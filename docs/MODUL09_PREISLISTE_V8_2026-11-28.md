# Modul 09 – Dach-Kalkulationspreisliste V8 im Leistungskatalog

Stand: 28.11.2026 · Quelle: `Dach_Kalkulationspreisliste_Aktuell_V8.pdf` vom 11.09.2026 (Dachdeckermeister Stephan Mangel)

## Umfang
- `preisliste-v8.js`: 93 Positionen aus 18 Leistungsbereichen (0010 Vorarbeiten bis 0180 Prüfungen) mit Katalognummer, Kurz- und Langtext, Einheit, Zeitwert (Minuten), Material-EK, Zusatzkosten und Referenz-EP aus der PDF.
- Alle 93 Referenz-EP wurden nachgerechnet: EP = (Minuten × 0,9589 €/min + Material + Zusatz) × 1,10. Das entspricht 57,53 €/h Kalkulationslohn (60 % LG4, 30 % LG5, 10 % LG6, Faktor 2,42) und 10 % Wagnis und Gewinn. Keine Abweichung.
- Leistungskatalog um die Felder Katalognummer, Leistungsbereich und Geräte/Zusatzkosten je Einheit erweitert. Katalognummern sind eindeutig; der Katalog ist nach Nummer sortiert.

## Bedienung
- Leistungen → „Preisliste V8 einspielen“: alles oder nichts. Gleiche Katalognummer wird aktualisiert, eigene Bausteine bleiben. Nur Administrator oder Bauleitung (Freigabeberechtigte); Verantwortlicher wird vom Server gesetzt.
- „V8-Kalkulationsbasis übernehmen“ setzt 57,53 €/h, AGK 0 %, W+G 10 %. Dann gleicht der EP im Katalog dem EP der PDF (Rundung höchstens 1 Cent).
- Katalogtabelle mit Suche (mehrere Wörter, z. B. „fallrohr kupfer“), EP aktuell und V8-Referenz-EP.
- „Ins LV“: Öffnet im gewählten Projekt eine neue LV-Position, vorbelegt mit Text, Einheit, Gliederung, Minuten, Material und Zusatz. Menge und Positionsnummer prüfen, dann speichern.
- In jeder LV-Position: „Aus Leistungskatalog übernehmen“ trägt Minuten, Material und Zusatz eines Bausteins ein, z. B. für importierte GAEB-Positionen. Nummer, Menge und vorhandener Text bleiben; abweichende Einheit wird gemeldet.

## Kalkulation – Deckungsbeitrag (Kurzform)
Nach dem Schema der Deckungsbeitragsrechnung H10010 (10.08.2026): Angebotssumme − Material-EK − Fremdleistungen − Geräte/Sonstiges = Roherlös − Lohnkosten = Deckungsbeitrag, dazu Prozent, Projektzeit, DB je Stunde und Roherlös je Stunde. Prozent und Stundenwert beziehen sich immer auf denselben Deckungsbeitrag. In der Vorlage H10010 war das nicht so: 20.500,59 € entsprechen 24,44 % und 35,81 €/h; ausgewiesen waren 21,51 % und 31,51 €/h. Diese Werte passen zu einem um 12 % reduzierten Deckungsbeitrag von rund 18.040 €.

## Prüfung
`test-preisliste-v8.cjs`: Datenbestand, Nachrechnung aller Referenz-EP, Berechtigung, Import, erneuter Import ohne Dubletten, atomare Ablehnung doppelter Nummern, LV-Übernahme mit gleichem EP, Deckungsbeitrag sowie Oberfläche (Einspielen, Suche, Ins LV, Katalogwerte in bestehende Position, Kalkulationsansicht).

## Offen / nicht Teil dieser Änderung
- Live- und iPhone-Abnahme. Modulfarbe unverändert; keine neue Freigabe.
- Zeitwerte gegen lizenzierte ZVDH-Zeitwerte (5. Auflage) abgleichen; Material-EK projektbezogen prüfen.
- Kein Leistungsbereich für Photovoltaik auf dem Flachdach (Unterkonstruktion, Schutzlage, Ballast, Durchdringungen) und keiner für Sockel-/Perimeterabdichtung (PMBC, Perimeterdämmung, Noppenbahn, Sockelputz). Werte dafür müssen fachlich vorgegeben werden.
