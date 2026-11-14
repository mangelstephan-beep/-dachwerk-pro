# Modul 12 – DATANORM und Preislisten · 14.11.2026

Status: **ROT**. Automatisch mit nachgebauten DATANORM-Dateien geprüft, keine Produktionsabnahme. GRÜN erst nach dokumentierter Abnahme mit einer **echten Händlerdatei** auf HP und iPhone.

Direkt öffnen: [Live](https://www.dachwerkpro.de/?start=app&module=pricelists) (erst nach dem Zusammenführen) · Vorschau-Link steht im PR.

## Umgesetzt

- **DATANORM 4 einlesen**: im Modul „DATANORM und Preislisten“ unter „DATANORM-Dateien auswählen“ die Dateien des Händlers **zusammen** markieren:
  - `DATANORM.001` (Artikel: Nummer, Kurztexte, Einheit, Preis, Preiseinheit, Rabattgruppe) – Pflicht
  - `DATPREIS.001` (neuere Preise und Rabatte) – wenn vorhanden
  - `DATANORM.RAB` (Rabattgruppen) – wenn vorhanden
  - Bis 5 Dateien, je 30 MB. Ablegen per Drag & Drop geht auch. Eine einzelne DATANORM-Datei im normalen Dateifeld wird ebenfalls erkannt.
- **Umrechnung**, in der Vorschau offen sichtbar (Spalten Preisart, Rabattquelle, Hinweis):
  - Preis steht in der Datei in Cent ohne Komma (1590 = 15,90 €).
  - Preiseinheit 0/1/2/3 = Preis je 1/10/100/1000 Einheiten → Gebindeinhalt.
  - Preiskennzeichen 1 = Listenpreis (Rabatt wird abgezogen), 2 = Nettopreis. Werkspreis (3) wird nicht übernommen.
  - Rabatt aus dem Preissatz (Rabattsatz oder Multiplikator) oder aus der Rabattgruppe in DATANORM.RAB.
  - Wäre der Preis je Einheit unter 1 Cent ungenau (z. B. Schrauben je 1000), wird der Artikel je Preiseinheit geführt (Einheit „1000 Stck“).
  - Zeichensatz wird erkannt: DOS (CP850, DATANORM-Standard), Windows-1252 oder UTF-8 – Umlaute bleiben richtig.
- **Sicherheitsregeln**: Listenpreis ohne Rabatt sperrt die ganze Übernahme, bis die Rabattdatei dabei ist oder „Listenpreise ohne Rabatt bewusst übernehmen“ angehakt ist. Teuerungszuschlag, mehrere Rabatte je Preissatz, unbekannte Kennzeichen und Preis 0 sperren ebenfalls. Löschsätze (L) und Preise ohne Artikelsatz werden nicht übernommen und gezählt.
- **Auswahl**: Suchbegriff (Artikelnummer, Text, Warengruppe, EAN) und „Nur Artikel, die schon im Materialstamm stehen“. Höchstens 5000 Artikel je Übernahme.
- **Wie bisher**: Preisstand aus dem Dateikopf vorbelegt, Spaltenzuordnung vorbelegt, verbindliche Vorschau, Übernahme nur als „Prüfung“ – freigegebene Preise bleiben bis zur Einzelfreigabe in Modul 10 unverändert.

Nicht enthalten: **DATANORM 5** (wird erkannt und mit Hinweis abgelehnt, weil die Satzbeschreibung frei nur lückenhaft vorliegt – kein Feld wird geraten), Langtexte (T-Sätze), Warengruppennamen (WRG), Staffelpreise.

## Testdateien zum Ausprobieren

Ohne Händlerdatei zuerst mit den nachgebauten Dateien üben (DOS-Zeichensatz, keine echten Preise, erwartete Werte in der [README](testdateien/datanorm4/README.md)):
[DATANORM.001](https://github.com/mangelstephan-beep/-dachwerk-pro/raw/modul-12/datanorm/docs/testdateien/datanorm4/DATANORM.001) · [DATPREIS.001](https://github.com/mangelstephan-beep/-dachwerk-pro/raw/modul-12/datanorm/docs/testdateien/datanorm4/DATPREIS.001) · [DATANORM.RAB](https://github.com/mangelstephan-beep/-dachwerk-pro/raw/modul-12/datanorm/docs/testdateien/datanorm4/DATANORM.RAB)

## Abnahme-Checkliste (HP und iPhone)

1. Beim Händler (z. B. Dachbaustoffhandel) die DATANORM-4-Dateien anfordern bzw. herunterladen.
2. Modul öffnen ([Live](https://www.dachwerkpro.de/?start=app&module=pricelists)) → „DATANORM-Dateien auswählen“ → alle Dateien zusammen markieren.
3. Oben steht „DATANORM 4 vom …“ mit Anzahl der Artikel und erkannter Kodierung. Preisstand = Datum im Dateikopf.
4. Suchbegriff eingeben, z. B. eine Warengruppe oder „Bitumen“ → „Auswahl anwenden“.
5. „Preisvorschau prüfen“ → **drei Artikel mit einer echten Händlerrechnung vergleichen** (EK je Einheit, Umlaute, Einheit). Mindestens ein Artikel mit Preis je 100 oder 1000.
6. Lieferant eintragen → Vorschau erneut prüfen → „Preisliste zur Prüfung übernehmen“.
7. In Modul 10 (Material) stehen die Artikel mit Status „Prüfung“; ein vorher freigegebener Preis ist unverändert.
8. Gegenprobe „Nur Artikel aus dem Materialstamm“: nur bekannte Artikelnummern erscheinen.

Ergebnis bitte mit Datum, Gerät und Händlername melden, z. B. „Modul 12 ok, iPhone und HP, Datei von Händler X“.

## Automatische Prüfung

`test-datanorm-import.cjs` (neu): Vorlaufsatz (Fassung, Datum, Währung), DATANORM 3/5 und DM abgelehnt, CP850/Windows-1252/UTF-8, Netto- und Listenpreis, Preiseinheit, Rabattgruppe aus RAB, Multiplikator im Preissatz, drei Artikel je P-Zeile, Löschsatz, Preis ohne Artikelsatz, Sperre bei Listenpreis ohne Rabatt, Filter, Materialstamm-Abgleich, Grenze 5000, Oberfläche mit Mehrfachauswahl, Vorschau und Übernahme zur Prüfung.

Quellen für den Satzaufbau: technische DATANORM-Spezifikation (Haufe Lexware) in der Umsetzung der offenen Bibliothek `datanorm` (PyPI) sowie Praxisbeispiele. Die Rabattwerte (Rabattsatz mit 2 Nachkommastellen, Multiplikator mit 3) sind daraus übernommen und müssen mit der echten Händlerdatei bestätigt werden – deshalb Schritt 5.
