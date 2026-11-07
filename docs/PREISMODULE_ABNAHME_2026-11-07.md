# Preisübernahme: technische Prüfung am 07.11.2026

Basis: main f0b848005d953f5a94414743c543102bc55405f8.
Betroffene Module: 10 Material und Systeme, 12 Preislisten; gemeinsamer Preisbestand mit Modul 11.

## Korrekturen
Die offenen Korrekturen aus PR #65 und #67 wurden gemeinsam auf den aktuellen main-Stand übertragen. Eine zugeordnete, aber leere Gebindeinhaltsspalte blockiert die gesamte Preislistenübernahme. Einzelpreise ohne Zuordnung einer Gebindespalte bleiben möglich. Im Materialeditor muss ein Importvorschlag vor Übernahme als freigegebener Preis ausdrücklich bestätigt werden; jede weitere Eingabe setzt die Bestätigung zurück. Alter Preis und Historie bleiben bis zur Bestätigung erhalten.

Keine Datenmigration, keine Änderung vorhandener Betriebsdaten und keine Änderung der API-Berechtigungen. Der Bestätigungsdialog verhindert versehentliche Freigabe in der Oberfläche; er ersetzt keine serverseitige Berechtigungsprüfung.

## Nachweise
- Beide Fehler vor Übernahme der Korrekturen auf aktuellem main reproduziert: Preislisten-Test akzeptierte zwei statt einer gültigen Zeile; Materialeditor erhöhte die Revision trotz fehlender Bestätigung.
- Nach Korrektur: vollständiges `npm test`, `npm run check`, `npm run build` und `git diff --check` bestanden.
- Regressionen prüfen CSV/Whitespace, echte XLSX mit fehlender Zelle, unveränderten Gesamtbestand bei fehlerhaftem Batch, explizite Einzelpreise, Bestätigungsrücksetzung sowie Preis und Historie nach erneutem Laden.
- Ein zusätzlicher Chromium-Test wurde versucht, konnte aber nicht starten: `socket() failed: Operation not permitted`. Daher kein visueller Browsernachweis aus diesem Lauf.
- Produktionsdeployment zur Basis f0b8480 wurde in Vercel als READY festgestellt. Das ist kein Produktionsnachweis für diese Änderung.

## Noch erforderliche Produktions-/Geräteabnahme
Ausschließlich getrennte Testartikel verwenden. Auf echtem iPhone und HP prüfen:
1. CSV mit gültiger und leerer Gebindezeile importieren: Vorschau nennt fehlenden Gebindeinhalt; keine Zeile wird gespeichert.
2. Inhalt ergänzen: 120 EUR je Rolle / 10 m² ergibt 12 EUR/m². Vorschau und Wiederabruf prüfen.
3. Testartikel mit freigegebenem Preis importieren: bisheriger Preis bleibt erhalten. Importpreis öffnen, ohne Bestätigung speichern: keine Übernahme.
4. Bestätigung setzen, Preis ändern: Bestätigung wird zurückgesetzt. Erneut bestätigen und speichern: neuer Preis und vorheriger Historienwert bleiben nach Reload erhalten.
5. Projekttrennung, zentralen Speicherstatus und Bedienbarkeit dokumentieren: Gerät, Datum, Eingaben, Soll/Ist, Screenshot und geprüfter Commit.

Die fachliche Freigabe bleibt offen. 5/36 Kernmodule GRÜN, keine zusätzliche Grünmarkierung. Händleranbindungen und DATANORM sind durch diese Korrekturen nicht implementiert.
