// Kleinunternehmer nach § 19 UStG: keine Umsatzsteuer, Hinweis auf Angebot und Rechnung.
const assert=require('node:assert/strict');
const {Store}=require('./project-core.js');
const ok={status:'Freigegeben',owner:'Prüfer'};
let raw=null;const db=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});
db.settings({wage:0,agk:0,profit:0,tax:19});
const c=db.save('customers',{name:'AG'});db.save('projects',{name:'Dach',customerId:c.id,phase:'Erfassung'});
const p=db.save('lv',{number:'010',text:'Bahn',qty:10,unit:'m²',material:10},ok);
const regular=db.issue('offers');
assert.equal(regular.data.gross,119);assert.equal(regular.data.smallBusiness,undefined);

db.settings({smallBusiness:'true',tax:'19'});
assert.equal(db.data.settings.smallBusiness,true);assert.equal(db.data.settings.tax,0,'§ 19 erzwingt 0 % USt');
const offer=db.issue('offers');
assert.equal(offer.data.tax,0);assert.equal(offer.data.taxAmount,0);assert.equal(offer.data.gross,100);
assert.equal(offer.data.smallBusiness,true);assert.match(offer.data.taxNote,/§ 19 UStG/);
assert.equal(db.get(regular.id).data.gross,119,'frühere Fassung bleibt unverändert');

db.save('orders',{title:'Auftrag',offerId:offer.id,date:'2026-11-14'},ok);
db.save('measurements',{title:'Dach',positionId:p.id,length:10,width:1,factor:1,date:'2026-11-14'},ok);
db.settings({smallBusiness:'false'});
assert.equal(db.data.settings.tax,19,'Rückkehr zur Regelbesteuerung stellt 19 % wieder her');
const invoice=db.issue('invoices');
assert.equal(invoice.data.tax,0,'Rechnung folgt dem beauftragten Angebot');
assert.equal(invoice.data.smallBusiness,true);assert.equal(invoice.data.gross,100);
const storno=db.stornoInvoice(invoice.id,{reason:'Test'});
assert.equal(storno.data.smallBusiness,true);assert.equal(storno.data.gross,-100);
console.log('Kleinunternehmer § 19 UStG: 0 % USt, Hinweistext, eingefrorener Stand bis Rechnung und Storno bestanden.');
