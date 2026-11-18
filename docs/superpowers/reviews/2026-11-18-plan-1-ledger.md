# SDD ledger — plan: docs/superpowers/plans/2026-11-18-plan-1-fundament-m365.md
Spec: docs/superpowers/specs/2026-11-18-nis2-agent-design.md
Branch: claude/fervent-pasteur-3zwxzi (Feature-Branch, kein Worktree nötig)

## Pre-flight scan
| Tasks | Shared interface/file | Finding |
|---|---|---|
| T1/T3 | DATABASE_URL, db:up | Kein Docker-Daemon im Container; lokales Postgres 16 auf 5432 läuft. |
| T2/T5 | Katalog-IDs ↔ registry | 10 automatische Anforderungen in T2 = 10 Prüfungen in T5. OK |
| T3/T4..T9 | withTenant, Tabellen | Superuser umgeht RLS (auch mit FORCE). |
| T4/T5/T6 | EvidenceKey (8), EvidenceBundle | konsistent (8 Endpunkte, 8 Keys). OK |
| T5/T7 | evaluate → Finding, 10 Befunde | konsistent. OK |
| T6/T7 | ConsentRevokedError, GraphFetcher | konsistent. OK |
| T7/T8 | COLLECT_JOB, Queue | T8-Test nutzt `jobQueue.sent` → injizierbare Queue nötig. |
| T5 intern | MFA-ERZWUNGEN / LEGACY-AUTH | evaluate setzt nicht_pruefbar bei JEDEM nicht-ok Nachweis → Tenant ohne P1 mit aktiven Security Defaults würde fälschlich nicht_pruefbar. |
| T1..T10 je | Eigenkonsistenz | T1–T4, T6–T10 intern konsistent. |

Ruling: Tests/Dev nutzen lokales Postgres via DATABASE_URL (Superuser `dev`, DB `compliance` / `compliance_test`, Port 5432); docker-compose.yml wird trotzdem geliefert — Kosten wenn falsch: nur lokale Doku.
Ruling: Migration legt Rolle `app_user` (NOSUPERUSER, NOBYPASSRLS) an; withTenant führt Abfragen als app_user aus (eigene Verbindung oder SET ROLE) — sonst testet der RLS-Test nichts — Kosten: kleine Umbauten.
Ruling: T8 Callback bekommt Queue per Abhängigkeit (Modul-Funktion `getQueue()` mockbar) — Kosten: gering.
Ruling: Check hat `benoetigt` (Pflicht) und optional `optional: EvidenceKey[]`; evaluate setzt nicht_pruefbar nur für Pflicht-Nachweise. MFA-ERZWUNGEN/LEGACY-AUTH: securityDefaults Pflicht, conditionalAccessPolicies optional; Prüfung selbst: SD aktiv → erfuellt; sonst CA nicht ok → nicht_pruefbar „Lizenz fehlt: m365.conditionalAccessPolicies“ (bzw. Berechtigung/Nachweis). Zusatztest: SD aktiv + CA not_licensed → erfuellt. Grund: Spec-Anti-Ziel falscher Urteile; typischer KMU-Tenant ohne P1 — Kosten: kleine Interface-Erweiterung.

