# DachWerk Pro – Arbeitsstand 12.10.2026

Dieser Ausbau ist **keine Fertigstellung aller produktiven Module**. Er ersetzt die isolierten Beispielmasken durch ein gemeinsames lokales Projektmodell mit fachbezogenen Eingaben. Grundlage sind die 34 Funktionsbereiche der Gesamtpräsentation vom 09.10.2026 sowie Sachverständigenwesen und Energieberatung. Bestehende Trainingsentwicklung bleibt auf ihrem eigenen Branch erhalten.

Fortschritt an der Hauptanwendung: Die serverseitige Grundlage für Anmeldung, Mandanten, Freigaben und PostgreSQL-Speicherung ist implementiert und lokal geprüft. Eine Live-Datenbank ist noch nicht bereitgestellt. Einrichtung und Grenzen stehen in [BACKEND_SETUP.md](BACKEND_SETUP.md). Der `/workspace`-Modultest ist davon getrennt.

## Implementierter Verbund

Kunde → Projekt → LV → Material-/Zeitansätze → Kalkulation → freigegebene Angebotsfassung → beauftragtes Angebot → freigegebenes Aufmaß → Rechnungsfassung → Zahlung → Nachkalkulation.

- Durchgängig gleiche Projekt-, Positions- und Beleg-IDs; Auswahl eines anderen Projekts isoliert dessen Vorgänge.
- 36 erreichbare Arbeitsbereiche; 29 mit fachbezogenen Datensatzmasken, übrige mit abgeleiteten Berechnungen, Ausgaben oder Import.
- Mengen, Preise, Minuten, Materialverbrauch, Gerät und Fremdleistung mit validierten Zahlen; deutscher Dezimalwert und Dezimalpunkt möglich.
- Freigegebene kaufmännische Basisdaten können nicht überschrieben werden; Dokumentfassungen behalten historische Kundendaten und Preise.
- Angebots- und Rechnungspositionen, Rundung, Umsatzsteuer und Käuferreferenz werden aus dem Projektbestand übernommen.
- Geprüfte Aufmaßmengen, Zeiten, markierte Eingangsbelege, NU-Kosten und Zahlungen fließen in Controlling ein. Mehrfachansatz von Kosten ist organisatorisch zu vermeiden.
- CSV-LV mit Vorschau und atomarer Übernahme; bestehende LV-Arbeitskopien können ausdrücklich einem ausgewählten Projekt zugeordnet werden. Altbestand wird nicht gelöscht.
- Testdateien JPG/PNG/WebP/PDF bis 2 MB pro Datei zuordnen; JSON-Sicherung, Wiederherstellung, CSV-Exporte und Druckansichten.
- Materialbedarf aus LV-Menge und Verbrauch; Bestellentwurf für offene Mengen; freigegebene Teil-/Restlieferungen und Prüfung gegen Überlieferung.
- Lieferantenpreise für denselben Artikel und dieselbe Einheit inklusive Rabatt und Fracht vergleichen, Quelle/Stand übernehmen und Preishistorie erhalten.
- CSV-Preislisten mit Vorschau und atomarer Artikelübernahme. Neue Artikel stehen auf Prüfung; Änderungen bestehender freigegebener Preise bleiben als Prüfvorlage separat, bis sie ausdrücklich übernommen werden.
- Mitarbeiter projektübergreifend für Zeiträume reservieren; Doppelbelegung verhindern; Stornierungen bleiben nachvollziehbar.
- Handschrift auf Finger-/Stift-/Mausfläche erfassen; Unterschrift an Protokoll, Projekt-, Kunden- und Briefkopfstand binden. Unterschriebene Abnahmen und Regievorgänge können nicht überschrieben werden.
- Lokales Änderungsjournal; Schreibkonflikte aus anderen Fenstern und Speicherfehler werden gemeldet.
- Gemeinsame Suche nach Kunden, Projekten und Vorgängen; fällige/überfällige Vorgänge aus tatsächlich gespeicherten Fristen statt Beispielmeldungen.
- Kumulative Abschlags- und Teilrechnungen; Schlussrechnung des verbleibenden freigegebenen Leistungsstands. Stornorechnung als Gegenbuchung mit eigenem Beleg; Rückzahlungen getrennt von Zahlungseingängen.
- Nachtragsangebote mit Hauptangebotsbezug; nur beauftragte Nachträge fließen in die Rechnung ein.
- Wahlweiser Zielpreis pro Position mit Anzeige des kalkulierten EP und Deckungsbeitrags; freigegebene Betriebskostenansätze als Vollkostensatz übernehmen, dabei AGK auf 0 setzen.
- Alter Importmanager bleibt erreichbar; eigene Bildschirmänderungen lösen kein fortlaufendes Neurendern mehr aus. Ausfall optionaler externer Parser verhindert das Laden des lokalen Importmanagers nicht mehr. Externe Parser sind unter der bestehenden Hosting-CSP weiterhin nicht produktiv verfügbar.

