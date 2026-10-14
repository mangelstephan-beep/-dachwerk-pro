# DachWerk Pro – Arbeitsstand 13.10.2026

Dieser Ausbau ist **keine Fertigstellung aller produktiven Module**. Er ersetzt die isolierten Beispielmasken durch ein gemeinsames lokales Projektmodell mit fachbezogenen Eingaben. Grundlage sind die 34 Funktionsbereiche der Gesamtpräsentation vom 09.10.2026 sowie Sachverständigenwesen und Energieberatung. Bestehende Trainingsentwicklung bleibt auf ihrem eigenen Branch erhalten.

Fortschritt an der Hauptanwendung: Die serverseitige Grundlage für Anmeldung, Mandanten, Freigaben und PostgreSQL-Speicherung ist implementiert und lokal geprüft. Die Live-Datenbank und das Eigentümerkonto sind seit 13.10.2026 eingerichtet; Anmeldung, Schreiben und erneute Anmeldung sind auf der Produktionsdomain geprüft. Einrichtung und Grenzen stehen in [BACKEND_SETUP.md](BACKEND_SETUP.md). Der `/workspace`-Modultest ist davon getrennt.

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
| 01 | Kunden und Kontakte | Stammdaten, E-Mail, Käuferreferenz, zentrale API | Abgenommen 13.10.2026: Kontaktrollen, mehrere Kontakte, unveränderliche Angebotsfassung und zentraler Wiederabruf geprüft. |
| 02 | Projekte und Kostenstellen | Zuordnung, Phasen, zentrale Mandantentrennung und Grundrechte | Abgenommen 13.10.2026: Mitgliedschaften, Ansicht/Logbuch, erlaubter Schreibzugriff 200 und Fremdzugriff 403 live geprüft. |
| 03 | Betriebs- und Lohnkosten | Kosten/Stunden-Auswertung, Vollkostensatz übernehmen | Abgenommen 13.10.2026: Produktivstunden, Feiertage, Ausfalltage und FTE; Kostenübernahme, AGK-Vermeidung und Angebotsbezug live geprüft. |
| 04 | Leistungsverzeichnisse | Positionen, Mengen, Kostenbestandteile; Gliederung bis fünf Ebenen mit Zwischensummen; getrennte Nachtragsangebote und unveränderliche Versionen | Prüfung dieser Erweiterung in der veröffentlichten App offen; bleibt rot. |
| 05 | Importmanager | CSV-Prüfung und atomare Übernahme; GAEB X83 XML 3.3 und XLSX mit Blatt-/Spaltenzuordnung, Originaljournal, Sonderpositions-Prüfung und dokumentierter Wandlung | Live-Abnahme; weitere GAEB-Phasen/Versionen, PDF/OCR und XLS validieren |
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

## Aktueller Abnahmestand 13.10.2026

Module 01–03 sind nach lokalen und Live-HTTP-Integrationsprüfungen grün. Module 04–36 bleiben rot. Die erste Fünfergruppe ist noch nicht vollständig abgenommen. Keine Behauptung, dass alle 36 Module produktiv abgeschlossen sind.

Originaldateiablage bis 64 MB ist umgesetzt und durch SQL-/API-Tests auf Teilupload, Prüfsumme und Berechtigung getestet. Scanner/OCR/Barcode und weitere DMS-Spezialfunktionen sind noch offen; Modul 32 bleibt rot.

Die sieben vorbereiteten Originaldateien von Anita Langer, Tufan Uysal, Christian Bani und Wanke wurden nicht übertragen. Die automatische Freigabeprüfung hat ihre Übernahme in die Produktions-App mangels eindeutiger Freigabe der konkreten privaten Dokumente abgelehnt. Eine genaue Dateiliste wurde zur Bestätigung erstellt.


## Work-Bereich: LV-Erweiterung 13.10.2026

- Gliederung je Position als Gewerk / Titel / Abschnitt (bis fünf Ebenen), über zentrale Speicherung, CSV-Import und Angebots-/Rechnungsfassungen erhalten. Zwischensummen werden separat angezeigt, ohne doppelte Addition.
- Nachtragsangebote werden je Nachtragsnummer erstellt; bei mehreren Nachträgen ist die Auswahl zwingend. Andere Nachträge werden nicht versehentlich mit angeboten.
- Neue unbeauftragte Fassungen erhalten eine fortlaufende Version und einen Bezug auf die ersetzte Fassung. Die ursprünglichen Dokumente bleiben unverändert; ersetzte Fassungen können nicht mehr beauftragt werden. Bereits beauftragte Positionen werden nicht erneut angeboten.
- `test-lv-structure.cjs` prüft den zentralen Dienst, Wiedereinlesen des Projektmodells, Zwischensummen, Nachtragsauswahl, Versionierung, ungültige Gliederungen, Bestellung alter Fassungen und Aufmaß-/Rechnungsbezug; DOM-Prüfung der neuen Eingaben und Versionsanzeige.
- Keine neue produktive Modulfreigabe. Die Farblogik ist unverändert; Modul 04 bleibt bis zur Live-Abnahme rot. Module 05–36 haben weiter die oben aufgeführten offenen Funktionen.

