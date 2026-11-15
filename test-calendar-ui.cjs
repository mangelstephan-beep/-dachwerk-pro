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
  audit:[],calendarScope:'team',calendarEntries:[{id:'x1',projectId:'hidden',start:workday,end:workday,task:'Aufmaß',employeeId:'pe1',employeeName:'Meier',own:true,projectLabel:'Geheimes Dach'}]};
v.DWPWorkspace.acceptServerState(state,{id:'u2',name:'Meier',role:'viewer'});
v.DWPWorkspace.open('personnel');
assert(!vq('#dwp-schedule'),'kein Planungsformular ohne Berechtigung');
assert.equal(vq('#dwp-calendar').querySelectorAll('.dwp-cal-row:not(.dwp-cal-head)').length,1,'nur die eigene Zeile');
assert(vq('#dwp-calendar').textContent.includes('Du siehst deine Einsätze und die deiner Kollegen'));
assert(vq('[data-dwp="respond-schedule"][data-id="pe1/x1/Zugesagt"]').textContent==='Zusagen');
assert(!vq('a[href^="https://wa.me/"]'),'kein WhatsApp-Versand für Mitarbeiter');
assert(!vq('[data-dwp="cancel-schedule"]'));

// Feiertage: Wochenansicht, Einsatzliste, Startseite, Einstellung Bundesland.
{
  const h=boot(),hq=s=>h.document.querySelector('#main-content').querySelector(s),hdb=()=>h.DWPWorkspace.store;
  h.DWPProject.berlinDay=()=>'2026-12-21';
  const hc=hdb().save('customers',{name:'Kunde'}),hp=hdb().save('projects',{name:'Halle Burg',customerId:hc.id,phase:'Erfassung'});
  const he=hdb().save('personnel',{name:'Peters',number:'P9',employment:'Arbeiter',mobile:'0171 999'});
  hdb().schedule(he.id,{projectId:hp.id,start:'2026-12-23',end:'2026-12-28',task:'Notabdichtung'});
  h.DWPWorkspace.open('dashboard');
  const up=hq('.dwp-upcoming');
  assert(up.textContent.includes('1. Weihnachtstag') && up.textContent.includes('2. Weihnachtstag'),'Startseite zeigt Feiertage');
  const dates=[...up.querySelectorAll('li')].map(li=>li.dataset.date);assert.deepEqual(dates,[...dates].sort(),'Startseite nach Datum sortiert');
  h.DWPWorkspace.open('personnel');
  assert(hq('.dwp-cal-holidays').textContent.includes('Fr 25.12. 1. Weihnachtstag'),'Hinweis in der Wochenansicht');
  assert.equal(hq('.dwp-cal-head .is-holiday small').textContent,'1. Weihnachtstag');
  assert.equal(hq('#dwp-calendar').querySelectorAll('.dwp-cal-cell.is-holiday').length,2,'Fr und Sa grau');
  assert(hq('.dwp-cal-holiday-note').textContent.includes('1. Weihnachtstag'),'Einsatzliste nennt Feiertag');
  assert(decodeURIComponent(hq('a[href^="https://wa.me/"]').href).includes('Achtung Feiertag: Fr 25.12. 1. Weihnachtstag'),'WhatsApp nennt Feiertag');
  assert(hq('#dwp-feed').textContent.includes('Nach der Anmeldung'),'Abo-Hinweis im lokalen Betrieb');
  // Bundesland umstellen: Nordrhein-Westfalen hat Allerheiligen.
  h.DWPWorkspace.open('settings');
  const select=hq('select[name="holidayState"]');assert.equal(select.value,'HB');
  select.value='NW';hq('#dwp-company').requestSubmit();
  assert.equal(hdb().data.settings.holidayState,'NW');
}
// Angemeldet: Kalender-Link erstellen, anzeigen, kopieren, sperren.
(async()=>{
  const f=boot(),fq=s=>f.document.querySelector('#main-content').querySelector(s);const calls=[];
  let info={active:false};
  f.DWPRemote={active:true,run:async()=>null,trackModule:async()=>{},calendarFeed:async body=>{calls.push(body?.action || 'status');if(body?.action==='create'){info={active:true,createdAt:'2026-11-15T10:00:00Z',lastUsedAt:null};return {...info,url:'https://www.dachwerkpro.de/kalender/'+'a'.repeat(43)+'.ics'};}if(body?.action==='revoke'){info={active:false};return info;}return info;}};
  f.eval("state.currentRole='admin'");
  f.DWPWorkspace.acceptServerState(JSON.parse(JSON.stringify(f.DWPWorkspace.store.data)),{id:'boss',name:'Stephan',role:'admin'});
  f.DWPWorkspace.open('personnel');
  await new Promise(r=>setTimeout(r,0));
  fq('[data-dwp="feed-create"]').click();await new Promise(r=>setTimeout(r,0));
  const url=fq('.dwp-feed-url').value;assert(url.endsWith('.ics'));
  assert(fq(`a[href="https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}&name=DachwerkPro"]`),'Outlook-365-Link');
  assert(fq('a[href^="webcal://www.dachwerkpro.de/kalender/"]'),'webcal für iPhone');
  f.DWPWorkspace.open('dashboard');f.DWPWorkspace.open('personnel');
  assert(!fq('.dwp-feed-url'),'Link nach Verlassen nicht mehr sichtbar');
  assert(fq('#dwp-feed').textContent.includes('Ein Link ist aktiv seit'));
  fq('[data-dwp="feed-revoke"]').click();await new Promise(r=>setTimeout(r,0));
  assert(fq('[data-dwp="feed-create"]'),'nach dem Sperren wieder erstellbar');
  assert.deepEqual(calls,['status','create','revoke']);
  console.log('Kalender-Oberflächentests bestanden');
})().catch(error=>{console.error(error);process.exit(1);});
