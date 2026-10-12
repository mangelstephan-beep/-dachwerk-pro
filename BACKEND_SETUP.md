# DachWerk Pro – zentrale Betriebsfassung

Die Hauptanwendung verwendet jetzt eine serverseitige Anmeldung und zentrale Schreibvorgänge. Die bisherige clientseitige Master-Hash-Anmeldung und die automatische Freischaltung über `sessionStorage` wurden entfernt. Der separate `/workspace`-Modultest bleibt browserlokal und ist kein Produktionszugang.

## Bereits implementiert

- Better Auth 1.7.7 mit E-Mail/Passwort, serverseitigen Sitzungen, begrenzter Sitzungsdauer und datenbankgestützter Anmelderatenbegrenzung.
- Selbstregistrierung über öffentliche Endpunkte deaktiviert; initiales Administratorkonto wird ausschließlich durch das lokale Einrichtungsskript angelegt.
- Benutzer besitzen serverseitig gepflegte Rolle und Mandant. Diese Felder können bei Anmeldung oder Registrierung nicht durch einen Browser gewählt werden.
- API für die gemeinsamen Fachvorgänge; Freigaben, Personalpflege, Einstellungen und Wiederherstellung werden serverseitig geprüft.
- PostgreSQL-Projektbestand mit Mandantenschlüssel und Versionsprüfung. Gleichzeitige Änderungen überschreiben einander nicht stillschweigend.
- Projektänderung und Audit-Eintrag werden gemeinsam durch ein SQL-Statement gespeichert. Audit-Ereignisse enthalten den authentifizierten Benutzer und eine Hashverkettung.
- Die Oberfläche übernimmt zentrale Änderungen erst nach positiver Serverantwort. Bei Schreibfehlern bleiben die eingegebenen Werte erhalten.
- Im zentralen Modus werden die Datensätze nicht automatisch in `localStorage` kopiert.

## Rollen im Fach-API

| Rolle | Fachvorgänge ändern | Freigaben | Personalstamm / Entgelt | Einstellungen / Wiederherstellung |
|---|---|---|---|---|
| admin | Ja | Ja | Ja | Ja |
| manager | Ja | Ja | Einsatzplanung; kein Entgelt | Nein |
| editor | Ja | Nein | Nein | Nein |
| hr | Nur Personal/Einsatzplanung | Personalpflege | Ja | Nein |
| viewer | Nein | Nein | Entgelt wird ausgeblendet | Nein |

Dies ist das implementierte Grundmodell. Projektbezogene Mitgliedschaften, vollständige Personalakten, Rollenverwaltung über eine Administrationsmaske und Einladungen sind noch weiter auszubauen. Die übrigen kaufmännischen Daten sind innerhalb eines Mandanten für angemeldete Rollen lesbar; vor Verwendung in einem Betrieb muss die gewünschte Leserechteverteilung abgestimmt werden.

## Noch nicht eingerichtet

Im verbundenen Vercel-Konto wurde am 12.10.2026 keine Datenbankintegration gefunden. Es gibt deshalb noch keine zentrale Live-Datenbank und keine Live-Abnahme dieser Betriebsfassung. Die produktive Konfiguration wurde nicht durch Testzugangsdaten ersetzt. Die fehlende Konfiguration führt zu einer Fehlermeldung und öffnet keinen ungeschützten Ersatzmodus.

## Einrichtung

1. PostgreSQL für dieses Projekt bereitstellen, beispielsweise über die vorhandene Vercel-Marketplace-Anbindung für Neon; Preview und Production müssen getrennte Datenbestände nutzen.
2. Die vier Variablen aus `.env.example` ausschließlich im jeweiligen Serverumfeld setzen. `BETTER_AUTH_SECRET` muss mindestens 32 Zeichen besitzen; `BETTER_AUTH_URL` ist in Production die tatsächliche HTTPS-Domain. Secrets niemals in Git oder Chat eintragen.
3. Mit migrationsberechtigter Verbindung `npm run db:setup` ausführen. Das Skript legt Auth- und Projekttabellen an.
4. Das erste Administratorkonto über `npm run admin:create` anlegen. Das Skript erwartet ein JSON-Objekt mit `name`, `email` und `password` auf stdin. Passwort mindestens 12 Zeichen; keine Passwörter als Prozessargumente oder in den Projektdateien speichern.
5. Laufzeitverbindung auf die benötigten Tabellenrechte begrenzen. Die Audit-Tabelle benötigt für die Anwendung SELECT/INSERT, keine UPDATE-/DELETE-Rechte. Ein Datenbank-Owner ist technisch mächtiger als dieses Grundmodell; die Hashverkettung ist kein externer revisionssicherer Archivdienst.
6. Sign-in → Kunden-/Projektanlage → vollständiger Fachablauf → Sign-out mit der Live-Datenbank prüfen. Erst danach Browserbestände kontrolliert importieren und die ursprüngliche Hauptdomain auf diesen Stand freigeben.

