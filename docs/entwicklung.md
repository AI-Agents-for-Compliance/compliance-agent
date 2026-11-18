# Entwicklung und Durchstich

Anleitung für die lokale Entwicklung, die Einrichtung eines Microsoft-365-Testtenants und den Demo-Modus ohne Microsoft-Zugang.

## Voraussetzungen

- Node.js >= 22, pnpm
- PostgreSQL 16: entweder `pnpm db:up` (Docker, Port 5433) oder eine eigene Instanz
- Für echte Erhebungen: Microsoft-365-Developer-Tenant und Entra-App-Registrierung (siehe unten)

## 1. Microsoft-365-Developer-Tenant

1. Am [Microsoft 365 Developer Program](https://developer.microsoft.com/microsoft-365/dev-program) teilnehmen und eine Sandbox mit Beispieldaten (E5) anlegen.
2. Im Tenant einen Global Admin bereithalten. Die Sandbox enthält Lizenzen für Conditional Access (Entra ID P1/P2) und Intune; ein Tenant ohne diese Lizenzen liefert bewusst "Lizenz fehlt"-Befunde.

## 2. Multi-Tenant-App-Registrierung (Entra)

Im Entra Admin Center (Entwickler-Tenant oder eigener Anbieter-Tenant) unter *App-Registrierungen > Neue Registrierung*:

- Unterstützte Kontotypen: **Konten in einem beliebigen Organisationsverzeichnis (mehrinstanzenfähig)**
- Umleitungs-URI (Web): `<APP_URL>/api/connect/m365/callback`, lokal `http://localhost:3000/api/connect/m365/callback`

Unter *API-Berechtigungen > Microsoft Graph > Anwendungsberechtigungen* genau diese sechs hinzufügen und Administratorzustimmung erteilen:

| Berechtigung |
|---|
| `Directory.Read.All` |
| `Policy.Read.All` |
| `AuditLog.Read.All` |
| `UserAuthenticationMethod.Read.All` |
| `DeviceManagementManagedDevices.Read.All` |
| `SecurityEvents.Read.All` |

Alle sind rein lesend. Die Anwendung verwendet ausschließlich GET-Anfragen.

### Zertifikat

Die App authentifiziert sich mit einem Zertifikat (kein Client Secret):

```bash
mkdir -p secrets   # per .gitignore ausgeschlossen (ebenso *.pem und *.key)
openssl req -x509 -newkey rsa:2048 -nodes -days 730 \
  -keyout secrets/m365-key.pem -out secrets/m365-cert.pem -subj "/CN=compliance-agent"
cat secrets/m365-key.pem secrets/m365-cert.pem > secrets/m365.pem   # PEM mit privatem Schlüssel und Zertifikat
```

- `secrets/m365-cert.pem` (öffentlich) in der App-Registrierung unter *Zertifikate & Geheimnisse > Zertifikate* hochladen.
- `M365_CERT_PATH=./secrets/m365.pem` (enthält den privaten Schlüssel). Diese Dateien niemals einchecken.

## 3. Umgebungsvariablen

`.env.example` nach `.env` kopieren und ausfüllen (Next.js liest `.env` selbst; die `demo:*`-Skripte laden sie über `tsx --env-file-if-exists=.env`, der Worker nicht: dort die Variablen vorher exportieren, z. B. `set -a; . ./.env; set +a`). Ein Beispiel-Wert für `DEMO_BASIC_AUTH` steht schon in `.env.example`; der Docker-Compose-Postgres lauscht auf Port 5433, eine eigene Instanz meist auf 5432.

| Variable | Bedeutung |
|---|---|
| `DATABASE_URL` | Datenbank der Anwendung (Standard ohne Angabe: `postgresql://dev:dev@localhost:5432/compliance`; mit `pnpm db:up` Port 5433) |
| `TEST_DATABASE_URL` | Eigene Datenbank für `pnpm test` (z. B. `.../compliance_test`); wird von Tests geleert |
| `M365_CLIENT_ID` | Anwendungs-(Client-)ID der Entra-App-Registrierung |
| `M365_CERT_PATH` | Pfad zur PEM-Datei mit privatem Schlüssel und Zertifikat |
| `CONNECT_STATE_SECRET` | Geheimnis (mindestens 32 Zeichen) zum Signieren des `state`-Parameters der Zustimmung, z. B. `openssl rand -hex 32` |
| `APP_URL` | Öffentliche Basis-URL, z. B. `http://localhost:3000`; bestimmt die Umleitungs-URI |
| `DEMO_BASIC_AUTH` | `benutzer:passwort` für den HTTP-Basic-Auth-Schutz der Demo; ohne Wert antwortet die App mit 503 (fail closed) |

## 4. Starten

```bash
pnpm install
pnpm db:up          # Postgres per Docker (oder eigene Instanz, dann DATABASE_URL setzen)
pnpm db:migrate
pnpm dev            # Web-Oberfläche auf http://localhost:3000
pnpm worker         # separates Terminal: Sammel-Jobs (pg-boss), täglich 03:00 Europe/Berlin
```

Tests und Qualität: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`.

## 5. Mandanten anlegen

Es gibt noch keine Registrierung; Mandanten entstehen per Skript:

```bash
pnpm demo:setup "Meine Firma"          # Mandant ohne Verbindung; gibt die Tenant-UUID aus
pnpm demo:setup "Demo GmbH" --fake     # zusätzlich Verbindung "aktiv" mit Dummy-Tenant-GUID (nur Demo)
```

Das Skript gibt die Tenant-UUID und die Dashboard-URL `<APP_URL>/dashboard?tenant=<uuid>` aus.

### Verbindung herstellen (echter Tenant)

Im Browser `<APP_URL>/api/connect/m365/start?tenant=<uuid>` öffnen. Es folgt die Microsoft-Administratorzustimmung; die Rückleitung auf `/api/connect/m365/callback` legt die Verbindung an. Danach die Erhebung anstoßen, entweder über den Worker (täglicher Job) oder direkt:

```bash
pnpm demo:collect <tenantUuid>
```

## 6. Demo-Modus ohne Microsoft-Zugang

> **Warnung:** `demo:setup --fake` und `demo:collect --fake` legen Fake-Mandanten, Verbindungen und Befunde an. Beide brechen ab, wenn `DATABASE_URL` nicht auf `localhost`, `127.0.0.1` oder `::1` zeigt (Override nur bewusst mit `ALLOW_DEMO=1`). Niemals gegen eine Produktionsdatenbank ausführen.

```bash
pnpm demo:setup "Demo GmbH" --fake      # druckt die Tenant-UUID
pnpm demo:collect <tenantUuid> --fake   # Erhebung mit Beispieldaten, druckt Tabelle Anforderung | Status | Begründung
DEMO_BASIC_AUTH=demo:demo-passwort CONNECT_STATE_SECRET=... APP_URL=http://localhost:3000 pnpm dev
```

Dann `http://localhost:3000/dashboard?tenant=<uuid>` öffnen (Benutzer `demo`, Passwort `demo-passwort`). Die Beispieldaten (`src/demo/fake-graph.ts`) ergeben ein gemischtes Bild aus erfüllten, teilweise erfüllten und nicht erfüllten Anforderungen sowie zwei nicht prüfbaren (Conditional Access ohne Lizenz). Ein Screenshot liegt unter `docs/screenshots/dashboard-demo.png`.

## Erster echter Test

Bisher wurde nie gegen einen echten Microsoft-365-Tenant getestet. Der Gründer prüft beim ersten Lauf (`pnpm demo:collect <uuid>` ohne `--fake`):

1. **Lizenz-Fehlerantworten.** Welche Antworten liefern Endpunkte, für die der Tenant keine Lizenz hat (v. a. `identity/conditionalAccess/policies`, `reports/authenticationMethods/userRegistrationDetails`, `deviceManagement/managedDevices`, `security/secureScores`)? Die Erkennung (`LIZENZ` in `src/collectors/m365/graph.ts`, aktuell `licen[sc]e|premium|AadPremiumLicenseRequired`, nur bei HTTP 400/401/403) muss echte Codes und Meldungen treffen. Erwartet: Befund "Lizenz fehlt: ..." statt "Nachweis nicht verfügbar: ...". Abweichende Antworten als Fixtures in `src/collectors/m365/graph.test.ts` und `src/collectors/m365` übernehmen, die Marker anpassen und die Tests grün halten.
2. **Alle zehn Befunde.** Kein Befund soll "Nachweis nicht verfügbar" lauten, außer bei echten Fehlern. Bei `permission_denied` fehlt Administratorzustimmung für die betreffende Berechtigung.
3. **Basic-Auth auf der Callback-Rückleitung.** Beim Ablauf *Verbinden > Zustimmung > Rückleitung* muss der Browser die Basic-Auth-Zugangsdaten auch bei der Weiterleitung von `login.microsoftonline.com` auf `/api/connect/m365/callback` mitsenden. Prüfen, dass der Callback nicht mit 401 antwortet, die Verbindung als "aktiv" gespeichert wird und das Dashboard 10 Bereiche mit Befunden zeigt. Falls der Browser keine Zugangsdaten mitsendet, zuerst die Seite der App im selben Browser öffnen und anmelden.
4. **Zertifikat.** Token-Beschaffung mit `M365_CERT_PATH` klappt (sonst Audit-Eintrag `sammlung_fehlgeschlagen`).

## Weiterführend

- Spezifikation: `docs/superpowers/specs/2026-11-18-nis2-agent-design.md`
- Plan 1: `docs/superpowers/plans/2026-11-18-plan-1-fundament-m365.md`
