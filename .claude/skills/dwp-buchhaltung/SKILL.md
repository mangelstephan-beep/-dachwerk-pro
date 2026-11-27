---
name: dwp-buchhaltung
description: Buchhaltung in DachWerk Pro (DWP) nach SKR03 – Rechnungen, Zahlungen, Mahnwesen, Eingangsrechnungen/Zahlungsausgang, Buchungsjournal und DATEV-CSV, § 19 / § 13b UStG, Storno. Verwenden, wenn Belege geprüft, Zahlungen gebucht, Mahnungen erstellt, Konten vorgeschlagen oder die Module 27–31 geändert werden.
---

# DWP-Buchhaltung

Anleitung für Claude, wie in DachWerk Pro buchhalterische Aufgaben erledigt und die
zugehörigen Module geändert werden. Gilt zusätzlich zu
`docs/DWP_VERBINDLICHE_PROJEKTREGELN_2026-11-11.md` – bei Widerspruch gelten die Projektregeln.

## Grundregeln (immer)

1. **Kein Steuerberater.** Kontenvorschläge sind Vorschläge („mit Steuerberater abstimmen“).
   Bei Steuerfragen Fakten nennen, keine verbindliche Empfehlung geben.
2. **Keine Kundendaten ins Repo.** Das Repo ist öffentlich. Rechnungen, Kontoauszüge,
   Kundennamen, IBANs, Steuernummern nie committen – auch nicht in Tests oder `docs/`.
   Tests nur mit erfundenen Daten („Hausverwaltung“, „Privat“).
3. **Nichts erfinden.** Beträge, Rechnungsnummern, Zahlungsdaten nur aus echten Belegen oder
   von Stephan. Fehlt etwas, nachfragen statt schätzen. Rechnen immer per Code, nicht im Kopf.
4. **Freigegebene Belege nicht ändern.** Korrektur nur über Stornorechnung + neue Rechnung.
   Vergebene Nummern nie umnummerieren.
5. **GRÜN nur durch Stephan.** Module 27–31 nach einer Änderung nicht selbst auf GRÜN setzen;
   `module-verification.js` bleibt bis zur dokumentierten Abnahme (HP + iPhone) unverändert
   bzw. auf ROT mit Hinweis auf die Änderung.
6. **Direkte Links mitschicken.** Alles, was Stephan prüfen oder freigeben soll, mit Link auf
   genau das Modul: `https://www.dachwerkpro.de/?start=app&module=<key>`.
7. **Gleich richtig.** Vor jeder Rückmeldung den betroffenen Test und `npm test` laufen lassen,
   damit nicht nachgebessert werden muss.

## Module und Links

| Nr. | Modul | key | Link |
|---|---|---|---|
| 23 | Zeiten und Regie | `times` | https://www.dachwerkpro.de/?start=app&module=times |
| 27 | Ausgangsrechnungen | `invoices` | https://www.dachwerkpro.de/?start=app&module=invoices |
| 28 | Eingangsrechnungen | `incoming` | https://www.dachwerkpro.de/?start=app&module=incoming |
| 29 | Zahlung und Kontierung | `payments` | https://www.dachwerkpro.de/?start=app&module=payments |
| 30 | Monatsabschluss und Export | `closing` | https://www.dachwerkpro.de/?start=app&module=closing |
| 31 | Nachkalkulation und Controlling | `controlling` | https://www.dachwerkpro.de/?start=app&module=controlling |
| – | Einstellungen (§ 19, Nummernstart, Bank/Steuer) | `settings` | https://www.dachwerkpro.de/?start=app&module=settings |

Code-Stellen:
- `project-core.js` – Felddefinitionen (`modules`), `PAYMENT_KINDS`, `SKR03`, `ACCOUNTS`,
  `ACCOUNT_LABELS`, `DUNNING_LEVELS`, `BASE_RATES`, `lateInterest()`, `paymentEffect`,
  `Store.save()` (Prüfregeln), `issue()` (Rechnungen mit Zahlungsziel), `stornoInvoice()`,
  `accounts()`, `invoiceDates()`, `openItems()`, `dunInvoice()`, `dunningLetter()`,
  `payIncoming()`, `openPayables()`, `journal()`, `balances()`, `controlling()`,
  `customerOverview()`, `nextDocumentNumber()`, `SMALL_BUSINESS_NOTE`, `REVERSE_CHARGE_NOTE`.
- `project-workflows.js` – Oberfläche: `dunningPanels()` (Modul 29), `payablesPanel()` (Modul 28),
  `journalPanel()` / `journalFile()` (Modul 30), `accountingSettings()` (Einstellungen),
  `printDunning()`, Export `closing-csv` / `project-json`.