## Modulabnahme

| Nr. | Bereich | In diesem Ausbau | Vor produktiver Fertigstellung offen |
|---|---|---|---|
| 01 | Kunden und Kontakte | Stammdaten, E-Mail, Käuferreferenz, zentrale API | Datenbank-Liveeinrichtung, Kontaktrollen |
| 02 | Projekte und Kostenstellen | Zuordnung, Phasen, zentrale Mandantentrennung und Grundrechte | Datenbank-Liveeinrichtung, Projektmitgliedschaften |
| 03 | Betriebs- und Lohnkosten | Kosten/Stunden-Auswertung, Vollkostensatz übernehmen | Vollständiges Kostenmodell, Feiertage |
| 04 | Leistungsverzeichnisse | Positionen, Einheit, Menge, Kostenbestandteile | Hierarchie, Nachtragsversionen |
| 05 | Importmanager | CSV-Prüfung, Übernahme, Altbestandskopie | GAEB-Varianten, PDF/OCR/Excel validieren |
| 06 | LV- und Vertragsprüfung | Position, Quelle, Befund, Rückfrage | Regelbasierte Prüfungen |
| 07 | Kalkulation und Zielpreis | Komponenten, EP/GP, Zuschläge, Zielpreis und Deckungsbeitrag | Rabatte, weitere Sonderpositionen |
| 08 | EFB und Kalkulationsblätter | Komponentenübersicht | EFB 221/222/223 mit Feldmapping |
| 09 | Leistungskatalog und Zeitwerte | Quelle, Zeitansatz, Übernahme ins LV | Fachkatalog, Nutzungsrechte |
| 10 | Material und Systeme | Artikel, Quelle, Preisfreigabe, Historie | Systemkompatibilität, Herstellerunterlagen |
| 11 | Lieferanten und Preisvergleich | Artikelbezogener Vergleich, Rabatt/Fracht, Preisquelle | Automatische Händleranbindungen, Gebindeumrechnung |
| 12 | DATANORM und Preislisten | CSV-Vorschau, Artikelabgleich, Prüffreigabe, Quellenregister | DATANORM-Parser, Excel-Spaltenmapping |
| 13 | Angebote | Unveränderliche Preisfassung, Druck, CSV | Versand, Angebotsvarianten, Bedingungen |
| 14 | Auftrag und Bestätigung | Haupt- und Nachtragsangebote beauftragen, gemeinsamer Rechnungsbezug | Weitere Auftragsänderungen und Bestätigungsdokument |
| 15 | Schriftverkehr und E-Mail | Nachrichtentwurf, Projektbezug | Mailkonto, Versand, Rücklauf, Zustellnachweis |
| 16 | Einkauf und Bestellung | Bedarf aus LV/Verbrauch, Bestellentwurf, Preis | Mehrere Materialien pro Position, Bestellversand |
| 17 | Liefertermine und Logistik | Bestellbezug, Teil-/Restlieferung, offene Mengen | Automatische Terminwarnung, Toleranzregeln |
| 18 | Personal und Termine | Personalstamm, Kostensatz, Einsatzzeiträume mit Konfliktprüfung | Kalenderdarstellung, Teilzeitschichten, sensible Stammdaten, DATEV/SV |
| 19 | Technische Prüfung | Befund, Positionsbezug, Entscheidung | Validierte Fachprüfungen |
| 20 | Arbeitsschutz und Unterweisung | Gefahr, Maßnahme, Teilnehmer | Vollständige Gefährdungsbeurteilung und Nachweise |
| 21 | Mobile Bauleitung | Tagesbericht, Wetter, Bautenstand | Offline-Synchronisation |
| 22 | Fotos und Mängel | Befund, Frist, Zuständigkeit, Datei | Verortung, serverseitige Erinnerungen |
| 23 | Zeiten und Regie | Stunden, Mitarbeiter, Leistung, Kosten, handschriftliche Bestätigung | Automatische Kundenkopie, zentrale Übergabe |
| 24 | Fremdleistungen | NU, Leistungsumfang, Aufwand | Vergabe- und Rechnungsabgleich |
| 25 | Aufmaß und Plan | Faktoren, Abzüge, LV-Abgleich | Kalibrierte Planmessung, Drohnenmessung |
| 26 | Abnahme und Unterschrift | Ergebnis, Vorbehalte, Unterschrift auf Display, gebundener Dokumentstand | Zentrale Originalablage, Signaturdienste |
| 27 | Ausgangsrechnungen | Abschlag, Teil-/Schlussrechnung, Storno; kumulativer Aufmaß-/Nachtragsbezug | Steuerliche Sonderfälle, XRechnung/ZUGFeRD |
| 28 | Eingangsrechnungen | Beleg, Steuer, Bestellbezug, Kostenfreigabe | OCR/E-Rechnung, automatischer Prüfabgleich |
| 29 | Zahlung und Kontierung | Zahlungseingang/Rückzahlung, Belegbezug, Restbetrag/Guthaben | Bankanbindung, Kontenmapping |
| 30 | Monatsabschluss und Export | Projektakte/Belegübersicht exportieren | Monatsperioden, DATEV-Paket |
| 31 | Nachkalkulation und Controlling | Erfasste Ist-Kosten, Umsatz, Restzahlungen | Gemeinkosten, Vollständigkeitskontrolle |
| 32 | DMS, Scanner, OCR und Barcode | Dateizuordnung, Referenz, Beschreibung | Scanner/OCR, zentrale Dateiablage |
| 33 | Technik und Wissensregister | Quelle, Fassung, Geltung | Lizenzierte Quellen und Versionsprüfungen |
| 34 | Ausschreibungsmonitor | Vergabe, Fundstelle, Frist, Entscheidung | Automatische Quellenabfrage/Übersicht |
| 35 | Sachverständigenwesen | Auftrag, Feststellung, Bewertung, Dateien | Vollständige Gutachten-/Honorarvorlagen |
| 36 | Energieberatung | Bauteile und Variantenvergleich | Energieausweis, Berechnungsverfahren, Förderprüfung |

