// Kalender-Oberfläche: Wochenansicht, Startseite „Anstehend“, Zusage und
// WhatsApp-Link im lokalen Testbetrieb sowie die eingeschränkte Sicht eines
// angemeldeten Mitarbeiters.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {JSDOM}=require(process.env.DWP_TEST_JSDOM || 'jsdom');
function boot() {
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test/?start=app',runScripts:'outside-only'});
  const w=dom.window;
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
  for(const file of ['app.js','module-fixes.js','project-core.js','material-price-import.js','project-workflows.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
  return w;
}
const w=boot(),main=()=>w.document.querySelector('#main-content'),q=s=>main().querySelector(s);
const db=()=>w.DWPWorkspace.store;
const today=w.DWPProject.berlinDay();
const workday=new Date(today+'T00:00:00Z').getUTCDay()===0?new Date(Date.parse(today)+864e5).toISOString().slice(0,10):today;
const c=db().save('customers',{name:'Kunde'});
const p=db().save('projects',{name:'Flachdach Lesum',address:'Lesumer Heerstraße 1',customerId:c.id,phase:'Erfassung'});
const e=db().save('personnel',{name:'Meier',number:'P2',employment:'Arbeiter',mobile:'0171 1234567'});
db().save('personnel',{name:'Schulz',number:'P3',employment:'Arbeiter'});
const a=db().schedule(e.id,{projectId:p.id,start:workday,end:workday,task:'Abdichtung'});

w.DWPWorkspace.open('dashboard');
assert(q('.dwp-upcoming').textContent.includes('Flachdach Lesum'),'Startseite zeigt den echten Einsatz');
assert(q('.dwp-upcoming').textContent.includes('Offen'));
q('[data-dwp="calendar-open"]').click();
assert.equal(q('h1').textContent,'Personal und Termine');
const cal=q('#dwp-calendar');assert(cal,'Wochenansicht vorhanden');
assert.equal(cal.querySelectorAll('.dwp-cal-row:not(.dwp-cal-head)').length,2,'Admin sieht alle Mitarbeiter als Zeilen');
assert(cal.querySelector('.dwp-cal-bar').textContent.includes('Flachdach Lesum'));
const wa=main().querySelector('a[href^="https://wa.me/491711234567?text="]');
assert(wa,'WhatsApp-Link mit internationaler Nummer');
assert(decodeURIComponent(wa.href).includes('Abdichtung') && decodeURIComponent(wa.href).includes('module=personnel'));
// Woche blättern und zurück.
const label=()=>q('.dwp-cal-nav strong').textContent;const before=label();
q('[data-dwp="calendar-week"][data-id="7"]').click();assert.notEqual(label(),before);
q('[data-dwp="calendar-week"][data-id="0"]').click();assert.equal(label(),before);
// Zusage für den Mitarbeiter eintragen.
q(`[data-dwp="respond-schedule"][data-id="${e.id}/${a.id}/Zugesagt"]`).click();
assert.equal(db().get(e.id).assignments[0].response,'Zugesagt');
assert(q('#dwp-calendar .dwp-cal-bar').textContent.startsWith('✓'));

// Angemeldeter Mitarbeiter ohne Planungsrecht: nur eigene Einsätze, kein Planungsformular.
const v=boot(),vq=s=>v.document.querySelector('#main-content').querySelector(s);
v.DWPRemote={active:true,run:async()=>null,trackModule:async()=>{}};v.eval("state.currentRole='viewer'");
const state={schema:1,revision:3,selectedProject:null,settings:{wage:55,agk:0,profit:10,tax:19,company:'DWP',address:''},
  records:[{id:'pe1',module:'personnel',projectId:null,status:'Entwurf',data:{name:'Meier',number:'P2',employment:'Arbeiter',wage:0},assignments:[]},{id:'pe2',module:'personnel',projectId:null,status:'Entwurf',data:{name:'Schulz',number:'P3',employment:'Arbeiter',wage:0},assignments:[]}],
  audit:[],calendarScope:'own',calendarEntries:[{id:'x1',projectId:'hidden',start:workday,end:workday,task:'Aufmaß',employeeId:'pe1',employeeName:'Meier',own:true,projectLabel:'Geheimes Dach'}]};
v.DWPWorkspace.acceptServerState(state,{id:'u2',name:'Meier',role:'viewer'});
v.DWPWorkspace.open('personnel');
assert(!vq('#dwp-schedule'),'kein Planungsformular ohne Berechtigung');
assert.equal(vq('#dwp-calendar').querySelectorAll('.dwp-cal-row:not(.dwp-cal-head)').length,1,'nur die eigene Zeile');
assert(vq('#dwp-calendar').textContent.includes('Du siehst nur deine eigenen Einsätze'));
assert(vq('[data-dwp="respond-schedule"][data-id="pe1/x1/Zugesagt"]').textContent==='Zusagen');
assert(!vq('a[href^="https://wa.me/"]'),'kein WhatsApp-Versand für Mitarbeiter');
assert(!vq('[data-dwp="cancel-schedule"]'));
console.log('Kalender-Oberflächentests bestanden');
