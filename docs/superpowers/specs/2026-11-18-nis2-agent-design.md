# NIS2-Agent für den Mittelstand – Design

Stand: 2026-11-18 · Status: Entwurf zur Freigabe

## 1. Absicht und Warum

Rund 29.500 Unternehmen in Deutschland fallen seit dem Inkrafttreten des
NIS2-Umsetzungsgesetzes (NIS2UmsuCG, Dezember 2025) unter das BSIG. Der größte
Teil davon ist Mittelstand (50–1.000 Mitarbeitende) ohne eigenes
Compliance-Team. Viele haben sich nicht einmal fristgerecht beim BSI
registriert.

Der schwerste, dauerhafte Aufwand ist **§30 BSIG**: Risikomanagement-Maßnahmen
umsetzen und **nachweisen** – Richtlinien, Risikoanalyse, Zugriffs- und
MFA-Konzepte, Backup, Schulungen – und das laufend aktuell halten.

Bestehende Tools (NIS2-Autopilot, NIS2Have, SECJUR, Proliance) liefern
überwiegend Fragebögen und Vorlagen – die Arbeit bleibt beim Kunden.
**Unser Agent erledigt die Arbeit:** Er verbindet sich mit den IT-Systemen des
Kunden, sammelt Nachweise selbst, erkennt Lücken und schreibt die Dokumente.
Der Mensch prüft und gibt frei.

Ausgangslage: Gründer mit Software- und Compliance-/Rechtsfachwissen, nur die
Idee, noch keine Kundenkontakte.

## 2. Zielgruppe

- **Kunde:** Deutscher Mittelstand (50–1.000 MA), der unter NIS2 fällt
  (wichtige oder besonders wichtige Einrichtung).
- **Käufer:** Geschäftsführung (persönlich haftbar nach §38 BSIG) oder
  IT-Leitung.
- **Nutzer:** IT-Leitung bzw. ein*e IT-Verantwortliche*r mit wenig Zeit und
  wenig Security-/Compliance-Wissen.
- **Vertrieb:** Direkt (kein Partner-/MSP-Kanal im MVP).

## 3. Ziele, Nicht-Ziele, Anti-Ziele

**Ziele (MVP, 6–8 Wochen)**
1. Betroffenheitsprüfung: Fällt das Unternehmen unter NIS2, und als welche
   Einrichtungsart?
2. Gap-Analyse gegen §30 BSIG mit klarem Reifegrad je Maßnahmenbereich.
3. Microsoft-365-/Entra-ID-Anbindung, die automatisch Nachweise sammelt und
   regelbasiert prüft.
4. KI-erstellte Richtlinien-Entwürfe, die auf den tatsächlich gefundenen Daten
   des Kunden beruhen, mit Freigabe durch einen Menschen.
5. Demo-fähig für Kundengespräche.

**Nicht-Ziele (MVP)**
- Weitere Regulierungen (AI Act, DORA, DSGVO, ISO 27001-Zertifizierung).
- Meldeprozess für Sicherheitsvorfälle (§32 BSIG).
- Lieferanten-/Lieferkettenmanagement.
- Lokale Infrastruktur (On-Prem-AD, Firewalls, Backup-Server), Google Workspace.
- Partner-/Berater-Mandantenverwaltung, Abrechnung, Self-Service-Signup.

**Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)**
- Die KI entscheidet, ob eine Pflicht erfüllt ist. Compliance-Urteile müssen
  regelbasiert und nachvollziehbar sein; die KI erklärt und schreibt, sie
  urteilt nicht.
- Der Agent ändert etwas in den Systemen des Kunden. Nur Leserechte.
- Kundendaten verlassen die EU oder landen im Training von Modellen.
- Generische Vorlagen-Texte, die nicht zum Kunden passen – dann sind wir die
  Konkurrenz.
- Ein Tool, das ohne Kundengespräche gebaut wird.

## 4. Rahmenbedingungen

- **Datenresidenz:** Alle Kundendaten und Modellaufrufe in der EU.
- **Vertrauen:** Leserechte, Admin-Zustimmung des Kunden, Prüfpfad.
  Sicherheit ist Verkaufsargument; wir müssen uns selbst an die Maßnahmen
  halten, die wir verkaufen.
- **Team:** 1–2 Entwickler*innen, eine Sprache.
- **Rechtsquelle:** BSIG in der Fassung des NIS2UmsuCG sowie die
  EU-Durchführungsverordnung 2024/2690 (für bestimmte digitale Dienste).
  Inhaltliche Auslegung verantwortet der Gründer.

