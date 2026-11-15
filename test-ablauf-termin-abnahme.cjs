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
console.log('Ablauf Termin → Besuchstermin → Bestandsaufnahme → Angebot → AZ → TR → ST → Abnahme → Schlussrechnung → Zahlung → Abschluss passed.');
console.log('  Belege: '+[offer.data.number,db.get(order.id).confirmation.number,az.data.number,tr.data.number,sr.data.number].join(', '));
