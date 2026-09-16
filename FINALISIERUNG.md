# DachWerk Pro – Finalisierung Release 0.3

## Ziel
DachWerk Pro wird nicht als Sammlung einzelner Menüpunkte finalisiert, sondern als durchgängiger Projektprozess.

## Verbindlicher End-to-End-Workflow
1. Kunde anlegen oder auswählen
2. Projekt anlegen und Kunde zuordnen
3. LV / GAEB / PDF importieren
4. LV-Positionen technisch prüfen und Leistungsgruppen zuordnen
5. Positionen mit Preis- und Materialdatenbank verknüpfen
6. Kalkulationswerte ergänzen: Material, Lohn, Minuten, Fremdleistung, Zuschläge, Auslösung
7. EP / GP und Projektsumme berechnen
8. Kalkulation projektbezogen speichern
9. Ausgabe erzeugen: Angebot/PDF, Excel und später GAEB
10. Freigegebene Kalkulation in Ausführungsprojekt überführen
11. Bautenstand, Fotos, Tagesberichte, Nachweise und Abnahmen projektbezogen führen
12. Nachträge und Abweichungen wieder in Kalkulation/Aufmaß zurückführen
13. Rechnungen und Projektabschluss aus dem gleichen Projektstamm ableiten

## Gemeinsame Datenobjekte
- Kunde
- Projekt
- Leistungsverzeichnis
- LV-Position
- Preisquelle / Materialartikel
- Kalkulation
- Dokument / Foto / Nachweis
- Nachtrag / Aufmaß
- Rechnung

## Grundregeln
- Kein Modul darf Daten nur als isolierte Demo halten, wenn diese Daten im nächsten Schritt gebraucht werden.
- Projekt- und LV-ID müssen in allen Folgemodulen erhalten bleiben.
- Preise brauchen Quelle, Preisstand und Einheit.
- Kalkulationen brauchen nachvollziehbare Material-, Lohn- und Zuschlagsanteile.
- Exporte dürfen nur Daten aus dem aktuell ausgewählten Projekt/LV verwenden.
- Lokaler Browser-Speicher ist nur Testbetrieb; produktiv ist eine zentrale Datenbank mit Rollen/Rechten erforderlich.

## Release-0.3-Abnahmekriterium
Das LV „Garnmagazin Brücke (004)“ muss vollständig durch den Ablauf Import → Zuordnung → Kalkulation → Speichern → Export-Test laufen können, ohne dass Positionen oder Projektbezug verloren gehen.
