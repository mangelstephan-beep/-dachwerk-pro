const assert=require('node:assert/strict');
const {Store}=require('./project-core.js');
// Durchgängiger Ablauftest (15.11.2026, Vorgabe Stephan Mangel):
// Termin → Besuchstermin → Bestandsaufnahme → Angebot → AZ (Abschlagsrechnung) → TR (Teilrechnung)
// → ST (Stundenzettel / Regie, vom Kunden unterschrieben) → Abnahme → Schlussrechnung → Zahlung → Abschluss.
let raw=null;const db=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v}),ok={status:'Freigegeben',owner:'Stephan'};
const cent=n=>Math.round(n*100)/100;
const date='2026-11-16',sign={signer:'Hr. Meyer (AG)',strokes:[[[0.1,0.1],[0.2,0.3],[0.4,0.2]]]};
const docNo=(type,n)=>new RegExp('^DWP-'+type+'-\\d{6}-'+String(n).padStart(4,'0')+'/1$');

// 1. Kunde und Projekt
const customer=db.save('customers',{name:'Hausverwaltung Meyer',customerType:'Gewerbekunde',contact:'Hr. Meyer'});
const project=db.save('projects',{name:'Flachdach Lesum',customerId:customer.id,phase:'Erfassung'});

// 2. Termin + Besuchstermin: Einsatz im Kalender (Modul 18), Mitarbeiter sagt zu, keine Doppelbelegung
const employee=db.save('personnel',{name:'Bauleiter',number:'P1',employment:'Angestellte',wage:45});
const visit=db.schedule(employee.id,{projectId:project.id,start:date,end:date,task:'Besuchstermin beim Kunden'});
assert.throws(()=>db.schedule(employee.id,{projectId:project.id,start:date,end:date,task:'Doppelt'}),/bereits eingeplant/);
db.respondSchedule(employee.id,visit.id,{answer:'Zugesagt',note:'Komme 9 Uhr'});
const planned=db.get(employee.id).assignments.find(a=>a.id===visit.id);
assert.equal(planned.response,'Zugesagt');assert.equal(planned.task,'Besuchstermin beim Kunden');assert.equal(planned.projectId,project.id);

// 3. Bestandsaufnahme: Feststellung (sperrend bis Entscheidung) und Fotobeleg
const finding=db.save('technical',{title:'Bestandsaufnahme Dach',finding:'Bitumenbahn versprödet, Attika undicht, Gully zugesetzt',blocking:true});
const photo=db.save('documents',{title:'Fotos Bestandsaufnahme',category:'Foto',description:'Dachfläche und Attika',date});
db.attach(photo.id,{name:'dach.png',dataUrl:'data:image/png;base64,iVBORw0KGgo='});
assert.equal(db.get(photo.id).attachments.length,1);

// 4. Angebot: LV, Sperre durch offene Feststellung, dann Angebotsnummer DWP-A-…
db.advancePhase('Kalkulation');
const p1=db.save('lv',{number:'01',text:'Abdichtung zweilagig',qty:200,unit:'m²',material:20},ok);
const p2=db.save('lv',{number:'02',text:'Attikaanschluss',qty:40,unit:'m',material:15},ok);
assert.throws(()=>db.issue('offers'),/Sperren/);
db.save('technical',{...finding.data,decision:'Sanierung zweilagig, Attika neu anschließen'},{id:finding.id,status:'Erledigt',owner:'Stephan'});
const offer=db.issue('offers');
assert.match(offer.data.number,docNo('A',100));assert(offer.data.net>0);

// 5. Auftrag mit Auftragsbestätigung DWP-AB-…
const order=db.save('orders',{title:'Auftrag Flachdach',offerId:offer.id,date},ok);
assert.match(db.get(order.id).confirmation.number,docNo('AB',100));
db.advancePhase('Beauftragt');db.advancePhase('Ausführung');
// Aufmaß (Leistungsstand): Abschlag/Teilrechnung rechnen den kumulativen Anteil vom freigegebenen Aufmaß ab.
db.save('measurements',{title:'Dachfläche',positionId:p1.id,length:20,width:10,factor:1,date},ok);
db.save('measurements',{title:'Attika',positionId:p2.id,length:40,width:1,factor:1,date},ok);

// 6. AZ: Abschlagsrechnung 30 %
const az=db.issue('invoices',{orderId:order.id,invoiceType:'Abschlagsrechnung',percentage:30});
assert.match(az.data.number,docNo('R',100));assert.equal(az.data.invoiceType,'Abschlagsrechnung');
assert.equal(az.data.net,cent(offer.data.net*0.3));

