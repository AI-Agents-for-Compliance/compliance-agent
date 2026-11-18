# Interviewleitfaden: Problem- und Zielgruppen-Validierung (NIS2-Agent)

Stand: 2026-11-18 · Status: Entwurf · Zweck: 10 echte Gespräche, bevor das MVP festgelegt wird

> **Wichtig:** Alle Hypothesen unten stammen aus öffentlichen Quellen (meist
> Berater- und Anbieterseiten) und aus *simulierten* Interviews. Nichts davon
> ist bei echten Kunden bestätigt. Dieses Dokument soll genau das ändern.

## 1. Ziel

Herausfinden, **wer** ein NIS2-Problem hat, das teuer genug ist, um dafür zu
zahlen, **was** genau dieses Problem ist und **was die Person heute dagegen tut**.
Es geht nicht darum, unser Produkt zu verkaufen oder Zustimmung einzusammeln.

Ein Gespräch ist erfolgreich, wenn wir einen konkreten, vergangenen Fall
verstehen, nicht wenn die Person „klingt interessant“ sagt.

## 2. Hypothesen und was sie widerlegt

| # | Hypothese | Widerlegt, wenn … |
|---|---|---|
| H1 | Zulieferer-Mittelständler (100–1.000 MA) erhalten wiederkehrend Kunden-Fragebögen zu Informationssicherheit/NIS2 und das kostet sie spürbar Zeit. | Weniger als 3 von 4 Zulieferern berichten ungefragt von einem Fragebogen in den letzten 12 Monaten mit mindestens einer Woche Aufwand. |
| H2 | Viele wissen nicht, ob sie betroffen sind oder haben sich nicht registriert, und wünschen sich eine klare Antwort. | Die Mehrheit weiß es und hat sich bereits mit Hilfe eines Beraters sauber eingeordnet. |
| H3 | Maßnahmen sind oft vorhanden, aber nicht belegt. Nachweise zu sammeln ist das eigentliche Problem. | Die Befragten haben Nachweise bereits geordnet (z. B. ISMS-Tool im Einsatz) oder nennen etwas anderes als größte Hürde. |
| H4 | Die Geschäftsführung gibt das Budget frei, die IT-Leitung arbeitet damit. | Niemand kann benennen, wer freigibt, oder es gibt kein Budget. |
| H5 | Lesezugriff auf den Microsoft-365-Tenant ist unter Bedingungen akzeptabel (nur lesen, EU-Hosting, AV-Vertrag). | Mehrheit lehnt jeden externen Zugriff ab oder nennt Bedingungen, die wir nicht erfüllen können. |
| H6 | Excel plus Berater ist heute die Lösung; bestehende Tools werden aus Preis- oder Integrationsgründen nicht genutzt. | Ein Großteil nutzt bereits ein Tool (z. B. Vanta, Secfix, SECJUR, DataGuard) und ist zufrieden. |
| H7 | Energie/BESS-Betreiber sind betroffen und haben einen eigenen Bedarf; Microsoft 365 ist für sie eine relevante Datenquelle. | Von 2 Energie-Gesprächen ist höchstens 1 klar betroffen, oder der Kernbedarf liegt in OT/Leitwarte statt Büro-IT. |
| H8 | Externe Berater sehen ein solches Werkzeug als Hilfe, nicht als Konkurrenz. | Berater lehnen es ab oder würden ihren Kunden davon abraten. |

## 3. Wen wir sprechen (10 Gespräche)

| Anzahl | Profil | Prüft |
|---|---|---|
| 4 | IT-Leitung oder Informationssicherheitsbeauftragte in Zulieferern (Industrie, Logistik), 100–1.000 MA | H1, H3, H5, H6 |
| 2 | Geschäftsführung in Unternehmen derselben Größe | H2, H4 |
| 2 | Externe ISB / IT-Dienstleister mit mehreren Mittelstandskunden | H8, H4 |
| 2 | Energie/BESS-Betreiber (technische Leitung oder Geschäftsführung) | H7 |