- `lib/project-service.cjs` – `dunInvoice` und `payIncoming` sind freigabepflichtig (admin/manager).
- `lib/project-service.cjs` – `execute()` und `memoryRepository()` für Server-Prüfungen.
- Tests: `test-accounting-dunning.cjs`, `test-accounting-ui.cjs`, `test-accounting-close.cjs`, `test-billing.cjs`, `test-payment-settlement.cjs`, `test-small-business.cjs`,
  `test-regie-reverse-charge.cjs`, `test-document-numbers.cjs`, `test-ablauf-termin-abnahme.cjs`.

## Belege und Nummern

- Format `DWP-<Art>-JJJJMM-NNNN/Version`, z. B. `DWP-R-202611-0104/1`.
  A = Angebot, AB = Auftragsbestätigung, R = Rechnung, M = Mahnung (G = Gutachten, GU = Gutschrift,
  NU = NU-Vertrag laut Projektregeln). `nextDocumentNumber()` vergibt technisch A, AB, R, M.
- Jede Rechnung trägt `invoiceDate`, `paymentDays` und `dueDate` (Zahlungsziel aus Einstellungen,
  Standard 14 Tage, bei Ausgabe änderbar). Alte Rechnungen ohne Datum: Erstellungsdatum + Zahlungsziel.
- Zähler je Belegart fortlaufend ab `settings.documentNumberStart`; nie aus sichtbaren Zeilen zählen.
- Rechnungsarten in `issue('invoices', {orderId, invoiceType, percentage})`:
  `Abschlagsrechnung`, `Teilrechnung`, `Schlussrechnung` (immer 100 %). Schlussrechnung nach Aufmaß
  braucht freigegebenes Aufmaß je Position; ohne Aufmaß nur bei vereinbartem Pauschalpreis.
  Pro Auftrag nur eine nicht stornierte Schlussrechnung.

## Umsatzsteuer

| Fall | Erkennung im Code | Rechnung | SKR03-Erlöskonto (Vorschlag) |
|---|---|---|---|
| Regelsteuer 19 % / 7 % | `tax` 19 bzw. 7 | mit USt | 8400 (19 %) / 8300 (7 %) |
| Kleinunternehmer § 19 UStG | `settings.smallBusiness===true` → `tax=0`, `taxNote=SMALL_BUSINESS_NOTE` | ohne USt, Hinweistext | 8195 |
| § 13b UStG (Kunde ist Bauleister) | `customer.reverseCharge===true` und nicht § 19 | ohne USt, `REVERSE_CHARGE_NOTE`, USt-IdNr./StNr. des Kunden Pflicht | 8337 |

- § 19 hat Vorrang vor § 13b (Kleinunternehmer stellt nie § 13b aus).
- Mischen innerhalb eines Auftrags ist gesperrt: erst alte Rechnungen stornieren.
- § 19-Grenzen (seit 2025: Vorjahr ≤ 25.000 €, laufendes Jahr ≤ 100.000 €) bei Fragen aktuell
  nachschlagen, nicht aus dem Gedächtnis zusichern.

## Zahlungen buchen (Modul 29)

Jede Buchung hängt an genau einer Ausgangsrechnung (`invoiceId`). Pflicht: `title`, `date`,
`amount` > 0 (brutto).

| Buchungsart (`direction`) | Wirkung | Pflichtangaben | Konto, das automatisch eingetragen wird |
|---|---|---|---|
| Zahlungseingang | Geld erhalten | – | – (Bank, z. B. 1200, ggf. selbst angeben) |
| Skonto / Abzug | gleicht aus, kein Geld | Grund in `notes`/`account` | 8736 (19 %), 8731 (7 %), sonst 8730 |
| Restbetrag ausgebucht | gleicht aus | Grund | 8700 Erlösschmälerungen |
| Restbetrag auf Zwischenkonto | gleicht aus | Grund | 1590 Durchlaufende Posten |
| Sicherheitseinbehalt | bleibt offen bis Auszahlung | `retentionUntil` (Ende Gewährleistung) | – |
| Einbehalt ausgezahlt | Geld erhalten, Einbehalt sinkt | höchstens offener Einbehalt | – |
| Rückzahlung | Geld zurück | nur auf Stornorechnung, höchstens erhaltenes Geld | – |
| Mahngebühr erhalten | Geld erhalten, gleicht Rechnung nicht aus | höchstens angemahnte Gebühren + Pauschale | 2700 Sonstige Erträge |
| Verzugszinsen erhalten | Geld erhalten, gleicht Rechnung nicht aus | höchstens höchster angemahnter Zinsbetrag | 2650 Zinserträge |

