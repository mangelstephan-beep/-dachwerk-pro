// Kalender: Nur Administrator (und Personal) sehen alle Einsätze. Jeder andere
// Benutzer sieht ausschließlich seine eigenen Einsätze und kann nur diese
// zusagen oder absagen.
const assert=require('node:assert/strict');
const {Store}=require('./project-core.js');
const {execute,memoryRepository,visibleState}=require('./lib/project-service.cjs');
const repo=memoryRepository();
const admin={id:'admin',name:'Stephan',role:'admin',tenantId:'company'};
const user2={id:'u2',name:'Nutzer 2',role:'viewer',tenantId:'company'};
const user3={id:'u3',name:'Nutzer 3',role:'editor',tenantId:'company'};
const hr={id:'hr1',name:'Personal',role:'hr',tenantId:'company'};
async function run(actor,method,args,projectId){return execute(repo,actor,{method,args,projectId,revision:(await repo.read(actor.tenantId)).state.revision});}
const load=state=>new Store({getItem:()=>JSON.stringify(state),setItem(){}});
(async()=>{
  const c=await run(admin,'save',['customers',{name:'Kunde'}]);
  const geheim=await run(admin,'save',['projects',{name:'Geheimes Dach',address:'Lesum',customerId:c.recordId,phase:'Erfassung'}]);
  const team=await run(admin,'save',['projects',{name:'Teamdach',customerId:c.recordId,phase:'Erfassung',memberIds:'u3'}]);
  const p2=await run(admin,'save',['personnel',{name:'Meier',number:'P2',employment:'Arbeiter',mobile:'0171 1234567',userId:'u2',wage:40}]);
  const p3=await run(admin,'save',['personnel',{name:'Schulz',number:'P3',employment:'Arbeiter',mobile:'0172 7654321',userId:'u3'}]);
  await assert.rejects(run(admin,'save',['personnel',{name:'X',number:'P9',employment:'Arbeiter',mobile:'abc'}]),/Mobilnummer/);
  await run(admin,'schedule',[p2.recordId,{projectId:geheim.recordId,start:'2026-11-16',end:'2026-11-18',task:'Abdichtung'}]);
  await run(admin,'schedule',[p3.recordId,{projectId:team.recordId,start:'2026-11-16',end:'2026-11-17',task:'Umdeckung'}]);
  const state=(await repo.read('company')).state;

  // Nutzer 2: nur der eigene Einsatz, Projektname trotz fehlender Projektmitgliedschaft lesbar.
  const v2=visibleState(state,user2);
  assert.equal(v2.calendarScope,'own');
  assert.deepEqual(v2.calendarEntries.map(e=>e.employeeName),['Meier']);
  assert.equal(v2.calendarEntries[0].projectLabel,'Geheimes Dach · Lesum');
  assert(!JSON.stringify(v2).includes('Umdeckung'),'Nutzer 2 sieht keine Einsätze von Nutzer 3');
  assert(!JSON.stringify(v2).includes('0172'),'keine fremden Mobilnummern');
  assert(v2.records.filter(r=>r.module==='personnel').every(r=>r.assignments.length===0 && r.data.userId===undefined && r.data.wage===0));
  assert.doesNotThrow(()=>load(v2),'eingeschränkter Bestand lässt sich im Browser laden');

  // Nutzer 3: nur der eigene Einsatz.
  const v3=visibleState(state,user3);
  assert.deepEqual(v3.calendarEntries.map(e=>e.task),['Umdeckung']);
  assert(!JSON.stringify(v3).includes('Abdichtung'));
  assert.doesNotThrow(()=>load(v3));

  // Administrator sieht alles direkt in den Personalakten.
  const va=visibleState(state,admin);
  assert.equal(va.calendarEntries,undefined);
  assert.equal(va.records.find(r=>r.id===p2.recordId).assignments.length,1);
  // Personal sieht alle Einsätze, auch bei nicht freigegebenen Projekten.
  const vh=visibleState(state,hr);
  assert.equal(vh.calendarScope,'all');
  assert.equal(vh.calendarEntries.length,2);
  assert.doesNotThrow(()=>load(vh));

  // Zusagen nur durch den eingeplanten Mitarbeiter.
  const a2=state.records.find(r=>r.id===p2.recordId).assignments[0];
  await assert.rejects(run(user3,'respondSchedule',[p2.recordId,a2.id,{answer:'Zugesagt'}]),/eingeplante Mitarbeiter/);
  await assert.rejects(run(user2,'respondSchedule',[p2.recordId,a2.id,{answer:'Vielleicht'}]),/zusagen oder absagen/);
  const ok=await run(user2,'respondSchedule',[p2.recordId,a2.id,{answer:'Zugesagt',note:'Komme um 7 Uhr'}]);
  assert.equal(ok.state.calendarEntries[0].response,'Zugesagt');
  assert(!JSON.stringify(ok.state).includes('Umdeckung'),'auch die Antwort nach dem Zusagen bleibt eingeschränkt');
  const stored=(await repo.read('company')).state.records.find(r=>r.id===p2.recordId).assignments[0];
  assert.equal(stored.response,'Zugesagt');assert.equal(stored.responseNote,'Komme um 7 Uhr');
  await assert.rejects(run(user2,'schedule',[p2.recordId,{projectId:geheim.recordId,start:'2026-11-20',end:'2026-11-20'}]),/Berechtigung/);

  // Lokaler Testbetrieb kennt dieselbe Rückmeldung.
  const local=new Store({_v:null,getItem(){return this._v;},setItem(_k,v){this._v=v;}});
  const lc=local.save('customers',{name:'K'}),lp=local.save('projects',{name:'P',customerId:lc.id,phase:'Erfassung'});
  const le=local.save('personnel',{name:'M',number:'1',employment:'Arbeiter'});
  const la=local.schedule(le.id,{projectId:lp.id,start:'2026-11-16',end:'2026-11-16'});
  local.respondSchedule(le.id,la.id,{answer:'Abgesagt'});
  assert.equal(local.get(le.id).assignments[0].response,'Abgesagt');
  console.log('Kalender-Zugriffstests bestanden');
})().catch(e=>{console.error(e);process.exit(1);});
