# Modul 11 – Lieferanten und Preisvergleich · 14.11.2026

Status: **ROT**. Lokal und in der GitHub-Prüfung getestet, keine Produktionsabnahme. GRÜN erst nach dokumentierter Abnahme auf HP und iPhone.

Direkt öffnen: [Testen (Vorschau Gesamtprüfung)](https://dachwerk-pro-git-integration-gesamtpr-b6edb3-mangelstephan-8407.vercel.app/workspace?module=suppliers) · [Live](https://www.dachwerkpro.de/?start=app&module=suppliers) (Live erst nach dem Zusammenführen)

## Umgesetzt

- **Preisvergleich je Artikel**: aktueller EK und Lieferant gegenüber dem günstigsten gültigen Lieferantenpreis (nicht abgelaufen, kein künftiger Preisstand, gleiche Artikeleinheit).
  - Hinweis „Günstiger bei …“ ab 3 % unter dem aktuellen EK, mit Betrag und Prozent; solche Artikel stehen oben.
  - Schaltfläche „Bestpreis übernehmen“ – der Artikelpreis ändert sich erst nach dieser ausdrücklichen Übernahme (wie bisher mit Freigabeberechtigung).
  - Hinweise: Bestpreis-Bindung endet in 14 Tagen, nur ein Lieferant (kein Vergleich), kein gültiger Preis, Artikeleinheit geändert, kein Lieferantenpreis erfasst.
- **Nur der neueste Preis je Lieferant zählt.** Ältere Preise desselben Lieferanten bleiben als „Ersetzt“ sichtbar und können nicht mehr übernommen werden.
- **Preis zurückziehen** (Tippfehler, Angebot vom Händler zurückgenommen): nur mit Grund, wird nicht gelöscht, zeigt Datum, Grund und Bearbeiter. Danach gilt wieder der vorherige Preis dieses Lieferanten. Bereits übernommene Artikelpreise bleiben unverändert. Zentral nur mit Freigabeberechtigung; den Bearbeiter setzt der Server.
- **Lieferantenübersicht**: Artikel mit Preis, gültig/abgelaufen, zurückgezogen, Anzahl Bestpreise, letzter Preisstand, Kontakt mit anklickbarer E-Mail und Telefonnummer. Hinweise: keine Kontaktdaten, kein gültiger Preis mehr, ablaufende Bindungen.
- **Doppelte Lieferanten** (gleicher Name, Groß-/Kleinschreibung und Leerzeichen egal) werden abgelehnt.
- **CSV-Export** des Preisvergleichs (Excel-tauglich, Semikolon, Formelschutz).

Nicht enthalten: automatische Händleranbindung, Lieferzeit, Mindestmenge und Zahlungsbedingungen (Skonto) im Vergleich – diese bitte weiterhin selbst abwägen.

## Abnahme-Checkliste (HP und iPhone)

1. Modul öffnen ([Live](https://www.dachwerkpro.de/?start=app&module=suppliers)).
2. Zwei Lieferanten anlegen; einen dritten mit gleichem Namen in anderer Schreibweise anlegen → wird abgelehnt.
3. Für einen freigegebenen Artikel bei beiden Lieferanten einen Preis erfassen, einer mindestens 3 % unter dem aktuellen EK → „Günstiger bei …“ steht oben in „Preisvergleich je Artikel“.
4. Beim selben Lieferanten einen neueren Preis erfassen → der ältere zeigt „Ersetzt durch neueren Preis dieses Lieferanten“.
5. Den neueren Preis mit Grund zurückziehen → „Zurückgezogen …: Grund“; der ältere Preis gilt wieder.
6. „Bestpreis übernehmen“ → Artikelpreis in Modul 10 geändert, Preishistorie enthält den alten Preis.
7. „Preisvergleich als CSV“ → Datei öffnet in Excel mit Umlauten.

## Automatische Prüfung

`test-supplier-overview.cjs` (neu): neuester Preis je Lieferant, Bestpreis, Ersparnis, Hinweise, Sortierung, Lieferantenübersicht, Zurückziehen (Grund, einmalig, Übernahme gesperrt, Vorpreis wieder gültig), Sicherung/Wiederherstellung, Server-Berechtigung. `test-material-price-import.cjs`: Anzeige, CSV-Schaltfläche und Zurückziehen über das Formular.
