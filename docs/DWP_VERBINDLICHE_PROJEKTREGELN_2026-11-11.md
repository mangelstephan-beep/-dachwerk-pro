# DachWerk Pro – Verbindliche Regeln und Prüffreigaben
Stand: 11.11.2026 · Fachlich bestätigte Sollvorgaben, **keine Produktionsabnahme**

## Verbindlichkeit
Bestehende Originale, freigegebene Vorlagen, historische Nummern und Projektakten nicht eigenmächtig verändern. Abweichungen vom bestätigten Stand zuerst als Konflikt dokumentieren. **GRÜN** erst nach dokumentierter produktiver Abnahme auf HP und iPhone. Lokale Tests und Vercel READY sind kein Live-Nachweis.

## 1. Produktiver Login und Datenerhalt
- Vorhandenes Administratorkonto und dessen Benutzer-ID erhalten; weder neue MASTER-Dubletten noch unkontrollierte Rechteänderungen.
- Zugang ausschließlich über nachgewiesene Inhaberschaft und sicheren, einmaligen, zeitbegrenzten Passwort-Reset wiederherstellen. Kein Passwort, Token oder Hash in GitHub, Chat, Logs oder Berichten.
- Aktueller Befund: Better Auth mit E-Mail/Passwort in Produktion; für Reset-Mail sind `RESEND_API_KEY` und `DWP_MAIL_FROM` noch nicht als produktiv eingerichtet nachgewiesen. Kein Reset-Versand ohne Konfiguration und Abnahme.
- Nach Reset alte Sitzungen sicher widerrufen. Bestandsdaten unverändert und per Leseprüfung vor/nach dem Vorgang kontrollieren.
- `/workspace` und `/training` bleiben vom produktiven Adminzugang getrennt. Preview-Secrets niemals ungeprüft in Produktion kopieren.

## 2. Dokumentnummern und Folgebelege
- DWP-A = Angebot, DWP-AB = Auftragsbestätigung, DWP-R = Rechnung, DWP-G = Gutachten, DWP-GU = Gutschrift. Für AZ/TZ/AR/SR weitere dokumentierte Typen und Beziehung verwenden.
- Fortlaufende, datumsbasierte Nummern nach Bestandsprüfung. Vom Nutzer gewünschtes Beispiel: `DWP-A-202611-0100`, dann `0101`, `0102` usw. **Bevor die technische Formatierung festgeschrieben wird, historische Belege und letzten vergebenen Zähler vergleichen; Beispiel noch nicht als bestehende Seriennummer interpretieren.**
- Überarbeitung: Ursprungsnummer mit `/1`, `/2` usw.; frühere Fassungen unverändert aufheben.
- Angebot → Auftrag/AB → Rechnung sind *neue Dokumentarten mit jeweils eigenem Nummernkreis* und lückenloser Ursprungs-/Folgebeziehung, nicht bloß eine umbenannte Datei.
- Nummern transaktionsfest, mandantenweit und ohne Doppelvergabe verwalten; nicht aus Anzahl sichtbarer Tabellenzeilen berechnen. Jahreswechselregel nachvollziehbar dokumentieren.
- Bereits vergebene Nummern und Projektkürzel erhalten, keine stille automatische Umnummerierung. Bei Umstellung historische Zuordnung sichern.

## 3. Originale und Masterlayouts
- Die zuletzt freigegebene Rottmann/Tittmoning-Schlussrechnung ist verbindliche Layout-Masterreferenz für alle DWP-Dokumente.
- Logo, Adressfenster, rote Linien, Schrift, rechter Metadatenblock, Fußzeile, DGuSV-Siegel, Unterschriftsposition, Barcode oberhalb der roten Kopflinie und QR-Code oberhalb der Fußlinie erhalten; Codes pro Beleg passend erzeugen.
- Nur belegbezogene Inhalte ändern, freigegebene Bank- und Steuerangaben aus dem Original übernehmen.
- Bilder, insbesondere Gesichter im Lebenslauf, nicht generativ verändern. Exakte freigegebene Originaldateien wiederverwenden.
- Ohne tatsächlich importiertes und verifiziertes PDF keine Behauptung, die Anwendung nutze schon das Originalmasterlayout. Freigegebene visuelle Referenz und Layout-Regressionsprüfung einführen.

## 4. Zentrale Dokumentenablage
- Jeder Beleg enthält Datum, Nummer und Version, Dokumentart, Projekt/Kommission, Empfänger, Bearbeiter, Status, Hinweis, Originaldatei und Ursprungs-/Folgelinks.
- Upload mit Prüfsumme und bestätigtem Wiederabruf; erst danach „gespeichert“ anzeigen. Versionen, Suche, Filter, Tabellenansicht, Excel/CSV, Rechte und Änderungsprotokoll sicherstellen.
- ChatGPT-Dateibibliothek und DWP-Backend sind **nicht automatisch synchronisiert**. Originale nur mit verifiziertem Upload übernehmen.
- Modul 37 bleibt ROT bis echter produktiver iPhone-/HP-/Mandanten-/Speicherabnahme.

## 5. Geschütztes Benutzer- und Anmeldeprotokoll
- Protokoll mit Benutzer-ID/Name, Datum/Uhrzeit inkl. Zeitzone, Login-/Logout-/Modulereignis, Ergebnis, Gerät/Browser sowie optional Projektbezug.
- Vorhandene Tabelle `dwp_access_events` und Auth-Hooks weiterverwenden. Fehlversuche, Logout und Darstellung separat prüfen; bisherige Login-Ereignisse belegen nicht vollständige Login-Audit-Abdeckung.
- **Niemals Passwörter, Passwort-Hashes, Tokens, Session-Cookies oder Secrets protokollieren oder exportieren.**
- Sichtbarkeit nur für verifizierten Eigentümer/autorisierten Admin, mit transparenter Nutzerinformation, technischen Zugriffsbeschränkungen sowie angemessenem Datenschutz-/Aufbewahrungskonzept.
- Modulaufrufe sind kein verlässlicher Zeitnachweis.

## 6. Technische Abnahmefolge
1. Auth-Routen und Vercel-Produktivkonfiguration ohne Secret-Ausgabe prüfen; E-Mail-Reset-Abhängigkeit dokumentieren.
2. Sicheren Reset erst nach verifizierter Identität, funktionsfähigem Mailanbieter und expliziter Freigabe ausführen.
3. Login, Rechtegrenzen, Projektbestand und Logout/Sitzungswiderruf auf HP und iPhone prüfen.
4. Originalbriefpapier und historische Dokumentnummern gegen Quellen abgleichen.
5. Nummern-/Versionskette und Originalspeicher in Tests absichern; Modul 37 auf echten Geräten abnehmen.
6. Änderungen erst nach Tests, Review und bestätigter Freigabe produktiv schalten.

**Dies ist ein Anforderungs-/Sicherungsdokument, keine Behauptung einer bereits fertiggestellten Funktion.**