## 5. Ansätze

| | A: TypeScript aus einem Guss | B: Python-Backend + TS-Frontend | Low-Code (n8n/Retool) |
|---|---|---|---|
| Kern | Next.js, Postgres, Job-Worker, Anthropic SDK (Bedrock) | FastAPI + Worker, Next.js-UI | Workflows + Admin-UI |
| Pro | Eine Sprache, schnellstes MVP, reife Graph-SDKs | Stärker bei Dokument-KI/eigenen Modellen | Sehr schnelle Demo |
| Contra | Python-Doku-Tools etwas besser | Zwei Codebasen, mehr Aufwand | Mandantentrennung, Prüfpfad, Sicherheit nicht verkaufbar |

**Gewählt: A** (vom Gründer entschieden). Grund: schnellster Weg zu einem
verkaufbaren MVP mit kleinem Team; Python-Stärken sind im MVP zweitrangig.

## 6. Architektur

```
┌─────────────────────────── AWS eu-central-1 (Frankfurt) ───────────────────────────┐
│                                                                                     │
│  Next.js-App (UI + API)  ──►  Postgres (Mandanten, Anforderungen, Nachweise,        │
│        │                         Befunde, Dokumente, Prüfpfad)                      │
│        │                                  ▲                                         │
│        ▼                                  │                                         │
│  Job-Queue ──► Worker ──► Sammler: Microsoft Graph (nur Lesen) ──► Regel-Prüfungen  │
│                   │                                                                 │
│                   └──► Agent-Schicht: Claude über Amazon Bedrock (EU)               │
│                                                                                     │
│  Objektspeicher (S3): Nachweis-Snapshots (unveränderlich), Dokument-Exporte          │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Anforderungskatalog als Code (Kern-IP)
- Die 10 Maßnahmenbereiche aus §30 Abs. 2 BSIG, zerlegt in einzelne prüfbare
  **Anforderungen** (ID, Rechtsgrundlage, Beschreibung, Nachweisart:
  `automatisch` | `dokument` | `bestätigung`, Prüfregel, Gewichtung).
- Versioniert im Repo (z. B. YAML/TS), mit Tests. Änderungen am Katalog sind
  Code-Reviews durch den Gründer.

### 6.2 Nachweis-Sammler (Microsoft 365 / Entra ID)
- Multi-Tenant-App in Entra ID, Admin-Consent durch den Kunden, **nur
  Leseberechtigungen** (Application Permissions, z. B. Benutzer, Richtlinien
  für bedingten Zugriff, Authentifizierungsmethoden, Geräte/Intune, Secure
  Score, Audit-Logs).
- Läuft als Job (bei Verbindung und dann regelmäßig).
- Jeder Abruf wird als **Snapshot** gespeichert: Rohdaten, Zeitstempel,
  Hash, Quelle. Snapshots sind unveränderlich.

### 6.3 Regel-Prüfungen
- Deterministische Funktionen pro Anforderung, z. B. „MFA für alle Admins
  erzwungen“, „Legacy-Authentifizierung blockiert“, „Geräte verschlüsselt“.
- Ergebnis: `erfüllt` | `teilweise` | `nicht erfüllt` | `nicht prüfbar`, mit
  Verweis auf den Snapshot.

### 6.4 Agent-Schicht (Claude über Bedrock, EU)
- **Betroffenheitsprüfung:** geführtes Gespräch (Sektor, Größe, Umsatz,
  Tätigkeit) → regelbasierte Einstufung; die KI führt nur das Gespräch.
- **Gap-Erklärung:** übersetzt Befunde in verständliche Sprache, priorisiert
  Maßnahmen.
- **Richtlinien-Entwürfe:** schreibt Dokumente aus Interview-Antworten und
  echten Befunden (z. B. Zugriffskontroll-Richtlinie, die den tatsächlichen
  MFA-Stand nennt). Jede Aussage soll auf einen Befund oder eine
  Kundenangabe verweisen.
- Ausgaben sind immer **Entwürfe**; Freigabe durch einen Menschen wird im
  Prüfpfad protokolliert.

### 6.5 Prüfpfad
- Append-only-Tabelle für alle relevanten Ereignisse (Verbindung, Abruf,
  Prüfergebnis, Dokument erstellt/geändert/freigegeben, wer, wann).
- Export als Nachweisbericht (PDF) für BSI-Anfragen oder Prüfer.

### 6.6 Mandantenfähigkeit und Sicherheit
- Jede Tabelle mit `tenant_id`; Postgres Row-Level-Security.
- Secrets (Graph-Zertifikat, DB) in AWS Secrets Manager; Verschlüsselung at
  rest und in transit.
- Login: E-Mail/Magic-Link oder Microsoft-Login (Entra ID) für Kundennutzer.

## 7. Nutzerfluss im MVP

1. Kunde legt Konto an (im MVP von uns angelegt).
2. Betroffenheitsprüfung im Chat → Einstufung.
3. Microsoft 365 verbinden (Admin-Consent).
4. Agent sammelt Nachweise, Regeln prüfen → Dashboard mit Reifegrad je
   Maßnahmenbereich.
5. Für Anforderungen ohne automatischen Nachweis: kurzes Interview oder
   Bestätigung.
6. Agent erstellt Richtlinien-Entwürfe → Kunde prüft, ändert, gibt frei.
7. Export: Gap-Bericht und Nachweisbericht.

## 8. Parallel: Validierung

Ohne Kundenkontakte ist die Problemhypothese ungeprüft. Parallel zum Bau:
~10 Interviews mit IT-Leitern/Geschäftsführern betroffener Mittelständler
(Zugang über IHK, Branchenverbände, LinkedIn). Kernfragen: Wie weit seid ihr
mit §30? Wer macht die Arbeit? Was habt ihr schon gekauft? Würdet ihr einem
Agenten Lesezugriff auf M365 geben?

## 9. Daten-Phasen (vom Gründer entschieden)

- **Wochen 1–6:** Nur Microsoft-365-Test-Tenant (Developer-Tenant mit
  Beispieldaten). Keine echten Kundendaten.
- **Vor dem ersten Piloten** (gleiche Architektur, zusätzlich): AV-Vertrag
  (Art. 28 DSGVO), Datenschutzhinweise, Liste der Subunternehmer (AWS,
  Bedrock), Backups mit Wiederherstellungstest, zentrales Logging, Härtung
  der Zugänge (MFA für unser Team), interne Sicherheitsprüfung.

## 10. Entscheidungen des Designers (bitte prüfen)

- **Sprache der Oberfläche und Dokumente:** nur Deutsch im MVP.
- **Dokument-Export:** Richtlinien als Word (.docx), damit Kunden sie
  weiterbearbeiten können; Berichte als PDF.
- **Katalog-Inhalt:** Den ersten Anforderungskatalog zu §30 schreibt der
  Gründer (Fachwissen); der Entwickler liefert Format, Validierung und Tests.
  Für die Demo reichen ca. 30–50 Anforderungen, davon mindestens 10
  automatisch über Microsoft 365 prüfbar.
- **Kundenkonten:** werden im MVP von uns angelegt, kein Self-Service-Signup.
- **Kein Agent-Framework im MVP:** direkte Nutzung des Anthropic SDK mit
  Tool-Calls; ein Framework erst, wenn der Bedarf klar ist.

## 11. Dem Umsetzer überlassen

- Konkrete Bibliotheken (ORM, Job-Queue, UI-Komponenten, PDF-Erzeugung).
- AWS-Dienstwahl im Detail (ECS/Fargate vs. App Runner, RDS vs. Aurora).
- Exaktes Datenmodell und API-Form.
- Konkrete Claude-Modellwahl innerhalb der in Bedrock-EU verfügbaren Modelle.
- Teststrategie im Detail (Katalog-Regeln müssen getestet sein).

## 12. Quellen (Marktlage)

- [SECJUR – NIS2-Umsetzung](https://www.secjur.com/blog/nis2-umsetzung)
- [kcert – NIS2-Umsetzungsgesetz](https://www.kcert.de/ratgeber/nis2-umsetzungsgesetz/)
- [locaterisk – BSI-Nachfrist](https://locaterisk.com/en/nis2-bsi-registration-deadline-2026/)
- [Proliance – NIS2-Software-Vergleich](https://www.proliance.ai/blog/nis2-software-mittelstand-vergleich)
- [NIS2-Autopilot](https://nis2-autopilot.de/)
- [Kertos – KI-Agenten für Compliance](https://deutsche-wirtschafts-nachrichten.de/716937/ki-agenten-fuer-compliance-startup-kertos-will-den-mittelstand-mit-ki-compliance-von-der-buerokratie-befreien)

Hinweis: Marktzahlen stammen überwiegend von Anbieter- und Beratungsseiten und
sollten gegen BSI-Veröffentlichungen geprüft werden.
