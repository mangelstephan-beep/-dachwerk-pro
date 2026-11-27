# Benutzerverwaltung · Anmeldung mit Benutzernamen, Sperren, Rechte per Häkchen

Stand: 15.11.2026

## Anmeldung
- Anmelden mit Kurznamen: `meier` steht für `meier@dachwerkpro.de` (kein echtes Postfach nötig).
- „Passwort vergessen“: Benutzername eingeben, der Link geht an die hinterlegte E-Mail (privat oder Firma).
- Neue Benutzer erhalten ein Startpasswort (einmal angezeigt, z. B. per WhatsApp weitergeben) und müssen beim ersten Login ein eigenes festlegen. Vorher liefert der Server keine Daten (HTTP 428).
- Passwörter werden nie lesbar gespeichert, protokolliert oder angezeigt; Better Auth speichert nur den Hash.

## Administrator
- Benutzer anlegen, Name/Benutzername/Rolle/E-Mail ändern, sperren und entsperren, neues Passwort setzen.
- Sperren beendet sofort alle Sitzungen; gesperrte Konten erhalten keine neue Sitzung und keinen Reset-Link.
- Schutz: Der Administrator kann sich nicht selbst sperren oder die Adminrolle entziehen; der letzte aktive Administrator ist nicht sperrbar.
- Bestehendes Admin-Konto: in „Rechte und Daten“ den Benutzernamen auf `admin` setzen. Benutzer-ID und alle Daten bleiben, die bisherige Adresse wird automatisch E-Mail für „Passwort vergessen“.

## Rechte per Häkchen
- Projekte: welche Projekte ein Benutzer sehen und (je nach Rolle) bearbeiten darf.
- Wer zusammen in einem Projekt ist, sieht dort die Einsätze der anderen und deren Mobilnummer.
- Sonderrechte: „darf alle Kalender sehen“, „eigene Telefonnummer ausblenden“.
- Verknüpfung mit dem Personalsatz (Modul 18) per Auswahl statt ID-Eingabe.
- Rechte liegen versioniert im Projektbestand (Logbuch „Benutzerrechte geändert“), nur der Administrator sieht die Rechteliste.

## Technik
- Tabelle `dwp_user_admin` (Sperre, Pflichtwechsel, Kontakt-E-Mail) wird beim ersten Zugriff automatisch angelegt; kein manueller Datenbankschritt.
- API: `GET/POST /api/users`; Store-Methode `setUserAccess` (nur Admin).
- Tests: `test-user-admin.cjs` (PostgreSQL/PGlite), `test-user-admin-ui.cjs`, erweiterte `test-calendar-access.cjs`.

## Noch offen
Interne Nachrichten zwischen Benutzern (nächster Schritt).