**Screening vor dem Gespräch (2 Fragen):**
1. Haben Sie in den letzten 12 Monaten einen Fragebogen oder eine Anforderung eines Kunden zu IT-Sicherheit bearbeitet? (nur Zulieferer-Gruppe)
2. Sind Sie persönlich an NIS2-Themen beteiligt, entweder umsetzend oder entscheidend?

Ausschluss: Anbieter von Compliance-Software, Studierende, Personen ohne
eigene Erfahrung mit dem Thema.

## 4. Wo wir Gesprächspartner finden

Alle Beispiele sind Ausgangspunkte und müssen geprüft werden.

- **Certicell-Netzwerk** (laut PRD vorhanden): für die 2 Energie/BESS-Gespräche. Dort zusätzlich fragen, ob ein Kontakt zu einem Berater besteht.
- **IHK und Wirtschaftsverbände** vor Ort: Webinare zu NIS2 und Lieferketten (z. B. IHK-Veranstaltungen) bieten Teilnehmerlisten, Ansprache nur nach den Regeln des Veranstalters.
- **LinkedIn:** gezielte Ansprache von IT-Leitungen und ISB in Zulieferunternehmen, kurze, ehrliche Nachricht (Vorlage unten).
- **Berater-Netzwerke und lokale IT-Dienstleister:** für die Berater-Gruppe.
- **Eigenes Netzwerk:** Einführungen über Bekannte sind die schnellste Quelle.

Ziel: 25–30 Anfragen für 10 Gespräche einplanen.

## 5. Ablauf (30 Minuten)

| Min. | Teil | Inhalt |
|---|---|---|
| 0–2 | Einstieg | Wer wir sind, Recherche statt Verkauf, Einwilligung zu Notizen, keine vertraulichen Daten nennen |
| 2–7 | Kontext | Rolle, Unternehmen (grob), Verantwortung bei NIS2 und Informationssicherheit |
| 7–17 | **Letzter konkreter Fall** | Ein Vorfall aus den letzten Monaten Schritt für Schritt: Auslöser, Beteiligte, Aufwand, Hindernisse, Ergebnis |
| 17–24 | Heutige Lösung und Geld | Was wird genutzt, was kostet es, wer zahlt, was wurde probiert und verworfen |
| 24–28 | Vertrauen und Zugriff | Bedingungen für Datenzugriff, Hosting, wer muss zustimmen |
| 28–30 | Abschluss | „Wen sollte ich noch sprechen?“, Erlaubnis für ein Folgegespräch |

## 6. Fragenkatalog

**Regel:** Nach der Vergangenheit fragen, nicht nach der Zukunft. Statt „Würden Sie …?“
immer „Wann haben Sie das zuletzt getan? Wie lief das?“

### Kontext
- Welche Rolle haben Sie bei NIS2 und Informationssicherheit im Unternehmen?
- Wissen Sie, ob Ihr Unternehmen unter NIS2 fällt? Woher? Wer hat das entschieden?
- Haben Sie sich beim BSI registriert? Wie ist das gelaufen?

### Letzter Fall
- Erzählen Sie mir vom letzten Mal, als ein Kunde oder eine Behörde einen Nachweis zu IT-Sicherheit verlangt hat. Was war der Auslöser?
- Was genau wurde verlangt? Können Sie die Art der Fragen beschreiben (ohne Details zu nennen)?
- Wer war beteiligt? Wie viele Stunden oder Tage hat das insgesamt gekostet?
- Was war der schwierigste Teil? Woher kamen die Antworten und Belege?
- Was ist schiefgelaufen oder hat sich verzögert? Was war die Folge?
- Wie oft passiert so etwas im Jahr?

### Heutige Lösung und Geld
- Was nutzen Sie dafür heute? (Excel, Berater, Tool, Vorlagen)
- Was kostet das, in Zeit und in Euro? Wer bezahlt das?
- Haben Sie schon ein Tool ausprobiert oder gekauft? Was hat gefehlt? Warum nicht weiter genutzt?
- Wenn Sie heute Budget freigeben müssten: Wer entscheidet? Was braucht diese Person als Nachweis?
- Was haben Sie bereits für NIS2 ausgegeben?

