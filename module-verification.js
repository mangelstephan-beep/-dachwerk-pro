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
    "evidence": "Live-Produktion 19.10.2026 im Testdach C: CSV zuvor bestanden; PDF mit 1,1 MB als gesperrte Prüfquelle, GAEB X83 XML 3.3 mit Position 01.02.9501 und 12,5 m² samt Gliederung sowie XLSX mit Spaltenzuordnung und Position 9601 mit 12,5 m² übernommen. Alle vier Quellen nach vollständigem Neuladen im zentralen Importjournal vorhanden; gespeicherte Excel-Quelldaten erneut geöffnet. Keine Fachfreigabe und kein Versand. PR #35 ergänzt abbrechbares Einlesen und Schutz vor verspäteten Ergebnissen; test-import-lifecycle.cjs bestanden. 100-seitiges PDF live eingelesen und Vorschau danach bedienbar; Abbruch selbst nur automatisiert geprüft. Live-OCR 19.10.2026 (PR #37): bildbasiertes PDF ohne Textschicht als gesperrte Quelle eingelesen; ABNAHME 12345 und 12,50 m2 Abdichtung erkannt, zentral gespeichert und nach Reload mit OCR-Nachweis erneut geöffnet. Keine automatische LV-Menge. XLS BIFF8 live (PR #39): Position 009701 mit 12,5 m² und vier gesperrte Hinweise zentral gespeichert, nach Reload im Journal vorhanden. Originaldownload im Prüf-Browser durch bestehende Geräteregel gesperrt; Downloadtyp und Originalbytes automatisiert geprüft. Vollständige Testsuite, Syntaxprüfung und Build bestanden.",
    "remaining": "iPhone-Abnahme und Originaldownload auf freigegebenem iPhone/HP offen; XLS vor Excel 97 sowie weitere GAEB-Phasen/-Versionen fehlen weiterhin. CSV, PDF/OCR, GAEB X83 XML 3.3, XLSX und XLS BIFF8 live importiert und nach Reload wiedergefunden."
  },
  "contract": {
    "number": 6,
    "name": "LV- und Vertragsprüfung",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Live-Abnahme der automatischen LV-Datenprüfung; weitergehende Vertrags- und Regelwerksprüfungen."
  },
  "calculation": {
    "number": 7,
    "name": "Kalkulation und Zielpreis",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Live-Abnahme von Rabatt, Zielpreis, Grund-/Alternativ- und Bedarfspositionen."
  },
  "efb": {
    "number": 8,
    "name": "EFB und Kalkulationsblätter",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "EFB 221/222/223 mit Feldmapping"
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
    "remaining": "Systemkompatibilität, Herstellerunterlagen"
  },
  "suppliers": {
    "number": 11,
    "name": "Lieferanten und Preisvergleich",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Automatische Händleranbindungen, Gebindeumrechnung"
  },
  "pricelists": {
    "number": 12,
    "name": "DATANORM und Preislisten",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "DATANORM-Parser, Excel-Spaltenmapping"
  },
  "offers": {
    "number": 13,
    "name": "Angebote",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Live-Abnahme der Versionen und Angebotsvarianten; Versand und Angebotsbedingungen."
  },
  "orders": {
    "number": 14,
    "name": "Auftrag und Bestätigung",
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Live-Abnahme der Auftragsbestätigung, Varianten- und Nachtragsbezüge; weitere Auftragsänderungen."
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
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Automatische Terminwarnung, Toleranzregeln"
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
    "verified": false,
    "checkedAt": null,
    "evidence": "",
    "remaining": "Gemeinkosten, Vollständigkeitskontrolle"
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
