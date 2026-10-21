# Kalkulationsnachweis und Materialprüfung

## Modul 08

Die hochgeladene Datei „Kalkulationsnachweis, EFB.xlsx“ dient als Referenz für die Eingabefelder. Sie ist kein amtliches EFB-Formblatt. Das Original bleibt unverändert. Seine leeren Preisfelder, die Vermischung von Fremdleistung und Gesamtsumme sowie feste Lohnwerte werden nicht übernommen.

Je LV-Position kann die Kostenartenrechnung aktiviert werden. Kalkulationslohn und Zuschläge für Lohn, Stoffe, Geräte und Fremdleistung sind explizite Eingaben. Die vier Zuschläge ersetzen für diese Position die globalen AGK-/Gewinnsätze. Nicht aktivierte Positionen rechnen unverändert mit der globalen Basis. Ein Vollkostensatz erfordert entsprechend abgestimmte Zuschläge.

Lohn-EK = Minuten / 60 × Kalkulationslohn. Jeder Kostenbestandteil einschließlich seines Zuschlags wird auf Cent gerundet. Die Summe der vier Preisbestandteile ergibt den kalkulierten EP. Zielpreis und Rabatt folgen danach. GP = Menge × endgültiger EP. Bei 6 Minuten, 54 €/h und 12,30 € Stoffen mit 35 % Stoffzuschlag ergeben sich 5,40 € Lohn, 16,61 € Stoffpreis und 22,01 € EP. Für dieses Beispiel ist kein zusätzlicher Lohnzuschlag angesetzt. Die Referenz enthält daneben 32,44 €/h KL und 35 % Lohnzuschlag; diese widersprüchlichen Ansätze werden nicht stillschweigend zusammengeführt.

Im Modul 08 sind Kostenbestandteile und Preise sichtbar, die Ansätze werden über die zugehörige LV-Position bearbeitet. Bestehende Angebots-/Rechnungsfassungen bleiben unverändert. Amtliche EFB 221/222/223 und ihre Feldzuordnung sind weiterhin offen.

## Modul 10

Artikelnummer, Quelle, Preisstand und Preisbindung werden am Artikel gespeichert. Das Enddatum gilt einschließlich. Ein leeres Enddatum bedeutet, dass keine Preisbindung dokumentiert ist. Die Oberfläche zeigt den Prüfbedarf und die letzten Preisstände samt Quelle und Bindung.

Systemzuordnung, HTTPS-Link zur Herstellerunterlage, Fassung und Eignungsnachweis dokumentieren den konkreten Aufbau. „Geeignet laut Nachweis“ erfordert alle vier Angaben. Es gibt keine automatische fachliche Systemfreigabe. Bei eingetragenem System sperren ungeprüfte oder ungeeignete Aufbauten die neue Angebotsausgabe. Abgelaufene Preisbindung und zukünftiger Preisstand sperren sie ebenfalls. Bestehende Fassungen und Rechnungen behalten ihre gespeicherten Preise.

CSV-Import unterstützt die zusätzlichen Artikelfelder. Eine Preisaktualisierung bleibt als Prüfpreis getrennt vom freigegebenen Preis. Vorhandene Systemunterlagen bleiben beim Import erhalten; die neue Preisbindung wird ausdrücklich aus dem Import übernommen, nicht aus einem alten Angebot. Lieferantenpreisübernahme ohne eigenes Bindungsdatum löscht eine frühere Bindung.

## Prüfung

`test-efb-material-systems.cjs` prüft Kostenarten und Rundung, Fremdleistungen, EP/GP, Zielpreis/Rabatt, unveränderte Standardkalkulation, zentrale Dienstaufrufe, Snapshots, Gültigkeitsgrenzen, sichere Herstellerlinks, Eignungsnachweise, Preisimport, Wiederherstellung und die Modulnavigation.

Lokale Prüfungen ersetzen keine Produktions- oder Geräteabnahme. Modul 08 und Modul 10 bleiben ROT.

## Blanko-Kalkulation 03/25 (Dropbox-Referenz, Oktober 2026)

