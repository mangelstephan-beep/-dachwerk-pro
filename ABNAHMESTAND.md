# DachWerk Pro – aktueller Abnahmestand

Automatisch aus `module-verification.js` erzeugt. Änderungen mit `npm run status:write` übernehmen.

**1/36 Module GRÜN.** Veröffentlichung, bestandene lokale Tests und fachliche Produktionsabnahme sind getrennte Nachweise.

| Nr. | Modul | Status | Nachweis / noch offen |
|---|---|---|---|
| 01 | Kunden und Kontakte | ROT | Freigabe zurückgezogen: Nutzer meldet nicht funktionierende Projektauswahl und Anlage. Erneute Prüfung im iPhone-Browser und Produktion erforderlich. |
| 02 | Projekte und Kostenstellen | ROT | Freigabe zurückgezogen: Nutzer meldet nicht funktionierende Projektauswahl und Anlage. Erneute Prüfung im iPhone-Browser und Produktion erforderlich. |
| 03 | Betriebs- und Lohnkosten | GRÜN | test-operating-capacity.cjs + Live-HTTP: 3096 Produktivstunden, Kostensatz 100, AGK 0, Angebotswert 275 und Wiederabruf |
| 04 | Leistungsverzeichnisse | ROT | Prüfung dieser Erweiterung in der veröffentlichten App offen; bleibt rot. |
| 05 | Importmanager | ROT | Produktiver Import und iPhone-Abnahme; Scan/OCR, XLS, weitere GAEB-Phasen und -Versionen. PDF-Textprüfung ist implementiert, noch nicht produktiv abgenommen. |
| 06 | LV- und Vertragsprüfung | ROT | Live-Abnahme der automatischen LV-Datenprüfung; weitergehende Vertrags- und Regelwerksprüfungen. |
| 07 | Kalkulation und Zielpreis | ROT | Live-Abnahme von Rabatt, Zielpreis, Grund-/Alternativ- und Bedarfspositionen. |
| 08 | EFB und Kalkulationsblätter | ROT | EFB 221/222/223 mit Feldmapping |
| 09 | Leistungskatalog und Zeitwerte | ROT | Fachkatalog, Nutzungsrechte |
| 10 | Material und Systeme | ROT | Systemkompatibilität, Herstellerunterlagen |
| 11 | Lieferanten und Preisvergleich | ROT | Automatische Händleranbindungen, Gebindeumrechnung |
| 12 | DATANORM und Preislisten | ROT | DATANORM-Parser, Excel-Spaltenmapping |
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
