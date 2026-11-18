# Final Whole-Branch Review: Plan 1 (Fundament + M365-Durchstich)

Range: `ad2d744..ae360a0` (20 commits). Reviewer: final whole-branch reviewer (read-only).
Method: read spec, plan, ledger; read every non-generated source file at HEAD in passes (db → evidence → checks → collector → jobs/worker → connect/proxy → dashboard → demo/scripts/docs/CI); skipped pnpm-lock, drizzle meta snapshots, PNG. Ran `pnpm test` once at the end: **31 files, 218 tests, all green (11.8 s)**.

---

## Strengths

- **Contracts line up end to end.** `ENDPOINTS` (8 keys, `src/collectors/m365/endpoints.ts`) = `EvidenceKey` (8, `src/evidence/types.ts`) = keys the checks read. List endpoints are always normalised to `{ value: [...] }` (`getAllPages`), single-object endpoints (`securityDefaults`, `authorizationPolicy`) are passed through as-is (`getEinzeln`). The checks read them the same way (`listeAus(...)` vs. `data.isEnabled` / `data.guestUserRoleId`). The demo fake (`src/demo/fake-graph.ts`) is built from `ENDPOINTS` paths, so it cannot drift silently. Catalog IDs ↔ `registry` ↔ `findings.anforderung_id` ↔ dashboard titles are consistent: `loadCatalog` rejects unknown `pruefung`s at startup in the worker, the dashboard and the demo script.
- **The "no false erfüllt" principle is built in structurally.** `evaluate` sets `nicht_pruefbar` for every required piece of evidence that is not `ok`, in one place (`checks/util.ts`). The `benoetigt`/`optional` split (ruling) correctly handles a tenant without P1 that has Security Defaults on. Unknown guest role → `nicht_pruefbar`. A Secure Score with `maxScore` ≤ 0 or a non-finite value → `nicht_pruefbar`. An invalid sign-in date counts as inactive. Thresholds include their lower bound and have tests for it.
- **Tenant isolation actually works.** `withTenant` switches to `app_user` (NOLOGIN, NOBYPASSRLS) with `SET LOCAL ROLE`. RLS is ENABLE+FORCE on all 5 tenant tables with `USING`+`WITH CHECK`. The tests cover cross-tenant SELECT/INSERT/UPDATE, a context leak between transactions, and that the role cannot log in. `recordAudit`/`storeSnapshot` take `tenant_id` from the transaction context.
- **Immutability.** A trigger blocks UPDATE/DELETE on `audit_events` and `evidence_snapshots`. The hash applies `toJSON` and is round-trip tested against the stored jsonb.
- **The error flow from collector → job → connection → dashboard is clean and tested.** Consent codes → `TokenError` → `ConsentRevokedError` → the collection transaction rolls back (no half-written snapshots), the connection becomes `getrennt`, old findings stay, an audit entry is written. A transient token error → run `fehlgeschlagen`, connection stays `aktiv`, the job throws so pg-boss retries. An endpoint error → snapshot with status `error` → `nicht_pruefbar`. The dashboard shows the last *successful* run plus a notice about the newer failed or disconnected run.
- **Graph is read-only.** The `GraphFetcher` interface has only `get`, the adapter only sends `method: "GET"`, and the nextLink host check stops the token from leaking to other hosts. Retry, paging and loop limits are in place.
- **Security basics.** The HMAC state uses `timingSafeEqual`, has a TTL and is tenant-bound. Basic auth compares in constant time over digests and fails closed (503). `*.pem`, `*.key` and `secrets/` are gitignored, no secrets are in the repo (checked with `git ls-files` and `git grep`). The demo scripts have a guard against non-local DBs.

---

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

