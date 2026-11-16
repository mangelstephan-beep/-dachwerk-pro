// Lokaler Probelauf gegen die echte Serverlogik (lib/project-service.cjs, Speicher im RAM).
const path=require('node:path').resolve(__dirname,'../..')+'/';
const {Store}=require(path+'project-core.js');
const {execute,memoryRepository}=require(path+'lib/project-service.cjs');
const {prueflauf}=require('./prueflauf.js');
(async()=>{
  const repo=memoryRepository(),admin={id:'admin',name:'Stephan',role:'admin',tenantId:'test'};
  let selected=null,state=(await repo.read('test')).state;
  const store=()=>{let raw=JSON.stringify({...state,selectedProject:selected});return new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});};
  const run=async(method,args)=>{
    const res=await execute(repo,admin,{method,args,projectId:selected,revision:(await repo.read('test')).state.revision});
    state=(await repo.read('test')).state;
    if(method==='save' && args[0]==='projects')selected=res.recordId;
    return res.recordId?store().get(res.recordId):null;
  };
  const out=await prueflauf({run,store,log:m=>console.log(m)});
  console.log(JSON.stringify(out,null,1));
})().catch(e=>{console.error('FEHLER in Schritt',e.step,'-',e.message);process.exitCode=1;});
