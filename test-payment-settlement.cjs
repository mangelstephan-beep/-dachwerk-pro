const assert=require('node:assert/strict');
const {Store}=require('./project-core.js');
// Modul 29: Skonto / Abzug und Sicherheitseinbehalt gleichen die Rechnung aus; der Einbehalt bleibt bis zur Auszahlung offen.
let raw=null;const db=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v}),ok={status:'Freigegeben',owner:'Stephan'};
const date='2026-11-10';
const customer=db.save('customers',{name:'Hausverwaltung'});
db.save('projects',{name:'Flachdach',customerId:customer.id,phase:'Erfassung'});
db.advancePhase('Kalkulation');
const lv=db.save('lv',{number:'01',text:'Abdichtung',qty:100,unit:'m²',material:10},ok);
const offer=db.issue('offers');const order=db.save('orders',{title:'Auftrag',offerId:offer.id,date},ok);
db.advancePhase('Beauftragt');db.advancePhase('Ausführung');
db.save('measurements',{title:'Dach',positionId:lv.id,length:10,width:10,factor:1,date},ok);
db.advancePhase('Abnahme');
const acceptance=db.save('acceptance',{title:'Abnahme',date,participants:'AG und AN',result:'Abgenommen'},ok);
db.sign(acceptance.id,{signer:'AG',strokes:[[[0.1,0.1],[0.2,0.3]]]});
const invoice=db.issue('invoices',{orderId:order.id});
const gross=invoice.data.gross,cent=n=>Math.round(n*100)/100;
const skonto=cent(gross*0.02),retention=cent(gross*0.05),cash=cent(gross-skonto-retention);
db.save('payments',{title:'Überweisung',invoiceId:invoice.id,direction:'Zahlungseingang',date,amount:cash},ok);
assert.throws(()=>db.save('payments',{title:'Skonto',invoiceId:invoice.id,direction:'Skonto / Abzug',date,amount:skonto},ok),/Grund/);
const sk=db.save('payments',{title:'Skonto',invoiceId:invoice.id,direction:'Skonto / Abzug',date,amount:skonto,notes:'2 % Skonto innerhalb 10 Tagen'},ok);
assert.equal(sk.data.account,'SKR03 8736 Gewährte Skonti 19 % USt');
assert.throws(()=>db.save('payments',{title:'Einbehalt',invoiceId:invoice.id,direction:'Sicherheitseinbehalt',date,amount:retention},ok),/Einbehalt bis/);
assert.throws(()=>db.save('payments',{title:'Zu viel',invoiceId:invoice.id,direction:'Sicherheitseinbehalt',date,amount:retention+1,retentionUntil:'2031-11-10'},ok),/offenen Rechnungsbetrag/);
db.save('payments',{title:'Einbehalt 5 %',invoiceId:invoice.id,direction:'Sicherheitseinbehalt',date,amount:retention,retentionUntil:'2031-11-10'},ok);
let c=db.controlling();
assert.equal(c.outstanding,0);assert.equal(c.discount,skonto);assert.equal(c.discountNet,cent(skonto/1.19));assert.equal(c.result,cent(c.revenue-c.discountNet-c.actual));assert.equal(c.retained,retention);assert.equal(c.paid,cash);
assert.deepEqual(c.retention.map(r=>[r.amount,r.until,r.open]),[[retention,'2031-11-10',retention]]);
assert.equal(db.customerOverview(customer.id).outstanding,0);
db.advancePhase('Abgeschlossen');assert.equal(db.project().data.phase,'Abgeschlossen');
// Nach Ablauf der Gewährleistung: Auszahlung des Einbehalts auch im abgeschlossenen Projekt.
assert.throws(()=>db.save('payments',{title:'Nachzahlung',invoiceId:invoice.id,direction:'Zahlungseingang',date,amount:1},ok),/wieder öffnen/);
assert.throws(()=>db.save('payments',{title:'Zu viel',invoiceId:invoice.id,direction:'Einbehalt ausgezahlt',date,amount:retention+1},ok),/übersteigt/);
db.save('payments',{title:'Einbehalt erhalten',invoiceId:invoice.id,direction:'Einbehalt ausgezahlt',date:'2031-11-20',amount:retention},ok);
c=db.controlling();
assert.equal(c.retained,0);assert.equal(c.paid,cent(cash+retention));assert.equal(c.outstanding,0);assert.equal(c.retention.length,0);
assert.equal(db.project().data.phase,'Abgeschlossen');
{
  // Restsumme: offen lassen oder ausbuchen bzw. auf ein Zwischenkonto (SKR03) buchen.
  let raw2=null;const db2=new Store({getItem:()=>raw2,setItem:(_k,v)=>raw2=v});
  const cu=db2.save('customers',{name:'Privat'});db2.save('projects',{name:'Steildach',customerId:cu.id,phase:'Erfassung'});db2.advancePhase('Kalkulation');
  const p1=db2.save('lv',{number:'01',text:'Eindeckung',qty:10,unit:'m²',material:10},ok);const of=db2.issue('offers');const or=db2.save('orders',{title:'Auftrag',offerId:of.id,date},ok);
  db2.advancePhase('Beauftragt');db2.advancePhase('Ausführung');db2.save('measurements',{title:'Dach',positionId:p1.id,length:10,width:1,factor:1,date},ok);db2.advancePhase('Abnahme');
  const ac=db2.save('acceptance',{title:'Abnahme',date,participants:'AG und AN',result:'Abgenommen'},ok);db2.sign(ac.id,{signer:'AG',strokes:[[[0.1,0.1],[0.2,0.3]]]});
  const inv=db2.issue('invoices',{orderId:or.id});
  db2.save('payments',{title:'Zahlung',invoiceId:inv.id,date,amount:cent(inv.data.gross-30)},ok);
  assert(db2.workflow().issues.some(i=>/offen lassen oder als „Restbetrag ausgebucht“/.test(i.message)));
  assert.throws(()=>db2.advancePhase('Abgeschlossen'),/Offene Zahlung/);
  assert.throws(()=>db2.save('payments',{title:'Rest',invoiceId:inv.id,direction:'Restbetrag ausgebucht',date,amount:20},ok),/Grund/);
  const w=db2.save('payments',{title:'Rest',invoiceId:inv.id,direction:'Restbetrag ausgebucht',date,amount:20,notes:'Kulanz'},ok);
  assert.equal(w.data.account,'SKR03 8700 Erlösschmälerungen');
  const z=db2.save('payments',{title:'Rest',invoiceId:inv.id,direction:'Restbetrag auf Zwischenkonto',date,amount:10,notes:'Klärung mit Kunde',account:'1590'},ok);
  assert.equal(z.data.account,'1590','eigenes Konto bleibt');
  const c2=db2.controlling();assert.equal(c2.outstanding,0);assert.equal(c2.writeOff,20);assert.equal(c2.suspense,10);assert.equal(c2.discountNet,cent(20/1.19));
  db2.advancePhase('Abgeschlossen');
}
console.log('Modul 29: Zahlungseingang, Skonto mit Grund, Sicherheitseinbehalt mit Frist, Abschluss trotz Einbehalt, Auszahlung im abgeschlossenen Projekt passed.');
