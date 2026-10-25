# DachWerk Pro – aktueller Abnahmestand

Automatisch aus `module-verification.js` erzeugt. Änderungen mit `npm run status:write` übernehmen.

**5/36 Module GRÜN.** Veröffentlichung, bestandene lokale Tests und fachliche Produktionsabnahme sind getrennte Nachweise.

| Nr. | Modul | Status | Nachweis / noch offen |
|---|---|---|---|
| 01 | Kunden und Kontakte | ROT | iPhone-Abnahme offen; Desktop-Liveprüfung von Anlage, Kontakten und Wiederabruf am 19.10.2026 bestanden. |
| 02 | Projekte und Kostenstellen | ROT | iPhone-Abnahme und Live-Prüfung der korrigierten Leerwahl offen; Desktop-Anlage, Wechsel und Wiederabruf am 19.10.2026 bestanden. |
| 03 | Betriebs- und Lohnkosten | GRÜN | test-operating-capacity.cjs + Live-HTTP: 3096 Produktivstunden, Kostensatz 100, AGK 0, Angebotswert 275 und Wiederabruf |
| 04 | Leistungsverzeichnisse | GRÜN | Live-Produktion 19.10.2026 im Testdach C: zentrale Positionsanlage und Wiederabruf, dreistufige Gliederung, Hauptleistung 180 EUR, Bedarf 100 EUR separat, Nachtrag 90 EUR; Hauptangebotsversionen 180/280 EUR und getrennte Nachtragsfassung 90 EUR. Ergänzend test-lv-structure.cjs für fünf Ebenen, Versionssperren und Aufmaß-/Rechnungsbezug. |
| 05 | Importmanager | ROT | iPhone-Abnahme und Originaldownload auf freigegebenem iPhone/HP offen; XLS vor Excel 97 sowie weitere GAEB-Phasen/-Versionen fehlen weiterhin. CSV, PDF/OCR, GAEB X83 XML 3.3, XLSX und XLS BIFF8 live importiert und nach Reload wiedergefunden. |
| 06 | LV- und Vertragsprüfung | ROT | Live-Abnahme der Prüfgrundlage und Erneuerungsanzeige; weitergehende Vertrags- und Regelwerksprüfungen. |
| 07 | Kalkulation und Zielpreis | GRÜN | Live-Produktion 21.10.2026 im Testdach D: H1 10 m² × 30 EUR Zielpreis abzüglich 10 % Rabatt = 270 EUR; Grundposition G1 80 EUR, Alternative A1 120 EUR separat, Bedarf B1 60 EUR separat. Kalkulationssumme 350 EUR; gewählte Angebotsvariante Alternative plus Bedarf 450 EUR. Zentrale Speicherung und vollständiger Reload bestätigen die vier Positionen und Preise. Server-/DOM-Regressionstests bestanden. |
| 08 | EFB und Kalkulationsblätter | ROT | Kostenartenzuschläge und Kalkulationsnachweis lokal geprüft; Live-Abnahme und amtliche EFB 221/222/223 mit Feldmapping offen. |
| 09 | Leistungskatalog und Zeitwerte | ROT | Fachkatalog, Nutzungsrechte |
| 10 | Material und Systeme | ROT | Preisbindung, Systemnachweise und Herstellerlinks lokal geprüft; Live- und Geräteabnahme sowie fachliche Prüfung der konkreten Systeme offen. |
| 11 | Lieferanten und Preisvergleich | ROT | Gebindeumrechnung, Rabatt, Fracht, Rechenvorschau und Einheitensperre lokal geprüft (24.10.2026); Live-/iPhone-Abnahme und automatische Händleranbindungen offen. |
| 12 | DATANORM und Preislisten | ROT | Excel-/CSV-Spaltenmapping und verbindliche Vorschau lokal geprüft; DATANORM-Parser, Live-/Geräteabnahme und reale Händlerdateien offen. |
| 13 | Angebote | ROT | Live-Abnahme der Versionen, Angebotsvarianten und Bedingungen; Mailversand über Modul 15 offen. |
| 14 | Auftrag und Bestätigung | ROT | Live-Abnahme von Auftragsbestätigung und Bedingungen; weitergehende Auftragsänderungen. |
| 15 | Schriftverkehr und E-Mail | ROT | Mailkonto, Versand, Rücklauf, Zustellnachweis |
| 16 | Einkauf und Bestellung | ROT | Mehrere Materialien pro Position, Bestellversand |
| 17 | Liefertermine und Logistik | GRÜN | Live-Produktion 21.10.2026 im Testdach D: Bestellung 100 m² mit begründeter Toleranz 98–105 m². Ohne Vereinbarung serverseitig abgewiesen. Termin 20.10. als überfällig angezeigt; 60 m² ergeben 40 m² offen, weitere 38 m² schließen innerhalb der Minderlieferung ab und zeigen 2 m² Differenz. Weitere 8 m² (gesamt 106) abgewiesen, 7 m² (gesamt 105) angenommen. Projektwechsel trennt Bestände. Automatische Terminwarnungen erfolgen beim Öffnen der Oberfläche; heutige/fehlende Termine und Grenzen zusätzlich im Server-/DOM-Test geprüft. Kein externer Mail-/Pushversand. |
| 18 | Personal und Termine | ROT | Kalenderdarstellung, Teilzeitschichten, sensible Stammdaten, DATEV/SV |
| 19 | Technische Prüfung | ROT | Validierte Fachprüfungen |
| 20 | Arbeitsschutz und Unterweisung | ROT | Vollständige Gefährdungsbeurteilung und Nachweise |
| 21 | Mobile Bauleitung | ROT | Offline-Synchronisation |
| 22 | Fotos und Mängel | ROT | Verortung, serverseitige Erinnerungen |
| 23 | Zeiten und Regie | ROT | Automatische Kundenkopie, zentrale Übergabe |
| 24 | Fremdleistungen | ROT | Vergabe- und Rechnungsabgleich |
| 25 | Aufmaß und Plan | ROT | Kalibrierte Planmessung, Drohnenmessung |
| 26 | Abnahme und Unterschrift | ROT | Zentrale Originalablage, Signaturdienste |
| 27 | Ausgangsrechnungen | ROT | Steuerliche Sonderfälle, XRechnung/ZUGFeRD |
| 28 | Eingangsrechnungen | ROT | OCR/E-Rechnung, automatischer Prüfabgleich |
| 29 | Zahlung und Kontierung | ROT | Bankanbindung, Kontenmapping |
| 30 | Monatsabschluss und Export | ROT | Monatsperioden, DATEV-Paket |
| 31 | Nachkalkulation und Controlling | GRÜN | Live-Produktion 22.10.2026 im Testdach D: geplante Einzelkosten 120 EUR + zusätzliche Gemeinkosten 200 EUR = 320 EUR. Unfreigegebene Materialrechnung wird nicht als Ist-Kosten gerechnet und als Prüfhinweis angezeigt. Freigegebene Material-/NU-Rechnungen 1000 + 180 EUR ersetzen den vorläufigen NU-Ansatz 200 EUR ohne Doppelzählung. Mit 150 EUR zusätzlichen Ist-Gemeinkosten ergeben sich 1330 EUR Ist-Kosten und bei Umsatz 0 ein vorläufiges Ergebnis -1330 EUR. Fehlende Freigaben und Belegzuordnungen werden angezeigt und nach Klärung aufgelöst. Projektwechsel trennt Kosten. Prüfung betrifft den erfassten Bestand; Buchhaltungsabgleich nicht erfasster Geschäftsvorfälle bleibt fachliche Aufgabe. |
| 32 | DMS, Scanner, OCR und Barcode | ROT | Scanner/OCR/Barcode, Backup/Wiederherstellung und produktive Geräteabnahme; zentrale Originalablage bis 64 MB implementiert. |
| 33 | Technik und Wissensregister | ROT | Lizenzierte Quellen und Versionsprüfungen |
| 34 | Ausschreibungsmonitor | ROT | Automatische Quellenabfrage/Übersicht |
| 35 | Sachverständigenwesen | ROT | Vollständige Gutachten-/Honorarvorlagen |
| 36 | Energieberatung | ROT | Energieausweis, Berechnungsverfahren, Förderprüfung |