- Steht in `account` schon eine vierstellige Kontonummer, bleibt sie unverändert.
- Summe aller Buchungen darf den Rechnungsbetrag brutto nicht übersteigen.
- Auf stornierte Rechnungen keine Zahlungseingänge.
- Projekt kann trotz offenem Sicherheitseinbehalt abgeschlossen werden; Auszahlung später möglich.
- Offener Posten = `gross − paid − discount − writeOff − suspense − retained` (siehe `controlling()`).

## Mahnwesen (Modul 29, Bereich „Offene Posten und Mahnwesen“)

- `openItems(asOf)` zeigt alle offenen Ausgangsrechnungen aller sichtbaren Projekte. Sicherheitseinbehalt
  wird nicht angemahnt, sondern nach Ablauf von `retentionUntil` als `retentionDue` gemeldet.
- Stufen `DUNNING_LEVELS`: Zahlungserinnerung (immer ohne Kosten) → 1. Mahnung → 2. Mahnung → Letzte Mahnung.
  Erst nach Fälligkeit, nächste Stufe erst nach Ablauf der Frist (`settings.dunningDays`, Standard 10).
- Gespeichert als `invoice.dunnings[]` (außerhalb von `data`, die Rechnung bleibt unverändert).
- Folgemahnungen fordern offene Kosten früherer Schreiben mit (`previousFees`, `previousInterest`);
  `dunningCosts(invoiceId)` liefert angemahnte/erhaltene/offene Mahnkosten, `openItems()` zeigt `costsOpen`.
- Mahngebühr `settings.dunningFee` ab 1. Mahnung; Verzugspauschale 40 EUR nur Gewerbekunden
  (`customerType==='Gewerbekunde'` oder § 13b) und nur einmal je Rechnung (§ 288 Abs. 5 BGB).
- Verzugszinsen nur auf Wunsch: Privat Basiszins + 5, Gewerbe + 9 Prozentpunkte, tagesgenau je
  Basiszins-Halbjahr. Verzugsbeginn: Tag nach der 1. Mahnung; bei Gewerbe spätestens 31 Tage nach
  Fälligkeit. Fehlt der Basiszins für einen Zeitraum, bricht die Berechnung ab → neuen Wert
  (Bundesbank, 1.1./1.7.) unter Einstellungen nachtragen bzw. `BASE_RATES` ergänzen.
- Kein Rechtsrat: bei Verbrauchern, Streit oder Beträgen vor Gericht auf Anwalt verweisen.

## Eingangsrechnungen (Modul 28)

- Pflicht: `title`, `supplier`, `invoiceNumber`, `date`, `net`, `tax`.
- Gleiche Kombination Rechnungssteller + Belegnummer ist gesperrt (Doppelerfassung).
- `includeInCosts` = zählt als Ist-Kosten im Controlling. Mit `purchaseId` bzw. `subcontractId`
  verknüpfen; bei NU muss `supplier` dem Nachunternehmer entsprechen, der NU-Ansatz wird ersetzt
  (keine Doppelzählung).
- Kontenvorschlag (SKR03, abstimmen): Material 3400/3300 (19/7 %), ohne Vorsteuer bzw. § 19: 3200,
  Fremdleistungen 3100. Eingehende Bauleistungen nach § 13b gesondert mit dem Steuerberater klären.
- Zahlungsausgang: `payIncoming(id,{kind,date,amount,account})`, Arten „Zahlungsausgang“ und
  „Skonto erhalten“, höchstens offener Bruttobetrag; gespeichert als `incoming.payouts[]`.

## Storno

- `stornoInvoice(id, {reason})`: Begründung Pflicht, nur Rechnungen im aktuellen Projekt,
  nur einmal; abgeschlossenes Projekt vorher mit Begründung wieder öffnen (`reopenProject`).
- Bereits gezahltes Geld über „Rückzahlung“ auf der Stornorechnung erfassen.

## Buchungsjournal und Export (Modul 30)

- `journal({from,to})`: Buchungssätze „Soll an Haben“, brutto, alle sichtbaren Projekte.
  Rechnung 1400 an Erlös (8400/8300/8195/8337/8200), Storno umgekehrt, Zahlung Bank an 1400,
  Skonto/Ausbuchung/Zwischenkonto an 1400, Rückzahlung 1400 an Bank, Eingangsrechnung Aufwand an 1600,
  Zahlungsausgang 1600 an Bank/erhaltene Skonti. Eine Kontonummer im Feld „Konto“ der Zahlung hat Vorrang.
