const assert=require('node:assert/strict');
const {Store}=require('./project-core.js');
const {execute,memoryRepository}=require('./lib/project-service.cjs');
// Modul 11: Lieferanten und Preisvergleich – neuester Preis je Lieferant, Bestpreis, Ersparnis, Zurückziehen, Lieferantenübersicht.
let raw=null;
const db=new Store({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}});
const today=require('./project-core.js').berlinDay();
const shift=days=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const ok=data=>db.save('materials',{unit:'m²',priceDate:shift(-30),source:'Altpreis',...data},{status:'Freigegeben',owner:'Prüfer'});
const membrane=ok({name:'Oberlage Elastomerbitumen',article:'OB-5',price:8,supplier:'Händler A'});
const vapour=ok({name:'Dampfsperre ALU',price:4,supplier:'Händler B'});
const gutter=ok({name:'Dachrinne Zink 333',unit:'m',price:14});
const lonely=ok({name:'Lichtkuppel 100x100',unit:'St',price:300});
const a=db.save('suppliers',{name:'Händler A',email:'einkauf@a.example'});
const b=db.save('suppliers',{name:'Händler B',phone:'0421 123'});
const c=db.save('suppliers',{name:'Händler C'});
// Doppelter Lieferant (Groß-/Kleinschreibung, Leerzeichen) wird abgelehnt, Umbenennen des eigenen Datensatzes nicht.
assert.throws(()=>db.save('suppliers',{name:'  händler a '}),/bereits vorhanden/);
db.save('suppliers',{name:'Händler A',email:'einkauf@a.example',phone:'0421 9'},{id:a.id});

// Bahn: A alt 7,50 → A neu 7,90 (ersetzt den alten), B 7,20 gültig noch 5 Tage, C abgelaufen 6,00.
const qOld=db.quote(a.id,{materialId:membrane.id,price:7.5,discount:0,freight:0,date:shift(-20),source:'A-Alt'});
const qNew=db.quote(a.id,{materialId:membrane.id,price:7.9,discount:0,freight:0,date:shift(-2),source:'A-Neu'});
const qB=db.quote(b.id,{materialId:membrane.id,price:80,discount:10,freight:0,baseQuantity:10,packageUnit:'Rolle',date:shift(-3),validUntil:shift(5),source:'B-123'});
db.quote(c.id,{materialId:membrane.id,price:6,discount:0,freight:0,date:shift(-40),validUntil:shift(-1),source:'C-Alt'});
const list=db.quotes(membrane.id);
assert.equal(list.find(q=>q.id===qOld.id).superseded,true,'älterer Preis desselben Lieferanten ist ersetzt');
assert.equal(list.find(q=>q.id===qNew.id).superseded,false);
assert.throws(()=>db.useQuote(a.id,qOld.id,'Prüfer'),/neueren Preis/);

// Dampfsperre: nur ein Lieferant, kein Vergleich; Rinne: kein Preis; Lichtkuppel: einziger Preis mit Einheitenwechsel.
db.quote(b.id,{materialId:vapour.id,price:4.1,discount:0,freight:0,date:shift(-1),source:'B-9'});
db.quote(c.id,{materialId:lonely.id,price:250,discount:0,freight:0,date:shift(-1),source:'C-7'});
db.save('materials',{...db.get(lonely.id).data,unit:'Stk'},{id:lonely.id,status:'Freigegeben',owner:'Prüfer'});

let o=db.supplierOverview(today);
const row=id=>o.articles.find(x=>x.id===id);
assert.equal(row(membrane.id).best.supplier,'Händler B','Bestpreis ist der günstigste gültige Preis');
assert.equal(row(membrane.id).best.price,7.2);
assert.equal(row(membrane.id).saving,0.8);assert.equal(row(membrane.id).savingPct,10);
assert.equal(row(membrane.id).offers,3,'ersetzte Preise zählen nicht, abgelaufene schon');
assert.equal(row(membrane.id).valid,2);
assert(row(membrane.id).hints.some(h=>h==='Günstiger bei Händler B: 7,20 € statt 8,00 € je m² (−10 %)'));
assert(row(membrane.id).hints.some(h=>/Bestpreis bei Händler B gilt noch 5 Tage/.test(h)));
assert.equal(o.articles[0].id,membrane.id,'Ersparnis steht oben');
assert.deepEqual(row(vapour.id).hints,['Nur ein Lieferant – kein Vergleich'],'teurerer Einzelpreis ist keine Ersparnis');
assert.equal(row(vapour.id).saving,null);
assert.deepEqual(row(gutter.id).hints,['Kein Lieferantenpreis erfasst']);
assert.equal(o.articles.at(-1).id,gutter.id,'Artikel ohne Preise stehen unten');
assert.match(row(lonely.id).hints.join(),/Artikeleinheit geändert/);
assert.deepEqual(o.counts,{savings:1,expiring:1,noValid:2,potential:0.8});

