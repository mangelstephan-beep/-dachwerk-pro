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

## Workflow / Zuständigkeit / Kommunikation
- Jeder Vorgang braucht einen Verantwortlichen oder eine Rolle.
- Zuweisung muss an internen Nutzer, Kundendaten-Kontakt oder freie E-Mail-Adresse möglich sein.
- Pflichtfelder: Status, Verantwortlicher, Ersteller, erstellt am, Fälligkeit, erwartete Rückmeldung, Priorität, letzter Kontakt, nächste Aktion.
- Vorgänge durchlaufen mindestens: Neu → zugewiesen → in Bearbeitung → Rückmeldung ausstehend → Prüfung → freigegeben → erledigt.
- Regie-/Tagelohnarbeiten: Leistung, Stunden, Material, Fotos, Bemerkung und digitale Unterschrift erfassen; PDF erzeugen; Kundenkopie an die im Kundenstamm hinterlegte E-Mail versenden; Original projektbezogen ablegen.
- Zentrale Funktionsadresse für eingehende Antworten und externe Weiterleitungen: workflow@dachwerk-pro.de. Optional spezialisierte Aliase wie regie@, rechnung@ oder dokumente@.

## Logbuch / Audit-Trail
Jede fachliche oder kaufmännische Änderung erzeugt einen unveränderbaren Logbucheintrag. Mindestinhalt:
- Zeitstempel
- Benutzer / Rolle
- Projekt-ID und Vorgangs-ID
- Aktion
- vorheriger Wert / neuer Wert bei Änderungen
- Statusänderung
- Zuweisung oder Weiterleitung
- versendete E-Mail / Empfänger / Betreff
- hochgeladene oder erzeugte Datei
- Kommentar oder Freigabe
- Fälligkeit / Erinnerungsdatum / Eskalationsstufe
- technische Quelle der Aktion: App, Import, E-Mail, API oder Automatik

Kein Logbucheintrag darf im normalen Anwenderbetrieb gelöscht oder überschrieben werden. Korrekturen werden als neuer Eintrag dokumentiert.

## Outlook / Microsoft-Graph-Workflow
- Outlook-Konto pro Benutzer oder Organisation verbindbar.
- Aus DachWerk-Vorgängen E-Mail, Outlook-Aufgabe oder Kalendereintrag erzeugen.
- Bei Zuweisung kann automatisch eine E-Mail mit Projekt-, Vorgangs- und Rückmeldefrist versendet werden.
- Erwartete Rückmeldung erhält ein konkretes Datum/Uhrzeit.
- Vor Fristablauf Erinnerung an Verantwortlichen.
- Bei Fristüberschreitung Eskalation an Bauleitung/Administrator nach definierbarer Regel.
- Eingehende Antwort soll über eindeutige Vorgangs-ID im Betreff bzw. Header wieder dem richtigen Workflow zugeordnet werden.
- Versand, Eingang, Rückmeldung und Eskalation werden im Logbuch protokolliert.
- Dashboard zeigt: mir zugewiesen, heute fällig, Rückmeldung ausstehend, überfällig, eskaliert.

## Mitarbeiterdatenbank / Personalstamm
Mitarbeiterdatenbank und Benutzerverwaltung werden getrennt geführt. Ein Mitarbeiter kann ohne App-Zugang existieren; ein App-Benutzer kann extern sein.

### Beschäftigungsart / Auswahlfelder
- gewerblich Stundenlohn / Arbeiter
- Angestellte Gehalt
- Auszubildende
- Teilzeit
- Aushilfe / geringfügige Beschäftigung
- Praktikum / Werkstudent optional
- aktiv / ruhend / ausgeschieden

### Persönliche Daten
- Personalnummer
- Anrede, Vorname, Nachname, Geburtsname
- Geburtsdatum und Geburtsort
- Staatsangehörigkeit
- Anschrift: Straße, Hausnummer, PLZ, Ort, Land
- private E-Mail und Telefon
- Familienstand sowie abrechnungsrelevante Angaben nur soweit erforderlich
- Eintrittsdatum, Austrittsdatum, Befristungsende
- Abteilung, Standort, Kostenstelle, Tätigkeit/Funktion, Vorgesetzter
- Führerscheinklassen und Gültigkeiten
- Qualifikationen, Unterweisungen, Scheine und Ablaufdaten

### Entgelt / Arbeitszeit
- Stundenlohn oder Monatsgehalt
- Wochenstunden / Teilzeitquote
- regelmäßige Arbeitstage
- Tarif-/Lohngruppe optional
- Zuschläge / Auslösung / Prämien
- Urlaubstage
- Zeitkonto / Überstundenmodell
- VWL-Daten inklusive Anbieter/Vertragsdaten und Arbeitgeber-/Arbeitnehmeranteil soweit benötigt