- Sicherheitseinbehalt bucht nicht (bleibt Forderung bis „Einbehalt ausgezahlt“).
- Abschlags-/Teil-/Schlussrechnungen buchen je ihren eigenen Betrag als Erlös (vereinfacht; ob
  Anzahlungskonten nötig sind, klärt der Steuerberater).
- Konten: `ACCOUNTS` + `settings.accounts` (Einstellungen → Buchhaltung). Erlös-, Skonto- und
  Wareneingangskonten sind DATEV-Automatikkonten, deshalb brutto ohne BU-Schlüssel.
- Exporte: Journal-CSV, „DATEV-Buchungen CSV“ (ASCII-Felder) und „DATEV-Buchungsstapel (EXTF)“:
  `datevExtf()` / `Store.datevExport({from,to})`, EXTF 700 Formatversion 13, Windows-1252 (`cp1252()`),
  Berater-/Mandantennummer und WJ-Beginn aus `settings.datevConsultant`, `datevClient`, `fiscalYearStart`.
  Ein Stapel = ein Wirtschaftsjahr, alle Konten gleich lang. Vor erstem Import mit dem Steuerberater testen.
- Festschreibung: `settings({lockedUntil})` nur vorwärts und nur bis gestern; `assertOpenPeriod()` sperrt
  Zahlungen, Eingangsrechnungen und Zahlungsausgänge mit Datum bis dahin.
- Stornorechnungen tragen ihr eigenes Datum (`invoiceDate` = Storno-Tag).
- Weiterhin vorhanden: Projektakte JSON, Belegübersicht CSV.

## Typische Aufgaben

**Beleg prüfen (PDF/Foto von Stephan):** Positionen, Netto, USt-Satz, Brutto per Skript
nachrechnen; Nummernformat, Pflichtangaben (§ 14 UStG), § 19-/§ 13b-Hinweis und Empfänger
prüfen; Abweichungen als Liste melden. Beleg nicht ins Repo legen.

**Zahlung kontieren:** passende Buchungsart aus der Tabelle wählen, Grund formulieren
(z. B. „2 % Skonto innerhalb 10 Tagen“), Konto nennen, Stephan den Link
https://www.dachwerkpro.de/?start=app&module=payments geben.

**Offene Posten / Kundenübersicht:** `openItems()`, `openPayables()`, `controlling()` bzw.
`customerOverview(customerId)` nutzen, nichts schätzen. Link Mahnwesen:
https://www.dachwerkpro.de/?start=app&module=payments

**Mahnung erstellen:** nur über Modul 29 bzw. `dunInvoice()`; Stufe und Kosten nie von Hand
festlegen, die Prüfregeln entscheiden. Ausdruck über „Drucken / PDF“ (Briefpapier).

**Für den Steuerberater:** Modul 30 → Zeitraum wählen → „DATEV-Buchungen CSV“ und „Journal CSV“.

**Daten vorab prüfen, bevor etwas in DWP eingetragen wird:** mit erfundenem oder lokalem Store
durchspielen, damit die Prüfregeln greifen:

```js
const {Store}=require('./project-core.js');
let raw=null;const db=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});
const ok={status:'Freigegeben',owner:'Stephan'};
// … Kunde, Projekt, LV, Angebot, Auftrag, Aufmaß, Abnahme wie in test-payment-settlement.cjs
const inv=db.issue('invoices',{orderId:order.id});
db.save('payments',{title:'Skonto',invoiceId:inv.id,direction:'Skonto / Abzug',date:'2026-11-10',amount:12.34,notes:'2 % Skonto'},ok);
console.log(db.controlling());
```

Für Server-Logik `execute(memoryRepository(), user, {method, args, projectId, revision})`
aus `lib/project-service.cjs` verwenden.

## Code ändern (Module 27–31)

1. Bestehende Prüfregel in `Store.save()` / `issue()` suchen und erweitern, nicht duplizieren.
2. Neue Regel mit Test in der passenden `test-*.cjs` absichern; neue Testdatei in
   `package.json` → `scripts.test` eintragen.
3. `npm run check` und `npm test` müssen grün sein.
4. Abnahme-Checkliste `docs/MODULxx_<NAME>_<JJJJ-MM-TT>.md` mit Testschritten und direkten Links.
5. Feature-Branch, PR gegen `main`, CI abwarten. Nicht ohne Stephans ausdrückliche Freigabe
   nach `main` mergen oder produktiv schalten.
