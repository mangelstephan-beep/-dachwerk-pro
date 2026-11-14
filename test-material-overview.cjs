const assert=require('node:assert/strict');
const {Store}=require('./project-core.js');
// Modul 10: Prüfliste Material – Fristen, Preissprünge, Verwendung, Systemübersicht.
let raw=null;
const db=new Store({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}});
const base={unit:'m²',priceDate:'2026-10-01',source:'Händlerangebot'};
const ok=(data,extra={})=>db.save('materials',{...base,...data},{status:'Freigegeben',owner:'Prüfer',...extra});
const evidence={documentUrl:'https://hersteller.example/system.pdf',documentEdition:'2026-03',compatibility:'Geeignet laut Nachweis',compatibilityEvidence:'Aufbau Warmdach, Herstellerbestätigung vom 01.10.2026'};
const vapour=ok({name:'Dampfsperre ALU',price:4.2,validUntil:'2026-11-20',system:'Warmdach Bitumen A',...evidence});
const insulation=ok({name:'EPS 035 DAA dh',price:9.8,validUntil:'2027-03-31',system:'Warmdach Bitumen A'});
const membrane=ok({name:'Oberlage Elastomerbitumen',price:7.5,validUntil:'2026-11-14',system:'warmdach bitumen a',...evidence});
const gutter=ok({name:'Dachrinne Zink 333',unit:'m',price:14,validUntil:'2026-10-31'});
const screws=ok({name:'Befestiger Flachdach',unit:'St',price:0.35});
// Preissprung: neuer Preisstand +12,5 %; zweiter Artikel nur +5 %.
db.save('materials',{...db.get(gutter.id).data,price:15.75,priceDate:'2026-11-01',validUntil:'2026-12-31'},{id:gutter.id,status:'Freigegeben',owner:'Prüfer'});
db.save('materials',{...db.get(screws.id).data,price:0.3675,priceDate:'2026-11-01'},{id:screws.id,status:'Freigegeben',owner:'Prüfer'});
assert.throws(()=>db.materialOverview('14.11.2026'),/Prüfdatum/);
let o=db.materialOverview('2026-11-14');
const by=name=>o.rows.find(r=>r.name===name);
assert.deepEqual(by('Dampfsperre ALU').hints,['Preisbindung endet in 6 Tagen (2026-11-20)']);assert.equal(by('Dampfsperre ALU').daysLeft,6);
assert.deepEqual(by('Oberlage Elastomerbitumen').hints,['Preisbindung endet heute']);
assert.equal(by('Dachrinne Zink 333').change,12.5);assert.match(by('Dachrinne Zink 333').hints.join(),/Preissprung \+12,5 % gegenüber 2026-10-01/);
assert.equal(by('Befestiger Flachdach').change,5);assert.deepEqual(by('Befestiger Flachdach').hints,['Keine Preisbindung dokumentiert']);
assert.match(by('EPS 035 DAA dh').blocking.join(),/Systemverträglichkeit ungeprüft/);assert.match(by('EPS 035 DAA dh').hints.join(),/ohne Herstellerunterlage/);
// Sortierung: sperrende Prüfungen zuerst, dann Fristen/Preissprünge nach Restlaufzeit, dann alphabetisch.
assert.deepEqual(o.rows.map(r=>r.name),['EPS 035 DAA dh','Oberlage Elastomerbitumen','Dampfsperre ALU','Dachrinne Zink 333','Befestiger Flachdach']);
assert.deepEqual(o.counts,{blocking:1,expiring:2,jumps:1});
// Abgelaufene Bindung sperrt (bestehende Regel) und ist kein „endet bald“-Hinweis mehr.
o=db.materialOverview('2026-11-15');
assert.match(o.rows.find(r=>r.name==='Oberlage Elastomerbitumen').blocking.join(),/Preisbindung abgelaufen/);
assert(!o.rows.find(r=>r.name==='Oberlage Elastomerbitumen').hints.some(h=>/endet/.test(h)));
// Systemübersicht: Schreibweise zusammengeführt, offener Nachweis eines Artikels hält das ganze System offen.
o=db.materialOverview('2026-11-14');
assert.equal(o.systems.length,1);assert.equal(o.systems[0].materials.length,3);assert.equal(o.systems[0].suitable,2);assert.equal(o.systems[0].open,1);assert.equal(o.systems[0].state,'Nachweis offen');
db.save('materials',{...db.get(insulation.id).data,...evidence},{id:insulation.id,status:'Freigegeben',owner:'Prüfer'});
assert.equal(db.materialOverview('2026-11-14').systems[0].state,'Alle Artikel nachgewiesen');
// Verwendung im ausgewählten Projekt.
assert.deepEqual(by('Dachrinne Zink 333').usage,[],'Ohne Projekt keine Verwendung');
const c=db.save('customers',{name:'Materialkunde'});db.save('projects',{name:'Materialdach',customerId:c.id,phase:'Erfassung'});
db.save('lv',{number:'020',text:'Dachrinne montieren\nhalbrund',qty:40,unit:'m',materialId:gutter.id,consumption:1.05,minutes:10,groupPath:'01 Dach'});
const use=db.materialOverview('2026-11-14').rows.find(r=>r.name==='Dachrinne Zink 333').usage;
assert.equal(use.length,1);assert.equal(use[0].number,'020');assert.equal(use[0].text,'Dachrinne montieren');
console.log('Material overview: expiring price bindings, price jumps, missing bindings, blocking checks first, system overview with merged spelling, project usage passed.');
