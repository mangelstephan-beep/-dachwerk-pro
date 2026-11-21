// Oberfläche Modul „Sicherung“ und Nutzerübersicht mit Ablauf-Hinweisen (jsdom).
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {JSDOM}=require(process.env.DWP_TEST_JSDOM || 'jsdom');
const tick=()=>new Promise(r=>setTimeout(r,0));
function boot() {
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test/?start=app',runScripts:'outside-only'});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
  for(const f of ['app.js','password-reset.js','module-fixes.js','project-core.js','material-price-import.js','project-workflows.js'])vm.runInContext(fs.readFileSync(f,'utf8'),dom.getInternalVMContext(),{filename:f});
  return w;
}
function choose(w,input,name,text) {
  Object.defineProperty(input,'files',{value:[{name,text:async()=>text}],configurable:true});
  input.dispatchEvent(new w.Event('change',{bubbles:true}));
}
(async()=>{
  // 1) Lokaler Testbetrieb: datierte Datei, Vorschau mit Datum vor dem Einspielen.
  {
    const w=boot(),q=s=>w.document.querySelector('#main-content').querySelector(s),db=()=>w.DWPWorkspace.store;
    const downloads=[];w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
    w.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};
    db().save('customers',{name:'Kunde Eins'});
    w.DWPWorkspace.open('settings');await tick();
    assert(q('[data-dwp="open"][data-id="backup"]'),'Einstellungen verweisen auf das Modul Sicherung');
    assert(w.document.querySelector('.nav-item[data-view="backup"]'),'Sicherung in der Navigation');
    w.DWPWorkspace.open('backup');await tick();
    assert(q('h1').textContent.includes('Sicherung'));assert(w.location.search.includes('module=backup'),'Direktlink');
    q('[data-dwp="backup"]').click();await tick();
    assert(q('#dwp-backup-ready').textContent.match(/DWP_Sicherung_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json/),'Dateiname mit Datum und Uhrzeit');
    q('[data-dwp="backup-save"]').click();assert.match(downloads[0],/^DWP_Sicherung_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/);
    const core=require('./project-core.js'),snapshot=core.backupFormat.wrap(JSON.parse(db().backup()),{createdAt:'2026-11-20T17:30:00Z',createdBy:'Stephan Mangel'});
    db().save('customers',{name:'Kunde Zwei'});
    choose(w,q('#dwp-restore'),'DWP_Sicherung_2026-11-20_18-30.json',JSON.stringify(snapshot));await tick();await tick();
    const preview=q('#dwp-restore-preview').textContent;
    assert(preview.includes('20.11.2026, 18:30 Uhr'),preview);assert(preview.includes('Stephan Mangel'));assert(preview.includes('1 Kunden'));
    assert.equal(db().data.records.filter(r=>r.module==='customers').length,2,'erst nach Bestätigung einspielen');
    q('[data-dwp="backup-file-restore"]').click();await tick();
    assert.equal(JSON.stringify(db().data.records.filter(r=>r.module==='customers').map(r=>r.data.name)),'["Kunde Eins"]');
    choose(w,q('#dwp-restore'),'urlaub.json','{"x":1}');await tick();await tick();
    assert(q('#dwp-error').textContent.includes('keine DachWerkPro-Sicherung'));assert(!q('#dwp-restore-preview'));
    w.close();
  }
  // 2) Angemeldeter Betrieb als Administrator: Verlauf, Jetzt sichern, Wiederherstellen, Datei hochladen.
  {
    const w=boot(),q=s=>w.document.querySelector('#main-content').querySelector(s),calls=[];
    let backups=[{id:'2',createdAt:'2026-11-21T05:15:00Z',createdBy:'Automatisch',kind:'automatisch',sourceCreatedAt:null,projects:3,records:120,bytes:250000,fileName:'DWP_Sicherung_2026-11-21_06-15.json'}];
    const usersList={domain:'dachwerkpro.de',roles:{admin:'Administrator',viewer:'Mitarbeiter (nur lesen)'},alerts:[{userId:'u7',daysLeft:3,validUntil:'2026-11-24',text:'aaaaaa (Anton Aaaaaa): Zugang läuft in 3 Tagen ab (gültig bis 24.11.2026)'}],
      users:[{id:'boss',name:'Stephan Mangel',username:'admin',login:'admin@dachwerkpro.de',role:'admin',self:true,validUntil:'',daysLeft:null,usage:{logins30:12,loginsTotal:40,moduleOpens30:85,lastActive:'2026-11-21T05:00:00Z'}},
        {id:'u7',name:'Anton Aaaaaa',username:'aaaaaa',login:'aaaaaa@dachwerkpro.de',role:'viewer',self:false,validUntil:'2026-11-24',daysLeft:3,expired:false,usage:{logins30:4,loginsTotal:5,moduleOpens30:7,lastActive:'2026-11-20T10:00:00Z'}}]};
    w.DWPRemote={active:true,trackModule:async()=>{},users:async()=>usersList,userAction:async body=>{calls.push(body);return usersList;},run:async()=>null,
      backups:async body=>{calls.push(body || {action:'list'});
        if(body?.action==='create'){const created={id:'3',createdAt:'2026-11-21T05:55:00Z',createdBy:'Stephan Mangel',kind:'manuell',projects:3,records:121,bytes:251000};backups=[created,...backups];return {created,backups};}
        if(body?.action==='restore')return {backups:[{...backups[0],id:'4',kind:'vor Wiederherstellung'},...backups]};
        return {backups};},
      uploadBackup:async text=>{calls.push({action:'upload',text});return {backups};},
      export:async()=>({name:'DWP_Sicherung_2026-11-21_06-55.json',type:'application/json',text:'{}'})};
    w.eval("state.currentRole='admin'");
    w.DWPWorkspace.open('dashboard');for(let i=0;i<4;i++)await tick();
    assert(q('#dwp-expiry-alerts').textContent.includes('aaaaaa (Anton Aaaaaa): Zugang läuft in 3 Tagen ab'),'Hinweis auf der Startseite');
    w.DWPWorkspace.open('backup');for(let i=0;i<3;i++)await tick();
    const history=q('table').textContent;assert(history.includes('21.11.2026, 06:15 Uhr'),history);assert(history.includes('automatisch'));
    q('[data-dwp="backup-create"]').click();for(let i=0;i<3;i++)await tick();
    assert(q('table').textContent.includes('21.11.2026, 06:55 Uhr'));assert.equal(calls.at(-1).action,'create');
    q('[data-dwp="backup-restore"][data-id="2"]').click();for(let i=0;i<3;i++)await tick();
    assert.equal(JSON.stringify(calls.at(-1)),'{"action":"restore","id":"2"}');assert(q('table').textContent.includes('vor Wiederherstellung'));
    q('[data-dwp="backup"]').click();for(let i=0;i<3;i++)await tick();
    assert(q('#dwp-backup-ready').textContent.includes('DWP_Sicherung_2026-11-21_06-55.json'),'Datei zum Ablegen in Dropbox/Drive bereit');
    const core=require('./project-core.js'),file=JSON.stringify(core.backupFormat.wrap(core.empty(),{createdAt:'2026-11-01T08:00:00Z',createdBy:'Stephan Mangel'}));
    choose(w,q('#dwp-restore'),'DWP_Sicherung_2026-11-01_09-00.json',file);for(let i=0;i<3;i++)await tick();
    assert(q('#dwp-restore-preview').textContent.includes('01.11.2026, 09:00 Uhr'));
    q('[data-dwp="backup-file-restore"]').click();for(let i=0;i<3;i++)await tick();
    assert.equal(calls.at(-1).action,'upload');assert.equal(calls.at(-1).text,file);assert(!q('#dwp-restore-preview'));

    // Nutzerübersicht: wer nutzt DWP wie oft, Ablaufdatum, Verlängern.
    w.DWPWorkspace.open('users');for(let i=0;i<3;i++)await tick();
    const overview=q('table').textContent;
    assert(overview.includes('Anton Aaaaaa') && overview.includes('bis 24.11.2026 (noch 3 Tage)'),overview);
    assert(overview.includes('85') && overview.includes('40'),'Anmeldungen und Modulaufrufe');
    assert(q('#dwp-expiry-alerts-panel').textContent.includes('läuft in 3 Tagen ab'));
    q('[data-dwp="user-extend"][data-id="u7"]').click();await tick();
    const edit=q('#dwpu-edit');assert.equal(edit.elements.validUntil.value,'2026-11-24');
    edit.elements.validUntil.value='2026-12-31';edit.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));for(let i=0;i<4;i++)await tick();
    assert.equal(calls.find(c=>c.action==='update').validUntil,'2026-12-31');
    const create=q('#dwpu-create');create.elements.name.value='Neu';create.elements.username.value='neu';create.elements.validUntil.value='2027-01-31';
    create.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));for(let i=0;i<3;i++)await tick();
    assert.equal(calls.find(c=>c.action==='create' && c.username==='neu').validUntil,'2027-01-31');
    w.DWPWorkspace.open('users');for(let i=0;i<2;i++)await tick();
    q('[data-dwp="user-edit"][data-id="boss"]').click();await tick();assert(!q('#dwpu-edit [name="validUntil"]'),'eigener Zugang unbefristet');
    w.close();
  }
  console.log('Oberfläche Sicherung und Nutzerübersicht: datierte Datei, Vorschau vor dem Einspielen, Verlauf, Ablauf-Hinweise und Verlängern bestanden');
})().catch(e=>{console.error(e);process.exitCode=1;});
