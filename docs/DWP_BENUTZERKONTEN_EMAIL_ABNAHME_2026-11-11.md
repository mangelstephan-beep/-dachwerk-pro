# DWP Benutzerkonten / E-Mail-Verifikation – Abnahmeplan (2026-11-11)

## Gewünschter Sollzustand
- Jeder produktive Benutzer besitzt genau ein individuelles Konto mit gültiger, bestätigter E-Mail-Adresse und eigenem Passwort. Admins verwalten Rollen, Sperren, Reset-Einladungen und Widerrufe von Sitzungen; sie können die Passwörter anderer Benutzer **niemals lesen**.
- Geheimnisse und Passwörter ausschließlich in geeigneten serverseitigen Prüfwerten beziehungsweise Secret-Speichern; keine Klartext-Passwortsammlung, keine Weitergabe per E-Mail.
- Benutzer dürfen Passwort ändern (mit altem Passwort) oder über begrenzt gültige, einmalige Reset-Links wiederherstellen.
- Eigentümer-/Admin-Ansicht protokolliert datensparsam Benutzer-ID, Datum, Uhrzeit, Aktion, Ergebnis, Geräteinformationen sowie wer die Aktion ausgelöst hat (Anmeldung, Passwort geändert/zurückgesetzt, Verifikation, Konto erstellt/gesperrt, Rolle geändert, Session widerrufen). Keine Passwörter, Tokens, Links, Cookies oder Passwort-Hashes in Auditdaten.
- Änderungen aller Benutzer werden protokolliert; Zugriff auf Auswertungen nur autorisierten Rollen mit nachvollziehbarer Einsicht und Retentionsregeln.

## Bereits im Code umgesetzt (PR)
- Better-Auth-E-Mail/Passwort-Anmeldung erfordert eine verifizierte Adresse.
- Versandhandler für Verifizierungs- und Passwort-Reset-Mails über serverseitig konfigurierten Resend; Verifizierungs- und Reset-Links verfallen nach 15 Minuten.
- Sitzungen werden bei Passwort-Reset widerrufen; Authentifizierungsgeheimnisse werden nicht in Logs geschrieben.

## BLOCKER vor Freigabe
1. In Vercel/Production fehlen die Werte `RESEND_API_KEY`, `DWP_MAIL_FROM`. Geheimwerte **nur** via autorisiertem Secret-Manager einpflegen, nicht in GitHub/Chat.
2. Produktionskonto ist laut Datenbankstand `emailVerified=false`. Den neuen Verification-Gate **nicht** auf main/Production aktivieren, bevor die Bestätigungsmail tatsächlich zugestellt und der vorhandene Eigentümer verifiziert wurde; sonst droht Aussperrung.
3. Für bestehende Benutzer sichere, transparente Verifizierungs-/Wiederherstellungswege bereitstellen. Keinen zweiten MASTER-Benutzer erstellen und keine Daten löschen.
4. Es fehlen vollständige serverseitige Audit-Hooks für fehlgeschlagene Anmeldungen sowie Passwortänderungen/Reset, Mail-Verifikation und administrative Kontoverwaltung. Vor Betrieb ergänzen, inklusive Zugriffsschutz.
5. Admin-Oberfläche, Wiederherstellungskonzept und Einladungsworkflow sind noch nicht als produktiv abgenommen.
6. Browser-/API- und End-to-End-Tests auf HP/iPhone, Mailzustellung, falsche/abgelaufene/erneut verwendete Links, Sperren, Berechtigungsprüfung und Bestandsdatenerhalt.

## Betriebsregel
**ROT / NICHT ZUSAMMENFÜHREN** bis zu funktionierendem Versand, verifiziertem Eigentümerkonto und positiver End-to-End-Abnahme. Die Prüfung erfolgt ohne Passwortoffenlegung und ohne Änderung produktiver Konto-/Projektdaten.
