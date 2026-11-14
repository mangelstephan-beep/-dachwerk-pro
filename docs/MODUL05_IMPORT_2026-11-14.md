# Modul 05 – Importmanager: weitere GAEB-Phasen und ältere Excel-Dateien · 14.11.2026

Status: **ROT**. Lokal und in der GitHub-Prüfung getestet, keine Produktionsabnahme. GRÜN erst nach dokumentierter Abnahme auf HP und iPhone (verbindliche Projektregeln).

Direkt öffnen: [Testen (Vorschau Gesamtprüfung)](https://dachwerk-pro-git-integration-gesamtpr-b6edb3-mangelstephan-8407.vercel.app/workspace?module=imports) · [Live](https://www.dachwerkpro.de/?start=app&module=imports) (Live erst nach dem Zusammenführen)

## Umgesetzt

- **GAEB DA XML 3.2 und 3.3** in den Austauschphasen
  - X81 Leistungsbeschreibung
  - X82 Kostenanschlag
  - X83 Angebotsaufforderung (wie bisher)
  - X84 Angebotsabgabe
  - X86 Auftragserteilung
- Die Phase wird aus dem Namensraum der Datei gelesen und mit der Angabe `DP` abgeglichen. Widersprechen sich beide, wird nichts übernommen.
- **Preise (X82/X84/X86):** Der Einheitspreis wird nur als **Zielpreis** übernommen, so wie bisher der EP aus der BFW-Übergabedatei. Die Position bleibt ungeprüft und muss vor einem Angebot freigegeben werden. Passt der Gesamtbetrag nicht zu Menge × Einheitspreis, wird die Position zum gesperrten Prüfvorgang (bei direkter Übernahme ohne Vorschau: Abbruch ohne Teilimport). In X83 bleiben Preisangaben wie bisher gesperrt.
- **Positionen ohne Menge** (typisch X81) werden gesperrte Prüfvorgänge mit leerer Menge. Es wird keine Menge erfunden.
- Titelsummen (`Totals`) in X82/X84/X86 werden erkannt und nicht als Fehler gewertet; das Original bleibt im Importjournal.
- Der Download der gespeicherten Textquelle erhält die passende Endung (.x81 … .x86).
- **Excel vor Excel 97:** Excel 5.0/95 (BIFF5, Datenstrom „Book“) sowie Excel 2.0, 3.0 und 4.0 (BIFF2–BIFF4, einzelnes Tabellenblatt). Gilt für LV-Import (Modul 05) und Preislisten (Modul 12).
- Schutzprüfungen gelten auch für die alten Formate: keine Makros (auch Excel-95-VBA und Excel-4-Makroblätter), keine verschlüsselten Dateien, keine Diagramm- oder Arbeitsmappendateien aus Excel 4.0, Datensatzgrenzen geprüft, höchstens 1 MB.

## Weiterhin nicht unterstützt

- GAEB 90 (D81–D86) und GAEB 2000 (P81–P86): bitte im AVA-Programm als GAEB DA XML 3.3 exportieren. Für einen eigenen Parser werden echte Beispieldateien benötigt.
- GAEB DA XML 3.0/3.1 und Nebenangebote X85: klare Fehlermeldung, keine Übernahme.

## Testdateien (synthetisch, keine Kundendaten)

- [Testdach_X81_Leistungsbeschreibung.x81](testdateien/modul05/Testdach_X81_Leistungsbeschreibung.x81): zwei Positionen, eine Position ohne Menge
- [Testdach_X84_Angebotsabgabe.x84](testdateien/modul05/Testdach_X84_Angebotsabgabe.x84): zwei Positionen mit Preisen (6,80 € und 38,50 €)
- [Testdach_X86_Auftrag_3-2_Summenfehler.x86](testdateien/modul05/Testdach_X86_Auftrag_3-2_Summenfehler.x86): XML 3.2, Position 01.0020 mit absichtlich falschem Gesamtbetrag

## Abnahme-Checkliste (HP und iPhone)

Datum, Gerät/iOS/Safari bzw. HP/Browser, URL, Testkonto/Rolle und Ergebnis je Schritt festhalten. Nur ein Testprojekt verwenden.

1. Anmelden, Testprojekt wählen, Modul „Importmanager“ öffnen ([Live](https://www.dachwerkpro.de/?start=app&module=imports)).
2. X81-Testdatei wählen → Format springt auf „GAEB XML“ → **Vorschau prüfen**: 2 LV-Positionen, 1 gesperrter Prüfvorgang „Menge fehlt“ (01.0030 Dachablauf).
3. Übernehmen. Im LV stehen 01.0010 (120 m²) und 01.0020 (45,5 m), Status „Neu“. Unter LV-/Vertragsprüfung steht 01.0030 mit leerer Menge.
4. Neues Testprojekt, X84-Testdatei: Vorschau 2 Positionen, 0 Prüfvorgänge. Nach Übernahme in der Position „Zielpreis verwenden“ = ja, Zielpreis 6,80 € bzw. 38,50 €.
5. X86-Testdatei (XML 3.2): Vorschau 1 Position (01.0010) und 1 gesperrter Prüfvorgang (01.0020, Gesamtbetrag passt nicht).
6. Importjournal: „Übernommene Textquelle herunterladen“ liefert die Datei mit der Endung .x84 bzw. .x86.
7. Falls eine alte Excel-Datei (Excel 5.0/95 oder älter) vorhanden ist: als LV-Quelle wählen, Blatt und Spalten zuordnen, Vorschau prüfen, Umlaute kontrollieren.
8. Seite neu laden: Import und Prüfvorgänge sind weiterhin vorhanden.

## Automatische Prüfung

- `test-gaeb-import.cjs`: Phasen X81/X82/X84/X86, XML 3.2, Preis- und Summenprüfung, fehlende Mengen, Ablehnung von X85, XML 3.1 und widersprüchlicher Phase, Dateiendung.
- `test-xls-import.cjs`: echte BIFF5- und BIFF2-Dateien aus dem eingebundenen SheetJS 0.20.3 (inkl. Umlaute), Makro-, Verschlüsselungs-, Blatttyp- und Grenzprüfung, Browser-Worker.
