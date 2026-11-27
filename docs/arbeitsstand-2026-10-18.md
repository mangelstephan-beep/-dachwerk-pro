# DachWerkPro – Arbeitsstand 18.10.2026

Stand: 22:25 Uhr Europe/Athens. Auf Nutzerwunsch nach dem aktuellen Punkt für heute pausiert.

## Veröffentlicht

- PR #30: Sprachhilfe in obere Bedienleiste verschoben, auf Mobilgeräten kompakt; keine Überlagerung des Inhalts. Projektleiste mit eindeutigem Leer-/Auswahlhinweis und Neuladeaktion.
- PR #31, Produktionscommit `8c2e6720b7c1a21b6d50bc1e774464e22723c324`: Projektauswahl je Benutzer im Browser-Tab merken und ausschließlich gegen bestätigten Serverbestand wiederherstellen. Keine Projektakten im Browser gespeichert. Ungültige/entzogene Auswahl wird verworfen; keine Übernahme zwischen Benutzerkonten.
- Navigation zeigt tatsächliche Projekte und offene Eingangsrechnungen statt fest eingebauter Demozahlen.

## Dokumentierte Prüfungen

- Produktionsanmeldung im Cloud-Browser erfolgreich, Rolle Administrator.
- Ausgangsbestand dieses Kontos war leer. Das ist keine Aussage über Dateien außerhalb der zentralen App oder andere Benutzerbestände.
- Modul 01: Klar gekennzeichneten Musterkunden mit Hauptkontakt und Zusatzkontakt angelegt. Zentral gespeichert, vollständig neu geladen und erneut geöffnet. Hauptkontakt bearbeitet, gespeichert und nach erneutem Serverabruf korrekt wieder angezeigt. Zusatzkontakt blieb erhalten.
- Modul 02: Zwei klar gekennzeichnete Musterprojekte (Musterdach A/B) mit Kundenzuordnung und separaten Kostenstellen zentral gespeichert. Beide auswählbar.
- Vor Korrektur: Auswahl von Musterdach A ging beim vollständigen Neuladen verloren.
- Nach Veröffentlichung von PR #31: Musterdach A ausgewählt, Browserseite vollständig neu geladen; Musterdach A bleibt ausgewählt. Navigation zeigt tatsächlich 2 Projekte.
- Automatisierte Gesamttests (`npm test`), Syntaxprüfung (`npm run check`), Build (`npm run build`) und `git diff --check` erfolgreich. Regression deckt Wiederherstellung, Benutzerwechsel, ungültige/entzogene Projektzuordnung und reale Navigationszahlen ab.
- Cloud-Browserprüfung ersetzt keine Prüfung auf einem tatsächlichen iPhone.

## Abnahmestand

Registry weiterhin 1 von 36 Modulen GRÜN; 35 ROT. Keine pauschale Freigabe. Module 01/02 bleiben bis zur dokumentierten erfolgreichen iPhone-/Produktionsabnahme rot. Das bereits grüne Modul 03 wurde in dieser Sitzung nicht neu abgenommen. Weitere Module wurden in dieser Sitzung nicht als produktiv abgenommen.

## Exakter Einstieg für die Fortsetzung

1. Aktuellen `main` und dieses Dokument lesen; zwischenzeitliche Änderungen berücksichtigen.
2. Module 01/02 auf dem tatsächlichen iPhone bestätigen: Musterkunde öffnen, gespeicherte Kontakte prüfen, Musterdach A auswählen, Seite neu laden, Auswahl und Kostenstelle prüfen, zu Musterdach B wechseln. Wenn Stephan handeln muss, direkten Link https://www.dachwerkpro.de/ und klare deutsche Schritte geben. Keine Zugangsdaten im Chat abfragen.
3. Danach Module 03 bis 36 konsequent in Reihenfolge bearbeiten: Fehler konkret reproduzieren, beheben, relevante Tests durchführen und Produktionsabnahmen belegen. ROT erst nach erfolgreicher dokumentierter Funktions-/Produktionsabnahme auf GRÜN setzen.
4. Dokumente auf vorhandenem Original-DachWerkPro-Briefpapier mit Original-Logo, Briefkopf und Fußzeile erstellen. Kein neues Ersatzlayout entwerfen.

Die gekennzeichneten Musterdaten sind als Abnahmenachweis erhalten. Nicht ohne ausdrückliche Löschfreigabe endgültig entfernen.
