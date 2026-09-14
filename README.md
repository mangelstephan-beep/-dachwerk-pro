# DachWerk Pro

**DachWerk Pro by Stephan Mangel**  
*Das Tool vom Dachhandwerker für Dachhandwerker.*

Online-Testfassung: https://dachwerk-pro-test.vercel.app

## Stand 14.09.2026 · Release 0.2

- gemeinsame Webbasis für GitHub und Vercel
- 21 erreichbare Arbeitsbereiche
- responsive Start- und Anmeldeoberfläche
- Zurück-, Home- und Weiter-Navigation mit lokaler Speicherabfrage
- „Bautenstand & Dokumentation“ und separater Bereich „Mängel & Abweichungen“
- „Regelwerk / Vertragsgrundlagen“ mit BGB-, VOB/A-, VOB/B- und VOB/C-Einordnung
- Gefährdungscheck um DGUV-I 201-056, DGUV Regel 112-199, ASR A2.1 und DDH Fachregel Abdichtungen 01/2026 ergänzt
- mobile Darstellung und installierbares Web-App-Manifest

## Technischer Status

Dies ist weiterhin eine Frontend-Testfassung. Anmeldung, Benutzerfreigabe, Datenbank, Dateiablage, Cloud-Schnittstellen und zahlreiche Fachfunktionen benötigen noch ein produktives Backend. Es dürfen keine echten Kunden- oder Projektdaten verwendet werden.

## Dateien

- `index.html` – Startseite, Anmeldung und Anwendungsshell
- `styles.css` – Desktop- und Mobilgestaltung
- `app.js` – Navigation, Ansichten und lokale Testinteraktionen
- `vercel.json` – Hosting- und Sicherheitsheader
- `manifest.webmanifest` und `icon.svg` – Web-App-Metadaten
- `release.json` – maschinenlesbarer Versionsstand
