const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require(process.env.DWP_TEST_JSDOM || 'jsdom');
const scripts=['project-core.js','project-records.js','app.js','module-fixes.js','lv-import-manager.js','lv-price-logic.js','lv-material-match.js','workflow-assistant.js'];
function boot(storage={}) {
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'});
 const w=dom.window;w.scrollTo=()=>{};w.confirm=()=>true;w.CSS={escape:s=>s};
 for(const [k,v] of Object.entries(storage))w.localStorage.setItem(k,v);
 scripts.forEach(s=>w.eval(fs.readFileSync(s,'utf8')));return dom;
}
const pause=()=>new Promise(r=>setTimeout(r,10));
(async()=>{
 const dom=boot(),w=dom.window,q=s=>w.document.querySelector(s),all=s=>[...w.document.querySelectorAll(s)];
 const errors=[];w.addEventListener('error',e=>errors.push(e.message));
 const C=w.DachWerkCore;
 for(const [input,out] of [[7.85,7.85],['7,85',7.85],['7.85',7.85],['1.234,56',1234.56],[0,0]])assert.equal(C.number(input),out);
 function create(type,name,customerId=''){
  w.eval(`openQuickModal(${JSON.stringify(type)})`);
  q('#record-name').value=name;q('#record-location').value='Bremen';q('#record-contact').value='Bauleitung';
  if(type==='Projekt')q('#record-customer').value=customerId;
  q('#quick-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 }
 create('Kunde','Kunde <Nord>');const customer=C.entities()[0];assert.equal(customer.name,'Kunde <Nord>');
 assert.ok(q('[data-page="customers"]').textContent.includes('Kunde <Nord>'));
 create('Projekt','Dach A',customer.id);const project=C.current();assert.equal(project.customerId,customer.id);
 create('Projekt','Dach B',customer.id);const second=C.current();assert.notEqual(project.number,second.number);
 assert.throws(()=>C.saveEntity({...project,id:undefined}),/bereits vergeben/);
 assert.throws(()=>C.saveEntity({type:'Projekt',number:'P-invalid',name:'Ohne Kunde'}),/Kunden/);
 q(`[data-project-id="${project.id}"]`).click();await pause();assert.equal(C.current().id,project.id);
 const fixture={documents:[{id:'sourceA',entityId:project.id,name:'LV A',originalName:'A.txt',pages:[],format:'TXT'},{id:'sourceB',entityId:second.id,name:'LV B',originalName:'B.txt',pages:[],format:'TXT'}],workingCopies:[{id:'workA',sourceId:'sourceA',entityId:project.id,name:'LV A',positions:[{id:'posA',nr:'001',text:'Dachabdichtung',unit:'m²',qty:10,ep:7.85,material:6,time:30}]},{id:'workB',sourceId:'sourceB',entityId:second.id,name:'LV B',positions:[{id:'posB',nr:'001',text:'Anderes Dach',unit:'m²',qty:5,ep:20}]}]};
 w.localStorage.setItem('dwp-lv-import-v1',JSON.stringify(fixture));w.eval("renderView('calculation')");await pause();
 assert.equal(all('[data-work-card]').length,1);assert.equal(q('[data-work-card]').dataset.workCard,'workA');
 const ep=q('[data-f="ep"]');ep.value='8,25';ep.dispatchEvent(new w.Event('input',{bubbles:true}));await pause();assert.equal(q('[data-f="ep"]'),ep);assert.equal(ep.value,'8,25');assert.ok(q('[data-work-total]').textContent.includes('82,50'));
 q('[data-work-action="save"]').click();await pause();assert.equal(JSON.parse(w.localStorage.getItem('dwp-lv-import-v1')).workingCopies[0].positions[0].ep,8.25);
 q('[data-f="ep"]').value='0';q('[data-work-action="save"]').click();await pause();assert.ok(q('[data-work-total]').textContent.includes('0,00'));
 w.localStorage.setItem('dwp-calc-settings',JSON.stringify({hourRate:60}));q('[data-f="ep"]').value='';q('[data-work-action="save"]').click();await pause();assert.ok(q('[data-work-total]').textContent.includes('360,00'));
 let printed='';w.open=()=>({document:{write:s=>printed=s,close(){}},opener:null});q('[data-work-print-target]').click();assert.ok(printed.includes('36,00'));assert.ok(printed.includes('m²'));
 w.eval("renderView('measurements')");all('.module-card').find(e=>e.querySelector('h3').textContent==='Digitales Aufmaß').querySelector('button').click();
 q('#pr-title').value='Dachfläche 1';q('#pr-position').value='workA:posA';q('#pr-length').value='10';q('#pr-width').value='5';q('#pr-count').value='2';q('#pr-deduction').value='1,5';
 q('[data-project-record-form]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 let records=JSON.parse(w.localStorage.getItem('dwp-project-records-v1'));assert.equal(records[0].quantity,98.5);assert.equal(records[0].projectId,project.id);assert.equal(records[0].positionId,'posA');
 q('[data-record-edit]').click();q('#pr-length').value='-1';q('[data-project-record-form]').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.ok(q('[data-record-error]').textContent);assert.equal(JSON.parse(w.localStorage.getItem('dwp-project-records-v1'))[0].quantity,98.5);
 q('#pr-length').value='11';q('[data-project-record-form]').dispatchEvent(new w.Event('submit',{cancelable:true}));records=JSON.parse(w.localStorage.getItem('dwp-project-records-v1'));assert.equal(records.length,1);assert.equal(records[0].quantity,108.5);
 w.localStorage.setItem('dwp-current-entity-v1',second.id);w.DachWerkRecords.render({title:'Digitales Aufmaß',view:'measurements'});assert.equal(all('[data-record-edit]').length,0);
 w.eval("renderView('calculation')");await pause();assert.equal(q('[data-work-card]').dataset.workCard,'workB');
 w.eval("renderView('projects')");q('[data-action="list-view"]').click();assert.equal(all('[data-project-list] tbody tr').length,2);q('.project-filter').value='Dach B';q('.project-filter').dispatchEvent(new w.Event('input'));assert.equal(all('[data-project-list] tbody tr').filter(r=>r.style.display!=='none').length,1);
 for(const title of ['Bautagebuch','Festgestellte Mängel','Abweichungen','Abnahmen & Übergaben','Leckage & Ortung','Nachweise']) {
  w.DachWerkRecords.render({title,view:'site-docs'});
  q('#pr-title').value=title+' Prüfung';q('#pr-owner').value='Bauleitung';
  q('[data-project-record-form]').dispatchEvent(new w.Event('submit',{cancelable:true}));
  assert.equal(all('[data-record-edit]').length,1,title);
  q('[data-record-edit]').click();assert.equal(q('#pr-owner').value,'Bauleitung');
}
const stored=Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]));
 await pause();assert.equal(errors.length,0,errors.join('\n'));w.dispatchEvent(new w.Event('pagehide'));dom.window.close();
 const again=boot(stored);again.window.eval("renderView('projects')");assert.equal(again.window.DachWerkCore.entities().length,3);assert.equal(again.window.document.querySelectorAll('.project-card').length,2);await pause();again.window.dispatchEvent(new again.window.Event('pagehide'));again.window.close();
 console.log('PASS: original forms, customer/project links, duplicate validation, project filtering, decimal and zero prices, automatic labor total, print, measurement CRUD, invalid inputs, list filtering, reload persistence, observer stability.');
})().catch(e=>{console.error(e);process.exit(1)});