## Produktionsvoraussetzungen

Die bisherige clientseitige Master-Hash-Anmeldung wurde aus der Hauptanwendung entfernt. Die neue Better-Auth-/PostgreSQL-Anbindung prüft echte Sitzungen und Fachfreigaben serverseitig. Dafür müssen Datenbank, Auth-Tabellen, Secrets und Administratorkonto noch eingerichtet und live geprüft werden. Im separaten lokalen Modultest bleiben Freigaben fachliche Testmarkierungen.

Vor echten Betriebsdaten: zentrale Datenbank, Mandanten und Rollen, serverseitige Sitzungen, geschützte Personalablage, revisionssicherer Audit-Trail, zentrale Dateiablage mit Backups, serverseitige Termine und Schnittstellen einrichten. Bisherige Browserbestände benötigen eine kontrollierte Migration; sie werden nicht automatisch zusammengeführt.

## Validierung dieses Standes

- `node test-project-core.cjs`: Preisrechnung, Angebots-/Rechnungssnapshot, beauftragte Preise trotz später geändertem Kalkulationssatz, Aufmaß, Kosten und Zahlungsrest, Projekttrennung, CSV-Batch ohne Teilimport, doppelte Positionen, Schreibkonflikt, Quota-Fehler, Sicherung.
- `test-project-workflows.cjs` mit jsdom: Formulare vom Kunden bis zur Rechnung, alle 36 Bereichsrouten, Pflichtfelder, Suche, CSV-Vorschau, Übernahme, Projektwechsel, ungespeicherte Eingaben und erneutes Laden.
- `test-project-execution.cjs`: Materialbedarf/Bestellung/Teil-/Restlieferung mit Überlieferungsprüfung; Lieferantenpreisvergleich und historische Bestellpreise; projektübergreifende Einsatzkonflikte und Stornierung; gebundene Unterschrift, Änderungssperre, Manipulationserkennung bei Wiederherstellung; CSV-Preislisten ohne Teilimport, alte Preise bleiben bis Freigabe aktiv.
- DOM-Test zusätzlich: CSV-Preisvorschau/-übernahme, Unterschrift über simulierte Pointer-Ereignisse, projektübergreifende Suche, Seitennavigation nach Untermodulen und Stabilität des bisherigen Importmanagers.
- Syntaxprüfung der neuen JavaScript-Dateien.
- Neue Rechnungsarten: kumulative Mengen, Nachträge, Storno, erneute Rechnung, Erstattungsgrenzen und unveränderte Originale bestanden.
- Serverdienst: Mandantentrennung, Freigabe-/Personalrechte, Entgelt-Ausblendung, konkurrierende Änderungen, Audit-Verkettung, Origin-Prüfung und sichere Fehlermeldungen bestanden.
- Zentraler Client: Erfolgsanzeige erst nach Serverantwort; Schreibfehler erhalten Eingaben; keine automatische Browserablage zentraler Datensätze bestanden.
- Projektmigration und tatsächliche parameterisierte Speicheraussagen in PGlite/PostgreSQL ausgeführt: atomare Speicherung einschließlich Logbuch, konkurrierende Versionsprüfung und Mandantentrennung bestanden.
- Kein vollständiger Browser-/iPhone-Test: Die geschützte Modultest-Vorschau wurde im Cloud-Browser geöffnet, die Benutzeranmeldung dort jedoch abgelehnt. Die Betriebsfassung mit PostgreSQL ist noch nicht live eingerichtet. DOM-/SQL-Tests ersetzen diese Live-Abnahme nicht.
- Keine produktive Veröffentlichung oder Freigabe.