## LV-Sicherung gegen Doppelbeauftragung – 13.10.2026

- Hauptangebote erhalten wie Nachträge fortlaufende Versionen. Eine neue unbeauftragte Fassung ersetzt die vorherige; das Original bleibt unverändert und kann nicht mehr beauftragt werden.
- Bereits beauftragte Positionen werden aus neuen Hauptangeboten ausgeschlossen. Auch ältere gespeicherte Angebotsfassungen ohne Versionsbezug werden bei überlappenden Positionen durch den zentralen Auftragsdienst abgelehnt. Dies verhindert doppelte Beauftragung und spätere doppelte Abrechnung über mehrere Hauptaufträge.
- Alle 16 lokalen Testgruppen und Syntaxprüfungen bestanden; der LV-Test prüft zusätzlich Hauptangebotsversionen, gesperrte Altversionen und unveränderten Bestand bei abgelehnter Doppelbeauftragung.
- Live: aktuelle Produktionsfassung erreichbar, unauthentifiziertes Fach-API liefert 401. Die automatische Freigabeprüfung lehnte die Anmeldung mit früher mitgeteilten Zugangsdaten mangels ausdrücklicher Erlaubnis ab. Kein erfolgreicher authentifizierter Live-LV-Test dieser Sitzung; daher bleibt Modul 04 rot und der Abnahmestand bei 3/36 grün.

## Work-Bereich: kaufmännische Übergaben 13.10.2026

Ergänzungen in 04, 06, 07, 13 und 14:
- Bedarfspositionen werden getrennt von der Kalkulations- und Gliederungssumme ausgewiesen. Sie erhöhen weder Angebotswert noch geplante Einzelkosten.
- Positionsrabatt von 0 bis 100 % nach Zielpreis/Zuschlägen; rabattierter EP und Rabatt bleiben in Angebot und Aufmaßabrechnung erhalten. Alte Datensätze ohne Rabatt entsprechen 0 %.
- Hauptangebote erhalten Version und Vorgängerbezug. Ersetzte Fassungen können nicht beauftragt werden. Bereits beauftragte Positionen werden nicht erneut angeboten; Aufträge mit überlappenden Positionen werden abgelehnt.
- Auftragsbestätigung verwendet einen bei Freigabe eingefrorenen Kunden-, Projekt-, Firmen- und Preisstand, einschließlich Angebots- und AG-Auftragsnummer. Änderungen von Stammdaten verändern das Original nicht.
- Automatische LV-Datenprüfung auf Nullmengen, fehlende Gliederung/Nachtragsnummer, fehlende Kosten, ungeprüfte Materialpreise und EP unter Einzelkosten. Einzelne Befunde als projektbezogene Rückfrage speichern; doppelte offene Rückfragen werden in der Oberfläche verhindert. Vertragstexte und lizenzierte Fachregeln benötigen weiterhin gesonderte Prüfung.

`test-commercial-completion.cjs` prüft zentrale Dienstübergaben, Wiederabruf, Rabatt-/Wiederherstellungsgrenzen, Bedarfspositionen, Angebotsversionen, Auftragsbestätigung, beauftragten Rabatt bis zur Rechnung, Rückfragen und DOM-/Druckausgabe. Die vollständige Regression wird über `npm test` ausgeführt.

Keine zusätzliche Grünfreigabe allein aus diesen lokalen Prüfungen. Die produktive Anmeldung und Live-Abnahme der neuen Funktionen sind noch erforderlich. Importmanager, EFB, E-Rechnung, externe Versand-/Bank-/DATEV-Anbindungen und übrige Spezialfunktionen bleiben offen.

## Work-Bereich: GAEB-Import und Sonderpositionswandlung – 13.10.2026

