# Product Requirements Document: Compliance Agent

**Version:** 1.0
**Datum:** 2026-11-18
**Status:** Draft

---

## 1. Executive Summary

Wir bauen AI-Agents für Compliance, die regulatorische Anforderungen in nachvollziehbare, auditierbare Entscheidungen übersetzen. Das System analysiert Dokumente, überwacht Regulatorikänderungen und generiert Audit-Reports — mit vollständigem Quellennachweis für jeden Befund.

**Positionierung:** "Bayshore für den deutschen Mittelstand"

Wir positionieren uns zwischen Vanta (zu flach, primär US-fokussiert) und OneTrust (zu teuer, zu komplex für den Mittelstand). Zielmarkt ist der deutsche Mittelstand, der EU-spezifische Anforderungen hat, aber keine Enterprise-Ressourcen.

---

## 2. Problem

### Compliance heute ist manuell, langsam und teuer

- Compliance-Prüfungen laufen größtenteils über Spreadsheets, E-Mails und manuelle Dokumentenreviews
- Ein typisches Compliance-Audit bindet 2–4 Wochen interner Kapazität
- Fehler entstehen nicht durch schlechte Absicht, sondern durch Komplexität und Volumen

### AI-Tools lösen das Vertrauensproblem nicht

- 73 % der AI-basierten Compliance-Tools bieten keine validierten Benchmarks
- Output ist nicht auditierbar — kein Quellennachweis, kein Prüfpfad
- Compliance-verantwortliche Personen haften persönlich: unklare AI-Outputs sind unakzeptabel

### Mid-Market fällt durch das Raster

- Zu groß für einfache Self-Service-Tools (Vanta, Tugboat Logic)
- Zu klein für Enterprise-Suites (OneTrust, RSA Archer)
- EU-Regulatorik (DSGVO, HGB, BNetzA, BaFin) wird von US-Anbietern nur oberflächlich abgedeckt

---

## 3. Zielnutzer / ICP

### Primäre Zielgruppe

**Compliance Officer / Head of Legal**, Unternehmen 100–2.000 Mitarbeitende

- Verantwortlich für regulatorische Konformität
- Persönliche Haftung bei Verstößen
- Braucht: Nachweise, Quellenangaben, Audit-Trail
- Schmerz: zu wenig Kapazität, zu viel manuelle Arbeit

**Typisches Profil:**
- Unternehmen in regulierten Branchen (Energie, Finanz, Gesundheit)
- Bestehende Compliance-Dokumentation vorhanden, aber unstrukturiert
- Jährliche externe Prüfungen oder Zertifizierungsanforderungen

### Sekundäre Zielgruppe

**Externe Berater / Wirtschaftsprüfer (Multi-Client)**

- Betreuen mehrere Mandanten parallel
- Brauchen: Effizienz, Mandantentrennung, exportierbare Reports
- Potenzieller Multiplikatoreffekt beim Go-to-Market

### Go-to-Market-Reihenfolge

1. **Energie / BESS** — Certicell-Netzwerk als Einstiegskanal, klare BNetzA/EEG-Anforderungen
2. **Finanzdienstleister** — BaFin-Regulatorik, höhere Zahlungsbereitschaft
3. **Breit** — DSGVO-Paket für deutsche KMU

### Geografie

**DACH-first.** Internationalisierung erst nach Marktvalidierung in Deutschland.

---

## 4. Positionierung & Differenzierung

### EU-first by Design

DSGVO, HGB, BNetzA, BaFin sind keine Add-ons — sie sind das Kernprodukt. Jede Analyse kennt die relevanten deutschen und EU-Regelwerke nativ.

### Transparenz als Produktmerkmal

Jede Entscheidung des Systems enthält:
- Das angewandte Regelwerk
- Den genauen Paragraphen / Artikel
- Die Einschätzung (konform / Klärungsbedarf / nicht konform)
- Die Konfidenz des Systems

Kein "AI says so" — sondern "§ 25a KWG Abs. 1 Satz 2 erfordert X, Ihr Dokument regelt Y → Klärungsbedarf."

### Audit-Trail als Kernprodukt

