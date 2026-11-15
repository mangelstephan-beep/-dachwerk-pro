# Passwort zurücksetzen per Mail über das Strato-Postfach · 15.11.2026

Status: bereit zur Einrichtung. Die App versendet den Link zum Zurücksetzen über das eigene Postfach @dachwerkpro.de (Strato, `smtp.strato.de`, Port 465, SSL).

## Einrichtung (einmalig, durch Stephan in Vercel)

[Vercel → dachwerk-pro → Settings → Environment Variables](https://vercel.com/mangelstephan-8407/dachwerk-pro/settings/environment-variables), jeweils nur **Production**:

| Name | Wert | Typ |
|---|---|---|
| `DWP_SMTP_USER` | vollständige Postfach-Adresse, z. B. `info@dachwerkpro.de` | normal |
| `DWP_SMTP_PASSWORD` | Passwort dieses Postfachs (wie in Strato) | **Sensitive** |

Optional: `DWP_MAIL_FROM` (Absendername, Standard „DachWerkPro <Postfach-Adresse>“), `DWP_SMTP_HOST`/`DWP_SMTP_PORT` (Standard Strato 465). Das Postfach-Passwort nie in GitHub oder im Chat eintragen.

Neue Werte gelten erst nach der nächsten Veröffentlichung: zuerst die Werte eintragen, dann den Pull Request zusammenführen.

## Ablauf für den Benutzer

1. Anmeldeseite → „Passwort vergessen?“ → hinterlegte E-Mail-Adresse → „Reset-Link anfordern“.
2. Mail „DachWerkPro – Passwort zurücksetzen“ öffnen, Link antippen (1 Stunde gültig, nur einmal verwendbar).
3. Neues Passwort mit mindestens 12 Zeichen festlegen. Alle bisher angemeldeten Geräte werden abgemeldet.
4. Im Zugriffsprotokoll erscheint „Passwort per Mail-Link zurückgesetzt“.

## Abnahme (HP und iPhone)

- Reset-Link an die eigene Adresse anfordern; Mail kommt an (auch Spam-Ordner prüfen).
- Link öffnen, neues Passwort setzen, anmelden.
- Denselben Link ein zweites Mal öffnen → „Der Link ist ungültig oder abgelaufen“.
- Unbekannte Adresse eingeben → gleiche neutrale Meldung, keine Mail.

## Bewusst nicht enthalten

Erzwungene E-Mail-Bestätigung vor der Anmeldung (Entwurf PR #72): bleibt aus, solange das bestehende Konto nicht bestätigt ist, sonst droht Aussperrung.
