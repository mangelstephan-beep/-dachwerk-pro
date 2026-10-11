# DachWerk Pro – Training

Stand 11.10.2026. Einstieg: `/training`. Eigene Route mit serverseitiger Anmeldung und signiertem HttpOnly-Sessioncookie (8 Stunden). Der Trainingsaccount ist ein geteilter Einladungszugang, keine individuelle Anwenderverwaltung.

## Umfang

Acht Schritte verwenden ein gemeinsames lokales Musterprojekt: Kunde → Projekt → Kalkulation → Angebot → Aufmaß → Dokumentation → Rechnungsvorschau → Nachkalkulation. Änderungen aktualisieren Angebots- und Rechnungswerte. Eine Preisänderung hebt die Annahmemarkierung auf. Ein eigener Browserspeicherschlüssel isoliert den Trainingsstand von den bisherigen Moduldaten. Rücksetzen betrifft nur das Musterprojekt. JSON-Download dient als lokale Ergebnissicherung.

Das Fragezeichen öffnet eine hinterlegte Produkthilfe. Unbekannte Fragen werden ausdrücklich als unbeantwortet angezeigt. Es gibt keine freie KI-Verbindung und keinen Zugriff auf private Chatverläufe. Für die spätere KI-Hilfe sind ein serverseitiger Modellzugang, eine freigegebene Produktwissensbasis, Nutzungslimits und testspezifische Gesprächsdaten erforderlich.

## Konfiguration

Serverseitig erforderlich:
- `TRAINING_SESSION_SECRET`: mindestens 32 Zeichen zufälliger Signaturschlüssel.
- `TRAINING_CREDENTIAL_HASH`: SHA-256 aus `Nutzer:Passwort` für den gewünschten Trainingszugang.

Werte ausschließlich als Vercel-Secrets konfigurieren. Keine echten Projekt-/Kundendaten für diesen geteilten Zugang. Die JavaScript- und CSS-Dateien enthalten ausschließlich Demo-Logik, keine Zugangsdaten. Vercel-Deployment-Schutz kann zusätzlich gelten; für externe Testpersonen einen Share-Link zum konkreten Deployment verwenden.

## Grenzen des geprüften Bestands

Basis: main Commit b30ec760fcf3bfb99d48e9174f3a8495175bcb5c.
- 21 registrierte Hauptbereiche (`pageMeta`/`views`, `release.json`), keine nachgewiesene Liste von 36 vollständigen Modulen.
- Kunden- und Projektansichten basieren überwiegend auf statischen Musterdaten; Schnellerfassung meldet ein Speichern, ohne persistente Datensatzablage.
- Zahlreiche Aktionen zeigen nur Hinweise für spätere Funktionen.
- Allgemeine Modulmasken speichern Status und Notizen lokal nach Modul, ohne gemeinsame projektspezifische Verknüpfung.
- Importbibliotheken von externen CDNs widersprechen `script-src 'self'`; die darauf folgende Loader-Kette für Materialabgleich und Workflow-Hilfe kann deshalb ausfallen.
- Die bisherige Anmeldung wird im Browser geprüft; sie ist keine produktive Benutzer- oder Rechteverwaltung.

Das Training ist eine gesonderte, benutzbare Demonstration eines ausgewählten Datenflusses. Eine Freigabe aller Module für den Produktivbetrieb ergibt sich daraus nicht.