### Steuer / Sozialversicherung / DATEV-Basis
- Steuer-ID
- Steuerklasse und ggf. Faktor/Freibetrag soweit über die Lohnabrechnung benötigt
- Sozialversicherungsnummer
- Krankenkasse aus Auswahlfenster
- Personengruppenschlüssel / Beitragsgruppenschlüssel soweit für die Abrechnung erforderlich
- Beschäftigungsstatus und SV-relevante Merkmale
- Betriebsnummer des Arbeitgebers
- ggf. Betriebsstätten-/Kostenstellenzuordnung
- Bankverbindung: IBAN, BIC, Kontoinhaber
- DATEV-Personalnummer / externe Abrechnungs-ID
- Abrechnungsmandant / Beraternummer und Mandantennummer nur auf Unternehmensebene

### Meldewesen / Schnittstellen vorbereiten
- Eintritt/Austritt erzeugt einen prüfbaren Meldevorgang
- Status je Meldung: Entwurf → geprüft → freigegeben → übertragen → bestätigt / Fehler
- Krankenkassen-Auswahl mit Institutionskennung und Kontaktdaten
- Vorbereitung für DEÜV-/SV-Meldungen, Krankenkassen-Datenaustausch und lohnrelevante Rückmeldungen
- Rückmeldungen werden dem Mitarbeiter und dem ursprünglichen Meldevorgang zugeordnet
- Online-An-/Abmeldungen dürfen erst nach Freigabe durch berechtigte Rolle übertragen werden
- echte Übertragung nur über zulässige/unterstützte DATEV- bzw. Sozialversicherungs-Schnittstellen; DachWerk Pro bildet Workflow, Datenhaltung, Prüfung und Übergabe ab

### DATEV-Übergabe
DachWerk Pro soll DATEV-kompatible Stammdaten vorbereiten und exportieren. Der Personalstamm erhält dafür ein Mapping auf die benötigten DATEV-Felder, ohne den Nutzer zur Doppelerfassung zu zwingen. Vor Export erfolgt eine Pflichtfeldprüfung und ein Protokoll der übergebenen Datensätze.

### Datenschutz / Berechtigungen Personal
- besonders geschützte Personalrolle für sensible Stammdaten
- Bank-, Steuer-, SV- und Entgeltdaten nur für explizit berechtigte Nutzer
- Bauleitung sieht nur die für Einsatzplanung nötigen Mitarbeiterdaten
- jede Einsicht/Änderung sensibler Daten wird im Audit-Trail protokolliert
- Dokumente wie Verträge, Nachweise oder Bescheinigungen werden verschlüsselt und personenbezogen abgelegt

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
- Mitarbeiter / Beschäftigung / Personalstamm
- Lohn-/Gehalts- und SV-Stammdaten
- Personal-Meldevorgang / DATEV-Übergabe
- Leistungsverzeichnis
- LV-Position
- Preisquelle / Preisliste / Materialartikel
- Kalkulation
- Workflow-Vorgang / Aufgabe
- Logbucheintrag / Audit-Ereignis
- E-Mail / Erinnerung / Eskalation
- Dokument / Foto / Nachweis
- Nachtrag / Aufmaß
- Rechnung / E-Rechnung

## Grundregeln
- Kein Modul darf Daten nur als isolierte Demo halten, wenn diese Daten im nächsten Schritt gebraucht werden.
- Projekt- und LV-ID müssen in allen Folgemodulen erhalten bleiben.
- Jeder Workflow-Vorgang hat eine eindeutige Vorgangs-ID und bleibt dadurch über App, Dokumente und E-Mail rückverfolgbar.
- Preise brauchen Quelle, Preisstand und Einheit.
- Kalkulationen brauchen nachvollziehbare Material-, Lohn- und Zuschlagsanteile.
- Exporte dürfen nur Daten aus dem aktuell ausgewählten Projekt/LV verwenden.
- Rechnungen übernehmen Kunden-, Projekt-, Auftrags- und Leitweg-ID-Daten aus dem gemeinsamen Datenbestand.
- Personalstammdaten werden nur einmal gepflegt und kontrolliert an Workflow, Kalkulation und DATEV-/Meldeprozesse weitergegeben.
- Lokaler Browser-Speicher ist nur Testbetrieb; produktiv ist eine zentrale Datenbank mit Rollen/Rechten, Audit-Trail und serverseitigen Fristen erforderlich.

## Release-0.3-Abnahmekriterium
Das LV „Garnmagazin Brücke (004)“ muss vollständig durch den Ablauf Import → Zuordnung → Preisquelle → Kalkulation → Speichern → Export-Test laufen können, ohne dass Positionen oder Projektbezug verloren gehen. Zusätzlich muss mindestens eine Preisliste per Drag & Drop eingelesen, geprüft, freigegeben und für eine LV-Position verwendet werden können. Ein Workflow-Test muss außerdem Zuweisung, E-Mail-Versand, Rückmeldefrist, Erinnerung, Statusänderung und vollständigen Logbuchnachweis abbilden. Für Personal muss mindestens ein Mitarbeiter vollständig angelegt, einer Beschäftigungsart zugeordnet, mit DATEV-/SV-Pflichtfeldern geprüft und als Melde-/Exportvorgang vorbereitet werden können.
