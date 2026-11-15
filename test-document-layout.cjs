const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const {render,ready}=require('./document-layout.js');
const {Store,modules}=require('./project-core.js');
for(const mod of modules){
  const document=new JSDOM(render({title:mod.name,body:'<h1>'+mod.name+'</h1>',recordId:'test-only',createdAt:'2026-10-18'})).window.document;
  assert.equal(document.body.dataset.letterhead,'dwp-master-rottmann-20261110');
  assert.equal(document.querySelector('.dwp-letterhead-logo').getAttribute('src'),'/assets/dachwerkpro-logo-briefkopf-20261110.png');
  assert(document.querySelector('.dwp-letterhead-rule') && document.querySelector('.dwp-footer-rule'),'rote Kopf- und Fußlinie');
  assert(document.querySelector('.dwp-letterhead-footer').textContent.includes('info@dachwerkpro.de'));
  assert(document.querySelector('.test-note'));
  assert(!document.body.textContent.includes('[Telefon]'));
}
const custom=new JSDOM(render({title:'<script>injection</script>',body:'<p>body</p>',company:{company:'A&B',email:'a@example.invalid',phone:'0123',address:'<b>Address</b>'}})).window.document;
assert.equal(custom.querySelector('title').textContent,'<script>injection</script>');assert.equal(custom.querySelectorAll('script').length,0);assert(!custom.querySelector('.dwp-letterhead-footer b'));
let raw=null;const store=new Store({getItem:()=>raw,setItem:(_k,value)=>{raw=value;}});
store.settings({company:'Original company',email:'original@example.invalid',phone:'123'});
const customer=store.save('customers',{name:'Synthetic customer'});store.save('projects',{name:'Synthetic project',customerId:customer.id,phase:'Erfassung'});
store.save('lv',{number:'1',text:'Roof',qty:1,unit:'m²',material:10},{status:'Freigegeben',owner:'Test'});
const offer=store.issue('offers');store.settings({email:'changed@example.invalid'});
assert.equal(offer.data.company.email,'original@example.invalid');
assert(render({title:'Offer',body:'',company:offer.data.company}).includes('original@example.invalid'));
assert(fs.readFileSync('project-print.css','utf8').includes('content:"Seite " counter(page)'));
assert(fs.readFileSync('lv-price-logic.js','utf8').includes('DWPDocument.render'));
assert(fs.readFileSync('project-workflows.js','utf8').includes('DWPDocument.render'));
assert(fs.existsSync('assets/dachwerkpro-logo-briefkopf-20261110.png'));
assert(fs.readFileSync('index.html','utf8').indexOf('/dwp-codes.js')<fs.readFileSync('index.html','utf8').indexOf('/document-layout.js'),'Codes vor Briefpapier laden');
// Masterlayout: Adressfeld, Infoblock, Barcode und QR mit Belegnummer, Bank/Steuer in der Fußzeile, Unterschrift/Siegel nur als Bild-Daten.
const L=require('./document-layout.js');
const sig='data:image/png;base64,iVBORw0KGgo=';
const html=L.render({title:'R',test:false,company:{company:'DachWerk Pro',proprietor:'Stephan Mangel',smallBusiness:true,iban:'DE00 0000',taxNumber:'12/345',email:'x@example.invalid'},
  doc:{heading:'Schlussrechnung',project:'BV Test',numberLabel:'Rechnung-Nr.',number:'DWP-R-202611-0104/1',dateLabel:'Rechnungsdatum',date:'15.11.2026',refs:[['Angebot','DWP-A-202611-0100/1'],['leer','']],recipient:['Kunde GmbH','Straße 1','28195 Bremen']},
  images:{signature:sig,seal:'javascript:alert(1)'},body:L.itemsTable([{number:'01',text:'Abdichtung',qty:10,unit:'m²',ep:12.5,gp:125}])+L.totalsBlock([['Netto','125,00 €','strong']],['RECHNUNGSBETRAG','125,00 €'])+L.paymentBlock({company:{iban:'DE00 0000',proprietor:'Stephan Mangel'},number:'DWP-R-202611-0104/1'})});
const d=new JSDOM(html).window.document;
assert.equal(d.querySelector('.dwp-doc-title').textContent,'Schlussrechnung');
assert.match(d.querySelector('.dwp-meta').textContent,/Rechnung-Nr\.: DWP-R-202611-0104\/1/);assert(!d.querySelector('.dwp-meta').textContent.includes('leer'));
assert.equal(d.querySelectorAll('.dwp-address div').length,3);assert.match(d.querySelector('.dwp-sender-line').textContent,/Dachdeckermeister Stephan Mangel · Upsalastraße 48 · 28719 Bremen/);
assert(d.querySelector('.dwp-barcode') && d.querySelector('.dwp-qrcode'),'Barcode und QR vorhanden');
assert.equal(d.querySelector('.dwp-barcode-text').textContent,'DWP-R-202611-0104/1');
assert.match(d.querySelector('.dwp-letterhead-title').textContent,/Kleingewerbe nach § 19/);
assert.match(d.querySelector('.dwp-letterhead-footer').textContent,/IBAN: DE00 0000.*Steuernummer 12\/345.*§19 Kleingewerbe Umsatzsteuerfrei/);
assert.equal(d.querySelector('.dwp-signature-scan').getAttribute('src'),sig);assert.equal(d.querySelector('img.dwp-seal'),null,'unsichere Bildquelle wird verworfen');
assert.match(d.querySelector('.dwp-total-bar').textContent,/RECHNUNGSBETRAG.*125,00 €/);assert.match(d.querySelector('.dwp-payment').textContent,/Verwendungszweck: DWP-R-202611-0104\/1/);
assert.equal(L.paymentBlock({company:{},number:'x'}),'','ohne IBAN kein Zahlungsblock');
// Unterschrift/Siegel: Speicherung nur als PNG/JPG, Größe begrenzt, entfernbar; nicht im Firmenstand der Belege.
store.letterhead({signature:sig});assert.equal(store.data.letterhead.signature,sig);
assert.throws(()=>store.letterhead({signature:'data:image/svg+xml;base64,AAAA'}),/PNG/);assert.throws(()=>store.letterhead({logo:sig}),/unbekannt/);
assert.throws(()=>store.letterhead({seal:'data:image/png;base64,'+'A'.repeat(400001)}),/zu groß/);
store.letterhead({signature:''});assert.equal(store.data.letterhead.signature,undefined);
assert.equal(store.issue('offers').data.company.signature,undefined);
(async()=>{
  await assert.rejects(ready({images:[{complete:true,naturalWidth:0}]}),/Logo/);
  await ready({images:[{complete:true,naturalWidth:863}]});
  console.log('Documents: all 36 routes share original logo/header/footer, escaped contacts, frozen offer contact data, page numbers and missing-logo print rejection passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