Nicht Feature, sondern Fundament. Jeder Check, jede Entscheidung, jede Eskalation wird mit Zeitstempel und Nutzer protokolliert. Der Audit-Trail ist der Nachweis gegenüber Prüfern.

### Human-in-the-Loop als Designprinzip

AI räumt Routinefälle weg. Grenzfälle eskalieren an menschliche Reviewer. Das System lernt aus Eskalationsentscheidungen. Compliance-Verantwortliche behalten Kontrolle und Haftung.

---

## 5. Core Features

### MVP — Document Review Agent

**Ziel:** Erstes Wertversprechen lieferbar, Pilotunternehmen können onboarden.

| Feature | Beschreibung |
|---------|-------------|
| Dokument-Upload | PDF und Word-Dateien (.pdf, .docx) |
| AI-Analyse | Automatische Prüfung gegen konfiguriertes Regulatorik-Profil |
| Findings mit Quellennachweis | Regelwerk + Paragraph + Einschätzung je Finding |
| Ampel-System | Grün (konform), Gelb (Klärungsbedarf), Rot (nicht konform) |
| Kommentare & Eskalation | Reviewer kann Findings kommentieren, an Kollegen eskalieren |
| Audit-Trail | Lückenloser Prüfpfad aller Checks und Entscheidungen |

**Nicht im MVP:** Automatisches Monitoring, Report-Export, Mandantenverwaltung

---

### V1 — Regulation Monitor

**Ziel:** Proaktive Compliance — nicht nur reagieren, sondern antizipieren.

| Feature | Beschreibung |
|---------|-------------|
| Regulatorik-Konfiguration | BNetzA, DSGVO, EEG, BaFin etc. auswählbar |
| Änderungs-Monitoring | Automatische Erkennung relevanter Regulatorikupdates |
| Impact Assessment | "Diese Änderung betrifft 3 deiner aktiven Dokumente" |
| Alert-System | E-Mail + In-App-Benachrichtigung bei relevantem Update |

---

### V1 — Audit Report Generator

**Ziel:** Prüfungsnachweis auf Knopfdruck.

| Feature | Beschreibung |
|---------|-------------|
| 1-Click-Export | Strukturierter Compliance-Report als PDF |
| Scope-Auswahl | Zeitraum, Framework, Dokumentenauswahl |
| Verwendungszweck | Betriebsprüfungen, BaFin-Anfragen, interne Audits |
| Branding | Report mit Unternehmenslogo und -angaben |

---

## 6. User Flows

### Onboarding

```
Registrierung
  → Unternehmensprofil anlegen (Branche, Größe, Rechtsform)
  → Regulatorik-Profil konfigurieren (welche Regelwerke gelten?)
  → Erster Dokument-Check (Guided Onboarding)
  → Dashboard mit Übersicht aktiver Checks
```

**Erfolgskriterium:** Nutzer führt ersten Check durch innerhalb von 10 Minuten nach Registrierung.

---

### Document Review

```
Dokument hochladen (Drag & Drop oder Upload)
  → Analyse startet automatisch (<60 Sek.)
  → Findings-Liste erscheint mit Ampel-Farben
  → Klick auf Finding → Detail-Ansicht mit Quellennachweis
     → Entscheidung: Approve / Flag as Issue / Eskalieren
  → Audit-Trail aktualisiert sich in Echtzeit
  → Status des Dokuments: "Geprüft", "Offen", "Eskaliert"
```

---

### Regulation Alert

```
System erkennt Regulatorik-Änderung
  → E-Mail + In-App-Alert: "BNetzA-Update: Netzzugangsverordnung geändert"
  → Impact-Assessment: "3 Ihrer Dokumente potenziell betroffen"
  → Nutzer startet Impact-Check
  → Betroffene Stellen werden markiert
  → Review-Workflow wie bei Document Review
```

---

### Report Export

```
Dashboard → "Report erstellen"
  → Zeitraum wählen (z.B. Q3 2026)
  → Scope definieren (Framework, Dokumentenauswahl)
  → Vorschau des Reports
  → PDF generieren
  → Download oder direkt teilen (Link, E-Mail)
```