**I1. The collection never gets queued after "Verbinden" in the real web process.** MUST FIX BEFORE MERGE.
- File: `src/app/api/connect/m365/callback/route.ts:66-70`, `src/jobs/boss.ts:24-32`
- Problem: `enqueueCollection` → `getBoss()` throws `"pg-boss ist nicht gestartet"` unless `startBoss()` was called *in the same process*. Only `src/worker.ts:12` calls `startBoss()`. There is no `instrumentation.ts` and no lazy start in the Next process (`grep startBoss` confirms this). So in the Next.js process every enqueue fails. The `try/catch` swallows the error and only logs it.
- Why it matters: This breaks the plan's core flow (Task 8: "Job `m365.collect` einreihen"; Task 7: "Worker plant den Job beim Verbinden sofort"). After connecting, the customer sees "verbunden" but no findings until 03:00 the next morning, and nothing tells them why. The tests could not catch it because `@/jobs/boss` is mocked in `callback/route.test.ts:3`, and the real browser run-through from T10 was never done (ruling). `docs/entwicklung.md` §5 even hides the gap ("Danach die Erhebung anstoßen ... oder direkt `pnpm demo:collect`").
- Fix: A send-only pg-boss instance started lazily in the web process, e.g. `getOrStartBoss()` with a module-level promise in `boss.ts` (`startBoss()` once, `createQueue` is idempotent). Have the callback use it. Add an integration test that runs the callback against the real `pgboss_test` schema (without the mock) and checks that a job lands in the queue.

**I2. The Conditional Access scope ignores conditions, so a false "erfüllt" is possible (deferred Task 5 item).** MUST FIX BEFORE MERGE.
- File: `src/checks/m365/util.ts:31-42` (`geltungsbereichProbleme`), `CaPolicy` type `:18-26`
- Problem: A policy with `includeUsers: ["All"]` + `includeApplications: ["All"]` + MFA counts as "für alle" even if it has `excludeApplications`, `locations` (e.g. "trusted locations excluded", very common in the Mittelstand), `platforms`, `signInRiskLevels`/`userRiskLevels` (MFA only on risk), `devices.deviceFilter`, `clientAppTypes` limited to e.g. `["browser"]`, `includeUserActions`/`includeAuthenticationContextClassReferences`, or `excludeGuestsOrExternalUsers`. Example: "MFA only for sign-ins with medium or higher risk" → `M365-MFA-ERZWUNGEN` = **erfüllt**. The same applies to `M365-LEGACY-AUTH` with excluded locations.
- Why it matters: This directly hits the spec's anti-goal (a rule-based judgement that must hold up). These are not rare edge cases but standard configurations. The dashboard would show 100 % in area 10.
- Fix (cheap, fail-safe): Extend `CaPolicy` with these fields. In `geltungsbereichProbleme`, report every non-empty restriction as a problem ("gilt nur an bestimmten Standorten", "nur bei Anmelderisiko", "ausgeschlossene Anwendungen", ...), so the result becomes `teilweise` instead of `erfuellt`. Treat `clientAppTypes` as unrestricted only if it is empty, `["all"]`, or (for MFA) covers browser+mobileAppsAndDesktopClients. One test per condition. Leave the threshold of 2 exclusion accounts as it is (ruling).

**I3. The "Reifegrad" percentage looks like area maturity but only rests on automatic checks.** FIX IN PLAN 2 (when the first `dokument`/`bestaetigung` requirements land). Ideally add a label now.
- File: `src/dashboard/maturity.ts:24-45`, `src/app/dashboard/BereichKarte.tsx:15-19`
- Problem: Area 6 "Bewertung der Wirksamkeit von Risikomanagementmaßnahmen" shows **100 %** as soon as one Secure Score check is ≥ 60 %. Once the founder adds non-automatic requirements, they will not appear in the percentage at all (no findings → not in the denominator). This follows the plan formula, so it is a weakness of the *plan*, not an implementation error.
- Why it matters: In a sales demo, "100 %" for a §30 area reads as "erfüllt". That is the kind of over-claim the spec rules out.
- Fix: On the card, add "Basis: n von m Anforderungen automatisch geprüft". In Plan 2, count unanswered `dokument`/`bestaetigung` requirements in the denominator as "offen", or show coverage separately.

