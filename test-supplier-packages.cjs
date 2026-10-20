const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {Store}=require('./project-core.js');
const {execute,memoryRepository}=require('./lib/project-service.cjs');
(async()=>{
const repo=memoryRepository(),actor={id:'tester',name:'Prüfer',role:'admin',tenantId:'suppliers'};
let state=(await repo.read(actor.tenantId)).state;
const run=async(method,args)=>{const out=await execute(repo,actor,{method,args,revision:state.revision});state=out.state;return out;};
await run('save',['materials',{name:'Bahn',article:'001',unit:'m²',price:20,priceDate:'2026-01-01',source:'Alt'},{status:'Freigegeben'}]);
const materialId=state.records.find(r=>r.module==='materials').id;
await run('save',['suppliers',{name:'Händler A'}]);const supplierId=state.records.find(r=>r.module==='suppliers').id;
const base={materialId,price:100,discount:10,freight:2,date:'2026-01-01',source:'Angebot A'};
await run('quote',[supplierId,{...base,packageQuantity:'5,0',packageLabel:'Rolle',validUntil:'2099-12-31'}]);
const model=()=>new Store({getItem:()=>JSON.stringify(state),setItem:()=>{}});
let q=model().quotes(materialId)[0];assert.equal(q.effectivePrice,20);assert(q.eligible);
await run('quote',[supplierId,{...base,price:21,discount:0,freight:0}]);
assert.deepEqual(model().quotes(materialId).map(q=>q.effectivePrice),[20,21]);
await run('useQuote',[supplierId,q.id]);let m=model().get(materialId);
assert.equal(m.data.price,20);assert.equal(m.data.validUntil,'2099-12-31');assert.equal(m.data.source,'Angebot A');assert.equal(m.history.at(-1).price,20);
for(const values of [{packageQuantity:0},{packageQuantity:-1},{packageQuantity:'abc'},{packageQuantity:1e10},{validUntil:'2026-02-30'},{validUntil:'2025-12-31'},{discount:101}]){
 const revision=state.revision;await assert.rejects(run('quote',[supplierId,{...base,...values}]));assert.equal(state.revision,revision);
}
await run('quote',[supplierId,{...base,price:1,validUntil:'2026-01-02'}]);
q=model().quotes(materialId)[0];assert(!q.eligible);await assert.rejects(run('useQuote',[supplierId,q.id]),/abgelaufen/);
await run('quote',[supplierId,{...base,date:'2099-01-01'}]);
q=model().quotes(materialId).find(q=>q.date==='2099-01-01');assert(!q.eligible);await assert.rejects(run('useQuote',[supplierId,q.id]),/gültig/);
const backup=JSON.parse(model().backup());backup.records.find(r=>r.id===supplierId).quotes[0].packageQuantity=0;
assert.throws(()=>model().restore(JSON.stringify(backup)),/Gebinde/);
const legacy=JSON.parse(model().backup());for(const q of legacy.records.find(r=>r.id===supplierId).quotes){delete q.packageQuantity;delete q.packageLabel;delete q.validUntil;}
assert.doesNotThrow(()=>model().restore(JSON.stringify(legacy)));
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'}),w=dom.window;
w.localStorage.setItem('dwp-project-core-v1',JSON.stringify(state));w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
for(const file of ['app.js','module-fixes.js','project-core.js','module-verification.js','project-workflows.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext());
w.DWPWorkspace.open('suppliers');
for(const name of ['packageQuantity','packageLabel','validUntil'])assert(w.document.querySelector(`#dwp-quote [name="${name}"]`));
assert(w.document.querySelector('#main-content').textContent.includes('Rolle / 5 m²'));
assert(w.document.querySelector('#main-content').textContent.includes('Angebot A'));
const form=w.document.querySelector('#dwp-quote');
for(const [key,value] of Object.entries({...base,supplierId,packageQuantity:10,packageLabel:'Paket'}))if(form.elements.namedItem(key))form.elements.namedItem(key).value=value;
form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
assert.equal(w.DWPWorkspace.store.quotes(materialId).find(q=>q.packageLabel==='Paket').effectivePrice,11);
dom.window.close();
console.log('Supplier package normalization, sorting, central persistence, validity, migration and UI submission passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
