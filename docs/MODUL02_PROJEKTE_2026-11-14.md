# Modul 02 – Projekte, Datenübernahme und Sortierung · 14.11.2026

Status: **ROT**. Lokal geprüft, keine Produktionsabnahme. Baut auf Modul 01 (Kundenstamm, PR #73) auf.

## Umgesetzt
- **Datenübernahme**: Bei Auswahl des Kunden im Projektformular werden Objektanschrift (Straße, PLZ Ort, ggf. Land) und Leitweg-ID/Käuferreferenz des Kunden übernommen – **nur in leere Felder**, mit Hinweis. Gespeichert wird erst nach Prüfung mit „Speichern“.
- **Kostenstelle eindeutig** (Groß-/Kleinschreibung egal). Bestandsdaten werden beim Laden nicht geprüft oder verändert; die Regel greift bei Neuanlage oder Änderung der Kostenstelle.
- **Kundenwechsel gesperrt**, sobald Angebote, Aufträge, Rechnungen oder Zahlungen im Projekt existieren. Ausgestellte Belege und Kundenübersicht bleiben dadurch konsistent.
- **Sortierung**: Kunden nach Kundennummer (numerisch), ohne Nummer am Ende. Projekte alphabetisch, abgeschlossene Projekte am Ende. Gilt für Projektleiste, Projektliste, Auswahlfelder und Modullisten. Alle anderen Module behalten ihre erfasste Reihenfolge.

## Lokale Prüfung
`test-project-master.cjs` (in `npm test`).

## Abnahme-Checkliste (HP und iPhone)
1. Kunden mit Anschrift und Leitweg-ID wählen → Objektanschrift und Leitweg-ID werden vorgeschlagen; bereits ausgefüllte Felder bleiben unverändert.
2. Zweites Projekt mit derselben Kostenstelle (andere Schreibweise) → abgelehnt.
3. Projekt mit ausgestelltem Angebot: Kunde ändern → abgelehnt; ohne Belege → möglich.
4. Projektleiste und Projektliste alphabetisch; abgeschlossenes Projekt am Ende. Kundenliste und Kundenauswahl nach Kundennummer.
5. Leere Projektauswahl („Projekt auswählen“) wählen → aktuelles Projekt bleibt erhalten (korrigierte Leerwahl).
6. Projektwechsel, Neuladen und erneute Anmeldung: Auswahl und Daten unverändert; iPhone: Auswahlfelder, Hinweise und Scrollen bedienbar.
