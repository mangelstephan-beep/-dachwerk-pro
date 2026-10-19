# DachWerk Pro

**DachWerk Pro by Stephan Mangel**  
*Das Tool vom Dachhandwerker für Dachhandwerker.*

Produktionsdomain: https://www.dachwerkpro.de/

## Aktueller Stand

36 verbundene Arbeitsbereiche. Die Hauptanwendung verwendet serverseitige Anmeldung und zentrale PostgreSQL-Speicherung. Eine Veröffentlichung bedeutet keine vollständige Fachfreigabe aller Module.

**2/36 Modulabnahmen GRÜN**: Betriebs- und Lohnkosten sowie Leistungsverzeichnisse (Live-Prüfung 19.10.2026). Kunden und Projekte wurden am 14.10.2026 wieder auf ROT gesetzt. Die übrigen 32 Module haben noch offene Fachfunktionen oder Abnahmen. Maßgeblich ist `module-verification.js`; die vollständige aktuelle Übersicht wird daraus in [ABNAHMESTAND.md](ABNAHMESTAND.md) erzeugt. [MODULSTATUS.md](MODULSTATUS.md) enthält den Entwicklungsverlauf mit datierten historischen Angaben.

## Prüfen und bauen

Node.js ab 22.13 oder 24; `npm ci`, `npm test`, `npm run check`, `npm run build`. Der Build liefert PDF.js samt Worker, Schriften und Zeichentabellen von derselben Domain aus. Dafür sind keine externen CDN-Freigaben nötig.

PDFs mit Textschicht können im zentralen Importmanager seitenweise als **Prüfquelle** übernommen werden. Daraus entstehen gesperrte Prüfvorgänge, keine automatisch freigegebenen Positionen oder Mengen. Der ausgelesene Text bleibt im Importjournal; das Original-PDF separat im DMS ablegen. Für Scanseiten kann vor der Dateiauswahl die deutsche Texterkennung aktiviert werden. Sie verarbeitet Seiten mit weniger als 35 Textzeichen, höchstens 20 Scanseiten je PDF, mit Fortschritt und Abbruch. Tesseract.js, WASM und Sprachdaten werden von derselben Domain geladen; die Erkennung läuft im Browser. OCR-Text und Erkennungssicherheit bleiben mit Seitenbezug im Importjournal. Jede Seite erzeugt einen gesperrten Prüfvorgang; Zahlen und Einheiten immer am Originalbild bestätigen. Das Original-PDF weiterhin separat im DMS ablegen. Die tatsächliche iPhone-Abnahme ist offen.

Einrichtung und Berechtigungen: [BACKEND_SETUP.md](BACKEND_SETUP.md). Der getrennte `/workspace`-Bereich bleibt ein lokaler Modultest und ist keine produktive Projektablage.

## Geschäftsdokumente

Gemeinsame Druck-/PDF-Ausgabe für sämtliche Fachvorgänge und die ältere LV-Ausgabe: Original-DachWerkPro-Logo aus „DachWerkPro_Briefkopf_Vorlage.pdf“ vom 06.10.2026, Briefkopf, rote Kopf-/Fußlinien, Fußzeile und Seitenzahl im Drucklayout. Kontaktangaben werden in den Betriebsdaten gepflegt und in neuen Angebots-/Rechnungsfassungen eingefroren. Das Logo muss vollständig geladen sein, bevor der Druck startet. Testkennzeichnung bleibt bis zur produktiven Fachfreigabe erhalten. Die Originalvorlage enthält keine persönliche Unterschriftsgrafik; bereits am Fachvorgang erfasste Unterschriften werden weiterhin ausgegeben.
