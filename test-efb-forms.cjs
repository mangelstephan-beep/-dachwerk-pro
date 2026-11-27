const assert=require('node:assert/strict');
const {Store}=require('./project-core.js');
// Modul 08: Übertragungshilfe für EFB-Preis 221/222/223 aus der Kalkulation.
const fresh=()=>{let raw=null;const db=new Store({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}});const c=db.save('customers',{name:'EFB-Kunde'});db.save('projects',{name:'EFB-Dach',customerId:c.id,phase:'Erfassung'});return db;};
const sumParts=r=>Math.round((r.labor+r.material+r.equipment+r.other+r.subcontract)*100)/100;
{
 // Globale Kalkulationsbasis: einheitliche Zuschläge, 221 eindeutig.
 const db=fresh();db.settings({wage:60,agk:10,profit:5});
 db.save('lv',{number:'010',text:'Dampfsperre verlegen\nÜberlappung 8 cm',qty:100,unit:'m²',material:5,minutes:6,equipment:1,subcontract:0,groupPath:'01 Dach'});
 db.save('lv',{number:'020',text:'Attikablech montieren',qty:40,unit:'m',material:12.3,minutes:20,equipment:0,subcontract:4,groupPath:'01 Dach'});
 db.save('lv',{number:'030',text:'Untergrund ausgleichen bei Bedarf',qty:10,unit:'m²',material:3,minutes:5,equipment:0,subcontract:0,kind:'Bedarfsposition',groupPath:'01 Dach'});
 const f=db.efbForms(),calc=db.calculation();
 assert.deepEqual(f.warnings,[]);
 assert.equal(f.f221.wage,60);assert.equal(f.f221.columns.material.agk,10);assert.equal(f.f221.columns.material.wg,5.5);assert.equal(f.f221.columns.material.total,15.5);
 assert.equal(f.f221.laborMarkup,15.5);assert.equal(f.f221.billingWage,69.3);
 assert.equal(f.f223.length,3);assert.equal(f.f223[0].text,'Dampfsperre verlegen','Kurzbezeichnung = erste Zeile');
 for(const row of f.f223)assert.equal(sumParts(row),row.ep,`Aufgliederung ergibt EP ${row.number}`);
 assert.equal(f.f223[0].hours,0.1);assert.equal(f.f223[0].ep,13.86);assert.equal(f.f223[0].labor,6.92);assert.equal(f.f223[0].material,5.78);assert.match(f.f223[0].notes.join(' '),/Rundungsausgleich -0,01 € in Lohn/);
 assert.equal(f.f222.direct.labor,1400);assert.equal(f.f222.direct.material,992);assert.equal(f.f222.direct.equipment,100);assert.equal(f.f222.direct.subcontract,160);
 assert.equal(f.f222.direct.hours,23.33);assert.equal(f.f222.direct.total,2652);
 assert.equal(f.f222.net,calc.net);assert.equal(f.f222.markup,Math.round((calc.net-2652)*100)/100);assert.equal(f.f222.optionalNet,calc.optionalNet);
 // Zielpreis und Rabatt werden anteilig verteilt, Summe bleibt exakt der angebotene EP.
 const p=db.list('lv')[1];db.save('lv',{...p.data,useTargetPrice:true,targetEp:50,discountPercent:3},{id:p.id});
 const t=db.efbForms().f223.find(r=>r.number==='020');assert.equal(t.ep,48.5);assert.equal(sumParts(t),48.5);assert.match(t.notes.join(' '),/Zielpreis anteilig/);
}
{
 // Kostenartenzuschläge: Gesamtzuschlag je Spalte, keine erfundene Aufteilung in BGK/AGK/W&G.
 const db=fresh();
 const base={qty:3,unit:'Stk.',minutes:6,material:12.3,useEfbRates:true,efbWage:54,laborMarkup:0,materialMarkup:35,equipmentMarkup:35,subcontractMarkup:35,groupPath:'01 Dach'};
 db.save('lv',{...base,number:'7',text:'Flachblech'});
 const f=db.efbForms(),row=f.f223[0];
 assert.equal(row.labor,5.4);assert.equal(row.material,16.61);assert.equal(row.ep,22.01);assert.equal(sumParts(row),22.01);
 assert.equal(f.f221.wage,54);assert.equal(f.f221.columns.material.total,35);assert.equal(f.f221.columns.material.agk,null);assert.equal(f.f221.billingWage,54);
 db.save('lv',{...base,number:'8',text:'Kehlblech',materialMarkup:20});
 assert.match(db.efbForms().warnings.join(' '),/Zuschlag Stoffe je Position unterschiedlich \(35 \/ 20 %\)/);
 db.save('lv',{number:'9',text:'Globale Position',qty:1,unit:'psch',material:10,minutes:0,equipment:0,subcontract:0,groupPath:'01 Dach'});
 const mixed=db.efbForms();assert.match(mixed.warnings.join(' '),/gemischt/);assert.equal(mixed.f221.wage,null);assert.equal(mixed.f221.billingWage,null);
}
{
 // EP ohne Einzelkosten wird nicht verschwiegen.
 const db=fresh();db.save('lv',{number:'1',text:'Pauschale laut Zielpreis',qty:1,unit:'psch',material:0,minutes:0,equipment:0,subcontract:0,useTargetPrice:true,targetEp:500,groupPath:'01 Dach'});
 const f=db.efbForms();assert.equal(f.f223[0].other,500);assert.match(f.warnings.join(' '),/ohne Einzelkosten/);
}
console.log('EFB 221/222/223 transfer data: global and cost-type markups, uniform/mixed warnings, billing wage, exact EP breakdown with rounding/target/discount allocation, offer-sum markup and optional items passed.');
