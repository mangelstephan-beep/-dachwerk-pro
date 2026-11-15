# Modul 18 · Kalender, Rückmeldung und WhatsApp-Versand

Stand: 15.11.2026 · Erweiterung von Modul 18 „Personal und Termine“

## Was neu ist
- **Wochenansicht** oben in Modul 18: Montag bis Samstag, je Mitarbeiter eine Zeile, Balken je Einsatz, Farbe je Projekt. Sonntags zeigt der Kalender schon die kommende Woche. Blättern mit ‹ und ›, „Heute“ springt zurück.
- **Startseite „Anstehend“**: echte Einsätze der nächsten 7 Tage statt fester Beispieltermine, mit Rückmeldung (Offen / Zugesagt / Abgesagt) und Knopf „Wochenansicht öffnen“.
- **Rückmeldung**: Der eingeplante Mitarbeiter sagt in DWP zu oder ab. Der Administrator kann eine Zusage oder Absage nachtragen (z. B. nach WhatsApp-Antwort).
- **Per WhatsApp senden**: öffnet WhatsApp mit fertigem Text (Zeitraum, Projekt, Aufgabe, Link zu Modul 18). Es gibt keinen Zustellnachweis.
- Neue Felder im Personalsatz: **Mobilnummer für WhatsApp** und **DWP-Benutzer-ID (Kalenderzugang)**.

## Wer was sieht (serverseitig erzwungen)
| Rolle | Kalender |
|---|---|
| Administrator | alle Einsätze aller Mitarbeiter |
| Personal (hr) | alle Einsätze |
| alle anderen (manager, editor, viewer) | nur eigene Einsätze; keine fremden Termine, Mobilnummern oder Benutzer-IDs |

Die Zuordnung „eigener Einsatz“ läuft über die DWP-Benutzer-ID im Personalsatz. Ohne eingetragene ID sieht der Mitarbeiter nichts. Zusagen/Absagen prüft der Server gegen diese ID. Zusätzlich behoben: Ein Benutzer ohne Mitgliedschaft in einem Projekt mit geplanten Einsätzen konnte den Bestand bisher nicht laden („Sicherung: Einsatzplanung ungültig“).

## Abnahme durch Stephan Mangel (HP und iPhone)
1. Modul 18: bei zwei Mitarbeitern Mobilnummer und DWP-Benutzer-ID eintragen.
2. Je einen Einsatz für beide planen. Wochenansicht und Startseite prüfen.
3. „Per WhatsApp senden“ tippen: WhatsApp öffnet sich mit dem richtigen Empfänger und Text.
4. Mit Mitarbeiterkonto anmelden: nur der eigene Einsatz ist sichtbar, „Zusagen“ funktioniert, beim Administrator steht danach „Zugesagt“.
5. Mit dem zweiten Mitarbeiterkonto prüfen, dass der Einsatz des ersten nicht sichtbar ist.

## Feiertage (Ergänzung 15.11.2026)
- Gesetzliche Feiertage je Bundesland, Standard **Bremen**; umstellbar in Einstellungen → „Bundesland für Feiertage“. Bremen und Niedersachsen haben dieselben Feiertage (inkl. Reformationstag seit 2018).
- Wochenansicht: Feiertag grau schraffiert, Name im Tageskopf und als Zeile über dem Kalender.
- Einsatzliste: „Feiertag: …“, wenn ein Feiertag im Einsatzzeitraum liegt. Die WhatsApp-Nachricht nennt ihn ebenfalls.
- Startseite „Anstehend“: Feiertage der nächsten 7 Tage.
- Nicht enthalten: Sonntage (Oster-/Pfingstsonntag), Mariä Himmelfahrt in Bayern (gemeindeabhängig), Augsburger Friedensfest, einmalige Sonderfeiertage (z. B. Berlin 8.5.2025).

## Outlook und iPhone: Kalender abonnieren (Ergänzung 15.11.2026)
- Modul 18 → „Outlook und iPhone · Kalender abonnieren“ → **Kalender-Link erstellen**. Knöpfe: Outlook (Microsoft 365), Outlook.com, iPhone/Outlook am PC (webcal).
- Der Feed (`/kalender/<link>.ics`, iCalendar) zeigt genau die Einsätze, die der Benutzer in DWP sieht (gleiche Serverprüfung wie `/api/projects`), dazu die Feiertage des Vorjahres bis Folgejahres. Stornierte Einsätze fehlen, abgesagte sind als „Abgesagt“ markiert.
- Richtung: nur DWP → Outlook. Zusagen/Absagen und Planung bleiben in DWP. Outlook aktualisiert abonnierte Kalender selbst (Outlook.com/365 meist alle paar Stunden).
- Sicherheit: In der Datenbank (`dwp_calendar_feeds`, wird automatisch angelegt) liegt nur der SHA-256-Hash des Links. Der Link wird nur beim Erstellen angezeigt. „Neuen Link erstellen“ macht den alten ungültig, „Link sperren“ löscht ihn. Gesperrte DWP-Konten erhalten keinen Feed. Erstellen und Sperren stehen im Zugriffsprotokoll (`calendar_feed_created`, `calendar_feed_revoked`).
- Hinweis: Wer den Link kennt, sieht die Termine ohne Anmeldung. Der Link steht im Pfad der Abrufe und kann daher in Vercel-Zugriffsprotokollen erscheinen; bei Verdacht neuen Link erstellen.

### Abnahme Outlook/Feiertage (HP und iPhone)
1. Einstellungen: Bundesland „Bremen“ prüfen.
2. Modul 18: Woche mit Feiertag aufrufen (z. B. KW 52): Freitag 25.12. und Samstag 26.12. grau.
3. Kalender-Link erstellen, „In Outlook (Microsoft 365) hinzufügen“ bzw. „In Outlook.com hinzufügen“ tippen, Abo bestätigen. Einsätze und Feiertage erscheinen.
4. iPhone: „iPhone / Outlook am PC“ tippen, „Abonnieren“.
5. Mit Mitarbeiterkonto eigenen Link erstellen und prüfen, dass fremde Projekte nicht erscheinen.
6. „Link sperren“: Outlook zeigt nach der nächsten Aktualisierung keine neuen Daten mehr.

## Noch offen
Zwei-Wege-Abgleich mit Outlook über Microsoft Graph (Termine aus Outlook nach DWP; braucht eine App-Registrierung im Microsoft-Entra-Konto des Betriebs), Teilzeitschichten, Eintragen per WhatsApp-Nachricht (WhatsApp Business Platform), Zusagen ohne DWP-Konto für Externe.

Tests: `test-calendar-access.cjs` (Rechte, Server), `test-calendar-ui.cjs` (Oberfläche, Feiertage, Abo-Bereich), `test-calendar-feed.cjs` (Feiertagsberechnung, Abo-Link und Feed gegen PostgreSQL).
