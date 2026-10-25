const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {Store}=require('./project-core.js');
const {execute,memoryRepository}=require('./lib/project-service.cjs');
const {repository}=require('./lib/project-repository.cjs');
const {PGlite}=require('@electric-sql/pglite');
const {JSDOM}=require('jsdom');

const storage=()=>{let raw=null;return {getItem:()=>raw,setItem:(_key,value)=>{raw=value;}};};
async function run(){
  const db=new Store(storage());
  const customer=db.save('customers',{name:'Ein Kunde für zwei Projekte'});
  const p1=db.save('projects',{name:'Doppelt angelegtes Dach',customerId:customer.id,phase:'Erfassung'});
  const lv=db.save('lv',{number:'01',text:'LV Position',qty:2,unit:'m²',material:12},{status:'Prüfung'});
  db.save('documents',{title:'Projektdateien',category:'Nachweis'});
  const worker=db.save('personnel',{name:'Kollege',number:'A01',employment:'Arbeiter'});
  db.transaction('Testschicht','personnel',worker.id,state=>{
    state.records.find(r=>r.id===worker.id).assignments=[{id:'A1',projectId:p1.id,start:'2026-10-25',end:'2026-10-26',task:'Dach'}];
  });
  const p2=db.save('projects',{name:'Anderes Dach',customerId:customer.id,phase:'Erfassung'});
  const otherLV=db.save('lv',{number:'01',text:'Bestand erhalten',qty:1,unit:'m²',material:15});
  for(const invalid of [undefined,[],['ja'],['ja','nein','ja'],['ja','ja','Ja']]){
    assert.throws(()=>db.deleteProject(p1.id,p1.data.name,invalid),/dreimal Ja/);
  }
  assert.throws(()=>db.deleteProject(p1.id,'Falscher Name',['ja','ja','ja']),/Projektbezeichnung/);
  assert.equal(db.list('lv',p1.id).length,1);
  const deleted=db.deleteProject(p1.id,p1.data.name,['ja','ja','ja']);
  assert.equal(deleted.id,p1.id);
  assert.equal(deleted.removed,2);
  assert.equal(db.get(p1.id),undefined);
  assert.equal(db.get(lv.id),undefined);
  assert(db.data.records.every(r=>r.projectId!==p1.id));
  assert.equal(db.project().id,p2.id);
  assert(db.get(otherLV.id));
  assert(db.get(customer.id),'Globale Kundendaten werden nicht ungewollt gelöscht');
  assert.equal(db.get(worker.id).assignments.length,0);
  assert(db.data.audit.some(e=>/Projekt endgültig gelöscht/.test(e.action)));
  assert.throws(()=>db.deleteProject(p1.id,p1.data.name,['ja','ja','ja']),/nicht gefunden/);

  const repo=memoryRepository();
  const admin={id:'admin',name:'Administrator',role:'admin',tenantId:'tenantA'};
  const editor={...admin,role:'editor',id:'editor'};
  const send=async(actor,method,args,projectId)=>{
    const old=await repo.read(actor.tenantId);
    return execute(repo,actor,{method,args,revision:old.state.revision,projectId});
  };
  const c=(await send(admin,'save',['customers',{name:'Firma'}])).recordId;
  const project=(await send(admin,'save',['projects',{name:'Zu löschen',customerId:c,phase:'Erfassung'}])).recordId;
  await send(admin,'save',['lv',{number:'01',text:'Leistung',qty:2,unit:'m²'}],project);
  await assert.rejects(send(editor,'deleteProject',[project,'Zu löschen',['ja','ja','ja']],project),/Administratorberechtigung/);
  await assert.rejects(send(admin,'deleteProject',[project,'Zu löschen',['ja','ja']],project),/dreimal Ja/);
  await assert.rejects(send(admin,'deleteProject',[project,'Umbenannt',['ja','ja','ja']],project),/Projektbezeichnung/);
  const before=await repo.read('tenantA');
  await assert.rejects(execute(repo,admin,{method:'deleteProject',args:[project,'Zu löschen',['ja','ja','ja']],revision:before.state.revision-1,projectId:project}),/Bestand wurde geändert/);
  const result=await send(admin,'deleteProject',[project,'Zu löschen',['ja','ja','ja']],project);
  assert.equal(result.state.records.some(r=>r.projectId===project||r.id===project),false);
  assert.equal(repo.ledger.at(-1).deletedProjectId,undefined,'Only persisted audit entries are returned in memory ledger');
  assert.equal(repo.ledger.at(-1).method,'deleteProject');

  // Real SQL transaction: data records, file storage, chunks and views must all vanish together.
  const pg=new PGlite();
  try{
    for(const migration of ['001-project-store.sql','002-access-security.sql','003-file-store.sql'])
      await pg.exec(fs.readFileSync('migrations/'+migration,'utf8'));
    const query=async(sql,args)=>(await pg.query(sql,args)).rows;
    const real=repository({query});
    let state=await real.read('files-tenant');
    const call=async(method,args,projectId)=>{
      const response=await execute(real,{...admin,tenantId:'files-tenant'},{method,args,projectId,revision:state.state.revision});
      state=await real.read('files-tenant');return response;
    };
    const rc=(await call('save',['customers',{name:'SQL-Kunde'}])).recordId;
    const rp=(await call('save',['projects',{name:'Mit Originaldatei',customerId:rc,phase:'Erfassung'}])).recordId;
    const doc=(await call('save',['documents',{title:'Original',category:'Nachweis'}],rp)).recordId;
    const keep=(await call('save',['projects',{name:'Behalten',customerId:rc,phase:'Erfassung'}])).recordId;
    await query("INSERT INTO dwp_files(id,tenant_id,actor,record_id,project_id,name,mime,size,sha256,ready) VALUES($1,$2,$3,$4,$5,'orig.pdf','application/pdf',4,$6,true)",['file-a','files-tenant',admin.id,doc,rp,'0'.repeat(64)]);
    await query("INSERT INTO dwp_file_chunks(file_id,part,data) VALUES('file-a',0,decode('25504446','hex'))",[]);
    await query("INSERT INTO dwp_file_views(tenant_id,actor,file_id) VALUES('files-tenant',$1,'file-a')",[admin.id]);
    assert.equal((await query("SELECT count(*)::int n FROM dwp_files WHERE project_id=$1",[rp]))[0].n,1);
    const stale=state.state.revision-1;
    await assert.rejects(execute(real,{...admin,tenantId:'files-tenant'},{method:'deleteProject',args:[rp,'Mit Originaldatei',['ja','ja','ja']],revision:stale,projectId:rp}),/Bestand wurde geändert/);
    assert.equal((await query("SELECT count(*)::int n FROM dwp_files WHERE project_id=$1",[rp]))[0].n,1);
    await call('deleteProject',[rp,'Mit Originaldatei',['ja','ja','ja']],rp);
    assert.equal((await query("SELECT count(*)::int n FROM dwp_files WHERE project_id=$1",[rp]))[0].n,0);
    assert.equal((await query("SELECT count(*)::int n FROM dwp_file_chunks WHERE file_id='file-a'"))[0].n,0);
    assert.equal((await query("SELECT count(*)::int n FROM dwp_file_views WHERE file_id='file-a'"))[0].n,0);
    assert(state.state.records.some(r=>r.id===keep));
    assert(state.state.records.every(r=>r.id!==rp&&r.projectId!==rp));
    assert.equal((await query("SELECT count(*)::int n FROM dwp_project_audit WHERE method='deleteProject'"))[0].n,1);
  }finally{await pg.close();}

  // UI: holding, swiping and exactly three separate Yes choices; any No aborts.
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'});
  const w=dom.window;
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  const context=dom.getInternalVMContext();
  for(const file of ['app.js','module-fixes.js','project-core.js','module-verification.js','project-workflows.js'])
    vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
  const ui=w.DWPWorkspace.store,uiCust=ui.save('customers',{name:'Kunde UI'});
  const uiProject=ui.save('projects',{name:'Löschprüfung UI',customerId:uiCust.id,phase:'Erfassung'});
  ui.save('lv',{number:'01',text:'LV',qty:2,unit:'m²'});
  w.DWPWorkspace.open('projects');
  const row=w.document.querySelector('[data-project-gesture="'+uiProject.id+'"]');
  assert(row);
  const point=(kind,x,y)=>{const e=new w.Event(kind,{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y,pointerType:'touch'});row.dispatchEvent(e);};
  point('pointerdown',190,70);point('pointermove',100,70);point('pointerup',100,70);
  assert(row.classList.contains('is-delete-revealed'));
  row.querySelector('[data-dwp="delete-project"]').click();
  await new Promise(resolve=>setTimeout(resolve,0));
  let dialog=w.document.querySelector('.dwp-delete-confirm');
  assert(dialog&&dialog.textContent.includes('1 von 3'));
  dialog.querySelector('[data-choice="yes"]').click();
  await new Promise(resolve=>setTimeout(resolve,0));
  dialog=w.document.querySelector('.dwp-delete-confirm');
  assert(dialog&&dialog.textContent.includes('2 von 3'));
  dialog.querySelector('[data-choice="no"]').click();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert(ui.get(uiProject.id),'Nein bei Stufe 2 verhindert Löschung');
  row.querySelector('[data-dwp="delete-project"]').click();
  for(let n=1;n<=3;n++){
    await new Promise(resolve=>setTimeout(resolve,0));
    dialog=w.document.querySelector('.dwp-delete-confirm');
    assert(dialog&&dialog.textContent.includes(n+' von 3'));
    dialog.querySelector('[data-choice="yes"]').click();
  }
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(ui.get(uiProject.id),undefined);
  assert.equal(ui.data.records.some(r=>r.projectId===uiProject.id),false);
  dom.window.close();
  console.log('Projektlöschung: 3 x Ja, Nein stoppt, UI-Wischgeste, Datenisolation, Rechte, Audit und SQL-Dateicascade bestanden.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
