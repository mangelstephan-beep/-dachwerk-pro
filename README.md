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

Ausbau vom 12.10.2026: Ein gemeinsames Projektmodell verbindet 36 Arbeitsbereiche. Die Hauptanwendung ist auf serverseitige Anmeldung und bestätigte zentrale Speicherung umgestellt; PostgreSQL muss noch bereitgestellt und die Betriebsfassung live abgenommen werden. Abschläge, Teil-/Schlussrechnungen, Storno, Rückzahlungen und beauftragte Nachträge sind ergänzt. Der tatsächliche Fertigstellungsstand steht in [MODULSTATUS.md](MODULSTATUS.md), die zentrale Einrichtung in [BACKEND_SETUP.md](BACKEND_SETUP.md). **Dieser Stand ist keine produktive Gesamtfreigabe.**

Die serverseitige Grundlage ist implementiert, aber noch nicht mit einer Live-Datenbank eingerichtet und abgenommen. Zentrale Dateiablage, weitere Fachschnittstellen und produktive Gesamtfreigabe bleiben offen. Bis dahin ausschließlich Musterangaben verwenden.

## Dateien

- `index.html` – Startseite, Anmeldung und Anwendungsshell
- `styles.css` – Desktop- und Mobilgestaltung
- `app.js` – Navigation, Ansichten und lokale Testinteraktionen
- `vercel.json` – Hosting- und Sicherheitsheader
- `manifest.webmanifest` und `icon.svg` – Web-App-Metadaten
- `release.json` – maschinenlesbarer Versionsstand
