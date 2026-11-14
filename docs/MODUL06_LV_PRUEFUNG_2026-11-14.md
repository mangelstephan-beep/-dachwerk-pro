# Modul 06 – LV- und Vertragsprüfung: LV-Datenprüfung v3 · 14.11.2026

Status: **ROT**. Lokal und in der GitHub-Prüfung getestet, keine Produktionsabnahme. GRÜN erst nach dokumentierter Abnahme auf HP und iPhone.

Direkt öffnen: [Testen (Vorschau Gesamtprüfung)](https://dachwerk-pro-git-integration-gesamtpr-b6edb3-mangelstephan-8407.vercel.app/workspace?module=contract) · [Live](https://www.dachwerkpro.de/?start=app&module=contract) (Live erst nach dem Zusammenführen)

## Umgesetzt

Die automatische LV-Datenprüfung erkennt zusätzlich zu Menge 0, fehlender Gliederung, fehlender Nachtragsnummer, fehlenden Einzelkosten, EP unter Einzelkosten und Materialhinweisen:

| Befund | Erkennung | Vorgeschlagene Rückfrage |
|---|---|---|
| Leistungstext unvollständig | weniger als 10 Zeichen | Langtext anfordern bzw. aus Original-LV ergänzen |
| Pauschale ≠ 1 | Einheit psch/pauschal mit anderer Menge als 1 | Menge oder Einheit klären |
| Stück mit Komma | Einheit St/Stk/Stück und nicht ganzzahlig | Menge oder Einheit prüfen |
| Bauseitige Leistung | „bauseits“, „bauseitig“ | Leistungsgrenze/Schnittstelle klären und im Angebot benennen |
| Leitfabrikat / Gleichwertigkeit | „gleichwertig“, „Leitfabrikat“, „Fabrikat:“, „Erzeugnis:“, „Bieterangabe“ | Fabrikat/Typ eintragen, Gleichwertigkeit nachweisen |
| Aufwand / Stundenlohn | „nach Aufwand“, „Stundenlohn“, „auf Nachweis“ | Verrechnungssatz, Nachweisform, Anerkennung vorab klären |
| Einschlussklausel | „einschließlich/inkl. aller/sämtlicher …“ | Besondere Leistungen nach VOB/C abgrenzen oder Rückfrage stellen |
| Bedarfsposition | Leistungsart Bedarfsposition | Beauftragung, Menge und Wertung klären |
| Doppelter Leistungstext | gleicher Text und Einheit in zwei Positionen (ohne Wahlgruppen) | Doppelleistung oder Abgrenzung (Bauabschnitt, Dachfläche) klären |
| Wahlgruppe unvollständig | nur eine Position oder keine Grundposition | Grund-/Alternativposition ergänzen |

- Befunde sind **Hinweise zur Rückfrage, keine rechtliche Bewertung**. Jeder Befund kann einzeln als Rückfrage gespeichert werden (Quelle „DachWerkPro LV-Datenprüfung v3“).
- Ändert sich die Position oder die Kalkulationsbasis, zeigt die Liste „Prüfung erneuern“. Ein behobener Befund verschwindet.

## Nicht enthalten

- Prüfung der Vertragsbedingungen (VOB/B oder BGB, Fristen, Vertragsstrafe, Sicherheiten, Gewährleistung) und Regelwerksbezüge (DIN, Fachregeln): weiterhin manuell anhand der angegebenen Quelle. Eine automatische Prüfung dieser Punkte wäre eine fachliche/rechtliche Bewertung und braucht eine abgestimmte Prüfliste.

## Abnahme-Checkliste (HP und iPhone)

Datum, Gerät, URL, Rolle und Ergebnis je Schritt festhalten. Nur ein Testprojekt verwenden.

1. Testprojekt wählen. Im LV drei Positionen anlegen:
   - „Attika anschließen, Unterkonstruktion bauseits vorhanden“, 40 m
   - „Baustelleneinrichtung für Dacharbeiten vorhalten“, 2 psch
   - „Wärmedämmung EPS 035, Fabrikat: …… oder gleichwertig“, 120 m²
2. Modul „LV- und Vertragsprüfung“ öffnen ([Live](https://www.dachwerkpro.de/?start=app&module=contract)). Die Tabelle „Automatische LV-Datenprüfung“ zeigt je Position den passenden Befund und die Rückfrage.
3. Beim bauseits-Befund „Rückfrage anlegen“ klicken. Ein zweiter Klick legt keine doppelte Rückfrage an.
4. Menge der Attika-Position auf 45 m ändern → Status in der Prüfliste „Prüfung erneuern“.
5. Pauschalposition auf 1 psch ändern → Befund verschwindet.
6. Seite neu laden: Rückfrage und Status bleiben erhalten.

## Automatische Prüfung

`test-contract-review.cjs` (neu, in `npm test`): alle Befundarten, saubere Position ohne Befund, keine rechtlichen Wertungen in Texten, Rückfrage speichern, Erneuerung nach Änderung, Wegfall nach Korrektur.
