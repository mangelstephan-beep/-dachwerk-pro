const assert=require('node:assert/strict');
const {Store}=require('./project-core.js');
// Modul 23: Stundenlohnarbeiten (Regie) mit Kundenbestätigung abrechnen. Modul 27: Rechnung nach § 13b UStG ohne USt.
const ok={status:'Freigegeben',owner:'Stephan'},date='2026-11-10';
function setup(customerValues){
  let raw=null;const db=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});
  const customer=db.save('customers',{name:'Bau GmbH',...customerValues});
  db.save('projects',{name:'Dach Halle',customerId:customer.id,phase:'Erfassung'});
  db.advancePhase('Kalkulation');
  const lv=db.save('lv',{number:'01',text:'Abdichtung',qty:100,unit:'m²',material:10},ok);
  const offer=db.issue('offers');const order=db.save('orders',{title:'Auftrag',offerId:offer.id,date},ok);
  db.advancePhase('Beauftragt');db.advancePhase('Ausführung');
  db.save('measurements',{title:'Dach',positionId:lv.id,length:10,width:10,factor:1,date},ok);
  const employee=db.save('personnel',{name:'Geselle',number:'P1',employment:'Arbeiter',wage:40});
  return {db,customer,offer,order,employee};
}
{
  const {db,offer,order,employee}=setup({});
  const base={title:'Regie Ablauf freilegen',date,employeeId:employee.id,hours:6,rate:40,work:'Ablauf freigelegt',billable:true};
  assert.throws(()=>db.save('times',base,ok),/Verrechnungssatz/);
  assert.throws(()=>db.save('times',{...base,billingRate:58},ok),/Kundenbestätigung/);
  const regie=db.save('times',{...base,billingRate:58,customerConfirmation:'Stundenzettel 12, Hr. Meyer'},ok);
  db.save('times',{title:'Eigene Leistung',date,employeeId:employee.id,hours:8,rate:40,work:'Abdichtung'},ok);
  assert(db.workflow().issues.some(i=>i.module==='invoices' && /Stundenlohnarbeit/.test(i.message)));
  const advance=db.issue('invoices',{orderId:order.id,invoiceType:'Abschlagsrechnung',percentage:50});
  const r1=advance.data.positions.find(p=>p.id===regie.id);
  assert.equal(r1.qty,6);assert.equal(r1.ep,58);assert.equal(r1.gp,348);assert.equal(r1.unit,'Std.');
  assert.equal(advance.data.net,Math.round((offer.data.net/2+348)*100)/100);
  assert(!db.workflow().issues.some(i=>/Stundenlohnarbeit/.test(i.message)));
  const final=db.issue('invoices',{orderId:order.id});
  assert(!final.data.positions.some(p=>p.id===regie.id),'Regie wird nur einmal berechnet');
  assert.equal(final.data.net,Math.round(offer.data.net/2*100)/100);
  db.stornoInvoice(advance.id,{reason:'Falscher Satz'});
  assert.equal(db.openRegie().length,1,'Nach Storno ist die Regie wieder offen');
  assert.equal(advance.data.tax,19);assert.equal(advance.data.reverseCharge,undefined);
}
{
  const {db,customer,order}=setup({reverseCharge:true});
  assert.throws(()=>db.issue('invoices',{orderId:order.id}),/USt-IdNr/);
  db.save('customers',{...customer.data,vatId:'DE123456789'},{id:customer.id});
  const invoice=db.issue('invoices',{orderId:order.id});
  assert.equal(invoice.data.tax,0);assert.equal(invoice.data.taxAmount,0);assert.equal(invoice.data.gross,invoice.data.net);
  assert.equal(invoice.data.reverseCharge,true);assert.match(invoice.data.taxNote,/§ 13b/);
}
console.log('Modul 23/27: Regie mit Verrechnungssatz und Kundenbestätigung, einmalige Abrechnung, Storno, Rechnung nach § 13b ohne USt mit USt-IdNr. passed.');