### Vertrauen und Zugriff
- Wann haben Sie zuletzt einem externen Dienst Lesezugriff auf Ihre IT-Systeme gegeben? Was musste dafür erfüllt sein?
- Wer muss dem zustimmen (IT, Datenschutz, Geschäftsführung)? Wie lange dauert das erfahrungsgemäß?
- Welche Bedingungen an Hosting und Datenverarbeitung hätten Sie?

### Nur für Berater
- Wie viele Mandanten betreuen Sie zu NIS2? Wie läuft Ihre Arbeit pro Mandant ab?
- Welche Schritte wiederholen Sie bei jedem Mandanten?
- Wie würden Sie reagieren, wenn Ihre Kunden ein Selbstbedienungs-Tool nutzen?

### Nur für Energie/BESS
- Wie haben Sie geklärt, ob NIS2 und das EnWG für Sie gelten? Wer hat Ihnen das gesagt?
- Welche Systeme sind für die Sicherheit entscheidend: Büro-IT, Leitwarte, Speichersteuerung? Was davon läuft in Microsoft 365?
- Wie gehen Sie mit der Doppelregulierung um? Was ist unklar?

## 7. Was wir nicht tun

- Das Produkt oder eine Funktion erklären oder vorführen, bevor die Fallgeschichte erzählt ist.
- Suggestivfragen („Wäre das nicht hilfreich?“) oder Fragen nach Meinungen über Hypothetisches.
- Höflichkeit als Zustimmung werten. „Klingt interessant“ ist kein Signal.
- Preise nennen. Wir fragen nach heutigen Kosten, nicht nach Zahlungsbereitschaft für unser Produkt.
- Echte Namen, Firmen oder vertrauliche Daten **im Repo** speichern.

## 8. Auswertung

Je Gespräch ein Bogen (außerhalb des Repos, mit Pseudonym wie „Z1“ für Zulieferer,
„G2“ für Geschäftsführung, „B1“ für Berater, „E1“ für Energie):

| Feld | Inhalt |
|---|---|
| Rolle, Größe, Branche | grob, ohne Firmennamen |
| Konkreter Fall | Auslöser, Ablauf, Dauer, Beteiligte |
| Workaround | was heute genutzt wird, Kosten |
| Häufigkeit | wie oft pro Jahr |
| Zitate | wörtlich, 2–3 pro Gespräch |
| Signalstärke | siehe unten |
| Hypothesen | je H1–H8: stützt / widerlegt / offen |

**Starke Signale:** zahlt bereits für eine Lösung oder Beratung, nennt ein Budget,
nennt die entscheidende Person, stellt einen echten (anonymisierten) Fragebogen
oder Testzugang bereit, vereinbart ein Folgegespräch.
**Schwache Signale:** „Klingt interessant“, Interesse an einer Demo, Lob für die Idee.

## 9. Entscheidungsregeln nach 10 Gesprächen (Vorschlag, bitte anpassen)

- **Zielgruppe Zulieferer gilt als bestätigt**, wenn H1 hält und mindestens 3 Gesprächspartner ein starkes Signal zeigen.
- **Zahlungsbereitschaft ist plausibel**, wenn mindestens 3 ein heutiges Budget oder bezahlte Beratung nennen.
- **Pilot-Kandidaten:** mindestens 3 bereit, einen echten Fall oder einen Testzugang einzubringen.
- **Energie/BESS wird Einstieg nur**, wenn mindestens 1 der 2 Energie-Gespräche klar betroffen ist und der Bedarf in der Büro-IT liegt. Sonst bleibt es eine spätere Erweiterung.
- **Berater als Kanal**, wenn beide Berater das Werkzeug als Entlastung sehen und mehrere Mandanten parallel nennen.

