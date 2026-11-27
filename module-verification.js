(function(root){
 'use strict';
 // Sole current source of module acceptance status. Tests do not grant production approval.
 const modules={
  "customers": {
    "number": 1,
    "name": "Kunden und Kontakte",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Frühere Prüfung: Live 19.10.2026: Testkunde mit Haupt- und Zusatzkontakt zentral gespeichert; Zuordnung zum neuen Testprojekt und Wiederabruf nach Seitenreload bestätigt. iPhone-Abnahme weiterhin offen. Weiter offen, nicht Teil dieser Freigabe: iPhone-Abnahme offen; Desktop-Liveprüfung von Anlage, Kontakten und Wiederabruf am 19.10.2026 bestanden. Erweiterung 14.11.2026 (Kundennummer, PLZ/Land, USt-IdNr., Kundenart, Kundenübersicht, vollständige Anschrift in Druck/PDF) nur lokal geprüft; Live- und iPhone-Abnahme nach docs/MODUL01_KUNDENSTAMM_2026-11-14.md offen.",
    "remaining": ""
  },
  "projects": {
    "number": 2,
    "name": "Projekte und Kostenstellen",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Frühere Prüfung: Live 19.10.2026: Testprojekt mit Kunde und Kostenstelle gespeichert; Wechsel zwischen Projekten und Auswahl nach Seitenreload bestätigt. iPhone-Abnahme und Live-Prüfung der korrigierten Leerwahl weiterhin offen. Weiter offen, nicht Teil dieser Freigabe: iPhone-Abnahme und Live-Prüfung der korrigierten Leerwahl offen; Desktop-Anlage, Wechsel und Wiederabruf am 19.10.2026 bestanden. Erweiterung 14.11.2026 (Übernahme von Kundenanschrift/Leitweg-ID, eindeutige Kostenstelle, Kundenwechsel nach Belegen gesperrt, sortierte Kunden-/Projektlisten) nur lokal geprüft; Abnahme nach docs/MODUL02_PROJEKTE_2026-11-14.md offen.",
    "remaining": ""
  },
  "operating": {
    "number": 3,
    "name": "Betriebs- und Lohnkosten",
    "verified": true,
    "checkedAt": "2026-10-13",
    "evidence": "test-operating-capacity.cjs + Live-HTTP: 3096 Produktivstunden, Kostensatz 100, AGK 0, Angebotswert 275 und Wiederabruf",
    "remaining": ""
  },
  "lv": {
    "number": 4,
    "name": "Leistungsverzeichnisse",
    "verified": true,
    "checkedAt": "2026-10-19",
    "evidence": "Live-Produktion 19.10.2026 im Testdach C: zentrale Positionsanlage und Wiederabruf, dreistufige Gliederung, Hauptleistung 180 EUR, Bedarf 100 EUR separat, Nachtrag 90 EUR; Hauptangebotsversionen 180/280 EUR und getrennte Nachtragsfassung 90 EUR. Ergänzend test-lv-structure.cjs für fünf Ebenen, Versionssperren und Aufmaß-/Rechnungsbezug.",
    "remaining": ""
  },
  "imports": {
    "number": 5,
    "name": "Importmanager",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Frühere Prüfung: Live-Produktion 19.10.2026 im Testdach C: CSV zuvor bestanden; PDF mit 1,1 MB als gesperrte Prüfquelle, GAEB X83 XML 3.3 mit Position 01.02.9501 und 12,5 m² samt Gliederung sowie XLSX mit Spaltenzuordnung und Position 9601 mit 12,5 m² übernommen. Alle vier Quellen nach vollständigem Neuladen im zentralen Importjournal vorhanden; gespeicherte Excel-Quelldaten erneut geöffnet. Keine Fachfreigabe und kein Versand. PR #35 ergänzt abbrechbares Einlesen und Schutz vor verspäteten Ergebnissen; test-import-lifecycle.cjs bestanden. 100-seitiges PDF live eingelesen und Vorschau danach bedienbar; Abbruch selbst nur automatisiert geprüft. Live-OCR 19.10.2026 (PR #37): bildbasiertes PDF ohne Textschicht als gesperrte Quelle eingelesen; ABNAHME 12345 und 12,50 m2 Abdichtung erkannt, zentral gespeichert und nach Reload mit OCR-Nachweis erneut geöffnet. Keine automatische LV-Menge. XLS BIFF8 live (PR #39): Position 009701 mit 12,5 m² und vier gesperrte Hinweise zentral gespeichert, nach Reload im Journal vorhanden. Originaldownload im Prüf-Browser durch bestehende Geräteregel gesperrt; Downloadtyp und Originalbytes automatisiert geprüft. Ergänzung 20.10.2026: CSV-Textquelle im Journal, geschützter UTF-8-Download für CSV/GAEB und fremde XML-Positionen als gesperrte Prüfung; lokale Regressionstests, Live-Abnahme offen. Vollständige Testsuite, Syntaxprüfung und Build bestanden. Weiter offen, nicht Teil dieser Freigabe: iPhone-Abnahme und Originaldownload auf freigegebenem iPhone/HP offen. CSV, PDF/OCR, GAEB X83 XML 3.3, XLSX und XLS BIFF8 live importiert und nach Reload wiedergefunden. Erweiterung 14.11.2026 (GAEB X81/X82/X84/X86 und XML 3.2, Preise nur als ungeprüfter Zielpreis, Positionen ohne Menge als Prüfvorgang; XLS Excel 5.0/95 und Excel 2.0–4.0) nur automatisiert geprüft; Live- und iPhone-Abnahme nach docs/MODUL05_IMPORT_2026-11-14.md offen. Weiterhin nicht unterstützt: GAEB 90/2000, GAEB XML 3.0/3.1, Nebenangebote X85.",
    "remaining": ""
  },
  "contract": {
    "number": 6,
    "name": "LV- und Vertragsprüfung",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Frühere Prüfung: Automatische LV-Befunde mit gespeicherter Prüfgrundlage und Kennzeichnung veralteter Entscheidungen lokal geprüft. Weiter offen, nicht Teil dieser Freigabe: Live-Abnahme der Prüfgrundlage und Erneuerungsanzeige. Erweiterung 14.11.2026 (LV-Datenprüfung v3: Pauschal-/Stückmengen, kurze und doppelte Leistungstexte, bauseits, Leitfabrikat/Gleichwertigkeit, Aufwand/Stundenlohn, Einschlussklauseln, Bedarfspositionen, Wahlgruppen) nur automatisiert geprüft; Abnahme nach docs/MODUL06_LV_PRUEFUNG_2026-11-14.md offen. Vertragsbedingungen (VOB/B, Fristen, Sicherheiten, Vertragsstrafe) und Regelwerksbezüge weiterhin nur über die angegebene Quelle manuell.",
    "remaining": ""
  },
  "calculation": {
    "number": 7,
    "name": "Kalkulation und Zielpreis",
    "verified": true,
    "checkedAt": "2026-10-21",
    "evidence": "Live-Produktion 21.10.2026 im Testdach D: H1 10 m² × 30 EUR Zielpreis abzüglich 10 % Rabatt = 270 EUR; Grundposition G1 80 EUR, Alternative A1 120 EUR separat, Bedarf B1 60 EUR separat. Kalkulationssumme 350 EUR; gewählte Angebotsvariante Alternative plus Bedarf 450 EUR. Zentrale Speicherung und vollständiger Reload bestätigen die vier Positionen und Preise. Server-/DOM-Regressionstests bestanden.",
    "remaining": ""
  },
  "efb": {
    "number": 8,
    "name": "EFB und Kalkulationsblätter",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Kostenartenzuschläge und Kalkulationsnachweis lokal geprüft. Erweiterung 14.11.2026: EFB-Preis 221/222/223 als Übertragungshilfe mit Feldzuordnung, Druck und CSV (223) nur automatisiert geprüft; Live-/iPhone-Abnahme und fachlicher Abgleich mit einem echten Formblatt aus Vergabeunterlagen nach docs/MODUL08_EFB_2026-11-14.md offen. Mittellohn-Aufteilung (1.1–1.3) und Aufteilung BGK/AGK/W&G bei Kostenartenzuschlägen werden nicht erfasst.",
    "remaining": ""
  },
  "services": {
    "number": 9,
    "name": "Leistungskatalog und Zeitwerte",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Fachkatalog, Nutzungsrechte",
    "remaining": ""
  },
  "materials": {
    "number": 10,
    "name": "Material und Systeme",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Preisbindung, Systemnachweise und Herstellerlinks lokal geprüft. Erweiterung 14.11.2026 (Prüfliste mit Fristwarnung 14 Tage, Preissprung ab 10 %, Verwendung im Projekt, Systemübersicht, CSV) nur automatisiert geprüft; Live- und Geräteabnahme nach docs/MODUL10_MATERIAL_2026-11-14.md sowie fachliche Prüfung der konkreten Systeme offen.",
    "remaining": ""
  },
  "suppliers": {
    "number": 11,
    "name": "Lieferanten und Preisvergleich",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Frühere Prüfung: Server-/DOM-Tests: Gebindeumrechnung, deutsche Dezimalwerte, sofortige Rechenvorschau, unveränderte Eingaben bei fehlgeschlagenem Speichern und gesperrte Übernahme nach Änderung der Artikeleinheit. Vollständige Testsuite, Syntaxprüfung und Build bestanden. Details: docs/LIEFERANTENPREISE_2026-10-24.md. Weiter offen, nicht Teil dieser Freigabe: Gebindeumrechnung, Rabatt, Fracht, Rechenvorschau und Einheitensperre lokal geprüft (24.10.2026). Erweiterung 14.11.2026 (Preisvergleich je Artikel mit Bestpreis und Ersparnis ab 3 %, nur neuester Preis je Lieferant, Zurückziehen mit Grund, Lieferantenübersicht, doppelte Lieferanten gesperrt, CSV) nur automatisiert geprüft; Live-/iPhone-Abnahme nach docs/MODUL11_LIEFERANTEN_2026-11-14.md und automatische Händleranbindungen offen.",
    "remaining": ""
  },
  "pricelists": {
    "number": 12,
    "name": "DATANORM und Preislisten",
    "verified": true,
    "checkedAt": "2026-11-14",
    "evidence": "Freigabe Stephan Mangel 14.11.2026 nach Live-Prüfung auf www.dachwerkpro.de: iPhone in Ordnung, HP mit freigegeben. Geprüft mit den Testdateien docs/testdateien/datanorm4 (DATANORM.001 + DATPREIS.001 + DATANORM.RAB, CP850; TD1001 je m², TD1003 je m). Vorher alle automatischen Tests und Live-Aufruf aller Module bestanden. Excel-/CSV-Spaltenmapping mit verbindlicher Vorschau. Preise der Testdateien sind Platzhalter und werden später überarbeitet; DATANORM 5 und Langtexte (T-Sätze) nicht Teil dieser Abnahme.",
    "remaining": ""
  },
  "offers": {
    "number": 13,
    "name": "Angebote",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Frühere Prüfung: Zahlungs-/Ausführungsbedingungen, Gültigkeit, Hinweise und getrennte Haupt-/Nachtragsformulare sowie unveränderliche Ausgabe lokal geprüft. Weiter offen, nicht Teil dieser Freigabe: Live-Abnahme der Versionen, Angebotsvarianten und Bedingungen; Mailversand über Modul 15 offen.",
    "remaining": ""
  },
  "orders": {
    "number": 14,
    "name": "Auftrag und Bestätigung",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Frühere Prüfung: Angebotsbedingungen und Auftragshinweise werden mit unveränderlicher Auftragsbestätigung gespeichert und gedruckt; Server-/DOM-Test bestanden. Weiter offen, nicht Teil dieser Freigabe: Live-Abnahme von Auftragsbestätigung und Bedingungen; weitergehende Auftragsänderungen. Erweitert 15.11.2026: Pauschalpreis im Hauptauftrag (Häkchen + Pauschalsumme) – Abschlag schon vor Aufmaß, Abschlags-/Teil-/Schlussrechnung in % der Pauschalsumme ohne Aufmaß; Einheitspreis weiter nach Aufmaß. Abgedeckt durch test-ablauf-termin-abnahme.cjs.",
    "remaining": ""
  },
  "correspondence": {
    "number": 15,
    "name": "Schriftverkehr und E-Mail",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Mailkonto, Versand, Rücklauf, Zustellnachweis",
    "remaining": ""
  },
  "purchase": {
    "number": 16,
    "name": "Einkauf und Bestellung",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Mehrere Materialien pro Position, Bestellversand",
    "remaining": ""
  },
  "logistics": {
    "number": 17,
    "name": "Liefertermine und Logistik",
    "verified": true,
    "checkedAt": "2026-10-21",
    "evidence": "Live-Produktion 21.10.2026 im Testdach D: Bestellung 100 m² mit begründeter Toleranz 98–105 m². Ohne Vereinbarung serverseitig abgewiesen. Termin 20.10. als überfällig angezeigt; 60 m² ergeben 40 m² offen, weitere 38 m² schließen innerhalb der Minderlieferung ab und zeigen 2 m² Differenz. Weitere 8 m² (gesamt 106) abgewiesen, 7 m² (gesamt 105) angenommen. Projektwechsel trennt Bestände. Automatische Terminwarnungen erfolgen beim Öffnen der Oberfläche; heutige/fehlende Termine und Grenzen zusätzlich im Server-/DOM-Test geprüft. Kein externer Mail-/Pushversand.",
    "remaining": ""
  },
  "personnel": {
    "number": 18,
    "name": "Personal und Termine",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Kalenderdarstellung, Teilzeitschichten, sensible Stammdaten, DATEV/SV",
    "remaining": ""
  },
  "technical": {
    "number": 19,
    "name": "Technische Prüfung",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Validierte Fachprüfungen",
    "remaining": ""
  },
  "safety": {
    "number": 20,
    "name": "Arbeitsschutz und Unterweisung",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Vollständige Gefährdungsbeurteilung und Nachweise",
    "remaining": ""
  },
  "diary": {
    "number": 21,
    "name": "Mobile Bauleitung",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Offline-Synchronisation",
    "remaining": ""
  },
  "defects": {
    "number": 22,
    "name": "Fotos und Mängel",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Verortung, serverseitige Erinnerungen",
    "remaining": ""
  },
  "times": {
    "number": 23,
    "name": "Zeiten und Regie",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Nachgebaut 15.11.2026: Stundenlohnarbeiten (Regie) mit Verrechnungssatz und Kundenbestätigung werden einmalig in die nächste Rechnung übernommen; nicht abgerechnete Regie blockiert den Projektabschluss. Freigabe Stephan Mangel 15.11.2026 nach bestandenem Ablauftest test-ablauf-termin-abnahme.cjs (Termin, Besuchstermin, Bestandsaufnahme, Angebot, Auftrag, Abschlags- und Teilrechnung, unterschriebener Stundenzettel, Abnahme, Schlussrechnung, Zahlung mit Skonto/Einbehalt, Abschluss) und test-regie-reverse-charge.cjs. Weiter offen, nicht Teil dieser Freigabe: Automatische Kundenkopie, zentrale Übergabe",
    "remaining": ""
  },
  "subcontracts": {
    "number": 24,
    "name": "Fremdleistungen",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Vergabe- und Rechnungsabgleich",
    "remaining": ""
  },
  "measurements": {
    "number": 25,
    "name": "Aufmaß und Plan",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Kalibrierte Planmessung, Drohnenmessung",
    "remaining": ""
  },
  "acceptance": {
    "number": 26,
    "name": "Abnahme und Unterschrift",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Zentrale Originalablage, Signaturdienste",
    "remaining": ""
  },
  "invoices": {
    "number": 27,
    "name": "Ausgangsrechnungen",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Nachgebaut 15.11.2026: Rechnung nach § 13b UStG ohne USt (Kunde als bauleistender Unternehmer markiert, USt-IdNr. Pflicht, Hinweistext) und Regiepositionen. Freigabe Stephan Mangel 15.11.2026 nach bestandenem Ablauftest test-ablauf-termin-abnahme.cjs (Termin, Besuchstermin, Bestandsaufnahme, Angebot, Auftrag, Abschlags- und Teilrechnung, unterschriebener Stundenzettel, Abnahme, Schlussrechnung, Zahlung mit Skonto/Einbehalt, Abschluss) und test-regie-reverse-charge.cjs. Weiter offen, nicht Teil dieser Freigabe: Mahnwesen, Steuerliche Sonderfälle, XRechnung/ZUGFeRD Erweitert 15.11.2026: Pauschalpreis im Hauptauftrag (Häkchen + Pauschalsumme) – Abschlag schon vor Aufmaß, Abschlags-/Teil-/Schlussrechnung in % der Pauschalsumme ohne Aufmaß; Einheitspreis weiter nach Aufmaß. Abgedeckt durch test-ablauf-termin-abnahme.cjs.",
    "remaining": ""
  },
  "incoming": {
    "number": 28,
    "name": "Eingangsrechnungen",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: OCR/E-Rechnung, automatischer Prüfabgleich",
    "remaining": ""
  },
  "payments": {
    "number": 29,
    "name": "Zahlung und Kontierung",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Nachgebaut 15.11.2026: Buchungsarten Skonto / Abzug (mit Grund) und Sicherheitseinbehalt (mit Frist); Restsumme ausbuchen oder auf Zwischenkonto; Kontovorschläge SKR03 (8736/8730 Skonto, 8700, 1590), mit Steuerberater abzustimmen; Abschluss trotz offenem Einbehalt, spätere Auszahlung auch im abgeschlossenen Projekt. Freigabe Stephan Mangel 15.11.2026 nach bestandenem Ablauftest test-ablauf-termin-abnahme.cjs (Termin, Besuchstermin, Bestandsaufnahme, Angebot, Auftrag, Abschlags- und Teilrechnung, unterschriebener Stundenzettel, Abnahme, Schlussrechnung, Zahlung mit Skonto/Einbehalt, Abschluss) und test-payment-settlement.cjs. Weiter offen, nicht Teil dieser Freigabe: Bankanbindung, Kontenmapping",
    "remaining": ""
  },
  "closing": {
    "number": 30,
    "name": "Monatsabschluss und Export",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Monatsperioden, DATEV-Paket",
    "remaining": ""
  },
  "controlling": {
    "number": 31,
    "name": "Nachkalkulation und Controlling",
    "verified": true,
    "checkedAt": "2026-10-22",
    "evidence": "Live-Produktion 22.10.2026 im Testdach D: geplante Einzelkosten 120 EUR + zusätzliche Gemeinkosten 200 EUR = 320 EUR. Unfreigegebene Materialrechnung wird nicht als Ist-Kosten gerechnet und als Prüfhinweis angezeigt. Freigegebene Material-/NU-Rechnungen 1000 + 180 EUR ersetzen den vorläufigen NU-Ansatz 200 EUR ohne Doppelzählung. Mit 150 EUR zusätzlichen Ist-Gemeinkosten ergeben sich 1330 EUR Ist-Kosten und bei Umsatz 0 ein vorläufiges Ergebnis -1330 EUR. Fehlende Freigaben und Belegzuordnungen werden angezeigt und nach Klärung aufgelöst. Projektwechsel trennt Kosten. Prüfung betrifft den erfassten Bestand; Buchhaltungsabgleich nicht erfasster Geschäftsvorfälle bleibt fachliche Aufgabe.",
    "remaining": ""
  },
  "documents": {
    "number": 32,
    "name": "DMS, Scanner, OCR und Barcode",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Scanner/OCR/Barcode, Backup/Wiederherstellung und produktive Geräteabnahme; zentrale Originalablage bis 64 MB implementiert.",
    "remaining": ""
  },
  "knowledge": {
    "number": 33,
    "name": "Technik und Wissensregister",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Lizenzierte Quellen und Versionsprüfungen",
    "remaining": ""
  },
  "tenders": {
    "number": 34,
    "name": "Ausschreibungsmonitor",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Automatische Quellenabfrage/Übersicht",
    "remaining": ""
  },
  "expert": {
    "number": 35,
    "name": "Sachverständigenwesen",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Vollständige Gutachten-/Honorarvorlagen",
    "remaining": ""
  },
  "energy": {
    "number": 36,
    "name": "Energieberatung",
    "verified": true,
    "checkedAt": "2026-11-15",
    "evidence": "Freigabe Stephan Mangel 15.11.2026: live auf www.dachwerkpro.de geöffnet und bearbeitet; Gesamtablauf am 15.11.2026 mit Beispielprojekt Flachdach (Kunde bis Controlling) geprüft. Weiter offen, nicht Teil dieser Freigabe: Energieausweis, Berechnungsverfahren, Förderprüfung",
    "remaining": ""
  }
};
 const api={modules,isVerified:id=>modules[id]?.verified===true};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPVerification=api;
})(typeof window!=='undefined'?window:globalThis);
