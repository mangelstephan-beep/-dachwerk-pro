const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {PGlite}=require('@electric-sql/pglite');
const {createHandler}=require('./api/projects.js');
const {Store}=require('./project-core.js');
const {execute,memoryRepository}=require('./lib/project-service.cjs');
const {repository}=require('./lib/project-repository.cjs');
const rawStorage=()=>{let raw=null;return {getItem:()=>raw,setItem:(_key,value)=>{raw=value;}};};

async function checkCoreAndUI() {
  const store=new Store(rawStorage());
  const customer=store.save('customers',{name:'Kunde'});
  const first=store.save('projects',{name:'Dach A',customerId:customer.id,phase:'Erfassung'});
  const lvA=store.save('lv',{number:'001',text:'Abdichtung',qty:10,unit:'m²'});
  const worker=store.save('personnel',{name:'Mitarbeiter',number:'001',employment:'Angestellte'});
  store.schedule(worker.id,{projectId:first.id,start:'2026-10-25',end:'2026-10-25'});
  const second=store.save('projects',{name:'Dach B',customerId:customer.id,phase:'Erfassung'});
  const lvB=store.save('lv',{number:'002',text:'Dämmung',qty:10,unit:'m²'});
  store.select(first.id);
  const removed=store.deleteProject(first.id);
  assert.equal(removed.removedRecords,2);
  assert.equal(store.get(first.id),undefined);
  assert.equal(store.get(lvA.id),undefined);
  assert(store.get(second.id));
  assert(store.get(lvB.id));
  assert(store.get(customer.id),'Global customer stays available to other projects');
  assert.equal(store.get(worker.id).assignments.length,0,'Personnel assignments are cascaded');
  assert.equal(store.data.selectedProject,null);
  assert.throws(()=>store.deleteProject(first.id),/nicht gefunden/);
  assert(!new Store(store.storage).get(first.id));

  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'});
  const w=dom.window;
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
  for(const file of ['app.js','module-fixes.js','project-core.js','project-workflows.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
  const local=w.DWPWorkspace.store;
  const c=local.save('customers',{name:'Kunde UI'});
  const p=local.save('projects',{name:'Dach UI',customerId:c.id,phase:'Erfassung'});
  const lv=local.save('lv',{number:'1',text:'Dacharbeiten',qty:1,unit:'m²'});
  w.DWPWorkspace.open('dashboard');
  const selector=w.document.querySelector('#dwp-project');
  selector.dispatchEvent(new w.Event('contextmenu',{bubbles:true,cancelable:true}));
  let dialog=w.document.querySelector('.dwp-project-delete-dialog');
  assert(dialog && dialog.textContent.includes('Ja, endgültig löschen'));
  dialog.querySelector('[data-choice="no"]').click();
  assert(local.get(p.id),'No preserves project');
  assert(local.get(lv.id),'No preserves child record');
  selector.dispatchEvent(new w.Event('contextmenu',{bubbles:true,cancelable:true}));
  dialog=w.document.querySelector('.dwp-project-delete-dialog');
  dialog.querySelector('[data-choice="yes"]').click();
  assert.equal(local.get(p.id),undefined,'Yes removes project');
  assert.equal(local.get(lv.id),undefined,'Yes removes linked data');
  assert.equal(w.document.querySelector('.dwp-project-delete-dialog'),null);
  dom.window.close();
}

async function checkServer() {
  const db=memoryRepository();
  const admin={id:'a',name:'Admin',role:'admin',tenantId:'main'};
  const editor={id:'e',name:'Editor',role:'editor',tenantId:'main'};
  const cmd=async(actor,method,args,projectId,revision)=>{
    const row=await db.read(actor.tenantId);
    return execute(db,actor,{method,args,projectId,revision:revision??row.state.revision});
  };
  const c=(await cmd(admin,'save',['customers',{name:'Kunde'}])).recordId;
  const project=(await cmd(admin,'save',['projects',{name:'Test',customerId:c,phase:'Erfassung',memberIds:'e'}])).recordId;
  await cmd(admin,'save',['lv',{number:'01',text:'Dach',qty:1,unit:'m²'}],project);
  await assert.rejects(cmd(editor,'deleteProject',[project],project),e=>e.status===403);
  await assert.rejects(cmd(admin,'deleteProject',[project],'other'),e=>e.status===400);
  assert.equal((await db.read('main')).state.records.length,3);
  await cmd(admin,'deleteProject',[project],project);
  assert.equal((await db.read('main')).state.records.filter(r=>r.id===project||r.projectId===project).length,0);
  assert(db.ledger.some(e=>e.method==='deleteProject'));
}

async function checkPostgres() {
  const pg=new PGlite();
  try{
    await pg.exec(fs.readFileSync('migrations/001-project-store.sql','utf8'));
    await pg.exec(fs.readFileSync('migrations/003-file-store.sql','utf8'));
    const repo=repository({query:async(sql,params)=>(await pg.query(sql,params)).rows});
    const admin={id:'admin',name:'Admin',role:'admin',tenantId:'t1'};
    const call=async(method,args,projectId,revision)=>{
      const row=await repo.read('t1');
      return execute(repo,admin,{method,args,projectId,revision:revision??row.state.revision});
    };
    const customer=(await call('save',['customers',{name:'K'}])).recordId;
    const project=(await call('save',['projects',{name:'Dach',customerId:customer,phase:'Erfassung'}])).recordId;
    const doc=(await call('save',['documents',{title:'PDF',category:'Plan'}],project)).recordId;
    await pg.query("INSERT INTO dwp_files(id,tenant_id,actor,record_id,project_id,name,mime,size,sha256,ready) VALUES('file-1','t1','admin',$1,$2,'test.pdf','application/pdf',1,$3,true)",[doc,project,'a'.repeat(64)]);
    await pg.query("INSERT INTO dwp_file_chunks(file_id,part,data) VALUES('file-1',0,decode('AA==','base64'))");
    await call('deleteProject',[project],project);
    assert.equal((await pg.query("SELECT count(*)::int AS n FROM dwp_files WHERE tenant_id='t1'")).rows[0].n,0);
    assert.equal((await pg.query("SELECT count(*)::int AS n FROM dwp_file_chunks")).rows[0].n,0);
    assert.equal((await repo.read('t1')).state.records.some(r=>r.id===project||r.projectId===project),false);
    assert.equal((await pg.query("SELECT method FROM dwp_project_audit ORDER BY revision DESC LIMIT 1")).rows[0].method,'deleteProject');
  }finally{await pg.close();}
}

(async()=>{await checkCoreAndUI();await checkServer();await checkPostgres();console.log('Project deletion: No/Yes, scoped cascades, permissions and atomic PostgreSQL file cleanup passed.');})().catch(error=>{console.error(error);process.exitCode=1;});
