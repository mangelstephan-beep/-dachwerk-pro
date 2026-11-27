const assert=require('node:assert/strict');
const {Store,bfwTransferRows}=require('./project-core.js');

const db=new Store({getItem:()=>null,setItem:()=>{}});
const customer=db.save('customers',{name:'Kalkulation Vorlage Test'});
db.save('projects',{name:'Test Blankokalkulation',customerId:customer.id,phase:'Erfassung'});
db.settings({wage:60,agk:0,profit:0});
const input={
  number:'01.01',text:'Dachabdichtung mit Materialansätzen',qty:3,unit:'m²',
  useDetailedMaterials:true,useEfbRates:true,efbWage:60,
  materialName1:'Abdichtungsbahn',materialPrice1:10,materialCut1:2,materialWaste1:10,materialMinutes1:6,
  materialName2:'Grundierung',materialPrice2:5,materialCut2:1,materialWaste2:20,materialMinutes2:4,
  fasteners:2,disposal:3,miscellaneous:1,
  laborMarkup:10,materialMarkup:20,equipmentMarkup:0,subcontractMarkup:0,otherMarkup:25
};
const r=db.save('lv',input);
let p=db.position(r);
assert.equal(p.materialBreakdown[0].cost,22);
assert.equal(p.materialBreakdown[1].cost,6);
assert.equal(p.material,30);
assert.equal(p.totalMinutes,10);
assert.equal(p.labor,10);
assert.equal(p.other,4);
assert.equal(p.direct,44);
assert.deepEqual(p.priceComponents,{labor:11,material:36,equipment:0,subcontract:0,other:5});
assert.equal(p.ep,52);
assert.equal(p.gp,156);

const old=db.save('lv',{number:'01.02',text:'Alte Position',qty:2,unit:'m²',material:10,minutes:10});
const legacy=db.position(old);
assert.equal(legacy.useDetailedMaterials,false);
assert.equal(legacy.material,10);
assert.equal(legacy.labor,10);
assert.equal(legacy.other,0);
assert.equal(legacy.ep,20);
assert.equal(db.calculation().other,12);
assert.equal(db.calculation().net,196);

const bfw=bfwTransferRows([p,legacy]);
assert.deepEqual(bfw[0],['Pos','Menge','MEH','Kurztext','Langtext','EP','PA']);
assert.deepEqual(bfw[1],['01.01','3,00','m²','Dachabdichtung mit Materialansätzen','Dachabdichtung mit Materialansätzen','52,00','']);
assert.equal(bfw[2][5],'20,00');
assert.equal(bfw[2][6],'');
assert.throws(()=>bfwTransferRows(null),/Positionsliste/);

assert.throws(()=>db.save('lv',{...input,number:'BAD',material:10}),/Vier Materialansätze/);
assert.throws(()=>db.save('lv',{...input,number:'BAD2',materialWaste2:120}),/Verschnitt/);
assert.throws(()=>db.save('lv',{...input,number:'BAD3',subcontractMaterialShare:110}),/Materialanteil Fremdarbeiten/);
console.log('Blankokalkulation und BFW-Übergabe geprüft.');
