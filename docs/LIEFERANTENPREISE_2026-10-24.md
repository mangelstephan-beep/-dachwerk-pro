# Lieferantenpreise – Prüfung 24.10.2026

## Korrektur und Verhalten

Nach einer Änderung der Artikeleinheit bot die Vergleichstabelle weiterhin die Freigabe alter Preisvergleiche an. Der Server wies die Übernahme bereits ab. Die Tabelle zeigt jetzt den konkreten Sperrgrund und bietet für diese Zeilen keine Freigabe an.

Das Erfassungsformular zeigt den Einkaufspreis unmittelbar vor dem Speichern. Vorschau, Vergleich und Preisübernahme verwenden dieselbe Rechenfunktion. Preis und Fracht beziehen sich auf das Preisgebinde; erst die Summe nach Rabatt wird durch den Gebindeinhalt geteilt. Beispiel: 100 EUR, 10 % Rabatt, 10 EUR Fracht und 5 m² Inhalt ergeben 20 EUR/m². Die Vorschau nennt die Artikeleinheit und erzeugt keinen Speichervorgang. Deutsche Dezimalwerte sind zulässig. Ungültiger Gebindeinhalt zeigt einen Hinweis; bei abgewiesenem Speichern bleiben Eingaben und gespeicherter Preis erhalten.

## Nachweise

- `npm test`: vollständige Suite bestanden, einschließlich Serverkommandos, zentraler Persistenz, Formularen und deutscher OCR.
- `npm run check`, `npm run build` und `git diff --check`: bestanden.
- Erweiterter `test-material-price-import.cjs`: Vorschau ohne Speicherung, deutsche Dezimalwerte, Gebindeinhalt 0 abgewiesen, Eingaben erhalten, korrigierter Preis gespeichert, Einheitensperre in Tabelle und Store ohne Preis- oder Revisionsänderung.

## Abnahmegrenze

Die Produktionsseite öffnet am 24.10.2026 im Prüf-Browser die DachWerkPro-Anmeldung. Eine angemeldete Liveprüfung und eine echte iPhone-Abnahme sind damit nicht belegt. Modul 11 bleibt ROT; der Freigabestand bleibt 5/36. Automatische Händleranbindungen sind weiterhin offen.

PR 42 verwendet ein älteres, vom aktuellen Hauptzweig abweichendes Feldschema (`packageQuantity` statt `baseQuantity` und Fracht je Artikeleinheit statt je Preisgebinde). Die hier geprüfte Änderung baut auf dem aktuellen Hauptzweig auf und führt dieses alte Schema nicht ein. Der Konflikt von PR 42 ist damit nicht aufgelöst; PR 42 wurde nicht zusammengeführt.
