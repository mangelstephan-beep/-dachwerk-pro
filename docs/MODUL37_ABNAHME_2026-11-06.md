# Modul 37 – Abnahmeprotokoll (06.11.2026)

**Status: ROT – technische Teilprüfung, produktive Abnahme offen.**

### Bereits implementiert / Codeprüfung
- Projektbezogenes Dokumentenregister: Suche, Filter, Datum-/Dokumentnummer-Sortierung, CSV-Export.
- PDF/JPG/PNG/WebP bis 64 MB, zentrale Dateispeicherung und SHA-256-Prüfung.
- Nachreichen fehlender Originaldateien ohne neuen Beleg; Versionsbezug und Änderungsjournal aus bestehendem Projektbestand.
- Diese Änderung: Dokumentnummern mandantenweit auf dem Server statt nur je Projekt fortschreiben; parallele Versionenkonflikte führen zu 409/Reload.
- Diese Änderung: Datei vor Metadatenzuordnung als abrufbar markieren, nach Upload zentralen Wiederabruf prüfen und erst dann Erfolg melden.
- Diese Änderung: Klick auf Tabellenzeile bzw. Enter/Leertaste öffnet den geschützten Originalabruf; zusätzlich geschützter XLSX-Export.

### Bestandsdaten wiederverwenden (Erweiterung)
- Im Register vorhandene Vorgänge als Metadatenvorlage für **neue unabhängige** Belege auswählen; ursprüngliche Datei, Dokumentnummer und Version bleiben unverändert.
- Bei Wiederverwendung im selben Projekt werden Titel, Kategorie, Beschreibung, Kommission, Empfänger und Bearbeiter vorausgefüllt; die neue Belegnummer wird separat erzeugt.
- Bei Wiederverwendung aus einem anderen freigegebenen Projekt werden nur allgemeiner Titel und Kategorie vorausgefüllt, nicht projektspezifische Inhalte oder Empfänger.
- Für jeden neu erfassten Beleg ist weiterhin ein eigener bestätigter Datei-Upload erforderlich. **Kein automatischer Zugriff auf die ChatGPT-Dateibibliothek**; deren Originale sind nur nach bestätigtem Import im App-Backend verfügbar.

### Automatisch zu prüfen
- `npm ci && npm test && npm run check && npm run build`
- `test-document-register.cjs`: Nummerierung über zwei Projekte, wirklicher XLSX-Export mit Projektfilter, CSV-Formelschutz, fehlende Datei nachreichen, Upload nach Fehler fortsetzen.
- `test-file-store.cjs`: Dateiintegrität >3 MB, Download bytegenau, verweigerte Zugriffe, erneute Chunks, Größenlimits.

### Unverzichtbare Produktions-/Geräteabnahme (noch nicht nachgewiesen)
1. Echtes Benutzerkonto, Projekt A/B und Kundenabgrenzung auf `www.dachwerkpro.de` öffnen.
2. PDF und Bild von einem **freigegebenen iPhone** hochladen, App vollständig schließen und erneut anmelden; Originaldatei und Metadaten unverändert öffnen.
3. Upload absichtlich unterbrechen; **kein grüner Erfolg**, dieselbe Dokument-ID wiederverwenden; Datei nachreichen.
4. Geschützten Originalabruf und PDF-Vorschau am iPhone sowie HP-PC testen; Dateihash/Größe mit Upload vergleichen.
5. Suche, Filter, Sortierung, Tabellenzeile, CSV- und XLSX-Export auf beiden Geräten bedienen; unbefugter Geräte-/Fremdprojektzugriff muss verweigert werden.
6. Bestehende Akte als **echte Originaldatei** importieren und erst nach serverseitiger Speicherbestätigung als „gespeichert“ markieren.
7. Protokoll prüfen: Anlage, Upload, Änderung, Export, Dateizugriff und Versionsketten. Revisionssicherheitsanforderungen ggf. zusätzlich rechtlich/technisch bewerten.

### Bestandsdaten- und Vorlagenwiederverwendung
Die bislang in ChatGPT-Dateibibliothek vorhandenen DWP-Gutachten-/Rechnungsvorlagen, Briefkopf, DGuSV-Stempel, Unterschrift und Projektakten sind **nicht automatisch im App-Backend**. Es darf daher kein scheinbarer Import oder eine Synchronisation behauptet werden. Für die produktive Wiederverwendung müssen berechtigte Originale per freigegebenem Upload und verifiziertem Wiederabruf in die jeweilige Projektakte eingebunden werden. Keine Originale löschen oder blind überschreiben.

**Abnahmeentscheidung:** ROT bis zu allen produktiven Nachweisen. Kein automatisches Umschalten auf GRÜN aufgrund eines Merges oder lokaler Tests.
