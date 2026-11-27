# Modulnavigation und Direktlinks - 22.10.2026

Der produktive Modul-Seitenkopf hatte keine Rücknavigation, obwohl die ältere
Ansicht einen Zurück-Button enthielt. Alle zentralen Module erhalten eine eigene,
oben haftende Navigation mit „Zurück“, „Alle Module“ und „Direktlink“.

Der Zurück-Button folgt den in dieser Sitzung geöffneten Modulen. Aus Bearbeitung,
Unterschrift oder Importdetail führt er zuerst zur zugehörigen Modulansicht. Nach
einem direkten Einstieg oder Neuladen ist die Modulübersicht das sichere Rückziel.
Das ist eine interne Modulnavigation; die native Browser-Historie wird nicht als
Modulverlauf verwendet. Ungespeicherte Eingaben verlangen eine Entscheidung.

`/?start=app&module=customers` öffnet Kunden nach bestätigter Anmeldung.
Weitere Beispiele: `projects`, `imports`, `lv`, `calculation`, `workflow`, `expert`.
Die URL wird beim Modulwechsel aktualisiert und kann kopiert werden. Unbekannte
Modulwerte führen zur Übersicht. Links enthalten keine Kundendaten oder
Zugriffsrechte; bestehende Anmeldung und serverseitige Berechtigungen bleiben nötig.
Die Projektauswahl wird weiterhin benutzerbezogen wiederhergestellt.

Prüfung: neuer DOM-Test für Direktstart, unbekannte Routen, Rückverlauf,
Bearbeitungsrückkehr, Abbruch bei ungespeicherten Eingaben und Projekterhalt.
Bestehende Projektstart-, zentrale Schreib- und Statusprüfungen bestanden;
vollständige npm-Testsuite, Syntaxprüfung und Build bestanden.

Produktive angemeldete Prüfung und echte iPhone-Geräteabnahme bleiben offen.
Keine Modulstatusänderung: weiterhin fünf dokumentierte Freigaben von 36.
