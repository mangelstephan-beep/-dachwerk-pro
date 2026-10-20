# DachWerk Pro – aktueller Abnahmestand

Automatisch aus `module-verification.js` erzeugt. Änderungen mit `npm run status:write` übernehmen.

**2/36 Module GRÜN.** Veröffentlichung, bestandene lokale Tests und fachliche Produktionsabnahme sind getrennte Nachweise.

| Nr. | Modul | Status | Nachweis / noch offen |
|---|---|---|---|
| 01 | Kunden und Kontakte | ROT | iPhone-Abnahme offen; Desktop-Liveprüfung von Anlage, Kontakten und Wiederabruf am 19.10.2026 bestanden. |
| 02 | Projekte und Kostenstellen | ROT | iPhone-Abnahme und Live-Prüfung der korrigierten Leerwahl offen; Desktop-Anlage, Wechsel und Wiederabruf am 19.10.2026 bestanden. |
| 03 | Betriebs- und Lohnkosten | GRÜN | test-operating-capacity.cjs + Live-HTTP: 3096 Produktivstunden, Kostensatz 100, AGK 0, Angebotswert 275 und Wiederabruf |
| 04 | Leistungsverzeichnisse | GRÜN | Live-Produktion 19.10.2026 im Testdach C: zentrale Positionsanlage und Wiederabruf, dreistufige Gliederung, Hauptleistung 180 EUR, Bedarf 100 EUR separat, Nachtrag 90 EUR; Hauptangebotsversionen 180/280 EUR und getrennte Nachtragsfassung 90 EUR. Ergänzend test-lv-structure.cjs für fünf Ebenen, Versionssperren und Aufmaß-/Rechnungsbezug. |
| 05 | Importmanager | ROT | iPhone-Abnahme und Originaldownload auf freigegebenem iPhone/HP offen; XLS vor Excel 97 sowie weitere GAEB-Phasen/-Versionen fehlen weiterhin. CSV, PDF/OCR, GAEB X83 XML 3.3, XLSX und XLS BIFF8 live importiert und nach Reload wiedergefunden. |
| 06 | LV- und Vertragsprüfung | ROT | Live-Abnahme der automatischen LV-Datenprüfung; weitergehende Vertrags- und Regelwerksprüfungen. |
| 07 | Kalkulation und Zielpreis | ROT | Live-Abnahme von Rabatt, Zielpreis, Grund-/Alternativ- und Bedarfspositionen. |
| 08 | EFB und Kalkulationsblätter | ROT | Kostenartenzuschläge und Kalkulationsnachweis lokal geprüft; Live-Abnahme und amtliche EFB 221/222/223 mit Feldmapping offen. |
| 09 | Leistungskatalog und Zeitwerte | ROT | Fachkatalog, Nutzungsrechte |
| 10 | Material und Systeme | ROT | Preisbindung, Systemnachweise und Herstellerlinks lokal geprüft; Live- und Geräteabnahme sowie fachliche Prüfung der konkreten Systeme offen. |
| 11 | Lieferanten und Preisvergleich | ROT | Gebindeumrechnung, Rabatt/Fracht und Preisbindung lokal geprüft; automatische Händleranbindungen sowie Live- und iPhone-Abnahme offen. |
| 12 | DATANORM und Preislisten | ROT | CSV-/Excel-Preislisten mit Blatt-/Spaltenzuordnung und Prüfpreisen lokal geprüft; DATANORM 4/5-Direktimport sowie Live- und Geräteabnahme offen. |
| 13 | Angebote | ROT | Live-Abnahme der Versionen und Angebotsvarianten; Versand und Angebotsbedingungen. |
| 14 | Auftrag und Bestätigung | ROT | Live-Abnahme der Auftragsbestätigung, Varianten- und Nachtragsbezüge; weitere Auftragsänderungen. |
| 15 | Schriftverkehr und E-Mail | ROT | Mailkonto, Versand, Rücklauf, Zustellnachweis |
| 16 | Einkauf und Bestellung | ROT | Mehrere Materialien pro Position, Bestellversand |
| 17 | Liefertermine und Logistik | ROT | Automatische Terminwarnung, Toleranzregeln |
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
| 31 | Nachkalkulation und Controlling | ROT | Gemeinkosten, Vollständigkeitskontrolle |
| 32 | DMS, Scanner, OCR und Barcode | ROT | Scanner/OCR/Barcode, Backup/Wiederherstellung und produktive Geräteabnahme; zentrale Originalablage bis 64 MB implementiert. |
| 33 | Technik und Wissensregister | ROT | Lizenzierte Quellen und Versionsprüfungen |
| 34 | Ausschreibungsmonitor | ROT | Automatische Quellenabfrage/Übersicht |
| 35 | Sachverständigenwesen | ROT | Vollständige Gutachten-/Honorarvorlagen |
| 36 | Energieberatung | ROT | Energieausweis, Berechnungsverfahren, Förderprüfung |