### Minor (Nice to Have)

- **M1** `src/collectors/m365/endpoints.ts:24`: `secureScores?$top=1` is a list endpoint. `getAllPages` follows `@odata.nextLink` and, if Graph sends a nextLink for `$top`, collects the whole history (up to ~90 entries). The result stays correct (newest wins) but the request count and snapshot size grow. Fix: mark it as a single page (`liste: true, maxSeiten: 1`). → Plan 2.
- **M2** Provenance on rebinding: `evidence_snapshots`/`collection_runs` do not store `ms_tenant_id`. After a rebind (`callback/route.ts:46-58`) the dashboard shows "verbunden" plus the findings of the *previous* Microsoft tenant (last ok run) until the next run. Together with I1 that lasts until 03:00. Fix: store `ms_tenant_id` on the run; the dashboard only shows runs of the current binding. → Plan 2 (together with the callback hardening).
- **M3** `src/jobs/collect-job.ts:59-81`: the whole Graph collection (including retry sleeps of up to 60 s and up to 1000 pages per endpoint) runs inside **one** DB transaction. That holds a pooled connection and a long-running transaction open for minutes (idle-in-transaction timeouts on RDS, bloat). It is atomic, which is good, but in Plan 4 collect first and then write in a short transaction. → Plan 4.
- **M4** `src/collectors/m365/graph.ts:31`: `AADSTS700016` (app not found) also appears when *our* `M365_CLIENT_ID` is misconfigured. Then the 03:00 job sets **every** tenant to `getrennt` (recoverable only by re-consent). Fix: a circuit breaker (if consent errors hit ≥ N tenants in one run, treat it as a configuration error), or verify our own app at worker start. → Plan 4.
- **M5** `src/db/test-setup.ts:10-12`: `DROP SCHEMA public CASCADE` on `TEST_DATABASE_URL` without a guard. A mistakenly exported `TEST_DATABASE_URL` wipes that DB. Fix: reuse `pruefeLokaleDatenbank` and require a `_test` suffix in the DB name. → cheap, fix now or in Plan 2.
- **M6** `package.json:13,16`: `worker` and `db:migrate` do not load `.env`. The `.env.example` uses port 5433 while the code default is 5432, so `pnpm db:migrate` after `pnpm db:up` migrates the wrong (or no) DB. Fix: `tsx --env-file-if-exists=.env` as in the `demo:*` scripts. → now (one line) or Plan 2.
- **M7** `catalog/anforderungen/m365.yaml`: descriptions promise more than the checks test. GAESTE ("erfasst, begrenzt und regelmäßig überprüft" vs. only `guestUserRoleId`), INAKTIVE-KONTEN ("werden deaktiviert oder entfernt"), SECURE-SCORE ("wird beobachtet"), ADMIN-MFA ("nutzen MFA" vs. *registered*). An `erfuellt` then confirms the description text. → founder, ongoing / Plan 2.
- **M8** `.env.example:9`: `DEMO_BASIC_AUTH=demo:demo-passwort` is a working default password that gets copied along with `cp .env.example .env`. Fix: leave it empty (fail closed) and put the example only in the docs. → now (one line) or Plan 4.
- **M9** `findings.status` and `collection_runs.ergebnis` are free text. `daten.ts:71,79` casts with `as Status`. An invalid value would produce `NaN` counts and empty labels. Fix: CHECK constraints (see deferred Task 3). → Plan 2.
- **M10** `src/jobs/boss.ts:19`: the `m365.collect` queue has no `expireInSeconds`. With the pg-boss default (15 min), a long collection on a large tenant can expire and get retried while the first handler is still running, which gives two parallel runs for one tenant despite `exclusive`. Fix: set `expireInSeconds` to fit the paging/retry limits. → Plan 4.

---

## Ledger triage (deferred minor findings and rulings)