---

## 7. Erfolgsmetriken

### Activation

| Metrik | Ziel |
|--------|------|
| Zeit bis zum ersten Compliance-Check | < 10 Minuten nach Registrierung |
| Check-Durchlaufzeit | < 60 Sekunden pro Dokument |
| Onboarding-Completion-Rate | > 70 % |

### Engagement

| Metrik | Ziel |
|--------|------|
| Wiederkehrende Nutzung | ≥ 3 Checks/Woche je aktivem Nutzer |
| Eskalationsrate | < 20 % (AI löst 80 % autonom) |
| Feature Adoption V1 | > 50 % der aktiven Nutzer nutzen Report-Export |

### Satisfaction

| Metrik | Ziel |
|--------|------|
| NPS nach 30 Tagen | > 50 |
| Churn nach 90 Tagen | < 10 % |

### Business

| Metrik | Ziel |
|--------|------|
| Pilotunternehmen Phase 1 | 10 |
| Conversion Pilot → Paid | > 60 % |

---

## 8. Tech Stack

| Komponente | Technologie | Status |
|-----------|-------------|--------|
| Backend | FastAPI + Python | Aufgesetzt |
| AI-Modell | Anthropic Claude (`claude-opus-4-6`) | Integriert |
| Frontend | Next.js 14 + Tailwind CSS | Aufgesetzt |
| Datenbank & Auth | Supabase (PostgreSQL + Auth) | Aufgesetzt |
| Backend-Deploy | Railway | Konfiguriert |
| Frontend-Deploy | Vercel | Konfiguriert |
| Dokument-Parsing | PyPDF2 / python-docx | — |
| Queue / Jobs | — | Zu evaluieren |

**Architektur-Prinzip:** Agent-basiert. Jeder Workflow (Document Review, Regulation Monitor, Report Generator) ist ein eigenständiger AI-Agent mit definiertem Input/Output und Audit-Logging.

---

## 9. Go-to-Market

### Phase 1 — Energie / BESS (MVP)

- **Kanal:** Certicell-Netzwerk (direkter Zugang zu BESS-Betreibern)
- **Regulatorik-Fokus:** BNetzA, EEG, Netzzugangsverordnung
- **Ziel:** 10 Pilotunternehmen, qualitatives Feedback, Produkt-Markt-Fit
- **Pricing:** Kostenlos / stark subventioniert während Pilot

### Phase 2 — Finanzdienstleister

- **Kanal:** Wirtschaftsprüfer-Partnerschaften, Steuerberater-Netzwerke
- **Regulatorik-Fokus:** BaFin (KWG, WpIG), MaRisk, DSGVO
- **Ziel:** Erste zahlende Kunden, Referenzfälle für Vertrieb
- **Pricing:** SaaS, tier-basiert nach Nutzungsvolumen

### Phase 3 — Horizontale Ausweitung

- **Kanal:** Inbound (SEO: "DSGVO-Compliance-Tool"), direkter Vertrieb
- **Produkt:** DSGVO-Paket als Einstiegsprodukt für deutsche KMU
- **Ziel:** Skalierbares Self-Service-Modell

---

## 10. Open Questions & Risiken

| Thema | Frage / Risiko | Priorität |
|-------|---------------|-----------|
| Regulatorische Haftung | Haftet der Anbieter für fehlerhafte AI-Einschätzungen? | Hoch |
| Daten-Compliance | Verarbeitung sensibler Compliance-Dokumente in der Cloud | Hoch |
| Modell-Accuracy | Wie wird AI-Accuracy gegen Ground Truth validiert? | Hoch |
| Regulatorik-Datenbank | Wie wird die Aktualität der Regelwerke sichergestellt? | Mittel |
| Pricing | Welches Preismodell optimiert für Mittelstand-Adoption? | Mittel |
| Enterprise-Konkurrenz | Wie reagieren OneTrust / Vanta auf Markteintritt? | Niedrig |

---

*Dieses Dokument basiert auf der Marktanalyse (Bayshore, Vanta, Drata, GRC-Landschaft 2026) und der definierten Positionierungsstrategie für den deutschen Mittelstand.*
