const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const registry=require('./module-verification.js');
const core=require('./project-core.js');
assert.deepEqual(Object.keys(registry.modules),core.modules.map(m=>m.id));
for(const [i,m] of core.modules.entries()){const item=registry.modules[m.id];assert.equal(item.number,i+1);assert.equal(item.name,m.name);assert(item.verified?item.evidence&&item.checkedAt:item.remaining);}
const verifiedCount=Object.values(registry.modules).filter(m=>m.verified).length;
assert.deepEqual(Object.entries(registry.modules).filter(([,m])=>m.verified).map(([id])=>id),['operating','lv','calculation']);
assert.equal(registry.isVerified('unknown'),false);assert.equal(registry.isVerified('documents'),false);
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'}),w=dom.window;
w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
for(const file of ['app.js','module-fixes.js','project-core.js','module-verification.js','project-workflows.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
const cards=()=>[...w.document.querySelectorAll('[data-dwp-card]')];
w.DWPWorkspace.open('dashboard');assert.equal(cards().length,36);assert.equal(cards().filter(c=>c.querySelector('[data-dwp-verified="true"]')).length,0);
w.DWPRemote={active:true,trackModule:async()=>{}};w.DWPWorkspace.open('dashboard');assert.equal(cards().filter(c=>c.querySelector('[data-dwp-verified="true"]')).length,verifiedCount);assert.equal(cards().filter(c=>c.textContent.includes('GRÜN')).length,verifiedCount);assert.match(w.document.querySelector('.dwp-acceptance-summary').textContent,new RegExp(verifiedCount+' von 36'));assert.equal(w.document.querySelectorAll('.dwp-module-reason').length,36);
w.DWPVerification=undefined;w.DWPWorkspace.open('dashboard');assert.equal(cards().filter(c=>c.querySelector('[data-dwp-verified="true"]')).length,0);assert.equal(cards().filter(c=>c.textContent.includes('ROT')).length,36);
dom.window.close();console.log('Module status UI: 36 areas, only documented live-verified modules green; unknown, local-only and missing registry remain red.');