| # | Ledger entry | Decision | Reasoning |
|---|---|---|---|
| T1-a | CI push+PR runs twice | ACCEPT | Costs only CI minutes; restrict to `push: branches: [main]` when convenient. |
| T1-b | `packageManager` field missing | FIX IN PLAN 4 | Reproducible pnpm version for deployment/CI; irrelevant for the demo. |
| T1-c | tsconfig `types` without "node" | ACCEPT | typecheck is green; no effect. |
| T1-d | no eslint-config-next | FIX IN PLAN 2 | More UI code is coming (login, chat); Next rules (hooks, `<a>`→Link) help then. |
| T2-a | Zod `.strict()` | FIX IN PLAN 2 | The founder grows the catalog to 30–50 entries; typos in optional keys would otherwise be ignored silently. |
| T2-b | missing `anforderungen/` → no CatalogError | FIX IN PLAN 2 | ENOENT is still loud enough; nicer message when the catalog grows. |
| T2-c | reject `pruefung` on non-automatic requirements | FIX IN PLAN 2 | Otherwise silently unchecked; becomes relevant with `dokument` requirements. |
| T2-d | error path tests for the loader | FIX IN PLAN 2 | Together with T2-a/c. |
| T3-a | `RESET ROLE` back to superuser / `getDb()` superuser | FIX IN PLAN 4 | Before production: a separate non-superuser runtime login (member of app_user, not owner); Plan 1 has no untrusted code in the tx callback. |
| T3-b | no TRUNCATE trigger | FIX IN PLAN 4 | `app_user` has no TRUNCATE grant (checked in 0001), only the owner can; for audit-proof storage also add `BEFORE TRUNCATE` + S3 Object Lock (Plan 4). |
| T3-c | new tables need grant/RLS manually | FIX IN PLAN 2 | Plan 2 adds tables; add a schema test now: "every table with `tenant_id` has `relforcerowsecurity` + a policy". |
| T3-d | `tenants` without RLS | FIX IN PLAN 2 | Comes with login/tenant scoping; currently only names are visible, behind basic auth. |
| T3-e | no CHECK on status, no indexes on tenant_id, unused `sql` re-export, duplicate DEFAULT_DATABASE_URL | FIX IN PLAN 2 (CHECK, cleanups) / PLAN 4 (indexes) | See M9; indexes only matter at real data volumes. |
| T3-f | DB_POOL_MAX unvalidated; pool=1 + nested getDb deadlock | ACCEPT | There is no nesting today; the test pool is set deliberately. Validate in Plan 4 with the config module. |
| T4 | NaN/Infinity/BigInt in payloads | ACCEPT | Payloads come exclusively from `JSON.parse` (Graph), so these values cannot occur. |
| T5-a | disabled accounts / service principals / new accounts distort ADMIN-MFA, USER-MFA, GLOBAL-ADMINS, INAKTIVE-KONTEN | FIX IN PLAN 2 | Mostly a false "nicht erfüllt"; exception GLOBAL-ADMINS (1 active + 1 disabled = "erfüllt"), so cross-check against `m365.users` in Plan 2 with priority. |
| T5-b | CA scope ignores further conditions (FINAL REVIEW TRIAGE) | **MUST FIX BEFORE MERGE** | False-"erfüllt" path for common configurations (risk, location); cheap fail-safe fix, see I2. |
| T5-c | no mixed-policy test; teilweise reason takes the first policy; `clientAppTypes ["all"]`+block not recognised; Secure Score without range check | FIX IN PLAN 2 | "beste Richtlinie zählt" is already tested; the rest is a false negative or wording, not a false "erfüllt". Take `["all"]`+block along when doing I2. |
| T6-a | env read in the factory instead of per request | ACCEPT | The worker reads it per tenant and job anyway; no effect. |
| T6-b | optional retry on 401 | FIX IN PLAN 4 | Only relevant for token expiry during very long runs (see M3). |
| T6-c | UntrustedNextLink stores the full URL; `startsWith("http")` looser than the trust check | ACCEPT | The trust check runs first on every path; the URL contains no secret (skiptoken), only a host. |
| T7-a | batch size > 1 fails the whole batch | ACCEPT | pg-boss default batchSize is 1; leave a comment in `worker.ts`. |
| T7-b | sweep for hung runs without `finished_at` | FIX IN PLAN 2 | Otherwise the dashboard shows "Datenerhebung läuft …" forever after a worker crash; together with M10. |
| T7-c | cleanup error path without a test; worker counts deduplicated tenants | ACCEPT | Log/count only; behaviour is correct. |
| T8-a | **Ruling:** forged callback / login CSRF / state replay accepted for Plan 1 | FIX IN PLAN 2 (mandatory, as ruled) | Correct for test tenant + basic auth; before the first real customer tenant: nonce+cookie, single-use state, token probe for `msTenantId`, auth on `/start`. |
| T8-b | different 400 messages reveal tenant existence; no test for missing APP_URL/CLIENT_ID in start | FIX IN PLAN 2 | Behind basic auth; drops away with login; add the test then. |
| T9-a | `proxy.ts` without a test | FIX IN PLAN 2 | It is the only access gate; a regression in the matcher would expose everything. Add a small test for `proxy()` + `config.matcher` at the latest with the login switch. |
| T9-b | basic auth on the callback depends on the browser cache | ACCEPT | Documented manual step (entwicklung.md "Erster echter Test" item 3); goes away with session login in Plan 2. |
| T9-c | `loadCatalog` cwd-relative | FIX IN PLAN 4 | Container deployment; resolve the path relative to the package root. |
| T9-d | connection status ≠ aktiv always "getrennt" | ACCEPT | The enum only has two values. |
| T9-e | times in UTC | FIX IN PLAN 2 | A German-only UI should show Europe/Berlin; the tests can stay deterministic with a fixed TZ. |
| T10-a | guard only checks hostname, not `?host=` | ACCEPT | Deliberately bypassing it is possible anyway (ALLOW_DEMO); it is protection against accidents, not against attacks. |
| T10-b | fragile stack filter in demo-collect | ACCEPT | Only affects the format of the error output. |
| R1 | **Ruling:** tests on local Postgres instead of Docker | ACCEPT | CI uses a postgres:16 service; consistent. |
| R2 | **Ruling:** `app_user` + `SET LOCAL ROLE` | ACCEPT (Plan 4: separate runtime login) | Tests actually exercise RLS; production hardening see T3-a. |
| R3 | **Ruling:** queue injectable/mockable in the callback | ACCEPT, but see **I1** | The mock hid that the web process never starts pg-boss; an integration test without the mock is missing. |
| R4 | **Ruling:** `benoetigt` + `optional` | ACCEPT | Solves the Security-Defaults-without-P1 case correctly and is tested. |
| R5 | **Ruling:** CA "für alle" = All/All, no groups/roles, ≤ 2 excludeUsers, MFA mandatory, report-only → teilweise | ACCEPT, extend per **I2** | The threshold of 2 remains a founder decision; further conditions are missing. |
| R6 | **Ruling:** fixtures as TS builders | ACCEPT | Graph shapes are respected; easier to read. |
| R7 | **Ruling:** only certain AADSTS codes → ConsentRevoked, otherwise transient | ACCEPT, Plan 4 see **M4** | Correct direction (no false "getrennt"); blast radius of a misconfiguration still open. |
| R8 | **Ruling T10:** no real tenant test, demo mode + docs instead | ACCEPT with reservation | Unavoidable without the founder's account; but licence detection and the browser flow including enqueue are unverified (that is how I1 slipped through). The first real run by the founder is a release condition for Plan 2. |

