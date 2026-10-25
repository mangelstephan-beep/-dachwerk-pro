const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {createHandler}=require('./api/projects.js');
const {memoryRepository}=require('./lib/project-service.cjs');
const repo=memoryRepository(),actor={id:'admin',name:'Server Admin',role:'admin',tenantId:'company'};
const handler=createHandler({sessionFromRequest:async()=>actor,repository:()=>repo});
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'}),w=dom.window;
w.scrollTo=()=>{};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};
let failNext=false,releaseWrite;
w.fetch=async(url,options={})=>{
  if(url!=='/api/projects')throw Error('Unexpected network call');
  if(options.method==='POST') {
    await new Promise(resolve=>{releaseWrite=resolve;});
    if(failNext){failNext=false;return {ok:false,json:async()=>({error:'Simulierter Schreibkonflikt'})};}
  }
  const res={code:200,status(n){this.code=n;return this;},setHeader(){return this;},json(body){this.body=body;return this;},end(){return this;}};
  await handler({method:options.method || 'GET',body:options.body,headers:{host:'dachwerk.test',origin:'https://dachwerk.test','content-type':'application/json'}},res);
  return {ok:res.code<400,json:async()=>res.body};
};
const context=dom.getInternalVMContext();
for(const file of ['app.js','module-fixes.js','project-core.js','project-workflows.js','central-entry.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const tick=()=>new Promise(r=>setTimeout(r,15));
const q=s=>w.document.querySelector('#main-content').querySelector(s);
(async()=>{
 await tick();assert(w.DWPRemote.active);assert.equal(w.document.querySelector('#profile-button strong').textContent,'Server Admin');
 w.DWPWorkspace.open('customers');q('[name="name"]').value='Serverkunde';
 q('#dwp-record').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await tick();assert.equal(w.DWPWorkspace.store.list('customers').length,0,'No optimistic success before server confirmation');assert(!w.document.querySelector('#app-shell').inert,'Pending writes keep navigation accessible');assert.equal(w.document.querySelector('#app-shell').getAttribute('aria-busy'),'true');
 releaseWrite();await tick();assert.equal(w.DWPWorkspace.store.list('customers').length,1);assert(!w.document.querySelector('#app-shell').inert);
 assert.equal(w.localStorage.getItem('dwp-project-core-v1'),null,'Central records are kept in memory, not silently copied to localStorage');
 failNext=true;w.DWPWorkspace.open('customers');q('[name="name"]').value='Nicht gespeichert';q('#dwp-record').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await tick();releaseWrite();await tick();assert.equal(w.DWPWorkspace.store.list('customers').length,1);assert(q('#dwp-error').textContent.includes('Schreibkonflikt'));assert.equal(q('[name="name"]').value,'Nicht gespeichert','Failed write keeps entered values');
 assert.equal((await repo.read('company')).state.records.length,1);
 dom.window.close();console.log('Central client: server hydration, real actor display, commit confirmation, no local data mirror, failed-write preservation and conflict error passed.');
})().catch(e=>{dom.window.close();console.error(e);process.exitCode=1;});
