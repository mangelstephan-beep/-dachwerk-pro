# Original-Komponenten – Arbeitsstand 12.10.2026

Basis: Originalbranch main, Commit b30ec760fcf3bfb99d48e9174f3a8495175bcb5c. Kein Ersatz durch den Trainingszugang.

## Implementiert im lokalen Testbetrieb

- Kunden und Projekte über die bestehende Schnellerfassung speichern; eindeutige Nummern prüfen, Kunde zum Projekt zuordnen, reale Datensätze in Tabellen und Projektkarten anzeigen.
- Projekt öffnen und aktuellen Projektkontext für Folgemodule wählen. Bestehende Datensätze unter dwp-entities-v1 werden weiterverwendet; es werden keine Beispieldatensätze automatisch in den neuen Stamm aufgenommen.
- LV-Originale und Kalkulationskopien nach Projekt filtern; neue Imports verlangen einen Projektbezug. Unzugeordnete Altstände bleiben bei leerer Projektauswahl zugänglich und können zugeordnet werden.
- Aufmaße mit LV-/Positionsbezug, Menge aus Länge × Breite/Faktor × Anzahl − Abzug, Eingabeprüfung, Bearbeitung, Speicherung und CSV-Ausgabe.
- Bautagebuch, Mängel, Abweichungen, Abnahmen/Übergaben, Leckageprüfungen und Nachweisregister mit eigenen Fachfeldern, Verantwortlichen, Fristen, Status, Bearbeitung und CSV-Ausgabe.
- Dezimalpreise als Zahlen sowie deutsche und punktgetrennte Eingaben korrekt verarbeiten. Automatischen Lohnanteil in LV-Zeile, Gesamtsumme und Druck konsistent berechnen; expliziten EP 0 erhalten.
- Automatischen Materialabgleich in die sichtbaren Materialfelder zurückführen.
- LV-Neudarstellungen und Material-Erweiterungen gegen sich selbst auslösende DOM-Beobachterschleifen absichern; optionale externe Parser blockieren den lokalen Modulstart nicht mehr.
- Noch generische Arbeitsnotizen werden als Arbeitsnotizen gekennzeichnet und nicht als fertige Fachfunktionen bezeichnet.

## Validierung

Automatisierte DOM-Integration mit JSDOM 26.1.0: Originalformulare, Kunden-/Projektbeziehung, Nummerndubletten, Projektisolation, Dezimal- und Nullpreise, Lohnanteil, Druckinhalt, Aufmaß-Erfassung/Bearbeitung/ungültige Eingaben, weitere sechs Fachmasken, Listen-/Kartenansicht, Filter und Wiederherstellung gespeicherter Daten. Syntaxprüfung der geänderten JavaScript-Dateien.

Ausführen: npm install, danach npm test. Alternativ können die Tests mit DWP_TEST_JSDOM auf eine vorhandene JSDOM-Installation zeigen.

Keine visuelle Browser-, iPhone-, Live-Deployment- oder reale GAEB/PDF/XLSX-Importprüfung in diesem Arbeitspaket. Die Importparser und externen Parser-CDNs benötigen eigene Dateitests.

## Offen bis zum produktiven Abschluss

Die Anwendung ist weiterhin ein lokaler Testbetrieb. Die 36 gewünschten Original-Komponenten sind nicht vollständig abgeschlossen. Insbesondere fehlen zentrale Datenbank, serverseitige Anmeldung/Rollen, geschützte Personalverwaltung, manipulationsgeschütztes Audit, E-Mail-/Graph-Anbindung, verlässliche Originaldateiablage, Foto-Uploads, Aufmaßübernahme in Ausgangsrechnungen, geprüfte E-Rechnung/GAEB-Ausgabe, Preislistenfreigabe mit Historie und mehrere Fachberechnungen. Abnahmen erfassen Vorgänge; digitale Unterschriften und unterschriftsreife PDF-Protokolle sind noch offen. Nachweise speichern Verweise; sie laden keine Dateien hoch.

Die neuen Fachmasken ändern keine produktiven Freigaben und senden keine Nachrichten. Eine Veröffentlichung wurde in diesem Arbeitspaket nicht durchgeführt.

## Online-Arbeitszugang – weiterer Stand

/original prüft Zugangsdaten serverseitig und liefert die Originaloberfläche erst nach erfolgreicher Anmeldung aus. Die Sitzung ist signiert, HttpOnly, Secure und acht Stunden gültig. Der Trainingszugang und der Originalzugang verwenden unterschiedliche Sitzungscookies. Der Originalzugang kann die bestehende Vorschaukonfiguration nutzen; separate ORIGINAL_CREDENTIAL_HASH und ORIGINAL_SESSION_SECRET haben Vorrang. Passwortprüfungen und automatische Anmeldung über einen veränderbaren sessionStorage-Wert wurden aus dem Frontend entfernt.

Die Authentifizierung dieses einzelnen Arbeitszugangs ersetzt noch keine produktive Mehrbenutzerverwaltung, geteilte Datenbank oder revisionssichere Ablage. Er bleibt eine Arbeitsversion. Lokale Tests prüfen Passwortfehler, Session-Signatur, Cookie-Eigenschaften, fremde Origins, getrennte Cookies, Abmeldung und fehlende Konfiguration.
