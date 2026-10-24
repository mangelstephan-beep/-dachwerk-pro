(function(root){
 'use strict';
 // Sole current source of module acceptance status. Tests do not grant production approval.
 const modules={
  "customers": {
    "number": 1,
    "name": "Kunden und Kontakte",
    "verified": false,
    "checkedAt": "2026-10-19",
    "evidence": "Live 19.10.2026: Testkunde mit Haupt- und Zusatzkontakt zentral gespeichert; Zuordnung zum neuen Testprojekt und Wiederabruf nach Seitenreload bestätigt. iPhone-Abnahme weiterhin offen.",
    "remaining": "iPhone-Abnahme offen; Desktop-Liveprüfung von Anlage, Kontakten und Wiederabruf am 19.10.2026 bestanden."
  },
  "projects": {
    "number": 2,
    "name": "Projekte und Kostenstellen",
    "verified": false,
    "checkedAt": "2026-10-19",
    "evidence": "Live 19.10.2026: Testprojekt mit Kunde und Kostenstelle gespeichert; Wechsel zwischen Projekten und Auswahl nach Seitenreload bestätigt. iPhone-Abnahme und Live-Prüfung der korrigierten Leerwahl weiterhin offen.",
    "remaining": "iPhone-Abnahme und Live-Prüfung der korrigierten Leerwahl offen; Desktop-Anlage, Wechsel und Wiederabruf am 19.10.2026 bestanden."
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
    "verified": false,
    "checkedAt": "2026-10-19",
    "evidence": "Live-Produktion 19.10.2026 im Testdach C: CSV zuvor bestanden; PDF mit 1,1 MB als gesperrte Prüfquelle, GAEB X83 XML 3.3 mit Position 01.02.9501 und 12,5 m² samt Gliederung sowie XLSX mit Spaltenzuordnung und Position 9601 mit 12,5 m² übernommen. Alle vier Quellen nach vollständigem Neuladen im zentralen Importjournal vorhanden; gespeicherte Excel-Quelldaten erneut geöffnet. Keine Fachfreigabe und kein Versand. PR #35 ergänzt abbrechbares Einlesen und Schutz vor verspäteten Ergebnissen; test-import-lifecycle.cjs bestanden. 100-seitiges PDF live eingelesen und Vorschau danach bedienbar; Abbruch selbst nur automatisiert geprüft. Live-OCR 19.10.2026 (PR #37): bildbasiertes PDF ohne Textschicht als gesperrte Quelle eingelesen; ABNAHME 12345 und 12,50 m2 Abdichtung erkannt, zentral gespeichert und nach Reload mit OCR-Nachweis erneut geöffnet. Keine automatische LV-Menge. XLS BIFF8 live (PR #39): Position 009701 mit 12,5 m² und vier gesperrte Hinweise zentral gespeichert, nach Reload im Journal vorhanden. Originaldownload im Prüf-Browser durch bestehende Geräteregel gesperrt; Downloadtyp und Originalbytes automatisiert geprüft. Ergänzung 20.10.2026: CSV-Textquelle im Journal, geschützter UTF-8-Download für CSV/GAEB und fremde XML-Positionen als gesperrte Prüfung; lokale Regressionstests, Live-Abnahme offen. Vollständige Testsuite, Syntaxprüfung und Build bestanden.",
    "remaining": "iPhone-Abnahme und Originaldownload auf freigegebenem iPhone/HP offen; XLS vor Excel 97 sowie weitere GAEB-Phasen/-Versionen fehlen weiterhin. CSV, PDF/OCR, GAEB X83 XML 3.3, XLSX und XLS BIFF8 live importiert und nach Reload wiedergefunden."
  },
  "contract": {
      "number": 6,
      "name": "LV- und Vertragsprüfung",
      "verified": false,
      "checkedAt": "2026-10-21",
      "evidence": "Automatische LV-Befunde mit gespeicherter Prüfgrundlage und Kennzeichnung veralteter Entscheidungen lokal geprüft.",
      "remaining": "Live-Abnahme der Prüfgrundlage und Erneuerungsanzeige; weitergehende Vertrags- und Regelwerksprüfungen."
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
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Kostenartenzuschläge und Kalkulationsnachweis lokal geprüft; Live-Abnahme und amtliche EFB 221/222/223 mit Feldmapping offen."
  },
  "services": {
    "number": 9,
    "name": "Leistungskatalog und Zeitwerte",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Fachkatalog, Nutzungsrechte"
  },
  "materials": {
    "number": 10,
    "name": "Material und Systeme",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Preisbindung, Systemnachweise und Herstellerlinks lokal geprüft; Live- und Geräteabnahme sowie fachliche Prüfung der konkreten Systeme offen."
  },
  "suppliers": {
    "number": 11,
    "name": "Lieferanten und Preisvergleich",
    "verified": false,
    "checkedAt": "2026-10-24",
    "evidence": "Server-/DOM-Tests: Gebindeumrechnung, deutsche Dezimalwerte, sofortige Rechenvorschau, unveränderte Eingaben bei fehlgeschlagenem Speichern und gesperrte Übernahme nach Änderung der Artikeleinheit. Vollständige Testsuite, Syntaxprüfung und Build bestanden. Details: docs/LIEFERANTENPREISE_2026-10-24.md.",
    "remaining": "Gebindeumrechnung, Rabatt, Fracht, Rechenvorschau und Einheitensperre lokal geprüft (24.10.2026); Live-/iPhone-Abnahme und automatische Händleranbindungen offen."
  },
  "pricelists": {
    "number": 12,
    "name": "DATANORM und Preislisten",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Excel-/CSV-Spaltenmapping und verbindliche Vorschau lokal geprüft; DATANORM-Parser, Live-/Geräteabnahme und reale Händlerdateien offen."
  },
  "offers": {
      "number": 13,
      "name": "Angebote",
      "verified": false,
      "checkedAt": "2026-10-21",
      "evidence": "Zahlungs-/Ausführungsbedingungen, Gültigkeit, Hinweise und getrennte Haupt-/Nachtragsformulare sowie unveränderliche Ausgabe lokal geprüft.",
      "remaining": "Live-Abnahme der Versionen, Angebotsvarianten und Bedingungen; Mailversand über Modul 15 offen."
  },
  "orders": {
      "number": 14,
      "name": "Auftrag und Bestätigung",
      "verified": false,
      "checkedAt": "2026-10-21",
      "evidence": "Angebotsbedingungen und Auftragshinweise werden mit unveränderlicher Auftragsbestätigung gespeichert und gedruckt; Server-/DOM-Test bestanden.",
      "remaining": "Live-Abnahme von Auftragsbestätigung und Bedingungen; weitergehende Auftragsänderungen."
  },
  "correspondence": {
    "number": 15,
    "name": "Schriftverkehr und E-Mail",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Mailkonto, Versand, Rücklauf, Zustellnachweis"
  },
  "purchase": {
    "number": 16,
    "name": "Einkauf und Bestellung",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Mehrere Materialien pro Position, Bestellversand"
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
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Kalenderdarstellung, Teilzeitschichten, sensible Stammdaten, DATEV/SV"
  },
  "technical": {
    "number": 19,
    "name": "Technische Prüfung",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Validierte Fachprüfungen"
  },
  "safety": {
    "number": 20,
    "name": "Arbeitsschutz und Unterweisung",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Vollständige Gefährdungsbeurteilung und Nachweise"
  },
  "diary": {
    "number": 21,
    "name": "Mobile Bauleitung",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Offline-Synchronisation"
  },
  "defects": {
    "number": 22,
    "name": "Fotos und Mängel",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Verortung, serverseitige Erinnerungen"
  },
  "times": {
    "number": 23,
    "name": "Zeiten und Regie",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Automatische Kundenkopie, zentrale Übergabe"
  },
  "subcontracts": {
    "number": 24,
    "name": "Fremdleistungen",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Vergabe- und Rechnungsabgleich"
  },
  "measurements": {
    "number": 25,
    "name": "Aufmaß und Plan",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Kalibrierte Planmessung, Drohnenmessung"
  },
  "acceptance": {
    "number": 26,
    "name": "Abnahme und Unterschrift",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Zentrale Originalablage, Signaturdienste"
  },
  "invoices": {
    "number": 27,
    "name": "Ausgangsrechnungen",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Steuerliche Sonderfälle, XRechnung/ZUGFeRD"
  },
  "incoming": {
    "number": 28,
    "name": "Eingangsrechnungen",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "OCR/E-Rechnung, automatischer Prüfabgleich"
  },
  "payments": {
    "number": 29,
    "name": "Zahlung und Kontierung",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Bankanbindung, Kontenmapping"
  },
  "closing": {
    "number": 30,
    "name": "Monatsabschluss und Export",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Monatsperioden, DATEV-Paket"
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
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Scanner/OCR/Barcode, Backup/Wiederherstellung und produktive Geräteabnahme; zentrale Originalablage bis 64 MB implementiert."
  },
  "knowledge": {
    "number": 33,
    "name": "Technik und Wissensregister",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Lizenzierte Quellen und Versionsprüfungen"
  },
  "tenders": {
    "number": 34,
    "name": "Ausschreibungsmonitor",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Automatische Quellenabfrage/Übersicht"
  },
  "expert": {
    "number": 35,
    "name": "Sachverständigenwesen",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Vollständige Gutachten-/Honorarvorlagen"
  },
  "energy": {
    "number": 36,
    "name": "Energieberatung",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Energieausweis, Berechnungsverfahren, Förderprüfung"
  }
};
 const api={modules,isVerified:id=>modules[id]?.verified===true};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPVerification=api;
})(typeof window!=='undefined'?window:globalThis);
