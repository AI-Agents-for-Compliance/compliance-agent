# Plan 1: Fundament und Microsoft-365-Durchstich – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Microsoft-365-Test-Tenant lässt sich per Admin-Consent verbinden; der Agent sammelt Nachweise (nur lesend), speichert sie als unveränderliche Snapshots, prüft sie regelbasiert gegen den §30-Katalog und zeigt den Reifegrad je Maßnahmenbereich in einem Dashboard.

**Architecture:** Eine Next.js-App (UI + API) und ein Worker-Prozess im selben TypeScript-Paket, beide auf Postgres. Jobs laufen über pg-boss (Postgres-basiert, kein Redis). Der Anforderungskatalog liegt als YAML im Repo und wird beim Start gegen ein Zod-Schema validiert. Compliance-Urteile entstehen ausschließlich in deterministischen Prüffunktionen; in Plan 1 gibt es noch keine KI.

**Tech Stack:** Node 22 LTS, TypeScript (strict), pnpm, Next.js (App Router), Drizzle ORM + Postgres 16, pg-boss, Zod, `yaml`, `@azure/identity` + `@microsoft/microsoft-graph-client`, Vitest, React Testing Library, Docker Compose (lokales Postgres), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-18-nis2-agent-design.md`

## Global Constraints

- Microsoft Graph nur mit **Application-Leseberechtigungen**, exakt: `Directory.Read.All`, `Policy.Read.All`, `AuditLog.Read.All`, `UserAuthenticationMethod.Read.All`, `DeviceManagementManagedDevices.Read.All`, `SecurityEvents.Read.All`. Keine Schreibberechtigung, nirgends.
- Compliance-Status (`erfuellt` | `teilweise` | `nicht_erfuellt` | `nicht_pruefbar`) entsteht **nur** in Regel-Prüffunktionen, nie in einer KI.
- Jede Tabelle mit Kundendaten hat `tenant_id`; Zugriff nur über Postgres Row-Level-Security.
- Snapshots und Prüfpfad-Einträge sind unveränderlich (UPDATE/DELETE durch DB-Trigger verboten).
- Oberfläche nur Deutsch.
- In Plan 1 nur Test-Tenant (Microsoft-365-Developer-Tenant), keine echten Kundendaten.
- Produktivbetrieb später ausschließlich in AWS `eu-central-1`; lokal Docker.

## Review Focus

1. **Großer Tenant (Tausende Benutzer/Geräte):** Graph liefert seitenweise (`@odata.nextLink`); alle Seiten müssen gesammelt werden → Test in Task 6.
2. **Fehlende Lizenz** (kein Entra ID P1 / kein Intune): Endpunkt antwortet 403 oder 400 mit Lizenzfehler → Anforderung `nicht_pruefbar` mit Grund „Lizenz fehlt“, **nicht** `nicht_erfuellt` → Tests in Task 5 und 6.
3. **Kunde entzieht die Zustimmung:** Token-Abruf schlägt fehl → Verbindung wird `getrennt`, bestehende Befunde bleiben unverändert, Prüfpfad-Eintrag → Test in Task 7.
4. **Graph-Drosselung (429):** `Retry-After` beachten, maximal 3 Wiederholungen, danach Endpunkt-Status `error` → Test in Task 6.
5. **Gefälschter `state` im Consent-Callback:** Ein Angreifer könnte einen fremden Microsoft-Tenant an einen unserer Mandanten binden → `state` signiert, mandantengebunden, 10 Minuten gültig; sonst 400 und nichts gespeichert → Test in Task 8.

---

## Dateistruktur

```
catalog/                         # Anforderungskatalog (Inhalt: Gründer)
  bereiche.yaml                  # die 10 Maßnahmenbereiche §30 Abs. 2 BSIG
  anforderungen/*.yaml
src/
  catalog/schema.ts  load.ts
  db/schema.ts  client.ts  tenant.ts
  db/migrations/                 # Drizzle + SQL für RLS/Trigger
  evidence/snapshot.ts  types.ts
  checks/types.ts  registry.ts  evaluate.ts
  checks/m365/*.ts               # eine Datei je Prüfung
  checks/m365/__fixtures__/*.json
  collectors/m365/graph.ts  collect.ts  endpoints.ts
  jobs/boss.ts  collect-job.ts
  worker.ts                      # Einstieg Worker-Prozess
  connect/state.ts
  app/api/health/route.ts
  app/api/connect/m365/start/route.ts  callback/route.ts
  app/dashboard/page.tsx
  dashboard/maturity.ts
scripts/demo-collect.ts
docker-compose.yml  .github/workflows/ci.yml
```

---

### Task 1: Projekt-Grundgerüst

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `docker-compose.yml`, `.env.example`, `.github/workflows/ci.yml`, `src/app/api/health/route.ts`, `src/app/layout.tsx`
- Test: `src/app/api/health/route.test.ts`

**Interfaces:**
- Produces: Skripte `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm db:up` (startet Postgres 16 auf Port 5433), `pnpm db:migrate`; Env `DATABASE_URL`.

- [ ] **Step 1: Failing test schreiben**

```ts
import { GET } from "./route";
it("meldet ok", async () => {
  const res = await GET();
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});
```

- [ ] **Step 2:** `pnpm test src/app/api/health` → FAIL (Modul fehlt).
- [ ] **Step 3:** Next.js-App mit TypeScript strict, Vitest, ESLint aufsetzen; `GET` in `route.ts` gibt `Response.json({ status: "ok" })` zurück. `docker-compose.yml` mit `postgres:16`. CI-Workflow: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test` mit Postgres-Service.
- [ ] **Step 4:** `pnpm test && pnpm typecheck && pnpm lint` → alles grün.
- [ ] **Step 5:** Commit `chore: Projekt-Grundgerüst mit Next.js, Vitest und CI`.

---

### Task 2: Anforderungskatalog – Schema und Loader

**Files:**
- Create: `src/catalog/schema.ts`, `src/catalog/load.ts`, `catalog/bereiche.yaml`, `catalog/anforderungen/m365.yaml`
- Test: `src/catalog/load.test.ts` (Fixtures unter `src/catalog/__fixtures__/`)

**Interfaces:**
- Produces:
  ```ts
  type Nachweisart = "automatisch" | "dokument" | "bestaetigung";
  interface Bereich { nr: 1|2|3|4|5|6|7|8|9|10; titel: string; rechtsgrundlage: string }
  interface Anforderung {
    id: string;              // z. B. "M365-ADMIN-MFA", Muster ^[A-Z0-9-]+$
    bereich: Bereich["nr"];
    titel: string; beschreibung: string; rechtsgrundlage: string;
    nachweisart: Nachweisart;
    pruefung?: string;       // Pflicht bei "automatisch": ID einer registrierten Prüfung
    gewicht: 1 | 2 | 3;
  }
  interface Katalog { version: string; bereiche: Bereich[]; anforderungen: Anforderung[] }
  function loadCatalog(dir: string, bekanntePruefungen: ReadonlySet<string>): Katalog // wirft CatalogError
  ```

- [ ] **Step 1: Failing tests schreiben**

```ts
it("lädt gültigen Katalog", () => {
  const k = loadCatalog(fx("gueltig"), new Set(["M365-ADMIN-MFA"]));
  expect(k.bereiche).toHaveLength(10);
  expect(k.anforderungen[0].id).toBe("M365-ADMIN-MFA");
});
it("lehnt doppelte IDs ab", () =>
  expect(() => loadCatalog(fx("doppelt"), alle)).toThrow(/doppelte ID: M365-ADMIN-MFA/));
it("lehnt automatische Anforderung ohne Prüfung ab", () =>
  expect(() => loadCatalog(fx("ohne-pruefung"), alle)).toThrow(/pruefung fehlt/));
it("lehnt unbekannte Prüfung ab", () =>
  expect(() => loadCatalog(fx("gueltig"), new Set())).toThrow(/unbekannte Prüfung: M365-ADMIN-MFA/));
it("verlangt genau die Bereiche 1 bis 10", () =>
  expect(() => loadCatalog(fx("neun-bereiche"), alle)).toThrow(/Bereich 10 fehlt/));
```

- [ ] **Step 2:** `pnpm test src/catalog` → FAIL.
- [ ] **Step 3:** Zod-Schemata in `schema.ts`; `loadCatalog` liest `bereiche.yaml` und alle `anforderungen/*.yaml` (Paket `yaml`), validiert, prüft Querbezüge, wirft `CatalogError` mit deutscher Meldung.
- [ ] **Step 4:** `catalog/bereiche.yaml` mit den 10 Bereichen aus §30 Abs. 2 BSIG (Nr. 1 Risikoanalyse/Sicherheit der Informationssysteme, 2 Bewältigung von Sicherheitsvorfällen, 3 Aufrechterhaltung des Betriebs, 4 Sicherheit der Lieferkette, 5 Sicherheit bei Erwerb/Entwicklung/Wartung, 6 Bewertung der Wirksamkeit, 7 Cyberhygiene und Schulungen, 8 Kryptografie, 9 Personal/Zugriffskontrolle/Anlagenmanagement, 10 MFA und gesicherte Kommunikation). `catalog/anforderungen/m365.yaml` mit den 10 Anforderungen aus Task 5 (Titel/Beschreibung als Entwurf; der Gründer überarbeitet).
- [ ] **Step 5:** `pnpm test src/catalog` → PASS. Commit `feat: Anforderungskatalog mit Schema-Validierung`.

---

### Task 3: Datenbank, Mandantentrennung und Prüfpfad

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `src/db/tenant.ts`, `src/db/audit.ts`, `src/db/migrations/0001_init.sql` (generiert) und `0002_rls_trigger.sql` (handgeschrieben)
- Test: `src/db/tenant.test.ts`, `src/db/audit.test.ts` (Integration gegen Docker-Postgres)

**Interfaces:**
- Produces:
  - Tabellen: `tenants(id uuid, name)`, `m365_connections(id, tenant_id, ms_tenant_id, status 'aktiv'|'getrennt', connected_at, last_collected_at)`, `evidence_snapshots(id, tenant_id, source, key, status, payload jsonb, sha256, collected_at)`, `findings(id, tenant_id, anforderung_id, status, begruendung, snapshot_ids uuid[], run_id, created_at)`, `collection_runs(id, tenant_id, started_at, finished_at, ergebnis)`, `audit_events(id, tenant_id, actor, aktion, details jsonb, created_at)`.
  - `withTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T>` – setzt `set_config('app.tenant_id', …, true)` in einer Transaktion; App-Rolle `app_user` ohne `BYPASSRLS`.
  - `recordAudit(tx: Tx, e: { actor: string; aktion: string; details?: object }): Promise<void>`

- [ ] **Step 1: Failing tests schreiben**

```ts
it("Mandant A sieht keine Daten von Mandant B", async () => {
  await withTenant(B, tx => tx.insert(findings).values(befund(B)));
  const rows = await withTenant(A, tx => tx.select().from(findings));
  expect(rows).toHaveLength(0);
});
it("Schreiben für fremden Mandanten scheitert", async () => {
  await expect(withTenant(A, tx => tx.insert(findings).values(befund(B)))).rejects.toThrow(/row-level security/);
});
it("Prüfpfad ist unveränderlich", async () => {
  await withTenant(A, tx => recordAudit(tx, { actor: "system", aktion: "test" }));
  await expect(withTenant(A, tx => tx.update(auditEvents).set({ aktion: "x" }))).rejects.toThrow(/unveränderlich/);
  await expect(withTenant(A, tx => tx.delete(auditEvents))).rejects.toThrow(/unveränderlich/);
});
```

- [ ] **Step 2:** `pnpm db:up && pnpm test src/db` → FAIL.
- [ ] **Step 3:** Drizzle-Schema; Migration `0002`: RLS `ENABLE` + `FORCE` auf allen Mandantentabellen mit Policy `tenant_id = current_setting('app.tenant_id')::uuid`; Trigger-Funktion `verbiete_aenderung()` (`RAISE EXCEPTION 'Eintrag ist unveränderlich'`) für UPDATE/DELETE auf `audit_events` und `evidence_snapshots`. Test-Setup migriert eine frische Test-DB.
- [ ] **Step 4:** `pnpm test src/db` → PASS. Commit `feat: Datenbankschema mit Row-Level-Security und unveränderlichem Prüfpfad`.

---

### Task 4: Nachweis-Snapshots

**Files:**
- Create: `src/evidence/types.ts`, `src/evidence/snapshot.ts`
- Test: `src/evidence/snapshot.test.ts`

**Interfaces:**
- Consumes: `withTenant`, Tabelle `evidence_snapshots` (Task 3)
- Produces:
  ```ts
  type EvidenceKey =
    | "m365.userRegistrationDetails" | "m365.globalAdmins" | "m365.conditionalAccessPolicies"
    | "m365.securityDefaults" | "m365.authorizationPolicy" | "m365.managedDevices"
    | "m365.secureScores" | "m365.users";
  type EvidenceStatus = "ok" | "permission_denied" | "not_licensed" | "error";
  interface EvidenceItem { snapshotId: string; status: EvidenceStatus; data: unknown; collectedAt: Date }
  type EvidenceBundle = Partial<Record<EvidenceKey, EvidenceItem>>;
  function canonicalHash(payload: unknown): string // sha256 hex über kanonisches JSON (Schlüssel sortiert)
  function storeSnapshot(tx: Tx, s: { key: EvidenceKey; status: EvidenceStatus; payload: unknown; source: "m365" }): Promise<EvidenceItem>
  ```

- [ ] **Step 1: Failing tests schreiben**

```ts
it("Hash ist unabhängig von der Schlüsselreihenfolge", () =>
  expect(canonicalHash({ a: 1, b: [2, { c: 3, d: 4 }] })).toBe(canonicalHash({ b: [2, { d: 4, c: 3 }], a: 1 })));
it("speichert Snapshot mit Hash und Zeitstempel", async () => {
  const s = await withTenant(A, tx => storeSnapshot(tx, { key: "m365.users", status: "ok", payload: { value: [] }, source: "m365" }));
  expect(s.snapshotId).toMatch(/^[0-9a-f-]{36}$/);
  const row = await rawSelectSnapshot(s.snapshotId);
  expect(row.sha256).toBe(canonicalHash({ value: [] }));
});
```

- [ ] **Step 2:** `pnpm test src/evidence` → FAIL.
- [ ] **Step 3:** Implementieren; jeder Aufruf erzeugt einen neuen Snapshot (keine Deduplizierung – die Zeitreihe ist selbst Nachweis). Payload in Plan 1 als `jsonb` in Postgres; Umzug nach S3 ist Teil von Plan 4.
- [ ] **Step 4:** `pnpm test src/evidence` → PASS. Commit `feat: unveränderliche Nachweis-Snapshots mit Prüfsumme`.

---

### Task 5: Regel-Engine und die 10 Microsoft-365-Prüfungen

**Files:**
- Create: `src/checks/types.ts`, `src/checks/registry.ts`, `src/checks/evaluate.ts`, `src/checks/m365/*.ts` (eine Datei je Prüfung), `src/checks/m365/__fixtures__/*.json`
- Test: `src/checks/evaluate.test.ts`, `src/checks/m365/*.test.ts`

**Interfaces:**
- Consumes: `Katalog`, `Anforderung` (Task 2); `EvidenceBundle`, `EvidenceKey` (Task 4)
- Produces:
  ```ts
  type Status = "erfuellt" | "teilweise" | "nicht_erfuellt" | "nicht_pruefbar";
  interface CheckResult { status: Status; begruendung: string; snapshotIds: string[] }
  interface Check { id: string; benoetigt: EvidenceKey[]; run(e: EvidenceBundle): CheckResult }
  const registry: ReadonlyMap<string, Check>;
  interface Finding extends CheckResult { anforderungId: string }
  function evaluate(katalog: Katalog, evidence: EvidenceBundle): Finding[]
  ```
  `evaluate` liefert nur Befunde für `nachweisart: "automatisch"`. Fehlt ein benötigter Nachweis oder hat er nicht Status `ok`, setzt **`evaluate`** (nicht die Prüfung) `nicht_pruefbar` mit Begründung: `not_licensed` → „Lizenz fehlt: <key>“, `permission_denied` → „Berechtigung fehlt: <key>“, `error`/fehlend → „Nachweis nicht verfügbar: <key>“.

**Die Prüfungen** (Schwellwerte sind Designer-Entscheidung, Gründer prüft fachlich):

| ID | Bereich | Nachweis | erfüllt | teilweise | nicht erfüllt |
|---|---|---|---|---|---|
| `M365-ADMIN-MFA` | 10 | userRegistrationDetails | alle `isAdmin` haben `isMfaRegistered` | – | ≥ 1 Admin ohne MFA (Namen in Begründung) |
| `M365-USER-MFA` | 10 | userRegistrationDetails | ≥ 95 % der Nutzer MFA-registriert | 50–95 % | < 50 % |
| `M365-MFA-ERZWUNGEN` | 10 | securityDefaults, conditionalAccessPolicies | Security Defaults aktiv **oder** aktive CA-Richtlinie mit `includeUsers: ["All"]` und `builtInControls` enthält `mfa` | CA-Richtlinie mit MFA, aber nicht für alle | nichts davon |
| `M365-LEGACY-AUTH` | 9 | securityDefaults, conditionalAccessPolicies | Security Defaults aktiv **oder** aktive CA-Richtlinie, die `exchangeActiveSync` und `other` blockiert | Richtlinie nur im Modus `enabledForReportingButNotEnforced` | nichts davon |
| `M365-GLOBAL-ADMINS` | 9 | globalAdmins | 2–4 | – | < 2 oder > 4 (Anzahl in Begründung) |
| `M365-GAESTE` | 9 | authorizationPolicy | `guestUserRoleId` = `2af84b1e-32c8-42b7-82bc-daa82404023b` | = `10dae51f-b6af-4016-8d66-8c2a99b929b3` | sonst |
| `M365-INAKTIVE-KONTEN` | 9 | users (mit `signInActivity`) | ≤ 5 % der aktiven Mitgliedskonten ohne Anmeldung seit 90 Tagen | 5–15 % | > 15 % |
| `M365-GERAETE-VERSCHL` | 8 | managedDevices | ≥ 95 % der Windows/macOS-Geräte `isEncrypted` | 70–95 % | < 70 %; 0 Geräte → `nicht_pruefbar` „keine verwalteten Geräte“ |
| `M365-GERAETE-COMPLIANCE` | 7 | managedDevices | ≥ 90 % `complianceState = compliant` | 60–90 % | < 60 %; 0 Geräte → `nicht_pruefbar` |
| `M365-SECURE-SCORE` | 6 | secureScores (neuester) | `currentScore/maxScore` ≥ 0,6 | 0,4–0,6 | < 0,4 |

Grenzwerte: Untergrenzen inklusive („≥“), z. B. genau 95 % → erfüllt.

- [ ] **Step 1: Failing tests für `evaluate` schreiben**

```ts
it("fehlender Nachweis → nicht_pruefbar", () => {
  const [f] = evaluate(katalogMit("M365-ADMIN-MFA"), {});
  expect(f).toMatchObject({ status: "nicht_pruefbar", begruendung: "Nachweis nicht verfügbar: m365.userRegistrationDetails" });
});
it("fehlende Lizenz → nicht_pruefbar, nicht nicht_erfuellt", () => {
  const [f] = evaluate(katalogMit("M365-LEGACY-AUTH"), { "m365.securityDefaults": ok({ isEnabled: false }), "m365.conditionalAccessPolicies": item("not_licensed") });
  expect(f).toMatchObject({ status: "nicht_pruefbar", begruendung: "Lizenz fehlt: m365.conditionalAccessPolicies" });
});
it("ignoriert Anforderungen ohne automatische Prüfung", () =>
  expect(evaluate(katalogMit({ nachweisart: "dokument" }), {})).toEqual([]));
```

- [ ] **Step 2:** `pnpm test src/checks/evaluate` → FAIL. Dann `evaluate` und `registry` implementieren → PASS.
- [ ] **Step 3: Je Prüfung Failing tests schreiben** (je eine Datei, Fixtures als echte Graph-Antwortformen). Pro Prüfung mindestens: ein Fall je Status-Spalte der Tabelle und der Grenzwert. Beispiel:

```ts
it("Admin ohne MFA → nicht_erfuellt mit Namen", () => {
  const r = adminMfa.run({ "m365.userRegistrationDetails": ok(fx("reg-ein-admin-ohne-mfa")) });
  expect(r.status).toBe("nicht_erfuellt");
  expect(r.begruendung).toContain("admin2@contoso.onmicrosoft.com");
});
it("genau 95 % MFA → erfuellt", () =>
  expect(userMfa.run({ "m365.userRegistrationDetails": ok(regMitQuote(95, 100)) }).status).toBe("erfuellt"));
```

- [ ] **Step 4:** `pnpm test src/checks` → FAIL. Prüfungen implementieren, in `registry` eintragen → PASS.
- [ ] **Step 5:** Commit `feat: Regel-Engine und zehn Microsoft-365-Prüfungen`.

---

### Task 6: Microsoft-Graph-Sammler

**Files:**
- Create: `src/collectors/m365/endpoints.ts`, `src/collectors/m365/graph.ts`, `src/collectors/m365/collect.ts`
- Test: `src/collectors/m365/collect.test.ts`, `src/collectors/m365/graph.test.ts`

**Interfaces:**
- Consumes: `storeSnapshot`, `EvidenceKey`, `EvidenceBundle` (Task 4)
- Produces:
  ```ts
  interface GraphFetcher { get(path: string): Promise<{ status: number; headers: Headers; body: any }> }
  function createGraphFetcher(msTenantId: string): GraphFetcher // ClientCertificateCredential, Scope https://graph.microsoft.com/.default
  function getAllPages(f: GraphFetcher, path: string, sleep?: (ms: number) => Promise<void>): Promise<EndpointResult>
  type EndpointResult = { status: EvidenceStatus; data: unknown }
  function collectM365(tx: Tx, f: GraphFetcher): Promise<EvidenceBundle>
  class ConsentRevokedError extends Error {}
  ```
- `endpoints.ts` – Zuordnung `EvidenceKey → Graph-Pfad` (v1.0):
  - `m365.userRegistrationDetails` → `/reports/authenticationMethods/userRegistrationDetails`
  - `m365.globalAdmins` → `/directoryRoles(roleTemplateId='62e90394-69f5-4237-9190-012177145e10')/members`
  - `m365.conditionalAccessPolicies` → `/identity/conditionalAccess/policies`
  - `m365.securityDefaults` → `/policies/identitySecurityDefaultsEnforcementPolicy`
  - `m365.authorizationPolicy` → `/policies/authorizationPolicy`
  - `m365.managedDevices` → `/deviceManagement/managedDevices?$select=id,operatingSystem,isEncrypted,complianceState`
  - `m365.secureScores` → `/security/secureScores?$top=1`
  - `m365.users` → `/users?$select=id,userPrincipalName,accountEnabled,userType,signInActivity`

- [ ] **Step 1: Failing tests schreiben** (Fake-`GraphFetcher`, kein Netzwerk)

```ts
it("folgt @odata.nextLink über alle Seiten", async () => {
  const f = fake({ "/users": page([u1], "/users?skip=1"), "/users?skip=1": page([u2]) });
  expect((await getAllPages(f, "/users")).data).toEqual({ value: [u1, u2] });
});
it("429 → wartet Retry-After und wiederholt, maximal 3-mal", async () => {
  const sleep = vi.fn(async () => {});
  const f = fakeSequence("/x", [r429(2), r429(2), r429(2), r429(2)]);
  expect((await getAllPages(f, "/x", sleep)).status).toBe("error");
  expect(sleep).toHaveBeenCalledTimes(3);
  expect(sleep).toHaveBeenCalledWith(2000);
});
it("403 → permission_denied", async () =>
  expect((await getAllPages(fake403("/x"), "/x")).status).toBe("permission_denied"));
it("Lizenzfehler → not_licensed", async () =>
  // Graph meldet fehlende P1/Intune-Lizenz als 403/400 mit Fehlercode bzw. Text zu "license"/"Premium"
  expect((await getAllPages(fakeLizenzfehler("/identity/conditionalAccess/policies"), "/identity/conditionalAccess/policies")).status).toBe("not_licensed"));
it("collectM365 speichert je Endpunkt einen Snapshot", async () => {
  const bundle = await withTenant(A, tx => collectM365(tx, fakeAlleOk()));
  expect(Object.keys(bundle)).toHaveLength(8);
});
it("Token-Fehler (Zustimmung entzogen) → ConsentRevokedError", async () =>
  await expect(withTenant(A, tx => collectM365(tx, fakeTokenFehler()))).rejects.toBeInstanceOf(ConsentRevokedError));
```

- [ ] **Step 2:** `pnpm test src/collectors` → FAIL.
- [ ] **Step 3:** Implementieren. Lizenzerkennung: Graph-Fehlercode oder Fehlermeldung enthält (ohne Groß-/Kleinschreibung) `license`, `premium` oder `AadPremiumLicenseRequired` → `not_licensed`; vor dem endgültigen Einbau mit echten Antworten des Developer-Tenants abgleichen (Task 10). Token-Fehler von `@azure/identity` (`AuthenticationError`, z. B. AADSTS7000229/AADSTS65001) → `ConsentRevokedError`.
- [ ] **Step 4:** `pnpm test src/collectors` → PASS. Commit `feat: Microsoft-Graph-Sammler mit Paging, Drosselung und Lizenzerkennung`.

---

### Task 7: Sammel-Job im Worker

**Files:**
- Create: `src/jobs/boss.ts`, `src/jobs/collect-job.ts`, `src/worker.ts`
- Test: `src/jobs/collect-job.test.ts`

**Interfaces:**
- Consumes: `collectM365`, `ConsentRevokedError` (Task 6), `evaluate`, `registry` (Task 5), `loadCatalog` (Task 2), `withTenant`, `recordAudit` (Task 3)
- Produces:
  ```ts
  const COLLECT_JOB = "m365.collect";
  function runCollection(tenantId: string, deps: { fetcherFor(msTenantId: string): GraphFetcher; katalog: Katalog }): Promise<{ runId: string; ergebnis: "ok" | "getrennt" }>
  ```
  Ablauf: aktive Verbindung laden → `collection_runs` anlegen → sammeln → `evaluate` → `findings` mit `run_id` schreiben → Prüfpfad `sammlung_abgeschlossen` (Anzahl Befunde je Status). Bei `ConsentRevokedError`: Verbindung `getrennt`, Prüfpfad `verbindung_getrennt`, **keine** neuen Befunde. Worker plant den Job beim Verbinden sofort und danach täglich um 03:00 Europe/Berlin.

- [ ] **Step 1: Failing tests schreiben**

```ts
it("schreibt Befunde und Prüfpfad", async () => {
  const { runId, ergebnis } = await runCollection(A, depsAlleOk());
  expect(ergebnis).toBe("ok");
  expect(await befundeVon(A, runId)).toHaveLength(10);
  expect(await auditAktionen(A)).toContain("sammlung_abgeschlossen");
});
it("entzogene Zustimmung → getrennt, alte Befunde bleiben", async () => {
  const alt = await runCollection(A, depsAlleOk());
  const neu = await runCollection(A, depsTokenFehler());
  expect(neu.ergebnis).toBe("getrennt");
  expect(await verbindungsstatus(A)).toBe("getrennt");
  expect(await befundeVon(A, alt.runId)).toHaveLength(10);
  expect(await auditAktionen(A)).toContain("verbindung_getrennt");
});
```

- [ ] **Step 2:** `pnpm test src/jobs` → FAIL. Implementieren → PASS.
- [ ] **Step 3:** Commit `feat: Sammel-Job mit Prüfpfad und Behandlung entzogener Zustimmung`.

---

### Task 8: Microsoft-365 verbinden (Admin-Consent)

**Files:**
- Create: `src/connect/state.ts`, `src/app/api/connect/m365/start/route.ts`, `src/app/api/connect/m365/callback/route.ts`
- Test: `src/connect/state.test.ts`, `src/app/api/connect/m365/callback/route.test.ts`

**Interfaces:**
- Consumes: `withTenant`, `recordAudit` (Task 3), `COLLECT_JOB` (Task 7)
- Produces:
  ```ts
  function signState(tenantId: string, now?: Date): string        // HMAC-SHA256 mit CONNECT_STATE_SECRET, enthält tenantId + Ablauf (10 min)
  function verifyState(state: string, now?: Date): { tenantId: string } // wirft InvalidStateError
  ```
  - `GET /api/connect/m365/start?tenant=<uuid>` → 302 auf `https://login.microsoftonline.com/organizations/v2.0/adminconsent?client_id=<M365_CLIENT_ID>&scope=https://graph.microsoft.com/.default&redirect_uri=<APP_URL>/api/connect/m365/callback&state=<signState>`
  - `GET /api/connect/m365/callback` mit `admin_consent=True&tenant=<msTenantId>&state=…` → Verbindung `aktiv` speichern, Prüfpfad `verbindung_hergestellt`, Job `m365.collect` einreihen, 302 auf `/dashboard?tenant=<uuid>`.
  - Bei `error=access_denied` → 302 auf `/dashboard?tenant=<uuid>&hinweis=zustimmung_abgelehnt`, nichts gespeichert.
  - Env: `M365_CLIENT_ID`, `M365_CERT_PATH`, `CONNECT_STATE_SECRET`, `APP_URL` (in `.env.example`).
  - (Mandantenauswahl über Query-Parameter ist eine Plan-1-Vereinfachung; Login kommt in Plan 2.)

- [ ] **Step 1: Failing tests schreiben**

```ts
it("manipulierter state → 400, nichts gespeichert", async () => {
  const res = await GET(req(`?admin_consent=True&tenant=${MS}&state=${signState(A)}x`));
  expect(res.status).toBe(400);
  expect(await verbindungen()).toHaveLength(0);
});
it("abgelaufener state → 400", async () => {
  const s = signState(A, new Date(Date.now() - 11 * 60_000));
  expect((await GET(req(`?admin_consent=True&tenant=${MS}&state=${s}`))).status).toBe(400);
});
it("gültiger Callback speichert Verbindung und reiht Job ein", async () => {
  const res = await GET(req(`?admin_consent=True&tenant=${MS}&state=${signState(A)}`));
  expect(res.status).toBe(302);
  expect(await verbindungsstatus(A)).toBe("aktiv");
  expect(jobQueue.sent).toContainEqual({ name: "m365.collect", data: { tenantId: A } });
});
it("Zustimmung abgelehnt → Hinweis, nichts gespeichert", async () => {
  const res = await GET(req(`?error=access_denied&state=${signState(A)}`));
  expect(res.headers.get("location")).toContain("hinweis=zustimmung_abgelehnt");
  expect(await verbindungen()).toHaveLength(0);
});
```

- [ ] **Step 2:** `pnpm test src/connect src/app/api/connect` → FAIL. Implementieren (Vergleich mit `timingSafeEqual`) → PASS.
- [ ] **Step 3:** Commit `feat: Microsoft-365-Verbindung per Admin-Consent mit signiertem state`.

---

### Task 9: Dashboard mit Reifegrad

**Files:**
- Create: `src/dashboard/maturity.ts`, `src/app/dashboard/page.tsx`, `src/app/dashboard/BereichKarte.tsx`
- Test: `src/dashboard/maturity.test.ts`, `src/app/dashboard/BereichKarte.test.tsx`

**Interfaces:**
- Consumes: `Katalog` (Task 2), Befunde des letzten Laufs aus `findings` (Task 7)
- Produces:
  ```ts
  interface Reifegrad { bereich: number; titel: string; prozent: number | null; anzahl: Record<Status, number> }
  function reifegrad(katalog: Katalog, findings: Finding[]): Reifegrad[] // genau 10 Einträge, Bereich 1–10
  ```
  Formel: Punkte je Befund `erfuellt` = 1, `teilweise` = 0,5, `nicht_erfuellt` = 0, gewichtet mit `gewicht`; `nicht_pruefbar` zählt nicht. `prozent` = gerundete Ganzzahl; `null`, wenn der Bereich keine bewertbaren Befunde hat (Anzeige „noch keine automatischen Nachweise“).

- [ ] **Step 1: Failing tests schreiben**

```ts
it("gewichtet Teil-Erfüllung", () => {
  const r = reifegrad(kat([{ id: "X", bereich: 9, gewicht: 2 }, { id: "Y", bereich: 9, gewicht: 1 }]),
                      [f("X", "teilweise"), f("Y", "erfuellt")]);
  expect(r.find(b => b.bereich === 9)!.prozent).toBe(67);
});
it("nicht prüfbar zählt nicht, Bereich ohne Befunde → null", () => {
  const r = reifegrad(kat([{ id: "X", bereich: 4 }]), [f("X", "nicht_pruefbar")]);
  expect(r.find(b => b.bereich === 4)!.prozent).toBeNull();
  expect(r).toHaveLength(10);
});
it("Karte zeigt deutschen Hinweis ohne Nachweise", () => {
  render(<BereichKarte r={{ bereich: 4, titel: "Sicherheit der Lieferkette", prozent: null, anzahl: leer }} />);
  expect(screen.getByText("noch keine automatischen Nachweise")).toBeInTheDocument();
});
```

- [ ] **Step 2:** `pnpm test src/dashboard src/app/dashboard` → FAIL. Implementieren: Seite lädt den letzten Lauf des Mandanten (`?tenant=`), zeigt Verbindungsstatus mit Button „Microsoft 365 verbinden“ (auf `/api/connect/m365/start`), 10 Bereichskarten, darunter die Befundliste (Anforderung, Status, Begründung, Zeitpunkt des Snapshots). Bei `hinweis=zustimmung_abgelehnt` Hinweistext „Die Zustimmung in Microsoft 365 wurde abgelehnt.“ Zugriff in Plan 1 per HTTP-Basic-Auth über Env `DEMO_BASIC_AUTH` (Middleware).
- [ ] **Step 3:** → PASS. Commit `feat: Dashboard mit Reifegrad je Maßnahmenbereich`.

---

### Task 10: Durchstich mit dem Developer-Tenant

**Files:**
- Create: `scripts/demo-collect.ts`, `docs/entwicklung.md`
- Modify: `README.md`, ggf. `src/collectors/m365/graph.ts` (Lizenzerkennung an echten Antworten schärfen) und Fixtures

**Interfaces:**
- Consumes: alles Vorherige.

- [ ] **Step 1:** In `docs/entwicklung.md` beschreiben: Microsoft-365-Developer-Tenant anlegen, Multi-Tenant-App-Registrierung mit genau den Berechtigungen aus „Global Constraints“, Zertifikat erzeugen, `.env` füllen, `pnpm db:up && pnpm db:migrate && pnpm dev` und `pnpm worker`.
- [ ] **Step 2:** `scripts/demo-collect.ts <tenantUuid>` führt `runCollection` direkt aus und druckt Status je Anforderung als Tabelle.
- [ ] **Step 3:** Gegen den Developer-Tenant ausführen. Erwartet: 10 Befunde, keiner mit „Nachweis nicht verfügbar“, außer wo der Tenant die Lizenz wirklich nicht hat (dann „Lizenz fehlt: …“). Echte Fehlerantworten (403/Lizenz) als Fixtures übernehmen und Test aus Task 6 daran anpassen; `pnpm test` grün.
- [ ] **Step 4:** Im Browser: Verbinden → Zustimmung → Dashboard zeigt 10 Bereiche und Befunde. Screenshot in die PR-Beschreibung.
- [ ] **Step 5:** README um Kurzbeschreibung und Verweis auf `docs/entwicklung.md` ergänzen. Commit `docs: Entwicklungsanleitung und Demo-Durchstich`.

---

## Folgepläne (nicht Teil dieses Plans)

- **Plan 2 – Login und Agent-Schicht:** Login (Microsoft-Login/Magic-Link) statt Query-Parameter und Basic-Auth; Betroffenheitsprüfung im Chat mit regelbasierter Einstufung; Gap-Erklärung und Priorisierung durch Claude über Bedrock (EU); Interviews und Bestätigungen für nicht automatisch prüfbare Anforderungen.
- **Plan 3 – Richtlinien und Berichte:** Richtlinien-Entwürfe aus Befunden und Interviews, Freigabe-Workflow im Prüfpfad, Export als .docx; Gap- und Nachweisbericht als PDF.
- **Plan 4 – Infrastruktur und Pilotreife:** AWS eu-central-1 (Container, RDS, S3 für Snapshots, Secrets Manager), Backups mit Wiederherstellungstest, zentrales Logging, AV-Vertrag und Datenschutzhinweise, interne Sicherheitsprüfung.
- **Laufend (Gründer):** Anforderungskatalog auf 30–50 Anforderungen ausbauen; ~10 Kundeninterviews.