Nächste Abnahme: Browser-/iPhone-Test, persistentes Backend und Import- sowie kaufmännische Sonderfälle. Die offenen Spezialfunktionen oben müssen einzeln umgesetzt und fachlich abgenommen werden.

## Ausführen der Tests

Node.js ab 22; `npm install` und `npm test`, danach `npm run check`. DOM-Tests verwenden jsdom 30.1.2. In dieser Arbeitsumgebung wurde die bereits installierte jsdom-Abhängigkeit über `DWP_TEST_JSDOM` verwendet.

Historischer Bereitstellungsstand vor diesem Ausbau: Der damalige Push war blockiert. Eine separate geschützte Modultest-Vorschau wurde direkt bereitgestellt; die Anmeldung war nicht vollständig im Browser geprüft. Die Betriebsfassung und die ursprüngliche Produktionsdomain wurden noch nicht auf diesen Stand umgestellt. Der aktuelle Repository- und Live-Stand wird im Änderungsantrag festgehalten.

## Verbund- und Zugriffsausbau dieser Sitzung

Alle 36 Bereiche sind genau einem von sieben Workflowabschnitten zugeordnet. „Workflow“ zeigt Datenstände, offene Übergaben und nächsten Arbeitsbereich. Projektphasen werden nacheinander übergeben und serverseitig anhand der vorhandenen Fachdaten geprüft. Neue Projekte beginnen in Erfassung. Fachliche Sperren in Vertrag, technischer Prüfung und Sicherheit erfordern dokumentierte Erledigung; Angebote und Aufträge umgehen solche Sperren nicht. Schlussabschluss verlangt beauftragte/freigegebene Mengen, unterschriebene vollständige Abnahme, erledigte Mängel, geschlossene Lieferungen, geprüfte kaufmännische Vorgänge, Schlussrechnungen und ausgeglichene Zahlungen. Geschlossene Projekte werden erst nach begründeter, berechtigter Wiederöffnung wieder geändert.

Fachvorgänge können auf andere Vorgänge desselben Projekts oder Stammdaten verweisen. Projektfremde und Selbstverweise werden verhindert. Eine Angebotsfassung kann nicht doppelt beauftragt werden. Bei mehreren Hauptaufträgen muss der Rechnungsbezug ausdrücklich ausgewählt werden. Nachkalkulations-Sollkosten und Materialbedarf verwenden nach Beauftragung den eingefrorenen Angebotsstand. Verknüpfte kostenrelevante NU-Eingangsrechnungen ersetzen den vorläufigen NU-Kostenansatz. Nicht verknüpfte doppelte Erfassungen kann das System weiterhin nicht automatisch erkennen.

Eigentümer-/Geräteexportschutz, Anmeldeprotokoll, Modulhäufigkeit und einmaliger Bildabruf sind serverseitig ergänzt. Einrichtung, Grenzen und Live-Schritte stehen in BACKEND_SETUP.md. Die persönliche Zugangsliste wird separat gespeichert und enthält keine neu erfundenen Betriebszugangsdaten.

Prüfung: bisherige Regressionen plus `test-workflow-integration.cjs`, `test-access-security.cjs` und `test-access-client.cjs`. Sie prüfen den projektübergreifenden Verbund, Übergabesicherungen, technische Sperren, Kostenersatz, Abschluss/Wiederöffnung, Eigentümer-/Geräte-/Mandantentrennung, tatsächliche SQL-Migrationen, atomaren Einmalabruf, Audit-Snapshot-Bereinigung, alle 36 Modulzähler, Login-Hook und API-/DOM-Interaktion.

Dieser Stand bedeutet weiterhin **nicht**, dass alle 36 Spezialfunktionen oder produktive Schnittstellen vollständig fertiggestellt sind. Die vorherige Modulabnahmetabelle bleibt maßgeblich für GAEB/PDF/DATANORM, EFB/E-Rechnung, OCR, Fachberechnungen und externe Integrationen. Eine neue funktionierende Live-Anmeldung, Gerätefreigabe, iPhone-/HP-Abnahme oder Umstellung der Hauptdomain ist noch nicht bestätigt.
