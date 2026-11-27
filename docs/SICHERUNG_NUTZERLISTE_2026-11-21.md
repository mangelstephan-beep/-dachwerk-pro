# Sicherung und Wiederherstellung · Nutzerliste mit Nutzung und Ablaufdatum

Stand: 21.11.2026

## Modul „Sicherung“ (Navigation unten links, Direktlink `/?start=app&module=backup`)
- **Jetzt sichern**: legt eine Sicherung auf dem Server ab, mit Datum, Uhrzeit, Ersteller, Anzahl Projekte und Vorgänge.
- **Automatisch**: jeden Morgen gegen 6–7 Uhr eine Tagessicherung (Vercel Cron `/api/cron`, einmal pro Tag).
- **Sicherungsverlauf** nach Datum und Uhrzeit, neueste oben. Je Zeile „Herunterladen“ und „Wiederherstellen“.
- **Extern ablegen (Dropbox, Google Drive, iCloud, eigene Cloud)**: Die Datei heißt `DWP_Sicherung_JJJJ-MM-TT_HH-MM.json`
  (deutsche Ortszeit). Datum, Uhrzeit, Ersteller und Umfang stehen zusätzlich im Dateikopf.
  iPhone: „Teilen“ → Dropbox oder „In Dateien sichern“. Laptop: „Herunterladen“ und in den Cloud-Ordner legen.
  Herunterladen nur auf dem freigegebenen iPhone oder HP-Laptop (bestehende Gerätefreigabe).
- **Aus Datei wiederherstellen**: Datei auswählen (auf dem iPhone direkt aus Dropbox/Drive). DachWerkPro zeigt vorher,
  von wann die Sicherung ist, von wem und wie viele Projekte/Kunden/Vorgänge sie enthält. Erst nach Bestätigung wird eingespielt.
- **Vor jeder Wiederherstellung** wird der aktuelle Stand automatisch als „vor Wiederherstellung“ gesichert und kann
  so mit einem Klick zurückgeholt werden.
- Ältere Sicherungsdateien (`DachWerkPro_Sicherung.json` ohne Datum) werden weiterhin angenommen.
- Aufbewahrung: automatische Sicherungen 35 Tage, insgesamt die letzten 80 Sicherungen.
- Nur der Eigentümer (Administrator, `DWP_OWNER_USER_ID`) sichert und stellt wieder her.

## Anwenderverwaltung: wer nutzt DWP wie oft
- **Nutzerübersicht** oben: Status, Zugang (unbefristet / gültig bis), Anmeldungen der letzten 30 Tage, Anmeldungen gesamt,
  Modulaufrufe der letzten 30 Tage, zuletzt aktiv. Einzelvorgänge mit Uhrzeit im Zugriffsprotokoll.
- **Zugang gültig bis** beim Anlegen und unter „Rechte und Daten“ (leer = unbefristet). Nach Ablauf ist keine Anmeldung
  mehr möglich, laufende Sitzungen enden; Verlängern gibt sofort wieder frei. Der eigene Administratorzugang bleibt unbefristet.
- **Hinweise**: „aaaaaa (Name): Zugang läuft in 3 Tagen ab (gültig bis …)“ in der Anwenderverwaltung und auf der Startseite
  (7 Tage vorher bis 30 Tage nach Ablauf), mit Knopf „Verlängern oder beenden“.
- **E-Mail an den Administrator** 7, 3 und 1 Tag vorher, am Ablauftag und nach Ablauf – jede Stufe genau einmal, mit
  Direktlink zur Anwenderverwaltung. Empfänger: `DWP_ADMIN_MAIL`, sonst die E-Mail für „Passwort vergessen“ des Eigentümers.
  Versand über das bestehende Strato-Postfach (`DWP_SMTP_USER`/`DWP_SMTP_PASSWORT`). Schlägt der Versand fehl, nächster Tag erneut.

## Technik
- Tabellen `dwp_backups` und Spalten `valid_until`, `expiry_notice` in `dwp_user_admin` werden beim ersten Zugriff angelegt.
- API: `GET/POST /api/backups` (create, download, restore, upload – gepackt bis ca. 4,5 MB je Anfrage), `GET /api/cron`.
- Optional `CRON_SECRET` in Vercel: dann verlangt `/api/cron` diesen Schlüssel (Vercel sendet ihn automatisch).
- Tests: `test-backups.cjs`, `test-user-validity.cjs`, `test-backup-ui.cjs`.