---

## Tenant isolation: every `getDb()` use (owner/superuser, bypasses RLS)

| Place | Purpose | Judgement |
|---|---|---|
| `src/db/tenant.ts:14` | Basis of `withTenant` (then `SET LOCAL ROLE app_user`) | Correct. |
| `src/worker.ts:22` | 03:00 job: `tenant_id` of all active connections, across tenants | Justified (cross-tenant by nature, reads only IDs). Plan 4: replace with a `SECURITY DEFINER` function or a dedicated role. |
| `src/app/api/connect/m365/start/route.ts:14` | Existence check in `tenants` | Acceptable (`tenants` has no RLS, `app_user` may SELECT). Could go through `withTenant` (T3-d). |
| `scripts/demo-setup.ts:14` | Create tenant (INSERT tenants) | Correct: admin script, `app_user` deliberately has no INSERT on `tenants`. |
| Tests (`helpers.test-util.ts`, `*.test.ts`) | Separate owner connections for reset/raw reads | Correct, test only. |

All reads and writes of tenant data in the app/worker (`collect-job.ts`, `collect.ts`, `snapshot.ts`, `audit.ts`, `callback/route.ts`, `dashboard/daten.ts`, `demo-collect.ts`) go through `withTenant`. They also carry explicit `tenant_id` filters as defense in depth.

