# DachWerk Pro – Finalisierung Release 0.3

## Ziel
DachWerk Pro wird nicht als Sammlung einzelner Menüpunkte finalisiert, sondern als durchgängiger Projektprozess.

## Verbindlicher End-to-End-Workflow
1. Kunde anlegen oder auswählen
2. Projekt anlegen und Kunde zuordnen
3. LV / GAEB / PDF importieren
4. LV-Positionen technisch prüfen und Leistungsgruppen zuordnen
5. Preislisten per Drag & Drop importieren und als Preisquellen versionieren
6. Preislistenspalten erkennen bzw. manuell zuordnen: Hersteller, Artikelnummer, Bezeichnung, Einheit, Listenpreis, EK, Rabatt, Fracht, Kalkulationspreis, Preisstand
7. Positionen mit Preis- und Materialdatenbank verknüpfen
8. Kalkulationswerte ergänzen: Material, Lohn, Minuten, Fremdleistung, Zuschläge, Auslösung
9. EP / GP und Projektsumme berechnen
10. Kalkulation projektbezogen speichern
11. Ausgabe erzeugen: Angebot/PDF, Excel und später GAEB
12. Freigegebene Kalkulation in Ausführungsprojekt überführen
13. Bautenstand, Fotos, Tagesberichte, Nachweise und Abnahmen projektbezogen führen
14. Nachträge und Abweichungen wieder in Kalkulation/Aufmaß zurückführen
15. Rechnungen und Projektabschluss aus dem gleichen Projektstamm ableiten

## Preislisten-Workflow
- Drag & Drop in der Preis- & Materialdatenbank
- Pflichtformate: XLSX, XLS, CSV; PDF als Prüf-/Erfassungsquelle
- Importvorschau vor Übernahme
- automatische Spaltenerkennung plus manuelle Korrektur
- Dubletten- und Einheitenprüfung
- Hersteller/Lieferant, Quelle, Dateiname und Preisstand speichern
- bestehende Artikel aktualisieren oder neue Artikel anlegen
- Preisänderungen nachvollziehbar versionieren
- erst freigegebene Preise dürfen automatisch in Kalkulationen übernommen werden

## E-Rechnung / Leitweg-ID
- Kundenstamm und Projekt müssen Leitweg-ID speichern können
- bei öffentlichen Auftraggebern Leitweg-ID vor Rechnungsfreigabe prüfen
- XRechnung: Leitweg-ID als Käuferreferenz BT-10 ausgeben
- Bestellnummer, Lieferantennummer und elektronische Empfängeradresse berücksichtigen
- XRechnung/ZUGFeRD als Rechnungs-Ausgabeweg vorsehen
- Projekt-, Auftrags-, Rechnungs- und Kundendaten dürfen beim Export nicht neu erfasst werden müssen

## Gemeinsame Datenobjekte
- Kunde
- Projekt
- Leistungsverzeichnis
- LV-Position
- Preisquelle / Preisliste / Materialartikel
- Kalkulation
- Dokument / Foto / Nachweis
- Nachtrag / Aufmaß
- Rechnung / E-Rechnung

## Grundregeln
- Kein Modul darf Daten nur als isolierte Demo halten, wenn diese Daten im nächsten Schritt gebraucht werden.
- Projekt- und LV-ID müssen in allen Folgemodulen erhalten bleiben.
- Preise brauchen Quelle, Preisstand und Einheit.
- Kalkulationen brauchen nachvollziehbare Material-, Lohn- und Zuschlagsanteile.
- Exporte dürfen nur Daten aus dem aktuell ausgewählten Projekt/LV verwenden.
- Rechnungen übernehmen Kunden-, Projekt-, Auftrags- und Leitweg-ID-Daten aus dem gemeinsamen Datenbestand.
- Lokaler Browser-Speicher ist nur Testbetrieb; produktiv ist eine zentrale Datenbank mit Rollen/Rechten erforderlich.

## Release-0.3-Abnahmekriterium
Das LV „Garnmagazin Brücke (004)“ muss vollständig durch den Ablauf Import → Zuordnung → Preisquelle → Kalkulation → Speichern → Export-Test laufen können, ohne dass Positionen oder Projektbezug verloren gehen. Zusätzlich muss mindestens eine Preisliste per Drag & Drop eingelesen, geprüft, freigegeben und für eine LV-Position verwendet werden können.