// 7. ST: Stundenzettel (Regie) mit Verrechnungssatz, Kundenbestätigung und Unterschrift
const st=db.save('times',{title:'Regie Gully freilegen',date,employeeId:employee.id,hours:3,rate:45,billingRate:62,work:'Gully freigelegt, Einlauf gereinigt',billable:true,customerConfirmation:'Stundenzettel 1, Hr. Meyer'},ok);
db.sign(st.id,sign);
assert(db.workflow().issues.some(i=>/Stundenlohnarbeit/.test(i.message)),'offene Regie wird gemeldet');

// 8. TR: Teilrechnung kumulativ 60 % + Regie aus dem Stundenzettel (nur einmal)
const tr=db.issue('invoices',{orderId:order.id,invoiceType:'Teilrechnung',percentage:60});
assert.match(tr.data.number,docNo('R',101));
const regie=tr.data.positions.find(p=>p.id===st.id);
assert.equal(regie.qty,3);assert.equal(regie.ep,62);assert.equal(regie.gp,186);
assert.equal(tr.data.net,cent(offer.data.net*0.3+186));
assert(!db.workflow().issues.some(i=>/Stundenlohnarbeit/.test(i.message)));

// 9. Abnahme mit Unterschrift, danach Schlussrechnung
db.advancePhase('Abnahme');
const acceptance=db.save('acceptance',{title:'Abnahme Flachdach',date,participants:'AG Hr. Meyer und AN Stephan Mangel',result:'Abgenommen',signer:'Hr. Meyer'},ok);
db.sign(acceptance.id,sign);
const sr=db.issue('invoices',{orderId:order.id});
assert.match(sr.data.number,docNo('R',102));assert.equal(sr.data.invoiceType,'Schlussrechnung');
assert(!sr.data.positions.some(p=>p.id===st.id),'Regie nicht doppelt');
assert.equal(cent(az.data.net+tr.data.net+sr.data.net),cent(offer.data.net+186));
assert.throws(()=>db.issue('invoices',{orderId:order.id}),/bereits abgerechnet/);

// 10. Zahlung: AZ und TR voll, Schlussrechnung mit 2 % Skonto und 5 % Sicherheitseinbehalt
assert.throws(()=>db.advancePhase('Abgeschlossen'),/Zahlung/);
for(const inv of [az,tr])db.save('payments',{title:'Zahlung '+inv.data.number,invoiceId:inv.id,direction:'Zahlungseingang',date,amount:inv.data.gross},ok);
const skonto=cent(sr.data.gross*0.02),retention=cent(sr.data.gross*0.05);
db.save('payments',{title:'Zahlung SR',invoiceId:sr.id,direction:'Zahlungseingang',date,amount:cent(sr.data.gross-skonto-retention)},ok);
db.save('payments',{title:'Skonto',invoiceId:sr.id,direction:'Skonto / Abzug',date,amount:skonto,notes:'2 % Skonto 10 Tage'},ok);
db.save('payments',{title:'Einbehalt',invoiceId:sr.id,direction:'Sicherheitseinbehalt',date,amount:retention,retentionUntil:'2031-11-16'},ok);
const c=db.controlling();
assert.equal(c.outstanding,0);assert.equal(c.retained,retention);

// 11. Abschluss: keine offenen Punkte mehr
db.save('documents',{title:'Abnahmeprotokoll',category:'Nachweis',description:'Abnahme unterschrieben',relatedRecordId:acceptance.id});
assert.deepEqual(db.workflow().issues.map(i=>i.message),[]);
db.advancePhase('Abgeschlossen');assert.equal(db.project().data.phase,'Abgeschlossen');

