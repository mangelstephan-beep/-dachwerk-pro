# Modul 10 – Material und Systeme: Prüfliste · 14.11.2026

Status: **ROT**. Lokal und in der GitHub-Prüfung getestet, keine Produktionsabnahme. GRÜN erst nach dokumentierter Abnahme auf HP und iPhone und fachlicher Prüfung der konkreten Systeme durch den Verantwortlichen.

Direkt öffnen: [Testen (Vorschau Gesamtprüfung)](https://dachwerk-pro-git-integration-gesamtpr-b6edb3-mangelstephan-8407.vercel.app/workspace?module=materials) · [Live](https://www.dachwerkpro.de/?start=app&module=materials) (Live erst nach dem Zusammenführen)

## Umgesetzt

- **Prüfliste** im Modul „Material und Systeme“, sortiert: zuerst Artikel mit sperrender Prüfung, dann ablaufende Preisbindungen und Preissprünge (nach Restlaufzeit), dann alphabetisch.
- **Sperrend** (wie bisher, blockiert neue Angebotsfassungen): Preis nicht freigegeben, Preisstand in der Zukunft, Preisbindung abgelaufen, System ungeprüft oder ungeeignet.
- **Hinweise** (sperren nicht):
  - Preisbindung endet in höchstens 14 Tagen (inkl. „endet heute“)
  - Preissprung ab 10 % gegenüber dem vorherigen Preisstand (mit Vorzeichen und Datum)
  - keine Preisbindung dokumentiert
  - Systemzuordnung ohne Herstellerunterlage
- **Verwendung im Projekt**: LV-Positionen des gewählten Projekts, die den Artikel verwenden, mit Menge.
- **Systemübersicht**: Artikel je System (Schreibweise wird zusammengeführt). Ein System gilt erst als nachgewiesen, wenn jeder Artikel einzeln „Geeignet laut Nachweis“ ist.
- **CSV-Export** der Prüfliste (Excel-tauglich, Semikolon, Formelschutz).

## Abnahme-Checkliste (HP und iPhone)

1. Modul öffnen ([Live](https://www.dachwerkpro.de/?start=app&module=materials)).
2. Testartikel mit Preisbindung in 5 Tagen anlegen und freigeben → Hinweis „Preisbindung endet in 5 Tagen“, Artikel steht oben unter den Fristen.
3. Preis eines freigegebenen Testartikels um mehr als 10 % ändern und neu freigeben → Hinweis „Preissprung +… %“.
4. Zwei Artikel demselben System zuordnen, nur einen mit Nachweis → Systemübersicht „Nachweis offen“.
5. Projekt wählen, eine LV-Position mit dem Artikel verknüpfen → „Verwendung im Projekt“ zeigt die Position.
6. „Prüfliste als CSV“ → Datei öffnet in Excel mit Umlauten.

## Automatische Prüfung

`test-material-overview.cjs` (neu): Fristen (inkl. heute und abgelaufen), Preissprünge, fehlende Bindung, Sortierung, Systemübersicht, Projektverwendung. `test-efb-material-systems.cjs`: Anzeige und CSV-Schaltfläche.