## Abnahme und Grenzen

Die echten Projekt-Migrations- und Speicheraussagen wurden in einer eingebetteten PostgreSQL-Engine (PGlite) ausgeführt: Datenhaltung, Mandantentrennung, konkurrierende Versionsprüfung und atomarer Audit-Eintrag sind geprüft. Der Auth-HTTP-Adapter und die Fachberechtigungen wurden separat geprüft; das ist noch keine Live-Abnahme von Better Auth gegen eine bereitgestellte PostgreSQL-Datenbank.

Dateien werden im aktuellen Modell als begrenzte Testdateien im Datensatz geführt. Für große oder umfangreiche digitale Bauakten bleibt eine zentrale Dateiablage mit Backups, Berechtigungen und Wiederherstellung erforderlich. Ebenso offen bleiben die im Modulstatus genannten Fachschnittstellen und das vollständige produktive Berechtigungskonzept.

## Eigentümer, Geräte und Zugriffsschutz – Ausbau 12.10.2026

`db:setup` führt nun beide Projektmigrationen aus. `DWP_OWNER_USER_ID` muss auf die stabile Benutzer-ID des persönlichen Administratorkontos gesetzt werden. Ohne diese Konfiguration sind Exporte und Zugriffsberichte gesperrt. Kein automatisches Hochstufen eines Benutzers und keine Erstbenutzerfreigabe.

Nur im vertrauenswürdigen Serverumfeld: `npm run device:pair` erwartet auf stdin `{"slot":"iphone"}` oder `{"slot":"hp-laptop"}`. Das Skript liefert einen zufälligen Freigabecode, dessen Hash gespeichert wird. Der Code gilt zehn Minuten und einmal; er wird auf dem betreffenden Gerät in „Zugriff und Nutzung“ eingelöst. Die App darf selbst keine Freigabecodes erzeugen. Nur diese zwei Slots werden akzeptiert. Neue Freigabe ersetzt die alte des Slots; Server und Cookie begrenzen die Gerätezulassung auf 30 Tage.

Exportprüfung: Eigentümer-ID + Administratorrolle + zugehöriges HttpOnly-/Secure-/SameSite-Cookie + Mandant. Anderer Administrator, fremder Mandant, gefälschtes Cookie und nicht registriertes Gerät werden abgelehnt. Das Cookie ist browsergebunden, keine Hardwareattestierung; gestohlene Sitzung plus Gerätecookies bleiben ein Restrisiko. Hardwaregebundene Passkeys und vollständige Zweifaktorverwaltung sind noch offen.

Dateiinhalte werden aus GET-/Mutationsantworten und darin enthaltenen Audit-Snapshots entfernt. Ein eigenes POST liefert Bilder einmal pro Benutzer und Datei-ID. Die Datenbank entscheidet atomar, sodass parallele Abrufe kein zweites Bild liefern. PDFs werden hier nicht angezeigt; vollständige Dokumente sind über den Eigentümerexport erreichbar. Die Einmalregel ist strikt: Netzwerkabbruch oder versehentliches Schließen nach Verbrauch begründet keine zweite Anzeige.

Die Oberfläche zeigt Wasserzeichen mit Benutzer und Zeit, schließt Bilder nach 30 Sekunden und entfernt sie beim Hintergrundwechsel. Screenshots, Fotos, bereits gelieferte Bildbytes und technisch versiertes Extrahieren freigegebener Bildschirmdaten können durch eine Web-App nicht zuverlässig verhindert werden. `display-capture=()` beschränkt ausschließlich die Web Screen Capture API, nicht Betriebssystem-Screenshots.

Better-Auth-Sitzungsanlage protokolliert erfolgreiche Anmeldungen. Modulöffnungen laufen über den authentifizierten Protokollendpunkt. Häufigkeit wird für 30 Tage nach Benutzer/Modul ausgewertet; letzter 200-Ereignisverlauf und Geräteübersicht sind eigentümerbeschränkt. Dies misst Aufrufe, keine aktive Arbeitsdauer. Der Benutzerhinweis ist in der zentralen Oberfläche sichtbar. Datenbank-Aufbewahrung/Löschfristen und weitere produktive Datenschutz-/Berechtigungsanforderungen sind noch nicht eingerichtet.

Diese Änderungen sind lokal gegen eine PostgreSQL-Engine, den serverseitigen API-Code und die DOM-Oberfläche getestet. Sie ersetzen keine abgeschlossene Live-Abnahme. Der lokale `/workspace`-Modultest behält ausschließlich Beispieldaten und erhält keine Produktionsschutz-Zusagen.
