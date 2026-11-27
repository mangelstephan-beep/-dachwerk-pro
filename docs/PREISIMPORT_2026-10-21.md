# Module 11 und 12 – Preisvergleich und Preislisten

## Implementiert

Modul 11 erfasst den Preis eines Preisgebindes, Rabatt, Fracht je Preisgebinde und dessen Inhalt in Artikeleinheiten. Ein Preisgebinde kann beispielsweise eine Rolle mit 10 m² oder eine Verpackung mit 100 Stück sein. Der Einkaufspreis je Artikeleinheit wird als `(Preis × (1 − Rabatt / 100) + Fracht) / Gebindeinhalt` berechnet und am Ende auf Cent gerundet. Die Umrechnung wird am Artikel nachvollziehbar gespeichert. Alte Preisvergleiche ohne Gebindeinhalt rechnen weiterhin mit dem Faktor 1.

Preisstand, Quelle und optionales Bindungsende werden beim Lieferantenpreis erfasst und bei der Artikelpreisfreigabe übernommen. Das Enddatum gilt einschließlich. Abgelaufene Bindungen und zukünftige Preisstände verhindern die Übernahme. Ohne Enddatum bleibt die Preisbindung ausdrücklich undokumentiert. Die Freigabe bleibt serverseitig berechtigten Rollen vorbehalten.

Modul 12 liest CSV, XLSX und XLS (Excel 97–2003/BIFF8), jeweils bis 1 MB, per Dateiauswahl oder Drag-and-drop. Die vorhandenen begrenzten Excel-Parser werden wiederverwendet. Arbeitsblatt und Überschriftenzeile sind wählbar; Spalten werden vorgeschlagen und lassen sich korrigieren. Mehrdeutige Preisspalten benötigen eine ausdrückliche Auswahl. Artikelnummern als Text beziehungsweise mit unterstützter Nullformatierung behalten führende Nullen.

Pflichtzuordnungen sind Bezeichnung, Artikeleinheit und Preis vor Rabatt. Optional sind Artikelnummer, Hersteller, Lieferant, Rabatt, Fracht, Gebindeinhalt, Preisbindung und Systemnachweise. Preisstand und Quelle werden für die Übernahme angegeben. Der Import berechnet den EK je Artikeleinheit und speichert die Berechnungsbasis am Artikel. Geldbeträge benötigen keine Währungszeichen; Datumswerte der Preisbindung werden als ISO-Text `JJJJ-MM-TT` erwartet. Excel-Datumszellen werden als Prüfbedarf abgewiesen.

Die Vorschau zeigt sowohl Artikelpreise als auch Preis, Rabatt, Fracht und Bezugsmenge der Originalzeilen. Sie ist vor jeder Übernahme verbindlich. Änderungen an Daten, Quelle, Zuordnung oder Bestandsrevision erfordern eine neue Vorschau. Verspätet abgeschlossene frühere Datei-Ladevorgänge überschreiben keine neuere Datei. Verdeckte Daten, Formeln, verbundene Zellen, fehlende Pflichtwerte und fehlerhafte Zahlen verhindern die gesamte Übernahme. Datenzeilen beginnen unterhalb der ausdrücklich gewählten Überschrift.

Artikelimporte erfolgen atomar. Neue Artikel bleiben auf Prüfung; bestehende freigegebene Preise bleiben bis zur gesonderten Preisfreigabe erhalten. Die Originaldatei selbst wird durch diese Preisübernahme noch nicht im DMS gespeichert und ist zusätzlich abzulegen.

## Prüfung

`test-material-price-import.cjs` prüft serverseitige Speicherung und Wiederabruf, Gebindeumrechnung, Rabatt und Fracht, Historie, Bindungsablauf, Wiederherstellung und alte Preisvergleiche. Echte XLSX-Dateien und CSV-Daten prüfen Zuordnung, führende Nullen, Formeln, verborgene Daten und mehrdeutige Preisfelder. Die Oberfläche wird einschließlich Pflichtvorschau, geänderter Quelle, XLSX-Drag-and-drop und überholter Ladevorgänge geprüft. Fehlerhafte Excel-Zeilen sperren die Übernahme vollständig. Der bestehende Modul-Workflowtest wurde auf den neuen Zuordnungsschritt erweitert.

## Weiter offen

- Modul 11: automatische Händleranbindungen sowie Live- und Geräteabnahme.
- Modul 12: DATANORM-Parser, Prüfung realer Händlerdateien sowie Live- und Geräteabnahme.
- Originaldateien in der zentralen DMS-Ablage mit Importvorgängen verknüpfen.

Die lokale Prüfung ist keine Produktionsabnahme. Beide Module bleiben ROT. Der Gesamtstand bleibt bei 2 von 36 dokumentiert abgenommenen Modulen.
