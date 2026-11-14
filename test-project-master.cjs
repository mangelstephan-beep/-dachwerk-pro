// Module 02: projects take over customer data, keep unique cost centres and sort predictably.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Store,projectDefaultsFromCustomer,sortRecords}=require('./project-core.js');
let raw=null;const db=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});
const ok={status:'Freigegeben',owner:'Prüfer'};
db.settings({wage:0,agk:0,profit:0,tax:19});
const stadt=db.save('customers',{name:'Stadt Musterhausen',address:'Rathausplatz 1',postalCode:'28195',location:'Bremen',publicCustomer:true,buyerReference:'04011000-12345-06'});
const privat=db.save('customers',{name:'Anna Beispiel',customerType:'Privatkunde'});
const ausland=db.save('customers',{name:'Alpen GmbH',address:'Berg 1',postalCode:'6020',location:'Innsbruck',country:'AT'});

// Takeover values only; the form fills empty fields and the user saves explicitly.
assert.deepEqual(projectDefaultsFromCustomer(stadt.data),{address:'Rathausplatz 1, 28195 Bremen',buyerReference:'04011000-12345-06'});
assert.deepEqual(projectDefaultsFromCustomer(ausland.data),{address:'Berg 1, 6020 Innsbruck, AT',buyerReference:''});
assert.deepEqual(projectDefaultsFromCustomer(undefined),{address:'',buyerReference:''});
const ui=fs.readFileSync('./project-workflows.js','utf8');
assert(ui.includes("core.projectDefaultsFromCustomer(db.get(event.target.value)?.data)") && ui.includes("!recordForm.elements[key].value.trim()"),'project form only fills empty fields');

// Unique cost centres (case-insensitive), unchanged own value allowed.
const schule=db.save('projects',{name:'Schule Dach',customerId:stadt.id,phase:'Erfassung',costCenter:'P-2026-01'});
assert.throws(()=>db.save('projects',{name:'Turnhalle',customerId:stadt.id,phase:'Erfassung',costCenter:'p-2026-01'}),/bereits einem anderen Projekt/);
db.save('projects',{name:'Schule Dach',customerId:stadt.id,phase:'Erfassung',costCenter:'P-2026-01',address:'Schulweg 3'},{id:schule.id});
const garage=db.save('projects',{name:'Garage',customerId:privat.id,phase:'Erfassung'});
const anbau=db.save('projects',{name:'anbau',customerId:privat.id,phase:'Erfassung'});

// Customer may change before documents exist, not afterwards.
db.save('projects',{name:'Garage',customerId:ausland.id,phase:'Erfassung'},{id:garage.id});
db.save('projects',{name:'Garage',customerId:privat.id,phase:'Erfassung'},{id:garage.id});
db.select(schule.id);db.save('lv',{number:'010',text:'Dach',qty:1,unit:'psch',material:100},ok);db.issue('offers');
assert.throws(()=>db.save('projects',{name:'Schule Dach',customerId:privat.id,phase:'Erfassung',costCenter:'P-2026-01'},{id:schule.id}),/nicht mehr gewechselt/);
assert.equal(db.get(schule.id).data.customerId,stadt.id);

// Sorting: customers by number, projects alphabetically with closed projects last; other modules unchanged.
assert.deepEqual(sortRecords('customers',db.list('customers')).map(r=>r.data.customerNumber),['10001','10002','10003']);
const unnumbered={data:{name:'Ohne Nummer'}};
assert.equal(sortRecords('customers',[unnumbered,...db.list('customers')])[3],unnumbered,'customers without number last');
const closed={module:'projects',data:{name:'Aaa abgeschlossen',phase:'Abgeschlossen'}};
assert.deepEqual(sortRecords('projects',[closed,...db.list('projects')]).map(r=>r.data.name),['anbau','Garage','Schule Dach','Aaa abgeschlossen']);
const lv=db.list('lv');assert.deepEqual(sortRecords('lv',lv),lv);
assert.deepEqual(sortRecords('customers',[{data:{customerNumber:'10010',name:'B'}},{data:{customerNumber:'9999',name:'A'}}]).map(r=>r.data.customerNumber),['9999','10010'],'numeric order');
assert(db.get(anbau.id));
console.log('Project master: customer takeover for empty fields, unique cost centres, customer lock after documents, sorted customer/project lists passed.');