## Spec anti-goals

- **No false "erfüllt":** structurally good (see Strengths). Open: **I2** (CA conditions), **I3** (percentage display), T5-a (GLOBAL-ADMINS with disabled accounts), M7 (catalog texts).
- **AI does not judge:** fulfilled. There is no LLM code; status comes only from `checks/m365/*`.
- **Read-only Graph:** fulfilled in the code (GET only). The permissions depend on the app registration, documented in `docs/entwicklung.md` (exactly the six `*.Read.All`).
- **EU data:** no outgoing connections apart from Graph/login.microsoftonline.com; no telemetry. AWS eu-central-1 is Plan 4.
- **Immutability:** triggers on snapshots/audit are in place. TRUNCATE and the owner can still get around them (T3-b, Plan 4).

## Test suite health

- 218/218 green, 11.8 s. `fileParallelism: false` + `resetTenants` per test give deterministic shared DB state. pg-boss uses its own schema `pgboss_test` (dropped before the run). Env through `vi.stubEnv`/`unstubAllEnvs`. Time-dependent checks have `now` injected.
- Gaps: no test for `proxy.ts` (T9-a). Enqueue is only mocked (I1). M5: test-setup drops schemas without a guard.

## Recommendations

1. Fix I1 and I2 before merging (both small and well bounded). If the founder agrees, add the I3 label right away. M6/M8 (one line each) can go along.
2. Before Plan 2 starts: the founder's first real-tenant run (R8). Take the licence error responses over as fixtures.
3. Plan 2 backlog from this triage: T5-a (cross-check against users), callback hardening (T8-a) together with M2, schema RLS test (T3-c), Zod strict (T2), Berlin time (T9-e), proxy test (T9-a), sweep (T7-b).

## Declined to judge

- The founder's legal assignment of requirements to §30 areas and the thresholds (95/50 %, 2–4 admins, etc.): the spec explicitly puts the content on the founder.
- Visual design of the dashboard/screenshot: not a requirement of Plan 1.
- Whether the `/api/health` exception in the proxy matcher behaves correctly in Next 16: not verifiable without a running Next server (read-only review, no build). Covered by T9-a (proxy test).
- Whether the actual Graph licence error responses match `LIZENZ`: can only be checked against a real tenant (R8, entwicklung.md).
- Performance of the dashboard queries at real data volumes: Plan 4 (indexes, T3-e).

## Assessment

**Ready to merge: With fixes**

**Reasoning:** The architecture, tenant isolation, immutability and the error flows are solid and well tested, and the module contracts match. Two problems block the merge. In the real web process the collection is never queued after connecting (I1, hidden by the mock). And Conditional Access policies with location, risk or app restrictions are judged "erfüllt" (I2), which is a direct breach of the spec's anti-goal. Both are small fixes.
