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

(async function testSafeTemplateReuse(){
  const {JSDOM}=require('jsdom');
  const dom=new JSDOM('<main id="register"></main>',{url:'https://www.dachwerkpro.de',runScripts:'outside-only'});
  const w=dom.window;
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.eval(fs.readFileSync('document-register.js','utf8'));
  const same={...base,id:'source-same',data:{...base.data,title:'Altes Gutachten',description:'Befund aus alter Akte',recipient:'Auftraggeber',commission:'p1',editor:'Prüfer'}};
  const foreign={...base,id:'source-cross',projectId:'p2',data:{...base.data,title:'Musterbericht',description:'Fremdprojekt intern',recipient:'Vertraulicher Empfänger',commission:'Fremdkostenstelle',editor:'Fremder Bearbeiter'}};
  const store={data:{records:[project('p1','A'),project('p2','B'),same,foreign],selectedProject:'p1'}};
  let creates=0,uploads=0,values;
  w.DWPRemote={active:true,async run(method,args){creates++;values=args[1];return {id:'new-beleg',data:{number:'DWP-2026-37-0042'}};},
    async uploadFile(id,file){uploads++;assert.equal(id,'new-beleg');assert.equal(file.name,'neue-datei.pdf');}};
  const root=w.document.querySelector('#register');
  w.DWPRegister.mount({store,root,notify:()=>{},showError:error=>{throw error;},onSaved:()=>{}});
  const form=root.querySelector('#dwp-reg-form');
  root.querySelector('[data-reg-template="source-cross:a1"]').click();
  assert.equal(form.elements.projectId.value,'p1','Destination project unchanged');
  assert.equal(form.elements.category.value,'Bestellung','Reuse category');
  assert.equal(form.elements.title.value,'Musterbericht','Reuse generic title');
  assert.equal(form.elements.description.value,'','No cross-project description copied');
  assert.equal(form.elements.commission.value,'','No cross-project commission copied');
  assert.equal(form.elements.recipient.value,'','No cross-project recipient copied');
  assert.equal(form.elements.editor.value,'','No cross-project editor copied');
  assert.equal(form.elements.versionOf.value,'','New document must not become a version');
  assert.equal(form.elements.file.required,true,'New original is mandatory');
  assert.match(root.querySelector('#dwp-reg-save-status').textContent,/anderen Projekt/);
  root.querySelector('[data-reg-template="source-same:a1"]').click();
  assert.equal(form.elements.title.value,'Altes Gutachten');
  assert.equal(form.elements.description.value,'Befund aus alter Akte');
  assert.equal(form.elements.recipient.value,'Auftraggeber');
  assert.equal(form.elements.commission.value,'p1');
  assert.equal(form.elements.editor.value,'Prüfer');
  assert.equal(form.elements.versionOf.value,'');
  Object.defineProperty(form.elements.file,'files',{configurable:true,value:[new w.File(['%PDF-1.7'],'neue-datei.pdf',{type:'application/pdf'})]});
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(creates,1,'Create an independent record exactly once');
  assert.equal(uploads,1,'Upload a distinct new file');
  assert.equal(values.versionOf,'');
  assert.equal(values.title,'Altes Gutachten');
  assert.match(values.notes,/Quelle: DWP-2026-37-0001/);
  dom.window.close();
  console.log('Modul 37: vorhandene Metadaten sicher wiederverwenden, Projektgrenzen beachten, neues Original verlangen');
})().catch(error=>{console.error(error);process.exitCode=1;});

(async function testTenantSequenceAndXlsx(){
  const {execute,memoryRepository}=require('./lib/project-service.cjs');
  const {xlsx}=require('./lib/document-register.cjs');
  const XLSX=require('xlsx');
  const db=memoryRepository(),actor={id:'test-owner',name:'Test',role:'admin',tenantId:'mod37-tests'};
  let revision=0;
  const save=async(module,data,projectId)=>{
    const result=await execute(db,actor,{method:'save',args:[module,data],projectId,revision});
    revision=result.state.revision;
    return result.recordId;
  };
  const customer=await save('customers',{name:'Testkunde'});
  const first=await save('projects',{name:'Projekt A',customerId:customer,phase:'Erfassung'});
  const second=await save('projects',{name:'Projekt B',customerId:customer,phase:'Erfassung'});
  const input={title:'Original',category:'Nachweis',date:'2026-11-06',number:'DWP-2026-37-0001'};
  const ids=[
    await save('documents',input,first),
    await save('documents',input,second),
    await save('documents',input,first)
  ];
  const persisted=(await db.read(actor.tenantId)).state;
  const numbers=ids.map(id=>persisted.records.find(r=>r.id===id)?.data.number);
  assert.deepEqual(numbers,['DWP-2026-37-0001','DWP-2026-37-0002','DWP-2026-37-0003'],'Server sequence must not repeat between projects');
  const result=await xlsx(persisted,{projectId:second});
  assert.equal(result.name,'DWP_Modul37_Register.xlsx');
  const workbook=XLSX.read(Buffer.from(result.base64,'base64'),{type:'buffer'});
  const values=XLSX.utils.sheet_to_json(workbook.Sheets.Schriftverkehr,{header:1});
  assert.equal(values.length,2,'Only project B document should be exported');
  assert.equal(values[1][1],'DWP-2026-37-0002');
  assert.equal(values[1][5],'Projekt B');
  console.log('Modul 37: mandantenweit eindeutige Nummern + echter XLSX-Export geprüft');
})().catch(error=>{console.error(error);process.exitCode=1;});

console.log('Modul 37: Projektfilter, CSV-Export, CSV-Formelschutz, Navigation und Dokumentzugriff geprüft');
})();