// Pauschalpreis: Abschlag schon vor Aufmaß und Baubeginn, Abrechnung in % der Pauschalsumme, kein Aufmaß nötig.
{
  let raw2=null;const db2=new Store({getItem:()=>raw2,setItem:(_k,v)=>raw2=v});
  const cu=db2.save('customers',{name:'Familie Kruse',customerType:'Privatkunde'});
  db2.save('projects',{name:'Steildach Pauschal',customerId:cu.id,phase:'Erfassung'});db2.advancePhase('Kalkulation');
  db2.save('lv',{number:'01',text:'Neueindeckung',qty:180,unit:'m²',material:55},ok);
  db2.save('lv',{number:'02',text:'Dachrinne',qty:24,unit:'m',material:30},ok);
  const of=db2.issue('offers');
  assert.throws(()=>db2.save('orders',{title:'Auftrag',offerId:of.id,date,lumpSumNet:9000},ok),/Pauschalpreis vereinbart/);
  const or=db2.save('orders',{title:'Auftrag pauschal',offerId:of.id,date,lumpSum:true,lumpSumNet:12500},ok);
  const ab=db2.get(or.id).confirmation;
  assert.equal(ab.lumpSum,true);assert.equal(ab.lumpSumNet,12500);assert.match(ab.notes,/Pauschalpreis: 12\.500,00 € netto/);
  db2.advancePhase('Beauftragt');
  const v=db2.issue('invoices',{orderId:or.id,invoiceType:'Abschlagsrechnung',percentage:30});
  assert.equal(v.data.net,3750);assert.equal(v.data.positions.length,1);
  assert.deepEqual([v.data.positions[0].qty,v.data.positions[0].unit,v.data.positions[0].ep],[30,'%',125]);
  assert.match(v.data.positions[0].text,/Pauschalpreis gemäß Auftragsbestätigung DWP-AB-/);
  assert.throws(()=>db2.save('orders',{title:'Auftrag pauschal',offerId:of.id,date,lumpSum:true,lumpSumNet:13000},{...ok,id:or.id}),/bleiben unverändert/);
  db2.advancePhase('Ausführung');
  const emp=db2.save('personnel',{name:'Geselle',number:'P1',employment:'Arbeiter',wage:40});
  const reg=db2.save('times',{title:'Regie Kamin',date,employeeId:emp.id,hours:2,rate:40,billingRate:60,work:'Kaminkopf verwahrt',billable:true,customerConfirmation:'Stundenzettel 3'},ok);db2.sign(reg.id,sign);
  assert.throws(()=>db2.issue('invoices',{orderId:or.id,invoiceType:'Teilrechnung',percentage:20}),/unter bereits berechneten 30 %/);
  const t2=db2.issue('invoices',{orderId:or.id,invoiceType:'Teilrechnung',percentage:70});
  assert.equal(t2.data.net,cent(5000+120));
  assert(!db2.workflow().issues.some(i=>i.module==='measurements'),'Pauschale braucht kein Aufmaß');
  db2.advancePhase('Abnahme');
  const ac=db2.save('acceptance',{title:'Abnahme',date,participants:'AG und AN',result:'Abgenommen'},ok);db2.sign(ac.id,sign);
  const s2=db2.issue('invoices',{orderId:or.id});
  assert.equal(s2.data.net,3750);assert.equal(s2.data.positions[0].qty,30);
  assert.equal(cent(v.data.net+t2.data.net+s2.data.net),cent(12500+120));
  for(const inv of [v,t2,s2])db2.save('payments',{title:'Zahlung',invoiceId:inv.id,direction:'Zahlungseingang',date,amount:inv.data.gross},ok);
  db2.save('documents',{title:'Abnahmeprotokoll',category:'Nachweis',description:'Abnahme',relatedRecordId:ac.id});
  assert.deepEqual(db2.workflow().issues.map(i=>i.message),[]);
  db2.advancePhase('Abgeschlossen');
}
// Einheitspreis bleibt beim Aufmaß: ohne Aufmaß kein Abschlag.
{
  let raw3=null;const db3=new Store({getItem:()=>raw3,setItem:(_k,v)=>raw3=v});
  const cu=db3.save('customers',{name:'EP Kunde'});db3.save('projects',{name:'EP',customerId:cu.id,phase:'Erfassung'});db3.advancePhase('Kalkulation');
  db3.save('lv',{number:'01',text:'Abdichtung',qty:10,unit:'m²',material:10},ok);const of=db3.issue('offers');
  const or=db3.save('orders',{title:'Auftrag',offerId:of.id,date},ok);db3.advancePhase('Beauftragt');
  assert.throws(()=>db3.issue('invoices',{orderId:or.id,invoiceType:'Abschlagsrechnung',percentage:30}),/Keine noch nicht berechnete Leistung/);
}
console.log('Ablauf Termin → Besuchstermin → Bestandsaufnahme → Angebot → AZ → TR → ST → Abnahme → Schlussrechnung → Zahlung → Abschluss passed; Pauschalpreis (Abschlag vor Aufmaß, % der Pauschalsumme, ohne Aufmaß) passed.');
console.log('  Belege: '+[offer.data.number,db.get(order.id).confirmation.number,az.data.number,tr.data.number,sr.data.number].join(', '));
