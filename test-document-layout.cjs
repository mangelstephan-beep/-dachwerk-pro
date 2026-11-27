const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const {render,ready}=require('./document-layout.js');
const {Store,modules}=require('./project-core.js');
for(const mod of modules){
  const document=new JSDOM(render({title:mod.name,body:'<h1>'+mod.name+'</h1>',recordId:'test-only',createdAt:'2026-10-18'})).window.document;
  assert.equal(document.body.dataset.letterhead,'dwp-original-20261006');
  assert.equal(document.querySelector('.dwp-letterhead-logo').getAttribute('src'),'/assets/dachwerkpro-original-logo-20261006.png');
  assert(document.querySelector('.dwp-letterhead-footer').textContent.includes('info@dachwerkpro.de'));
  assert(document.querySelector('.test-note'));
  assert(!document.body.textContent.includes('[Telefon]'));
}
const custom=new JSDOM(render({title:'<script>injection</script>',body:'<p>body</p>',company:{company:'A&B',email:'a@example.invalid',phone:'0123',address:'<b>Address</b>'}})).window.document;
assert.equal(custom.querySelector('title').textContent,'<script>injection</script>');assert.equal(custom.querySelectorAll('script').length,0);assert(!custom.querySelector('.dwp-sender-line b'));
let raw=null;const store=new Store({getItem:()=>raw,setItem:(_k,value)=>{raw=value;}});
store.settings({company:'Original company',email:'original@example.invalid',phone:'123'});
const customer=store.save('customers',{name:'Synthetic customer'});store.save('projects',{name:'Synthetic project',customerId:customer.id,phase:'Erfassung'});
store.save('lv',{number:'1',text:'Roof',qty:1,unit:'m²',material:10},{status:'Freigegeben',owner:'Test'});
const offer=store.issue('offers');store.settings({email:'changed@example.invalid'});
assert.equal(offer.data.company.email,'original@example.invalid');
assert(render({title:'Offer',body:'',company:offer.data.company}).includes('original@example.invalid'));
assert(fs.readFileSync('project-print.css','utf8').includes('content:counter(page)'));
assert(fs.readFileSync('lv-price-logic.js','utf8').includes('DWPDocument.render'));
assert(fs.readFileSync('project-workflows.js','utf8').includes('DWPDocument.render'));
assert(fs.existsSync('assets/dachwerkpro-original-logo-20261006.png'));
(async()=>{
  await assert.rejects(ready({images:[{complete:true,naturalWidth:0}]}),/Logo/);
  await ready({images:[{complete:true,naturalWidth:863}]});
  console.log('Documents: all 36 routes share original logo/header/footer, escaped contacts, frozen offer contact data, page numbers and missing-logo print rejection passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