const sup=id=>o.suppliers.find(x=>x.id===id);
assert.equal(o.suppliers[0].id,b.id,'Lieferant mit den meisten Bestpreisen zuerst');
assert.equal(sup(b.id).bestCount,2);assert.equal(sup(b.id).articles,2);assert.equal(sup(b.id).expiring,1);
assert.equal(sup(a.id).valid,1);assert.equal(sup(a.id).articles,1);
assert.deepEqual(sup(a.id).hints,[]);
assert(sup(c.id).hints.includes('Keine E-Mail und kein Telefon hinterlegt'));
assert(sup(c.id).hints.includes('Kein gültiger Preis mehr'));
assert.equal(sup(c.id).expired,1);

// Zurückziehen: nur mit Grund, nur einmal, Preis bleibt sichtbar, Übernahme gesperrt, älterer Preis wird wieder aktuell.
assert.throws(()=>db.withdrawQuote(b.id,qB.id,{reason:'  '}),/Grund/);
const withdrawn=db.withdrawQuote(b.id,qB.id,{reason:'Tippfehler im Rabatt',owner:'Prüfer'});
assert.equal(withdrawn.withdrawnAt,today);assert.equal(withdrawn.withdrawnBy,'Prüfer');
assert.throws(()=>db.withdrawQuote(b.id,qB.id,{reason:'nochmal'}),/bereits zurückgezogen/);
assert.throws(()=>db.useQuote(b.id,qB.id,'Prüfer'),/zurückgezogen/);
assert.equal(db.quotes(membrane.id).length,4,'zurückgezogener Preis wird nicht gelöscht');
db.withdrawQuote(a.id,qNew.id,{reason:'Angebot zurückgenommen'});
assert.equal(db.quotes(membrane.id).find(q=>q.id===qOld.id).superseded,false,'nach Zurückziehen des neuen Preises gilt wieder der ältere');
o=db.supplierOverview(today);
assert.equal(row(membrane.id).best.supplier,'Händler A');assert.equal(row(membrane.id).best.price,7.5);
assert.equal(sup(b.id).withdrawn,1);
assert.equal(db.data.audit.filter(e=>e.action==='Lieferantenpreis zurückgezogen').length,2);

// Übernahme des Bestpreises ändert erst dann den Artikelpreis.
assert.equal(db.get(membrane.id).data.price,8);
db.useQuote(a.id,qOld.id,'Prüfer');
assert.equal(db.get(membrane.id).data.price,7.5);
o=db.supplierOverview(today);assert.equal(row(membrane.id).saving,null);

// Sicherung mit zurückgezogenem Preis bleibt gültig; ohne Grund wird sie abgelehnt.
const backup=JSON.parse(db.backup());
const reloaded=new Store({getItem:()=>JSON.stringify(backup),setItem:()=>{}});
assert.equal(reloaded.quotes(membrane.id).filter(q=>q.withdrawn).length,2);
const broken=JSON.parse(JSON.stringify(backup));broken.records.find(r=>r.id===b.id).quotes.find(q=>q.withdrawnAt).withdrawnReason='';
assert.throws(()=>db.restore(JSON.stringify(broken)),/zurückgezogener Lieferantenpreis/);

// Serverpfad: Bearbeiter darf nicht zurückziehen, Freigabeberechtigte schon; Bearbeiter wird vom Server gesetzt.
(async()=>{
  const repository=memoryRepository(),admin={id:'admin',name:'Inhaber',tenantId:'t11',role:'admin'},editor={id:'ed',name:'Bearbeiter',tenantId:'t11',role:'editor'};
  let revision=0;
  const run=async(actor,method,args)=>{const result=await execute(repository,actor,{method,args,revision});revision=result.state.revision;return result;};
  const m=(await run(admin,'save',['materials',{name:'Bahn',unit:'m²',price:10,priceDate:'2026-01-01',source:'Alt'}])).recordId;
  const s=(await run(admin,'save',['suppliers',{name:'Händler S'}])).recordId;
  const q=(await run(admin,'quote',[s,{materialId:m,price:'9',discount:'0',freight:'0',date:'2026-01-02',source:'S-1'}])).recordId;
  await assert.rejects(run(editor,'withdrawQuote',[s,q,{reason:'Test'}]),/Freigabeberechtigung/);
  const result=await run(admin,'withdrawQuote',[s,q,{reason:'Falsche Einheit',owner:'Fremder Name'}]);
  const stored=result.state.records.find(r=>r.id===s).quotes.find(x=>x.id===q);
  assert.equal(stored.withdrawnBy,'Inhaber');assert.equal(stored.withdrawnReason,'Falsche Einheit');
  console.log('Modul 11 Lieferanten und Preisvergleich: ok');
})().catch(error=>{console.error(error);process.exit(1);});
