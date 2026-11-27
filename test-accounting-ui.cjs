const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {JSDOM}=require(process.env.DWP_TEST_JSDOM || 'jsdom');
// Oberfläche Buchhaltung: Zahlungsziel (27), Mahnwesen (29), Zahlungsausgang (28), SKR03-Journal (30), Einstellungen.
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'});
const w=dom.window;
w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
for(const file of ['app.js','module-fixes.js','project-core.js','material-price-import.js','project-workflows.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
const open=id=>w.DWPWorkspace.open(id),db=()=>w.DWPWorkspace.store,core=w.DWPProject;
const query=s=>w.document.querySelector('#main-content').querySelector(s);
const error=()=>query('#dwp-error').textContent;
const submit=form=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
function save(id,values,approved=false) {
  open(id);const form=query('#dwp-record');
  for(const [key,value] of Object.entries(values)){const el=form.elements.namedItem(key);if(el.type==='checkbox')el.checked=value;else el.value=value;}
  if(approved){form.elements.status.value='Freigegeben';form.elements.owner.value='Prüfer';}
  submit(form);assert.equal(error(),'');return db().list(id).at(-1);
}
let files=[];w.URL.createObjectURL=b=>{files.push(b);return 'blob:x';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){files.at(-1).name=this.download;};
// Einstellungen
open('settings');let f=query('#dwp-accounting');assert(f,'Buchhaltungseinstellungen');
f.elements.paymentDays.value='10';f.elements.dunningFee.value='5,00';f.elements.acc_bank.value='1210';submit(f);assert.equal(error(),'');
assert.equal(db().data.settings.paymentDays,10);assert.equal(db().data.settings.dunningFee,5);assert.equal(db().accounts().bank,'1210');
open('settings');f=query('#dwp-accounting');f.elements.acc_bank.value='12x';submit(f);assert.match(error(),/Kontonummer/);
const customer=save('customers',{name:'Testkunde GmbH',customerType:'Gewerbekunde'});
save('projects',{name:'Dach A',customerId:customer.id,phase:'Erfassung'});
const lv=save('lv',{number:'010',text:'Abdichtung',qty:'10',unit:'m²',material:'10',minutes:'0'},true);
open('offers');query('[data-dwp="issue"]').click();
save('orders',{title:'Auftrag',offerId:db().list('offers')[0].id,date:'2026-10-12'},true);
save('measurements',{title:'Dach',positionId:lv.id,length:'10',width:'1',factor:'1',deduction:'0',date:'2026-10-12'},true);
open('invoices');assert.equal(query('[name="paymentDays"]').value,'10');query('[name="paymentDays"]').value='14';query('[data-dwp="issue"]').click();assert.equal(error(),'');
const inv=db().list('invoices')[0];assert.equal(inv.data.dueDate,core.addDays(core.berlinDay(),14));
// Mahnwesen: noch nicht fällig → kein Formular; zurückdatiert → Formular
open('payments');assert(w.document.body.textContent.includes('Offene Posten und Mahnwesen'));assert(!query('#dwp-dunning'));
Object.assign(db().data.records.find(r=>r.id===inv.id).data,{invoiceDate:core.addDays(core.berlinDay(),-40),dueDate:core.addDays(core.berlinDay(),-30)});
open('payments');f=query('#dwp-dunning');assert(f,'Mahnformular');submit(f);assert.equal(error(),'');
assert.equal(db().get(inv.id).dunnings[0].level,'Zahlungserinnerung');
assert(query('[data-dwp="dunning-print"]'),'Druckknopf');
// Druck ohne Briefpapier-Skript meldet verständlichen Fehler statt abzustürzen
query('[data-dwp="dunning-print"]').click();assert.match(error(),/Briefpapier/);
// Eingangsrechnung und Zahlungsausgang
const er=save('incoming',{title:'Material',supplier:'Handel',invoiceNumber:'R-77',date:core.berlinDay(),net:'100',tax:'19',includeInCosts:true},true);
open('incoming');f=query('#dwp-payout');assert(f);f.elements.amount.value='119';submit(f);assert.equal(error(),'');
assert.equal(db().incomingOpen(db().get(er.id)),0);
// Journal und Exporte
open('closing');assert(query('#dwp-journal'));
assert(w.document.body.textContent.includes('Buchungsjournal SKR03'));
const tableText=[...w.document.querySelectorAll('.data-table')].map(t=>t.textContent).join(' ');
assert(tableText.includes('1400') && tableText.includes('8400') && tableText.includes('1600') && tableText.includes('3400'));
query('[data-dwp="datev-csv"]').click();let csv=null;
const reader=b=>new Promise(r=>{const fr=new w.FileReader();fr.onload=()=>r(fr.result);fr.readAsText(b);});
(async()=>{
  csv=await reader(files.at(-1));assert.match(files.at(-1).name,/^DachWerkPro_DATEV_Buchungen_/);
  assert(csv.includes('"Umsatz (ohne Soll/Haben-Kz)";"Soll/Haben-Kennzeichen"'));
  const gross=inv.data.gross.toFixed(2).replace('.',',');
  assert(csv.includes(`"${gross}";"S";"EUR";"1400";"8400"`),'Rechnung als DATEV-Buchung');
  assert(csv.includes('"119,00";"S";"EUR";"1600";"1210"'),'Zahlungsausgang über eigenes Bankkonto');
  query('[data-dwp="journal-csv"]').click();const j=await reader(files.at(-1));assert(j.includes('"Datum";"Beleg";"Buchungstext";"Soll";"Haben"'));
  // Zeitraumfilter
  f=query('#dwp-journal');f.elements.from.value=core.addDays(core.berlinDay(),1);submit(f);assert.equal(error(),'');
  assert(!w.document.body.textContent.includes('ER Handel'),'Zeitraum filtert');
  // DATEV-Buchungsstapel (EXTF): ohne Zeitraum/Beraternummer verständliche Meldung, danach Download
  open('closing');query('[data-dwp="datev-extf"]').click();assert.match(error(),/Zeitraum/);
  const t=core.berlinDay();f=query('#dwp-journal');f.elements.from.value=t;f.elements.to.value=t;submit(f);
  query('[data-dwp="datev-extf"]').click();assert.match(error(),/Beraternummer/);
  open('settings');f=query('#dwp-accounting');f.elements.datevConsultant.value='1001';f.elements.datevClient.value='1';f.elements.fiscalYearStart.value='';submit(f);assert.equal(error(),'');
  assert.equal(db().data.settings.datevConsultant,'1001');assert.equal(db().data.settings.datevClient,'1');
  open('closing');query('[data-dwp="datev-extf"]').click();assert.equal(error(),'');
  assert.match(files.at(-1).name,/^EXTF_DachWerkPro_Buchungsstapel_/);assert.equal(files.at(-1).type,'text/csv;charset=windows-1252');
  const extf=await reader(files.at(-1));assert.match(extf,/^"EXTF";700;21;"Buchungsstapel";13;/);assert.match(extf,/;3400;1600;"";/);
  // Mahnkosten-Buchungsarten im Zahlungsformular
  open('payments');const kinds=[...query('#dwp-record').elements.direction.options].map(o=>o.value);
  assert(kinds.includes('Mahngebühr erhalten') && kinds.includes('Verzugszinsen erhalten'));assert(w.document.body.textContent.includes('Mahnkosten offen'));
  // Festschreibung
  open('closing');f=query('#dwp-lock');assert(f,'Festschreibungsformular');f.elements.lockedUntil.value=core.addDays(t,-1);submit(f);assert.equal(error(),'');
  assert.equal(db().lockedUntil(),core.addDays(t,-1));assert(w.document.body.textContent.includes('Festgeschrieben bis'));
  console.log('Buchhaltung-Oberfläche: Einstellungen, Zahlungsziel, Mahnwesen, Zahlungsausgang, SKR03-Journal, DATEV-CSV, DATEV-EXTF und Festschreibung passed.');
})().catch(e=>{console.error(e);process.exit(1);});
