const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const shell={inert:false,attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}};
const nodes=new Map([['#app-shell',shell]]);
const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:'',value:'',addEventListener(){}});return nodes.get(selector);};
let finishWrite,timeoutCallback,cleared=false,aborted=false,mode='pending';
const payload={state:{revision:1},user:{id:'admin',name:'Test Admin',role:'admin'}};
const window={DWPWorkspace:{store:{data:{selectedProject:'project-a'},get(){return null;}},acceptServerState(){},open(){}},navigator:{standalone:false},matchMedia:()=>({matches:false})};
const context={window,state:{},location:{search:''},document:{querySelector:s=>s.startsWith('meta')?null:node(s)},URLSearchParams,AbortController,showLogin(){},startApp(){},confirmPageChange:()=>true,showToast(){},setTimeout(fn){timeoutCallback=fn;return 1;},clearTimeout(){cleared=true;},fetch:async(url,options={})=>{
 if(options.method!=='POST')return {ok:true,json:async()=>payload};
 return new Promise((resolve,reject)=>{finishWrite=()=>resolve({ok:true,json:async()=>payload});options.signal.addEventListener('abort',()=>{aborted=true;const e=Error('aborted');e.name='AbortError';reject(e);});});
}};
vm.runInNewContext(fs.readFileSync('central-entry.js','utf8'),context);
(async()=>{
 await new Promise(r=>setImmediate(r));assert(window.DWPRemote.active);
 const write=window.DWPRemote.run('save',['customers',{name:'Test'}]);
 assert.equal(shell.inert,false,'Pending server writes must not disable project selection and navigation');
 assert.equal(shell.attributes['aria-busy'],'true');
 await assert.rejects(window.DWPRemote.run('save',[]),/vorherige Vorgang/,'Duplicate writes remain blocked');
 finishWrite();await write;assert(cleared);assert.equal(shell.attributes['aria-busy'],undefined);
 cleared=false;const stalled=window.DWPRemote.run('save',[]);timeoutCallback();
 await assert.rejects(stalled,/Speicherstand ist unklar/);assert(aborted);assert(cleared);assert.equal(shell.inert,false);assert.equal(shell.attributes['aria-busy'],undefined);
 const recovery=window.DWPRemote.run('save',[]);finishWrite();await recovery;
 console.log('PASS: navigation remains available, duplicate writes blocked, timeout aborts and clears busy state, recovery write succeeds.');
})().catch(e=>{console.error(e);process.exitCode=1;});
