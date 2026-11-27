# DWP → Make → Dropbox (Stand 26.11.2026)

Status: **ROT** bis zur Abnahme durch Stephan (HP und iPhone).

## Was passiert
| Ereignis in DWP | Ablage in Dropbox |
|---|---|
| Neues Projekt angelegt | `/DWP/Projekte/<Projektname>` als Kopie von `/DWP/00_Verwaltung/Projektvorlage` (Schriftverkehr, Angebote, Vertraege-NU, Rechnungen, Fotos-Doku, Plaene-Statik, Behoerde) |
| Originaldatei geprüft hochgeladen (Modul 37, Gutachten, Mängel, Bautagebuch, Abnahme) | passender Unterordner des Projekts, Dateiname mit Belegdatum. Briefe an Landratsamt/Bauamt/Gemeinde → `Behoerde` |
| Sicherung angelegt (manuell oder täglich automatisch) | `/DWP/04_Sicherungen/DWP_Sicherung_JJJJ-MM-TT_HH-MM.json` |
| Monatserster (täglicher Lauf) | `/DWP/03_Buchhaltung/DATEV-Export`: DATEV-Buchungen und Buchungsjournal des Vormonats (gleiche Spalten wie Modul 30) |

## Technik
- DWP meldet an den Make-Webhook (`DWP_MAKE_WEBHOOK_URL`). Die Datei selbst holt Make über `/api/make-file` mit einem signierten, 24 Stunden gültigen Link.
- Signierschlüssel: `DWP_MAKE_SECRET` oder abgeleitet aus `BETTER_AUTH_SECRET` (HMAC, eigener Zweck). Kein Secret geht an Make.
- Jeder Abruf wird im Zugriffsprotokoll als `make_export` vermerkt.
- Ist Make nicht erreichbar, läuft der Vorgang in DWP normal weiter (Zeitlimit 5 s).
- Ohne `DWP_MAKE_WEBHOOK_URL` ist alles abgeschaltet; `/api/make-file` antwortet dann 404.
- Hinweis: Damit verlassen freigegebene Dateien den Server auch ohne das freigegebene iPhone/HP-Gerät – ausschließlich in Stephans eigene Dropbox. Bewusste Entscheidung des Eigentümers (26.11.2026).

## Grenzen
- Angebote/Rechnungen, die DWP nur als Druckansicht erzeugt, landen erst in Dropbox, wenn das PDF als Originaldatei im Modul 37 hochgeladen wird.
- Sehr große Dateien (> 4,5 MB) werden gestreamt; bei Problemen im Make-Verlauf prüfen.

## Abnahme (Stephan)
1. Projekt anlegen → Ordner erscheint in Dropbox: https://www.dropbox.com/home/DWP/Projekte
2. Im Modul 37 eine PDF hochladen → Datei im Projektordner.
3. Modul Sicherung → „Jetzt sichern“ → Datei in https://www.dropbox.com/home/DWP/04_Sicherungen
4. Am Monatsersten DATEV-Dateien in https://www.dropbox.com/home/DWP/03_Buchhaltung/DATEV-Export
