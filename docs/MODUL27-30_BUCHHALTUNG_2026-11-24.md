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

## Bewusst noch offen
- Echter DATEV-EXTF-Buchungsstapel mit Beraternummer/Mandant, Festschreibung und Monatsperioden.
- Zahlungseingang von Mahngebühren/Zinsen (derzeit darf eine Zahlung den Rechnungsbetrag nicht übersteigen).
- Bankabgleich (Kontoauszug-Import) und Mahnversand per E-Mail.
