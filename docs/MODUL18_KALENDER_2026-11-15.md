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

## Noch offen
Outlook-Kalender (Microsoft Graph), Feiertage, Teilzeitschichten, Eintragen per WhatsApp-Nachricht (WhatsApp Business Platform), Zusagen ohne DWP-Konto für Externe.

Tests: `test-calendar-access.cjs` (Rechte, Server), `test-calendar-ui.cjs` (Oberfläche).
