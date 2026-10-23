const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {JSDOM}=require(process.env.DWP_TEST_JSDOM || 'jsdom');
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'});
const w=dom.window;
w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
for(const file of ['app.js','module-fixes.js','project-core.js','material-price-import.js','project-workflows.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
const open=id=>w.DWPWorkspace.open(id);
const query=s=>w.document.querySelector('#main-content').querySelector(s);
function save(id,values,approved=false) {
  open(id);
  const form=query('#dwp-record');assert(form,`${id} has form`);
  for(const [key,value] of Object.entries(values)){const el=form.elements.namedItem(key);assert(el,`${key} exists`);if(el.type==='checkbox')el.checked=value;else el.value=value;}
  if(approved){form.elements.status.value='Freigegeben';form.elements.owner.value='Prüfer';}
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(query('#dwp-error').textContent,'');
  return w.DWPWorkspace.store.list(id).at(-1);
}
const customer=save('customers',{name:'Testkunde'});
const project=save('projects',{name:'Dach A',customerId:customer.id,phase:'Erfassung'});
const lv=save('lv',{number:'010',text:'Abdichtung',qty:'100',unit:'m²',material:'15,50',minutes:'12',equipment:'1',subcontract:'2'},true);
open('offers');query('[data-dwp="issue"]').click();
assert.equal(w.DWPWorkspace.store.list('offers').length,1);
const offer=w.DWPWorkspace.store.list('offers')[0];
assert.equal(lv.data.useNuMarkup,true);assert.equal(lv.data.subcontractMarkup,15);
assert.equal(offer.data.positions[0].ep,32.55); // 27.50 non-NU × 1.10 + 2.00 NU × 1.15
save('orders',{title:'Auftrag',offerId:offer.id,date:'2026-10-12'},true);
save('measurements',{title:'Dachfläche',positionId:lv.id,length:'11',width:'10',factor:'1',deduction:'0',date:'2026-10-12'},true);
open('invoices');query('[data-dwp="issue"]').click();
assert.equal(w.DWPWorkspace.store.list('invoices')[0].data.net,3580.5);
assert(query('.data-table').textContent.includes('4.260,80'));
for(const m of w.DWPProject.modules) {
  open(m.id);assert.equal(query('h1').textContent,m.name);
  if(m.fields.length && m.id!=='imports')for(const f of m.fields)assert(query(`[name="${f.key}"]`),`${m.id}: ${f.key}`);
}
open('dashboard');assert.equal(w.document.querySelectorAll('[data-dwp-card]').length,36);
for(const m of w.DWPProject.modules) {
  query(`[data-dwp="open"][data-id="${m.id}"]`).click();
  assert.equal(query('h1').textContent,m.name,`${m.id} card opens its module`);
  query('[data-dwp="open"][data-id="dashboard"]').click();
}
query('[data-dwp="open"][data-id="workflow"]').click();
assert.equal(query('h1').textContent,'Gemeinsamer Projektworkflow');
query('[data-dwp="open"][data-id="access"]').click();
assert.equal(query('h1').textContent,'Zugriff und Modulnutzung');
query('[data-dwp="open"][data-id="audit"]').click();
assert.equal(query('h1').textContent,'Projektlogbuch');
query('[data-dwp="open"][data-id="dashboard"]').click();
assert.equal(query('h1').textContent,'Alle Arbeitsmodule');
query('#dwp-module-search').value='Aufmaß';query('#dwp-module-search').dispatchEvent(new w.Event('input',{bubbles:true}));
assert.equal([...w.document.querySelectorAll('[data-dwp-card]')].filter(c=>!c.hidden).length,1);
open('imports');query('#dwp-csv').value='number;text;qty;unit\n020;"Detail; Anschluss";1,5;m';query('[data-dwp="preview-import"]').click();
assert(query('#dwp-import-preview').textContent.includes('Detail; Anschluss'));
query('#dwp-import').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
assert.equal(w.DWPWorkspace.store.list('lv').length,2);
const second=save('projects',{name:'Dach B',customerId:customer.id,phase:'Erfassung'});
open('calculation');assert(!query('.data-table').textContent.includes('Abdichtung'));
open('customers');query('[name="name"]').value='Ungespeichert';query('[name="name"]').dispatchEvent(new w.Event('input',{bubbles:true}));
w.confirm=()=>false;open('projects');assert.equal(query('h1').textContent,'Kunden und Kontakte');
w.confirm=()=>true;open('projects');
assert.equal(w.DWPWorkspace.store.data.selectedProject,second.id);
const reload=new w.DWPProject.Store(w.localStorage);
assert.equal(reload.list('projects').length,2);
assert.equal(reload.list('lv',project.id).length,2);
open('pricelists');
query('#dwp-price-csv').value='name;unit;price;article;manufacturer\nBahn;m²;9,20;ART1;Testhersteller';
query('#dwp-price-import [name="source"]').value='Testpreise.csv';
query('[data-dwp="price-csv"]').click();
query('[data-dwp="price-preview"]').click();
assert(query('#dwp-price-preview').textContent.includes('9,20'));
query('#dwp-price-import').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
assert.equal(w.DWPWorkspace.store.list('materials')[0].status,'Prüfung');
const acceptance=save('acceptance',{title:'Abnahme Dach B',date:'2026-10-17',participants:'Test AG und AN',result:'Mit Restpunkten',remaining:'Detail prüfen'});
w.HTMLCanvasElement.prototype.getContext=()=>({beginPath(){},moveTo(){},lineTo(){},stroke(){},clearRect(){}});
w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:640,height:240});
w.HTMLCanvasElement.prototype.setPointerCapture=()=>{};
w.HTMLCanvasElement.prototype.hasPointerCapture=()=>false;
query(`[data-dwp="signature"][data-id="${acceptance.id}"]`).click();
const canvas=query('#dwp-signature');assert(canvas);
const pointer=(name,x,y)=>{const event=new w.Event(name,{bubbles:true,cancelable:true});Object.assign(event,{clientX:x,clientY:y,pointerId:1});canvas.dispatchEvent(event);};
pointer('pointerdown',64,48);pointer('pointermove',192,96);pointer('pointerup',192,96);
query('#dwp-sign [name="signer"]').value='Test Unterzeichner';
query('#dwp-sign').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
assert.equal(query('#dwp-error').textContent,'');
assert.equal(w.DWPWorkspace.store.get(acceptance.id).signatures[0].snapshot.data.remaining,'Detail prüfen');
assert.equal(w.DWPWorkspace.store.get(acceptance.id).signatures[0].strokes[0].length,2);
const search=w.document.querySelector('#global-search');search.value='Dach A';search.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
assert.equal(query('h1').textContent,'Suche im gemeinsamen Bestand');
assert(query('.data-table').textContent.includes('Dach A'));
query('[data-dwp="search-open"]').click();
assert.equal(query('#dwp-record [name="name"]').value,'Dach A');
async function checkLegacyObserver() {
  open('offers');
  w.document.querySelector('.nav-item[data-view="dashboard"]').click();
  await new Promise(resolve=>w.setTimeout(resolve,10));
  assert.equal(query('h1').textContent,'Alle Arbeitsmodule','Sidebar navigation works after opening a nested module');
  vm.runInContext(fs.readFileSync('lv-import-manager.js','utf8'),dom.getInternalVMContext(),{filename:'lv-import-manager.js'});
  open('imports');query('[data-dwp="legacy-import"]').click();
  await new Promise(resolve=>w.setTimeout(resolve,30));
  assert(query('[data-lv-import-manager]'),'Legacy manager is still reachable');
  let mutations=0;
  const observer=new w.MutationObserver(()=>mutations++);
  observer.observe(query('[data-lv-import-manager]'),{childList:true,subtree:true});
  await new Promise(resolve=>w.setTimeout(resolve,30));
  assert.equal(mutations,0,'Legacy importer does not re-render from its own changes');
  observer.disconnect();dom.window.close();
  console.log('DOM workflow: customer → invoice; 36 routes/forms; CSV/price imports; pointer signature; project search/isolation; legacy importer stability passed.');
}
checkLegacyObserver().catch(error=>{dom.window.close();console.error(error);process.exitCode=1;});
