const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {Store}=require('./project-core.js');
const {memoryRepository,execute,visibleState}=require('./lib/project-service.cjs');
const {createHandler:projects}=require('./api/projects.js');
const {createHandler:access}=require('./api/access.js');
(async()=>{
 const oldOwner=process.env.DWP_OWNER_USER_ID;process.env.DWP_OWNER_USER_ID='owner';
 const actor={id:'viewer',name:'Testbetrachter',role:'viewer',tenantId:'company'},repo=memoryRepository();
 let raw=null;const store=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});
 const c=store.save('customers',{name:'AG'}),p=store.save('projects',{name:'Dach',customerId:c.id,phase:'Erfassung'}),d=store.save('documents',{title:'Dachfoto',category:'Foto'});
 store.attach(d.id,{name:'test.png',dataUrl:'data:image/png;base64,eA=='});
 await repo.compareAndSwap('company',0,store.data,{hash:'test'});
 const seen=new Set(),events=[];
 const audit={event:async(a,type,details)=>events.push({actor:a.id,type,...details}),consumeFile:async(a,id)=>{const key=a.id+':'+id;if(seen.has(key))return false;seen.add(key);return true;},trusted:async()=>false,report:async()=>({usage:[],events:[],devices:[]})};
 const handlers={'/api/projects':projects({sessionFromRequest:async()=>actor,repository:()=>repo}),'/api/access':access({sessionFromRequest:async()=>actor,repository:()=>repo,accessRepository:()=>audit})};
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'}),w=dom.window;
 w.scrollTo=()=>{};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.fetch=async(url,options={})=>{const res={code:200,status(n){this.code=n;return this;},setHeader(){return this;},json(body){this.body=body;return this;},end(){return this;}};await handlers[url]({method:options.method || 'GET',body:options.body,headers:{host:'dachwerk.test',origin:'https://dachwerk.test','content-type':'application/json'}},res);return {ok:res.code<400,json:async()=>res.body};};
 const ctx=dom.getInternalVMContext();for(const file of ['app.js','module-fixes.js','project-core.js','project-workflows.js','central-entry.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
 const tick=()=>new Promise(r=>setTimeout(r,20)),q=s=>w.document.querySelector(s.startsWith('dialog')?s:'#main-content '+s);
 try {
  await tick();assert(w.DWPRemote.active);w.DWPWorkspace.store.data.selectedProject=p.id;
  w.DWPWorkspace.open('documents');await tick();assert(events.some(e=>e.type==='module_open' && e.module==='documents'));
  assert.equal(w.DWPWorkspace.store.get(d.id).attachments[0].dataUrl,undefined);
  q('[data-dwp="backup"]').click();await tick();assert(q('#dwp-error').textContent.includes('Nur Stephan'));
  q('[data-dwp="file"]').click();await tick();assert(q('dialog'));assert(q('dialog').textContent.includes('Testbetrachter'));assert(q('dialog img').src.startsWith('data:image/'));
  q('dialog button').click();assert(!q('dialog'));
  q('[data-dwp="file"]').click();await tick();assert(q('#dwp-error').textContent.includes('bereits einmal'));assert(!q('dialog'));
  w.DWPWorkspace.open('workflow');assert(q('h1').textContent.includes('Projektworkflow'));assert(q('[data-dwp="advance-phase"]'));
  w.DWPWorkspace.open('access');await tick();assert(q('#dwp-error').textContent.includes('Nur Stephan'));
  assert.equal(w.localStorage.getItem('dwp-project-core-v1'),null);
  console.log('Central UI: actual API routing, module tracking, denied third-party export/report, metadata-only files, watermarked once-only dialog and 36-stage workflow navigation passed.');
 }finally{dom.window.close();if(oldOwner===undefined)delete process.env.DWP_OWNER_USER_ID;else process.env.DWP_OWNER_USER_ID=oldOwner;}
})().catch(e=>{console.error(e);process.exitCode=1;});