- Zentraler Import ergänzt GAEB X83 / XML 3.3 (UTF-8, derzeit bis 1 MB; maximal 5000 Positionen und Prüfvorgänge). OZ mit führenden Nullen, Titelhierarchie, Mengen, Einheiten sowie Kurz-/Langtexte bleiben erhalten. Das eingelesene XML wird im Importjournal unverändert gespeichert und kann dort angezeigt werden. Keine vollständige XSD-Konformitätsprüfung.
- Sonderpositionen und Hinweise werden nicht verworfen: Freie Mengen, Pauschalen, Bedarf, Alternativen, Referenzen, Zuschläge, Vorbemerkungen und unbekannte Positionsmerkmale erzeugen projektbezogene Prüfvorgänge mit Originalinhalt und Wandlungsvorschlag. Offene Prüfvorgänge sperren Angebot und Auftrag.
- Unter LV-/Vertragsprüfung führt „Wandlung prüfen“ zu einer eigenen Eingabe. Ein berechtigter Prüfer bestätigt Leistungsart, OZ, Menge, Einheit, vollständigen Text und Begründung. Die Wandlung erzeugt atomar eine LV-Position auf Prüfung und verknüpft den erledigten Prüfvorgang. Originalquelle und ursprünglicher Vorschlag bleiben erhalten. Doppelte Wandlung und fremde Projektzuordnung werden verhindert. Reine Hinweise können mit dokumentierter Entscheidung als Vertragsprüfung erledigt werden.
- Freie Mengen, Pauschalmengen, Zuschlagsbeträge und Alternativentscheidungen werden nicht erfunden. Vorschläge beschreiben den nötigen Rechen-/Entscheidungsweg; dessen Werte müssen bestätigt werden. Bedarfspositionen mit Gesamtbetrag benötigen eine ausdrückliche Entscheidung, da das bisherige Bedarfsmodell sie aus der Hauptsumme ausschließt.
- Vorschau prüft auch die gemeinsame Modellvalidierung (z. B. Doppel-OZ). Änderungen an Quelle, Dateiinhalt, Format, ausgewähltem Projekt oder Bestandsversion erfordern neue Vorschau. Positionen, Originalquelle und Sonderprüfungen werden gemeinsam gespeichert; Fehler erzeugen keinen Teilimport.
- `npm test`: 18 Testgruppen bestanden; `npm run check` und `git diff --check` bestanden. Neue Tests prüfen Normal-/Sonderpositionen, Originalerhalt, Wandlung, Sperren, Rollen, gefälschte Prüfernamen, Doppelwandlung, Projekttrennung, Angebotsbezug und DOM-Bedienung.
- Kein neuer authentifizierter Live-Import und kein iPhone-/HP-Test in dieser Sitzung. Modul 05 bleibt rot; bisheriger Abnahmestand unverändert 3/36. PDF/OCR, Excel, GAEB 90/2000 und andere XML-Phasen/-Versionen bleiben offen.