Die bereitgestellte Makroarbeitsmappe `Blanko Kalkulation ab 03-25.xlsm` enthält 19 Arbeitsblätter, darunter Kalkulation, Ergebnis, LV, Einzelpos, Berechnung, EFB-Preis 2 und efb 221. Sie hat VBA-Makros und mindestens einen fehlerhaften `#REF!`-Bezug. Die komplette Datei wird **nicht** ausgeführt, verarbeitet oder mit Makros in die Web-App kopiert; die Originalquelle ist über einen Dropbox-Leselink im Modul 08 erreichbar.

Zur schrittweisen Übernahme wird im LV je Position eine explizit zu aktivierende Detailkalkulation angeboten: vier Materialbezeichnungen mit Einkaufspreis je LV-Einheit, Zuschnittfaktor (leer/0 = 1), Verschnitt in Prozent und Arbeitsminuten; außerdem Befestigungsmittel, Entsorgung, sonstige Nebenkosten und ein Herkunftsvermerk. Bei aktiver Detailkalkulation ersetzen diese Material- und Minutenansätze die allgemeinen LV-Felder. Ein Materialartikel aus Modul 10 ist dann für dieselbe Position nicht zulässig. Nachunternehmer und Geräte bleiben die üblichen LV-Felder.

Material je Einheit = Summe über vier Materialien von (Preis × Faktor × (1 + Verschnitt/100)) + Befestigungsmittel. Lohn je Einheit = (Summe Minuten / 60) × Stundenlohn. Container und Sonstiges sind getrennte Nebenkosten. Einzelfeldrundungen der Alt-Exceldatei werden **nicht** als fachlich verbindlich übernommen: die Materialsumme wird insgesamt auf Cent gerundet, angezeigte Einzelanteile separat. Im Kostenartenzuschlagsmodus sind die Nebenkosten eine fünfte gesonderte Kategorie mit eigenem Zuschlag. Ohne diesen Modus gelten die bestehenden globalen Zuschlagsregeln für die gesamten direkten Kosten.

Vorhandene Angebots-/Rechnungssnapshots bleiben unverändert. Die Vorlage ist noch nicht vollständig auf EFB-Feldkompatibilität, Rechenidentität oder fachliche Eignung geprüft. Änderungen stehen bis Live-/iPhone-Abnahme im Testbranch; Modul 08 bleibt ROT. Der Test `test-kalkulationsvorlage-03-25.cjs` prüft Rechenwege, Rückwärtskompatibilität, Validierung und Darstellung.

## BFW-Übergabedatei (.xls), 21.10.2026

Die im selben Dropbox-Verzeichnis bereitgestellte `000 BFW Übergabedatei.xls` (22 KB, zuletzt geändert am 08.10.2026) ist eine **leere** Excel-97/2003-Übergabevorlage mit den Spalten `Pos | Menge | MEH | Kurztext | Langtext | EP | PA`.

Für Modul 05 wird bei exakt passenden Überschriften eine Spaltenzuordnung angeboten. `Pos` wird als Positionsnummer, `Menge` als LV-Menge, `MEH` als Mengeneinheit, `Kurztext` und `Langtext` zusammen als Beschreibung und `EP` als bestehender Zielpreis je Einheit zugeordnet. Die Funktion wird auch bei umbenannter Datei durch Überschriftenerkennung aktiviert. Die Bedeutung von `PA` ist nicht belegt: kein automatischer Import oder eigenständige Preiswirkung. Das unbearbeitete Original wird nach einem regulären Import weiterhin im Importjournal aufbewahrt. Die Vorlage selbst erzeugt **keine** importierten LV-Positionen, solange keine Datenzeilen vorliegen.

Der Modul-08-Bildschirm erhält einen Link zur BFW-Datei und zum LV-Importmanager. Daten werden nur nach Datei-Auswahl, Vorschau, erforderlicher Prüfung und ausdrücklicher Projektübernahme importiert. Angebotserstellung bleibt bei ungeklärten Formeln/Positionen gesperrt. Ein BFW-Vollimport von vorhandenen Bestandsdaten und die fachliche PA-Semantik sind **noch nicht abgenommen**. Siehe `test-bfw-uebergabe.cjs`.
