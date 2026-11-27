const assert=require('node:assert/strict');
const {Store}=require('./project-core.js');
// Modul 06: LV-Datenprüfung v3 – Hinweise zur Rückfrage, keine rechtliche Bewertung.
let raw=null;
const db=new Store({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}});
assert.throws(()=>db.contractChecks(),/Projekt/);
const customer=db.save('customers',{name:'Prüfkunde'});
db.save('projects',{name:'Prüfdach',customerId:customer.id,phase:'Erfassung'});
const save=data=>db.save('lv',{groupPath:'01 Dach',material:10,minutes:5,...data});
const p={
 base:save({number:'010',text:'Dampfsperre auf Betondecke verlegen, Überlappung 8 cm',qty:120,unit:'m²'}),
 short:save({number:'020',text:'Blech',qty:5,unit:'m'}),
 lump:save({number:'030',text:'Baustelleneinrichtung für Dacharbeiten vorhalten',qty:2,unit:'psch'}),
 lumpOk:save({number:'031',text:'Baustelleneinrichtung räumen und Flächen reinigen',qty:1,unit:'psch'}),
 piece:save({number:'040',text:'Dachablauf DN 100 mit Anschlussflansch einbauen',qty:2.5,unit:'St'}),
 bauseits:save({number:'050',text:'Attika anschließen, Unterkonstruktion bauseits vorhanden',qty:40,unit:'m'}),
 product:save({number:'060',text:'Wärmedämmung EPS 035, Fabrikat: …… oder gleichwertig',qty:120,unit:'m²'}),
 effort:save({number:'070',text:'Zusätzliche Abdichtungsarbeiten nach Aufwand auf Nachweis',qty:10,unit:'h'}),
 inclusive:save({number:'080',text:'Dachrinne montieren einschließlich aller Nebenarbeiten und Befestigungen',qty:30,unit:'m'}),
 optional:save({number:'090',text:'Untergrund ausgleichen bei Bedarf mit Spachtelmasse',qty:5,unit:'m²',kind:'Bedarfsposition'}),
 dup:save({number:'100',text:'Dampfsperre auf Betondecke verlegen,  Überlappung 8 cm',qty:30,unit:'m²'}),
 alt:save({number:'110',text:'Alternative: Dämmung aus Mineralwolle 040 statt EPS',qty:120,unit:'m²',kind:'Alternativposition',choiceGroup:'W1'}),
 alt2:save({number:'120',text:'Alternative: Dämmung aus PIR 024 statt EPS verlegen',qty:120,unit:'m²',kind:'Alternativposition',choiceGroup:'W1'}),
 single:save({number:'130',text:'Grundposition Lichtkuppel 120 x 120 cm einbauen',qty:2,unit:'St',kind:'Grundposition',choiceGroup:'W2'})
};
const findings=db.contractChecks(),codes=id=>findings.filter(f=>f.positionId===id).map(f=>f.code).sort();
assert.deepEqual(codes(p.base.id),[],'Saubere Position ohne Befund');
assert.deepEqual(codes(p.short.id),['text-short']);
assert.deepEqual(codes(p.lump.id),['lump-sum-qty']);assert.deepEqual(codes(p.lumpOk.id),[]);
assert.deepEqual(codes(p.piece.id),['piece-qty']);
assert.deepEqual(codes(p.bauseits.id),['text-bauseits']);
assert.deepEqual(codes(p.product.id),['text-product']);
assert.deepEqual(codes(p.effort.id),['text-effort']);
assert.deepEqual(codes(p.inclusive.id),['text-inclusive']);
assert.deepEqual(codes(p.optional.id),['optional']);
assert.deepEqual(codes(p.dup.id),['duplicate-text']);
assert.match(findings.find(f=>f.code==='duplicate-text').finding,/Position 010/);
assert.deepEqual(codes(p.alt.id),['choice-base']);assert.deepEqual(codes(p.alt2.id),[]);
assert.deepEqual(codes(p.single.id),['choice-single']);
for(const f of findings){assert(f.question.length>20,'Jeder Befund hat eine konkrete Rückfrage');assert.doesNotMatch(f.finding+f.question,/unwirksam|rechtswidrig|nichtig/i,'Keine rechtliche Bewertung');}
// Rückfrage speichern; nach Änderung der Position ist die Prüfung zu erneuern.
const finding=findings.find(f=>f.code==='text-bauseits');
db.save('contract',{title:'Bauseits klären',positionId:finding.positionId,finding:finding.finding,question:finding.question,checkCode:finding.code,blocking:false});
assert.equal(db.contractReview().find(f=>f.code==='text-bauseits').reviewState,'Neu');
db.save('lv',{...db.get(p.bauseits.id).data,qty:45},{id:p.bauseits.id});
assert.equal(db.contractReview().find(f=>f.code==='text-bauseits').reviewState,'Prüfung erneuern');
// Behobener Befund verschwindet, ohne andere zu beeinflussen.
db.save('lv',{...db.get(p.lump.id).data,qty:1},{id:p.lump.id});
assert(!db.contractChecks().some(f=>f.code==='lump-sum-qty'));
assert.equal(db.contractChecks().filter(f=>f.code==='text-product').length,1);
console.log('Contract review v3: short texts, lump-sum and piece quantities, site-provided work, product/equivalence, effort billing, inclusive clauses, optional items, duplicate texts, choice groups, renewal after change passed.');