Nach der Auswertung wird das MVP (Zielgruppe, Angebot, Outcome) in einem eigenen Dokument festgeschrieben.

## 10. Annahmen aus den simulierten Interviews, die geprüft werden müssen

- Kunden schicken Fragebögen mit Fristen von rund drei Wochen und rund 80 Fragen. *(Zahlen erfunden.)*
- Geschäftsführung registrierte sich nicht, weil unklar war, ob das Unternehmen betroffen ist. *(Plausibel, nicht belegt.)*
- Die Leitwarte und die Speichersteuerung von BESS-Betreibern hängen nicht an Microsoft 365. *(Annahme.)*
- Externe Berater sehen Selbstbedienungs-Tools als Konkurrenz, wenn sie keine Mandantenansicht haben. *(Annahme.)*
- Bestehende Tools scheitern an Integrationen und Preis. *(Aus G2-Bewertungen, nicht aus dem deutschen Mittelstand.)*
- Ob NIS2 und das EnWG für Batteriespeicher gelten, ist **offen** und muss rechtlich geklärt werden.

## 11. Datenschutz bei den Gesprächen

- Einwilligung zu Notizen am Anfang einholen; Aufnahmen nur mit ausdrücklicher Zustimmung.
- Keine personenbezogenen Daten und keine vertraulichen Firmendaten im Repo.
- Notizen nur pseudonymisiert und mit der Erlaubnis zur Auswertung aufbewahren; Löschfrist vorab festlegen.
- Auf Wunsch Zusammenfassung an die Gesprächspartner schicken.

## 12. Kontaktvorlage (kurz)

> Hallo [Name], ich arbeite an einem Werkzeug, das Mittelständlern den NIS2-Papierkram
> erleichtern soll, und führe dazu Recherchegespräche. Es ist **kein Verkaufsgespräch**.
> Ich würde gern 30 Minuten hören, wie Sie zuletzt einen Sicherheitsnachweis für einen
> Kunden oder eine Behörde erstellt haben und was daran schwierig war. Ich nenne
> keine Namen und bitte Sie, keine vertraulichen Daten zu teilen. Hätten Sie diese
> oder nächste Woche Zeit?

## 13. Quellen der Hypothesen

- [Praxisbericht NIS2 nach 12 Monaten (hagel-it.de)](https://www.hagel-it.de/it-sicherheit/nis2-praxis-nach-12-monaten)
- [Lieferkette Werften Kiel (hagel-it.de)](https://www.hagel-it.de/it-sicherheit/nis2-lieferkette-werften-kiel-zulieferer-it-sicherheit)
- [Audit-Erfahrungen Hamburg (hagel-it.de)](https://www.hagel-it.de/it-sicherheit/nis2-audit-erfahrungen-top-findings-hamburg)
- [BIHK-Webinar Lieferkettensicherheit, April 2026](https://www.bihk.de/fileadmin/BIHK.de_Dateien/Webinare/IT-Sicherheit/20260428-NIS2_Lieferkettensicherheit_RAK_LAW.pdf)
- [eco-Umfrage (it-daily.net)](https://www.it-daily.net/shortnews/cybervorfaelle-mittelstand)
- [Registrierungsstand (channelpartner.de/dpa)](https://www.channelpartner.de/article/4142460/cybersicherheit-11-500-unternehmen-haben-pflicht-erfullt.html)
- [EnWG und NIS2 (OpenKRITIS)](https://www.openkritis.de/it-sicherheitsgesetz/enwg-nis2.html)
- [Haftung der Geschäftsführung (Rödl)](https://www.roedl.com/insights/compliance-mittelstand-risiken-erkennen-verantwortung-und-gestaltungsspielraum-teil-1/)
- [Anbieter-Vergleich Vanta und Drata (G2)](https://www.g2.com/compare/vanta-vs-drata)

Hinweis: Die meisten Quellen sind Berater- oder Anbieterseiten. Fristen zur
BSI-Registrierung widersprechen sich zwischen den Quellen und müssen beim BSI
geprüft werden.
