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
console.log('Modul 37: Projektfilter, CSV-Export, CSV-Formelschutz, Navigation und Dokumentzugriff geprüft');
})();
