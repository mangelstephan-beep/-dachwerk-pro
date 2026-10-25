const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
function setup(url){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url,runScripts:'outside-only'}),w=dom.window;
 w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
 for(const file of ['app.js','module-fixes.js','project-core.js','module-verification.js','project-workflows.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
 return {dom,w,q:s=>w.document.querySelector('#main-content').querySelector(s)};
}
const {dom,w,q}=setup('https://dachwerk.test/?start=app&module=customers');
w.DWPWorkspace.start();
assert.equal(q('h1').textContent,'Kunden und Kontakte');
const customer=w.DWPWorkspace.store.save('customers',{name:'Navigation Test'});
const project=w.DWPWorkspace.store.save('projects',{name:'Testprojekt',customerId:customer.id,phase:'Erfassung'});
w.DWPWorkspace.store.select(project.id);
for(const id of ['projects','lv','calculation','imports','workflow','audit','settings']){
 w.DWPWorkspace.open(id);
 assert(q('[data-dwp="module-back"]'),'Every module has a back button');
 assert.equal(new URL(w.location.href).searchParams.get('module'),id);
 assert.equal(new URL(q('[data-dwp="direct-link"]').href).searchParams.get('module'),id);
 assert.equal(w.DWPWorkspace.store.project().id,project.id);
}
q('[data-dwp="module-back"]').click();assert.equal(new URL(w.location.href).searchParams.get('module'),'audit');
q('[data-dwp="module-back"]').click();assert.equal(new URL(w.location.href).searchParams.get('module'),'workflow');
w.DWPWorkspace.open('customers');
q('[name="name"]').value='Ungespeichert';q('[name="name"]').dispatchEvent(new w.Event('input',{bubbles:true}));
w.confirm=()=>false;q('[data-dwp="module-back"]').click();
assert.equal(q('[name="name"]').value,'Ungespeichert');assert.equal(new URL(w.location.href).searchParams.get('module'),'customers');
w.DWPWorkspace.open('projects');assert.equal(new URL(w.location.href).searchParams.get('module'),'customers');
w.confirm=()=>true;q('[data-dwp="module-back"]').click();assert.equal(new URL(w.location.href).searchParams.get('module'),'workflow');
w.DWPWorkspace.open('customers');
q(`[data-dwp="edit"][data-id="${customer.id}"]`).click();
assert.equal(q('[name="name"]').value,'Navigation Test');
q('[data-dwp="module-back"]').click();
assert.equal(new URL(w.location.href).searchParams.get('module'),'customers','Back from edit returns to the module, not an unrelated prior module');
assert.equal(q('[name="name"]').value,'');
dom.window.close();
for(const [requested,expected] of [['imports','imports'],['workflow','workflow'],['not-a-module','dashboard'],['__proto__','dashboard']]){
 const t=setup('https://dachwerk.test/?module='+requested);
 t.w.DWPWorkspace.start();
 assert.equal(new URL(t.w.location.href).searchParams.get('module'),expected);
 t.q('[data-dwp="module-back"]').click();
 assert.equal(new URL(t.w.location.href).searchParams.get('module'),'dashboard','Direct entry always has a safe back destination');
 t.dom.window.close();
}
console.log('Module navigation: direct entry, safe unknown routes, back trail, edit return, dirty-form cancellation and project preservation passed.');
