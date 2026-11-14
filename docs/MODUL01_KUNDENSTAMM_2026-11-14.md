# Modul 01 – Kundenstamm und Übergaben · 14.11.2026

Status: **ROT**. Lokal geprüft, keine Produktionsabnahme. GRÜN erst nach dokumentierter Abnahme auf HP und iPhone (siehe verbindliche Projektregeln).

## Umgesetzt

- **Kundennummer**: Bei leerem Feld automatisch vergeben, ab 10001 (Debitorenbereich), immer höchste vorhandene Nummer + 1, nie aus der Zeilenanzahl. Eigene Nummer aus einem Vorsystem ist beim Anlegen möglich. Eindeutig im ganzen Mandanten, auch wenn ein Benutzer nicht alle Kunden sieht. Einmal vergeben, bleibt sie unverändert.
- **Bestandskunden** werden beim Laden nicht umnummeriert. Sie erhalten erst beim nächsten Speichern eine Nummer.
- **Anschrift strukturiert**: Straße und Hausnummer, PLZ, Ort, Land (ISO-Code, Standard DE). Deutsche PLZ muss fünfstellig sein.
- **USt-IdNr.**: Leerzeichen und Punkte werden entfernt, Ländercode und Format geprüft (DE + 9 Ziffern).
- **Kundenart**: Gewerbekunde, Privatkunde oder nicht angegeben. Grundlage für spätere steuerliche Sonderfälle in Modul 27; daraus wird noch keine Steuerlogik abgeleitet.
- **Fehler behoben**: Angebots-PDF las das nicht vorhandene Feld `city`, dadurch fehlte der Ort. Druckansicht von Angebot, Auftragsbestätigung und Rechnung zeigte nur die Straße. Beide verwenden jetzt dieselbe Anschriftsformatierung, ergänzt um Kundennummer und USt-IdNr. Alte Belege mit `city` werden weiterhin korrekt angezeigt.
- **Kundenübersicht** im Modul 01: je Kunde Anschrift, Projekte mit Phase, freigegebene Angebote, Rechnungen brutto, Zahlungen und offener Betrag – aus denselben freigegebenen Daten wie das Controlling.
- Ausgestellte Belege behalten den Kundenstand zum Zeitpunkt der Ausstellung.

## Lokale Prüfung

`test-customer-master.cjs` (neu, in `npm test` aufgenommen): automatische und manuelle Nummern, Dubletten, Unveränderlichkeit, Bestandskunden, PLZ/Land/USt-IdNr., Anschriftsformat einschließlich alter Belege, Snapshot in Angebot und Rechnung, Übersicht über zwei Projekte, mandantenweite Nummernvergabe über den Server.

In der Arbeitsumgebung ohne installierte Abhängigkeiten liefen alle abhängigkeitsfreien Testgruppen. DOM-, PDF- und Datenbanktests laufen über die GitHub-Prüfung des Pull Requests.

## Abnahme-Checkliste (HP und iPhone)

Datum, Gerät/iOS/Safari bzw. HP/Browser, Produktiv-URL, Testkonto/Rolle und Ergebnis je Schritt dokumentieren. Nur Testdaten verwenden.

1. Anmelden, Modul „Kunden und Kontakte“ öffnen.
2. Neuen Testkunden mit leerer Kundennummer, Straße, PLZ 28195, Ort, USt-IdNr. `DE 123 456 789` und Kundenart speichern → Nummer wird vergeben, USt-IdNr. als `DE123456789` angezeigt.
3. PLZ `2819` eingeben → verständliche Fehlermeldung, Eingaben bleiben erhalten.
4. Kunden bearbeiten und versuchen, die Kundennummer zu ändern → wird abgelehnt.
5. Zweiten Kunden mit derselben Kundennummer anlegen → wird abgelehnt.
6. Bestehenden älteren Kunden öffnen und speichern → erhält die nächste freie Nummer, sonst keine Änderung.
7. Projekt für den Testkunden anlegen; im Projektauswahlfeld erscheint „Nummer · Name“.
8. LV-Position, Angebot ausstellen, Druck/PDF öffnen → Name, Straße, **PLZ Ort**, Kundennummer und USt-IdNr. sichtbar.
9. Kundenanschrift ändern → bereits ausgestelltes Angebot zeigt weiterhin die alte Anschrift.
10. Kundenübersicht prüfen: Projekt(e), Angebotsanzahl und -summe, nach Rechnung und Zahlung korrekte offene Summe.
11. iPhone: Formular vollständig scrollbar, Tastatur verdeckt keine Felder, Auswahlfelder bedienbar, Übersichtstabelle lesbar.
12. Seite neu laden bzw. ab- und wieder anmelden → alle Werte unverändert vorhanden.

Erst nach bestandenen Schritten auf beiden Geräten `module-verification.js` für Modul 01 mit Nachweis auf `verified: true` setzen und `npm run status:write` ausführen.
