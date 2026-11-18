# compliance-agent

KI-gestützter NIS2-Compliance-Agent für kleine und mittlere Unternehmen. Er erhebt Nachweise automatisch aus Microsoft 365 (rein lesend über Microsoft Graph), bewertet sie anhand eines Anforderungskatalogs und zeigt den Reifegrad je Maßnahmenbereich samt nachvollziehbarer Befunde in einem Dashboard. Mandantentrennung per Row-Level-Security, lückenloser Prüfpfad.

## Status

Plan 1 (Fundament und Microsoft 365): Katalog, Regel-Engine mit zehn Prüfungen, Graph-Sammler, Sammel-Job, Verbindung per Admin-Consent, Dashboard mit Demo-Zugang (Basic-Auth). Noch nicht gegen einen echten Tenant getestet, siehe "Erster echter Test" in der Entwicklungsanleitung. Login, Agent-Schicht, Richtlinien und Berichte folgen in späteren Plänen.

## Schnellstart

```bash
pnpm install
pnpm db:up && pnpm db:migrate   # oder eigene Postgres-Instanz über DATABASE_URL
pnpm test
```

### Demo-Modus (ohne Microsoft-Zugang)

```bash
pnpm demo:setup "Demo GmbH" --fake        # gibt Tenant-UUID und Dashboard-URL aus
pnpm demo:collect <tenantUuid> --fake     # Erhebung mit Beispieldaten, Tabelle im Terminal
DEMO_BASIC_AUTH=demo:demo-passwort CONNECT_STATE_SECRET=$(openssl rand -hex 32) pnpm dev
```

Dashboard: `http://localhost:3000/dashboard?tenant=<uuid>`

![Dashboard mit Demo-Daten](docs/screenshots/dashboard-demo.png)

## Dokumentation

- [Entwicklungsanleitung](docs/entwicklung.md): Tenant, App-Registrierung, Zertifikat, Umgebungsvariablen, erster echter Test
- [Spezifikation](docs/superpowers/specs/2026-11-18-nis2-agent-design.md)
- [Plan 1](docs/superpowers/plans/2026-11-18-plan-1-fundament-m365.md)