## Tasks
Task 1: complete (commits ad2d744..5f2b423, review clean; Minor offen: CI push+PR doppelt, packageManager-Feld, tsconfig types ohne "node", kein eslint-config-next)
Task 2: complete (commits 5f2b423..6e35b83, review clean; Minor für Final-Welle: Zod .strict(), fehlendes anforderungen/ → CatalogError, pruefung bei nicht-automatisch ablehnen, Fehlerpfad-Tests)
Task 3: review 1 → Needs fixes (Important: app_user LOGIN mit bekanntem Passwort). Fix-Runde 1 an Implementer aed3676 geschickt (NOLOGIN + UPDATE-Tenantwechsel-Test + Leak-Test zuverlässig + Grant-Kommentar).
Task 3: minor (deferred): withTenant kann per RESET ROLE zu Superuser zurück; getDb() exportiert Superuser-Verbindung → vor Produktion eigene Runtime-Rolle/URL (Plan 4).
Task 3: minor (deferred): kein TRUNCATE-Trigger auf unveränderlichen Tabellen.
Task 3: minor (deferred): neue Tabellen brauchen Grant+RLS ENABLE/FORCE+Policy manuell (kein ALTER DEFAULT PRIVILEGES).
Task 3: minor (deferred): tenants ohne RLS → Mandantennamen für alle sichtbar.
Task 3: minor (deferred): kein CHECK-Constraint auf m365_connections.status; keine Indizes auf tenant_id; ungenutzter sql-Re-Export; DEFAULT_DATABASE_URL doppelt.
Task 3: fix round 1/5 (4 addressed, 0 open; commits ca692aa..f61ea58)
Task 3: minor (deferred): DB_POOL_MAX ohne Validierung; Pool=1 in Tests → verschachtelte getDb() in withTenant würde blockieren.
Task 3: complete (commits 6e35b83..f61ea58, review clean after 1 fix round)
Task 4: review 1 → Needs fixes (Important: canonicalize ignoriert toJSON/Date; null/undefined-Payload). Fix-Runde 1 an a3e3162.
Task 4: fix round 1/5 (3 addressed, 0 open; commits ceac416..a3b73de)
Task 4: minor (deferred): NaN/Infinity/BigInt in Payloads nicht behandelt.
Task 4: complete (commits f61ea58..a3b73de, review clean after 1 fix round)
Task 5: review 1 → Needs fixes (Important: LEGACY-AUTH/MFA-ERZWUNGEN ignorieren Scope/Ausnahmen/Operator → falsches erfuellt; ungültiges Datum = aktiv). Fix-Runde 1 an a8003c0.
Ruling: CA-Richtlinie „für alle“ nur bei includeUsers All + includeApplications All + keine excludeGroups/Roles + ≤2 excludeUsers (Notfallzugang); MFA zwingend (AND bzw. nur mfa, oder authenticationStrength); sonst teilweise; Berichtsmodus → teilweise in beiden — Grund: Spec-Anti-Ziel falscher Urteile — Kosten wenn falsch: Schwellwert 2 Ausnahmen vom Gründer anzupassen.
Ruling: Fixtures als TS-Builder statt JSON akzeptiert — Graph-Formen eingehalten — Kosten: keine.
Task 5: minor (deferred): userRegistrationDetails ohne accountEnabled → deaktivierte Konten verzerren ADMIN-MFA/USER-MFA (falsch negativ); GLOBAL-ADMINS zählt deaktivierte/Service Principals; neue Konten <90 Tage ohne Anmeldung gelten als inaktiv. → Gründer/Plan 2 (Abgleich mit m365.users).
Task 5: fix round 1/5 (3 Important + 4 Minor addressed, 0 open; commits 157c2c7..941b0d5)
Task 5: minor (deferred, FINAL REVIEW TRIAGIEREN): CA-Scope ignoriert excludeApplications, locations, platforms, Risiko-Level, device filter, excludeGuestsOrExternalUsers, includeUserActions → möglicher falscher erfuellt-Pfad.
Task 5: minor (deferred): kein Mixed-Policy-Regressionstest; teilweise-Begründung nimmt erste Richtlinie; clientAppTypes ["all"]+block nicht erkannt; Secure Score ohne Bereichsprüfung.
Task 5: complete (commits a3b73de..941b0d5, review clean after 1 fix round)
Task 6: review 1 → Needs fixes (Important: jeder Token-Fehler → ConsentRevoked; nextLink ohne Host-Prüfung). Fix-Runde 1 an a607958.
Ruling: Nur AADSTS65001/7000229/700016/7000215/90002/50020 → ConsentRevokedError; sonst TokenTransientError (Lauf abbrechen, Verbindung NICHT getrennt) — Grund: kein falscher Status beim Kunden — Kosten: Codeliste ggf. erweitern. Task 7 muss TokenTransientError behandeln (Lauf „fehlgeschlagen“, Status unverändert).
Task 6: minor (deferred): Env wird bei Factory-Aufruf gelesen statt pro Request; optional Retry bei 401.
Task 6: fix round 1/5 (2 Important + 4 Minor addressed, 0 open; commits c5ddf12..b84d08e)
Task 6: minor (deferred): UntrustedNextLink speichert volle URL in message; startsWith("http") im Fetcher lockerer als Trust-Check.
Task 6: complete (commits 941b0d5..b84d08e, review clean after 1 fix round)
Task 7: review 1 → Needs fixes (Important: singletonKey wirkungslos bei pg-boss-Policy standard). Fix-Runde 1 an a72877a (policy exclusive + Test, Minors).
Task 7: minor (deferred): Batch-Größe >1 würde ganzen Batch fehlschlagen lassen; Sweep für hängende Läufe ohne finished_at.
Task 7: fix round 1/5 (1 Important + 4 Minor addressed, 0 open; commits dcf3f7c..aaf40d1)
Task 7: minor (deferred): Cleanup-Fehlerpfad ohne Test; Worker zählt auch deduplizierte Mandanten.
Task 7: complete (commits b84d08e..aaf40d1, review clean after 1 fix round)
Task 8: review 1 → Needs fixes (Important: Upsert-Race ohne Unique-Constraint). Fix-Runde 1 an acb1498.
Ruling: Gefälschter Callback / Login-CSRF / state-Replay (Reviewer #2) → für Plan 1 akzeptiert (kein Login, nur Test-Tenant), PFLICHT in Plan 2: sessiongebundener Einmal-state (Nonce+Cookie), Zustimmungsnachweis per Token-Abruf für msTenantId vor „aktiv“, Auth auf /start — Kosten wenn falsch: Fremd-Tenant könnte an Mandanten gebunden werden; vor echten Kundendaten zwingend.
Task 8: minor (deferred): unterschiedliche 400-Meldungen im Start-Route erlauben Existenztest von Mandanten-UUIDs; kein Test für fehlende APP_URL/M365_CLIENT_ID im Start-Route.
Task 8: fix round 1/5 (1 Important + 5 Minor addressed, 0 open; commits 43fea25..b5220ec)
Task 8: complete (commits aaf40d1..b5220ec, review clean after 1 fix round)
Task 9: review 1 → Approved mit 1 Important (laufender Lauf als „fehlgeschlagen“ angezeigt). Fix-Runde 1 an a67e06b.
Task 9: minor (deferred): proxy.ts ohne Test; Basic-Auth auf Callback hängt an Browser-Credential-Caching (in T10 manuell prüfen); loadCatalog cwd-relativ (Plan 4 Deployment); Verbindungsstatus ≠ aktiv immer „getrennt“; Zeiten in UTC.
Task 9: fix round 1/5 (1 Important + 4 Minor addressed, 0 open; commits a3996aa..6a7ba99)
Task 9: complete (commits b5220ec..6a7ba99, review clean after 1 fix round)
Ruling T10: Schritte 3+4 (echter Developer-Tenant, App-Registrierung, Browser-Durchstich) brauchen Microsoft-Konto des Gründers → nicht im Container möglich; stattdessen: Doku + Skript + README, zusätzlich `--fake`-Modus (Demo-Daten ohne Microsoft) und lokaler Durchstich mit Screenshot. Echter Tenant-Test bleibt offener Schritt für den Gründer — Kosten: Lizenzerkennung noch nicht an echten Antworten geprüft.
Task 10: review 1 → Needs fixes (Important: *.pem nicht gitignored; Demo-Skripte ohne Guard gegen Nicht-lokal-DB). Fix-Runde 1 an a66a0bb.
Task 10: fix round 1/5 (2 Important + 3 Minor addressed, 0 open; commits 255580f..ae360a0)
Task 10: minor (deferred): Guard prüft nur hostname, nicht ?host=-Parameter; fragiler stack-Filter in demo-collect.
Task 10: complete (commits 6a7ba99..ae360a0, review clean after 1 fix round)
Final review: With fixes (0 Critical, 3 Important, 10 Minor). Fix-Welle an ab3826b (I1 Enqueue im Web-Prozess, I2 CA-Bedingungen, I3 Basis-Hinweis auf Karte). FIX_BASE ae360a0.
Ruling: I3 (Reifegrad nur aus automatischen Prüfungen) — Formel bleibt laut Plan, Karte zeigt „Basis: n von m Anforderungen automatisch geprüft“; echte Gesamtbewertung in Plan 2 — Kosten wenn falsch: Kunde könnte Prozentwert überschätzen.
Final fix wave: re-review Approved (I1–I3 addressed; commits ae360a0..823e29c). Minor (deferred): gecachte Rejection in getSendBoss bei fehlender DATABASE_URL; kein stopSendBoss bei SIGTERM; HMR kann Send-Instanzen leaken.
