# Module 27–30 · Buchhaltung SKR03, Mahnwesen, Zahlungsausgang – Abnahme
Stand: 24.11.2026 · Status: **ROT bis Abnahme durch Stephan Mangel auf HP und iPhone**

Lokale Tests: `test-accounting-dunning.cjs`, `test-accounting-ui.cjs` und alle bestehenden Tests bestanden.
Das ist keine Produktionsabnahme.

## 1. Einstellungen → Buchhaltung
Link: https://www.dachwerkpro.de/?start=app&module=settings
- [ ] Zahlungsziel (z. B. 14), Mahnfrist (z. B. 10), Mahngebühr (z. B. 5,00) speichern.
- [ ] SKR03-Konten prüfen; leer = Standard. Eigene Bank (z. B. 1210) eintragen → erscheint im Journal.
- [ ] Konten mit dem Steuerberater abstimmen.

## 2. Modul 27 · Ausgangsrechnungen
Link: https://www.dachwerkpro.de/?start=app&module=invoices
- [ ] Rechnung mit Zahlungsziel ausgeben; Ausdruck zeigt „zahlbar ohne Abzug bis …“.

## 3. Modul 29 · Offene Posten und Mahnwesen
Link: https://www.dachwerkpro.de/?start=app&module=payments
- [ ] Tabelle zeigt offene Rechnungen aller Projekte mit Fälligkeit und Tagen überfällig.
- [ ] Bei überfälliger Rechnung: Zahlungserinnerung erstellen → Nummer DWP-M-…, ohne Kosten.
- [ ] Nächste Stufe vor Fristablauf wird abgelehnt.
- [ ] 1. Mahnung bei Gewerbekunde mit Verzugspauschale 40 EUR und Zinsen; bei Privatkunde wird die Pauschale abgelehnt.
- [ ] „Drucken / PDF“ öffnet das Mahnschreiben auf dem DWP-Briefpapier (HP und iPhone).
- [ ] Nach vollständigem Zahlungseingang verschwindet die Rechnung aus den offenen Posten.

## 4. Modul 28 · Zahlungsausgang
Link: https://www.dachwerkpro.de/?start=app&module=incoming
- [ ] Freigegebene Eingangsrechnung erscheint unter „Offene Verbindlichkeiten“.
- [ ] Zahlung buchen; Betrag über dem offenen Betrag wird abgelehnt.

## 5. Modul 30 · Buchungsjournal SKR03
Link: https://www.dachwerkpro.de/?start=app&module=closing
- [ ] Kontensalden: 1400 = offene Forderungen inkl. Einbehalt, 1600 = offene Verbindlichkeiten.
- [ ] Zeitraum (z. B. ein Monat) filtern.
- [ ] „DATEV-Buchungen CSV“ und „Journal CSV“ herunterladen; DATEV-Datei dem Steuerberater zum Testimport geben.

## 6. Ergänzung 26.11.2026 (Abschluss Buchhaltung)
Lokale Tests: `test-accounting-close.cjs`, erweiterte `test-accounting-dunning.cjs` / `test-accounting-ui.cjs` und alle bestehenden Tests bestanden.

**Einstellungen → Buchhaltung** – https://www.dachwerkpro.de/?start=app&module=settings
- [ ] Unter „DATEV“ Berater- und Mandantennummer (vom Steuerberater) und ggf. Beginn Wirtschaftsjahr eintragen.
- [ ] Neue Konten „Sonstige Erträge (Mahngebühren, Verzugspauschale)“ 2700 und „Zinserträge (Verzugszinsen)“ 2650 mit dem Steuerberater abstimmen.

**Modul 27 · Storno** – https://www.dachwerkpro.de/?start=app&module=invoices
- [ ] Stornorechnung trägt das heutige Datum (vorher: Datum der Ursprungsrechnung) und erscheint im Journal im Storno-Monat.

**Modul 29 · Mahnkosten** – https://www.dachwerkpro.de/?start=app&module=payments
- [ ] 2. Mahnung zeigt „Offene Mahnkosten aus früheren Schreiben“ und rechnet sie in den Gesamtbetrag ein.
- [ ] Nach Zahlung der Hauptforderung bleibt die Rechnung mit „Mahnkosten offen“ in der Liste.
- [ ] Zahlung mit Buchungsart „Mahngebühr erhalten“ bzw. „Verzugszinsen erhalten“ buchen; mehr als angemahnt wird abgelehnt.

**Modul 30 · DATEV und Festschreibung** – https://www.dachwerkpro.de/?start=app&module=closing
- [ ] Zeitraum (ein Monat) wählen → „DATEV-Buchungsstapel (EXTF)“ → Datei dem Steuerberater zum Testimport geben.
- [ ] „Zeitraum festschreiben“ erst nach Abstimmung mit dem Steuerberater (nicht rücknehmbar). Danach wird eine Zahlung mit Datum im gesperrten Zeitraum abgelehnt.
- [ ] Am Monatsersten liegt der EXTF-Stapel des Vormonats zusätzlich in Dropbox: https://www.dropbox.com/home/DWP/03_Buchhaltung/DATEV-Export

## Bewusst noch offen
- EXTF enthält die 14 Standardfelder (Umsatz bis Buchungstext); Kostenstelle, Leistungsdatum, Belegverknüpfung fehlen. Vor produktivem Import vom Steuerberater prüfen lassen.
- Bankabgleich (Kontoauszug-Import) und Mahnversand per E-Mail.