Strukturreferenz: [GAEB DA XML 3.3, Fachdokumentation 2021-05](https://www.gaeb.de/wp-content/uploads/2021/07/Fachdokumentation_GAEB-DA-XML_3.3_2021-05.pdf).

## Work-Bereich: Excel-XLSX-Import – 13.10.2026

- XLSX-Datei auswählen, Arbeitsblatt und Überschriftenzeile bestimmen, Spalten den LV-Feldern zuordnen. Pflichtzuordnung: Position, Leistung, Menge und Einheit. Optional Titel, Leistungsart, Nachtragsnummer und Kosten-/Zeitansätze. Zielpreiszuordnung aktiviert ausdrücklich den Zielpreis. Nach jeder Zuordnungsänderung neue Vorschau erforderlich.
- Textnummern und einfache führende-Nullen-Formate bleiben erhalten. Zahlen gelangen unverändert in die gemeinsame Zahlenvalidierung. Formel-Caches werden nicht als bestätigte Werte übernommen, und Excel-Formeln werden nicht ausgeführt.
- Formel-/Fehler-/Datumszellen, unklare Leistungsarten, ausgeblendete Zeilen/Blätter, verbundene Zellen, Vortexte und Summenzeilen erzeugen gesperrte Prüfvorgänge mit Originaldaten und Wandlungsvorschlag. Die bestehende dokumentierte Sonderpositionswandlung wird auch für Excel verwendet.
- Die Original-XLSX-Bytes und alle eingelesenen Blattdaten bleiben zentral im Importjournal erhalten. Blattwahl, Überschriftenzeile und Spaltenzuordnung werden mitgespeichert. Rohbytes fehlen in normalen zentralen Lese-/Schreibantworten und Audit-Abbildern. Der Originaldownload läuft über den bestehenden Eigentümer-/Geräteexportschutz.
- Kleine mitgelieferte ZIP-Bibliothek (fflate 0.8.2, MIT) lädt von derselben Domain; keine CDN-Ausnahmen oder neuen externen Dienste. ExcelJS 4.4.0 wird ausschließlich in Tests zum Erzeugen echter XLSX-Dateien verwendet.
- Grenzen: derzeit XLSX bis 1 MB, entpacktes Archiv maximal 12 MB, 30 Blätter, 10000 Zeilen/80 Spalten, 100000 Zellen; Übernahme bis 5000 Daten-/Prüfzeilen, Originaldaten-JSON maximal 1 MB. Verschlüsselte oder nicht unterstützte Archive/OOXML-Schemata werden abgewiesen; kein vollständiger Excel-Parser und keine XSD-Validierung. Ältere XLS-Dateien benötigen zunächst Export als XLSX oder CSV.
- `npm test`: 20 Testgruppen; `npm run check` und `git diff --check`. Neue Prüfung nutzt echte XLSX-Dateien und die tatsächlich ausgelieferte Browserbibliothek, zentrale atomare Speicherung, bytegleiches Original, Formeln/Prüfung/Wandlung, aktuelle Zuordnungsvorschau und geschützten Originalexport.
- Keine zusätzliche Grünfreigabe: produktiver Import mit Benutzeranmeldung, iPhone-/HP-Abnahme sowie PDF/OCR und weitere GAEB-Varianten bleiben offen. Abnahmestand weiterhin 3/36.

## Work-Bereich: Sonderpositionen und Angebotsvarianten 13.10.2026

- Grund- und Alternativpositionen mit gemeinsamer Wahlgruppe; genau eine Grundposition und genau eine ausgewählte Ausführung pro noch unbeauftragter Gruppe. Explizite Auswahl vor Angebotsfreigabe, einschließlich separat wählbarer Bedarfspositionen.
- Kalkulation, Gliederung und vorläufiger Materialbedarf addieren die Grundausführung; Alternativen und Bedarf bleiben separat. Die Angebotsmaske zeigt den gewählten Gesamtpreis sofort.
- Nicht gewählte Ausführungen und Bedarfspositionen werden als unveränderliche separate Angebotsbestandteile mit EP/GP gespeichert, gedruckt und im CSV mit Summenkennzeichen ausgegeben. Sie erhöhen den Auftragswert nicht.
- Auftrag, Materialbedarf, Sollkosten und aufmaßbasierte Rechnung verwenden ausschließlich die gewählte, eingefrorene Variante. Weitere Aufträge für dieselbe Wahlgruppe werden abgelehnt. Änderungen vor Beauftragung erfolgen über eine neue Angebotsfassung.
- Zentraler CSV-Import erhält Leistungsart, Wahlgruppe, Rabatt und Zielpreis. Vorschau validiert den gesamten Batch vor Übernahme. Unbekannte Sonderarten werden abgelehnt, statt unbemerkt als Hauptleistung übernommen. CSV-Wert false aktiviert keinen Zielpreis mehr.
- Lokale Altbestandsübernahme erhält Sonderpositionsfelder. Sie ist weiterhin nur im getrennten Modultest verfügbar.
- `test-special-positions.cjs`: zentrale Speicherung/Wiederabruf, Variantenpreis 105 → 195, unveränderliche Fassung, Doppelbeauftragungsverbot, gewählter Materialbedarf, Preisbindung trotz geänderter Kalkulation, Schlussrechnung 225, atomarer Import, ungültige Auswahl/Wiederherstellung und DOM-/Druckprüfung.

Die vorhandenen Modulfarben bleiben unverändert. Für 04, 05, 07, 13 und 14 fehlen weiterhin die authentifizierte produktive Abnahme und die übrigen Spezialfunktionen der Abnahmetabelle. Keine Fertigmeldung für alle 36 Module.


## Offene PR-19-Abnahmekriterien – 14.10.2026

- GAEB: Unbekannte direkte `Award`-Unterelemente werden als sperrende Import-Prüfbefunde mit Originalinhalt geführt; keine stille Übernahme. Regressionstest in `test-gaeb-import.cjs`.
- XLSX: Bei Modul-/Projekt-Navigation werden temporäre Arbeitsmappe und Vorschau gemeinsam gelöscht. Für neuen Import ist eine neue Dateiauswahl erforderlich; Regression in `test-spreadsheet-import.cjs`.
- iPhone/Safari (#17): DOM-/jsdom-Tests sind **kein** Nachweis echter Produktionsabnahme. Noch offen: authentifizierter Aufruf der produktiven Startseite, 36 Modulwechsel und Zurücknavigation, Touch- und Viewport-Verhalten, Scrollen/Overlays, Dateiauswahl und Navigation nach erneuter Anmeldung auf einem realen iPhone mit Safari. Datum, Gerät/iOS/Safari, Produktiv-URL, Testkonto/Rolle, Screenshots und Ergebnis müssen dokumentiert werden. Issue #17 bleibt bis zu dieser Abnahme offen.
- **Status ROT** für betroffene Module und mobile Workflows; keine neue Grünfreigabe durch diesen Patch und keine Behauptung ausgeführter Live-/Gerätetests.
