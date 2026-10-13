const assert=require('node:assert/strict');
const {execute,memoryRepository,visibleState}=require('./lib/project-service.cjs');
const repo=memoryRepository(),admin={id:'admin',name:'Stephan',role:'admin',tenantId:'company'},editor={id:'editor',name:'Bauleitung',role:'editor',tenantId:'company'};
async function run(actor,method,args,projectId){return execute(repo,actor,{method,args,projectId,revision:(await repo.read(actor.tenantId)).state.revision});}
(async()=>{
 const a=await run(admin,'save',['customers',{name:'Auftraggeber A',contact:'Anita',contactRole:'Hausverwaltung',email:'anita@example.de',contacts:'Eva | Buchhaltung | eva@example.de | 0421 123'}]);
 const p=await run(admin,'save',['projects',{name:'Freigegebenes Dach',customerId:a.recordId,memberIds:editor.id,phase:'Erfassung',costCenter:'1001'}]);
 const b=await run(admin,'save',['customers',{name:'Anderer Auftraggeber'}]);
 const secret=await run(admin,'save',['projects',{name:'Vertrauliches Dach',customerId:b.recordId,phase:'Erfassung'}]);
 const view=visibleState((await repo.read('company')).state,editor);
 assert(view.records.some(r=>r.id===p.recordId));assert(!view.records.some(r=>r.id===secret.recordId||r.id===b.recordId));assert(!JSON.stringify(view.audit).includes('Vertrauliches Dach'));
 const diary=await run(editor,'save',['diary',{title:'Baustellentag',date:'2026-10-13',work:'Abdichtung'}],p.recordId);assert.equal(diary.state.records.find(r=>r.id===diary.recordId).projectId,p.recordId);
 await assert.rejects(run(editor,'save',['diary',{title:'Fremd',date:'2026-10-13',work:'Fremd'}],secret.recordId),/Mitgliedschaft/);
 await assert.rejects(run(editor,'save',['projects',{name:'Vertrauliches Dach',customerId:b.recordId,phase:'Erfassung',memberIds:editor.id},{id:secret.recordId}]),/mitgliedschaften/);
 await assert.rejects(run(editor,'save',['projects',{name:'Freigegebenes Dach',customerId:a.recordId,phase:'Erfassung',memberIds:'editor,other'},{id:p.recordId}]),/mitgliedschaften/);
 const own=await run(editor,'save',['customers',{name:'Eigener neuer Kunde'}]);assert(own.state.records.some(r=>r.id===own.recordId));
 const ownProject=await run(editor,'save',['projects',{name:'Eigenes neues Projekt',customerId:own.recordId,phase:'Erfassung'}]);assert.equal(ownProject.state.records.find(r=>r.id===ownProject.recordId).data.memberIds,editor.id);
 const info=(await repo.read('company')).state.records.find(r=>r.id===a.recordId).data;assert.deepEqual(info.contacts,[{name:'Eva',role:'Buchhaltung',email:'eva@example.de',phone:'0421 123'}]);
 await assert.rejects(run(admin,'save',['customers',{name:'Fehler',contacts:'Eva | Buchhaltung | keine-email'}]),/E-Mail/);
 await assert.rejects(run(admin,'save',['customers',{name:'Fehler',email:'keine-email'}]),/E-Mail/);
 await run(admin,'save',['lv',{number:'01',text:'Abdichtung',qty:10,unit:'m²',material:12,minutes:6},{status:'Freigegeben'}],p.recordId);
 const offer=await run(admin,'issue',['offers'],p.recordId);const fixed=offer.state.records.find(r=>r.id===offer.recordId).data.customer;
 await run(admin,'save',['customers',{...info,contacts:'Max | Bauleitung | max@example.de | 123'},{id:a.recordId}]);
 assert.equal(fixed.contacts[0].name,'Eva');assert.equal(fixed.contactRole,'Hausverwaltung');
 const reloaded=visibleState((await repo.read('company')).state,editor);assert.equal(reloaded.records.find(r=>r.id===p.recordId).data.costCenter,'1001');
 console.log('Customer/project integration: contact roles and multiple contacts, immutable offer snapshot, project memberships, hidden foreign records/audit, denied writes/privilege escalation, own creation, central reload and cost centre preservation passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
