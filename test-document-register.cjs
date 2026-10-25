(function registerTests() {
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {rows,csv,cell}=require('./lib/document-register.cjs');
const project=(id,tenant)=>({module:'projects',id,data:{name:id,costCenter:tenant}});
const base={id:'doc1',module:'documents',projectId:'p1',createdAt:'2026-10-14T10:00:00Z',status:'Neu',
  data:{number:'DWP-2026-37-0001',date:'2026-10-14',title:'Eurofast',description:'Lieferung',category:'Bestellung',recipient:'Bauleiter'},
  attachments:[{id:'a1',storageId:'blob1',name:'bestellung.pdf'}]};
const state={records:[project('p1','a'),project('p2','b'),base,
 {...base,id:'doc2',projectId:'p2',data:{...base.data,number:'DWP-2026-37-0002'},attachments:[]},
 {...base,id:'foreign-orphan',projectId:'not-visible',attachments:[]},
 {module:'customers',id:'customer',projectId:null,data:{title:'not in register'}}]};
const all=rows(state);
assert.equal(all.length,2,'No orphaned / irrelevant modules');
assert.equal(rows(state,{projectId:'p1'}).length,1,'Server-side project filter');
assert.equal(all[0].date,'2026-10-14');
assert(all.some(x=>x.filename==='bestellung.pdf'));
assert.equal(rows({records:[project('p3','new')] }).length,0);
const exported=csv(state,{projectId:'p2'});
assert(exported.includes('DWP-2026-37-0002'));
assert(!exported.includes('DWP-2026-37-0001'),'Projects must filter');
assert.equal(cell('=HYPERLINK("evil")'),'"\'=HYPERLINK(""evil"")"','Excel injection protected');
assert.equal(cell('+SUM(1;2)'),'"\' +SUM(1;2)"'.replace('\' ','\''),'Leading plus protected');
assert.equal(cell('Line\nbreak'),'"Line break"');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('/document-register.js'),'Client file included');
const workflows=fs.readFileSync('project-workflows.js','utf8');
assert(workflows.includes("if(id==='register')"),'Module 37 reachable');
assert(workflows.includes("['dashboard','workflow','access','audit','help','settings','register']"),'Deep link allowed');
assert(fs.readFileSync('central-entry.js','utf8').includes('originalFile(recordId,fileId,projectId='),'Cross-project document open');
assert(fs.readFileSync('lib/access-security.cjs','utf8').includes("if(body.kind==='register')"),'Export route protected through existing owner/device gate');
(async function testBrowserUploadRetry() {
  const {JSDOM}=require('jsdom');
  const browser=new JSDOM('<main id="register"></main>',{url:'https://www.dachwerkpro.de',runScripts:'outside-only'});
  const {window}=browser;
  window.HTMLElement.prototype.scrollIntoView=function(){};
  window.eval(fs.readFileSync('document-register.js','utf8'));
  const older={...base,id:'old-document',data:{...base.data,number:'DWP-2026-37-0003'},attachments:[]};
  const store={data:{records:[project('p1','a'),older],selectedProject:'p1'}};
  let saves=0,uploads=0,done=0,number='',uploadIds=[],errors=[];
  window.DWPRemote={
    active:true,
    async run(method,args){assert.equal(method,'save');saves++;number=args[1].number;return {id:'new-document'};},
    async uploadFile(id){uploads++;uploadIds.push(id);if(uploads===1)throw Error('Unterbrochen');}
  };
  const root=window.document.querySelector('#register');
  window.DWPRegister.mount({store,root,notify:()=>{},showError:e=>errors.push(e.message),onSaved:()=>done++});
  const form=root.querySelector('#dwp-reg-form');
  form.elements.projectId.value='p1';
  form.elements.date.value='2026-10-25';
  form.elements.title.value='Testbeleg';
  const documentFile=new window.File(['%PDF-1.7'],'test.pdf',{type:'application/pdf'});
  Object.defineProperty(form.elements.file,'files',{configurable:true,value:[documentFile]});
  const submit=async()=>{form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,10));};
  await submit();
  assert.equal(saves,1);
  assert.equal(uploads,1);
  assert.equal(done,0,'Upload failure must not report a completed document');
  assert.equal(number,'DWP-2026-37-0004','New number must follow maximum, not count');
  assert.match(root.querySelector('#dwp-reg-save-status').textContent,/erneut hochladen/);
  form.elements.title.value='Geändert';
  await submit();
  assert.equal(saves,1,'A pending record must not be rewritten after metadata change');
  assert.equal(uploads,1,'Changed metadata must block upload retry');
  assert(errors.some(e=>e.includes('nicht mehr ändern')));
  form.elements.title.value='Testbeleg';
  await submit();
  assert.equal(saves,1,'Retry must reuse existing document instead of creating a duplicate');
  assert.equal(uploads,2);
  assert.deepEqual(uploadIds,['new-document','new-document']);
  assert.equal(done,1);
  const retry=root.querySelector('[data-reg-retry="old-document"]');
  assert(retry,'Missing originals must offer an upload-recovery action');
  retry.click();
  await submit();
  assert.equal(saves,1,'Recovering an older record must not create a second record');
  assert.equal(uploadIds.at(-1),'old-document');
  assert.equal(done,2);
  browser.window.close();
})().catch(error=>{console.error(error);process.exitCode=1;});

console.log('Modul 37: Projektfilter, CSV-Export, CSV-Formelschutz, Navigation und Dokumentzugriff geprüft');
})();
