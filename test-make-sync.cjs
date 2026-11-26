// DWP → Make → Dropbox: signierte Download-Links, Ordnerzuordnung, Abschaltung ohne Konfiguration,
// Meldung bei neuem Projekt, geprüftem Upload, Sicherung und Buchhaltungsexport; Download-Endpunkt.
// Echtes PostgreSQL (PGlite), Make-Webhook durch eine Attrappe ersetzt.
const assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const sync=require('./lib/make-sync.cjs');
const {repository}=require('./lib/project-repository.cjs');
const {execute}=require('./lib/project-service.cjs');
const {fileRepository,CHUNK}=require('./lib/file-store.cjs');
const {backupStore}=require('./lib/backup-store.cjs');
const projectsApi=require('./api/projects.js'),filesApi=require('./api/files.js'),backupsApi=require('./api/backups.js'),cronApi=require('./api/cron.js'),makeFile=require('./api/make-file.js');
const {Store}=require('./project-core.js');
const SECRET='x'.repeat(40),URL_OK='https://hook.eu1.make.com/abcDEF123';
const env={DWP_MAKE_WEBHOOK_URL:URL_OK,DWP_MAKE_SECRET:SECRET,BETTER_AUTH_URL:'https://dachwerk.test'};
function response(){const r={statusCode:200,headers:{},chunks:[],headersSent:false,status(n){this.statusCode=n;return this;},setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},json(v){this.body=v;this.headersSent=true;return this;},send(v){this.body=v;this.headersSent=true;return this;},write(b){this.headersSent=true;this.chunks.push(Buffer.from(b));return true;},end(){this.headersSent=true;return this;}};return r;}
function fakeFetch(){const calls=[];const f=async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return {ok:true,status:200};};f.calls=calls;return f;}
(async()=>{
  // Konfiguration: ohne URL/Secret abgeschaltet, nur echte Make-Webhook-Adressen, Secret mind. 32 Zeichen.
  assert.equal(sync.config({}).enabled,false);
  assert.equal(sync.config({...env,DWP_MAKE_SECRET:'kurz'}).enabled,false);
  assert.equal(sync.config({...env,DWP_MAKE_WEBHOOK_URL:'https://evil.example/hook'}).enabled,false);
  assert.equal(sync.config(env).enabled,true);
  // Ohne eigenes Secret: aus BETTER_AUTH_SECRET abgeleitet, aber nie identisch damit.
  const derived=sync.config({DWP_MAKE_WEBHOOK_URL:URL_OK,BETTER_AUTH_SECRET:'auth-secret-0123456789abcdef'});
  assert.equal(derived.enabled,true);assert.notEqual(derived.secret,'auth-secret-0123456789abcdef');assert.equal(derived.secret.length,64);
  assert.equal(sync.config({DWP_MAKE_WEBHOOK_URL:URL_OK,BETTER_AUTH_SECRET:'kurz'}).enabled,false);
  const off=fakeFetch();
  assert.deepEqual(await sync.createSync({env:{},fetchImpl:off}).projectCreated({id:'p',data:{name:'X'}}),{ok:false,skipped:true});
  assert.equal(off.calls.length,0,'ohne Konfiguration keine Meldung');

  // Signierte Links: gültig 24 h, Manipulation und Ablauf werden abgewiesen.
  const now=Date.parse('2026-11-26T12:00:00Z'),token=sync.sign({t:'company',k:'file',id:'f1'},SECRET,now);
  assert.deepEqual({...sync.verify(token,SECRET,now),exp:0},{t:'company',k:'file',id:'f1',exp:0});
  assert.throws(()=>sync.verify(token,'y'.repeat(40),now),/ungültig/);
  assert.throws(()=>sync.verify(token.replace(/^./,c=>c==='e'?'f':'e'),SECRET,now),/ungültig/);
  assert.throws(()=>sync.verify(token,SECRET,now+25*3600e3),/abgelaufen/);
  assert.throws(()=>sync.sign({t:'company',k:'passwort'},SECRET),/Unbekannte/);
  assert.notEqual(sync.webhookKey(SECRET),SECRET);assert.equal(sync.webhookKey(SECRET).length,40);

  // Namen und Ordner: keine Pfadzeichen, feste Unterordner der Projektvorlage.
  assert.equal(sync.safeName('Sanierung ../Tittmoning: "Dach"/2'),'Sanierung ..-Tittmoning- -Dach-2');assert(!sync.safeName('a/../b').includes('/'));
  assert.equal(sync.safeName('   '),'Ohne Namen');
  assert.equal(sync.projectFolder({id:'p1',data:{name:'Tittmoning'}},sync.config(env)),'/DWP/Projekte/Tittmoning');
  for(const [rec,folder] of [[{module:'documents',data:{category:'Vertrag'}},'Vertraege-NU'],[{module:'documents',data:{category:'Rechnung'}},'Rechnungen'],[{module:'documents',data:{category:'Brief',recipient:'Landratsamt Traunstein'}},'Behoerde'],[{module:'documents',data:{category:'Plan'}},'Plaene-Statik'],[{module:'documents',data:{category:'Angebot'}},'Angebote'],[{module:'documents',data:{category:'Brief'}},'Schriftverkehr'],[{module:'defects',data:{}},'Fotos-Doku'],[{module:'expert',data:{}},'Plaene-Statik']])
    assert.equal(sync.subfolder(rec),folder);
  for(const f of ['Vertraege-NU','Rechnungen','Behoerde','Schriftverkehr','Fotos-Doku','Plaene-Statik'])assert(sync.SUBFOLDERS.includes(f));
  assert.deepEqual(sync.previousMonth('2026-12-01'),{from:'2026-11-01',to:'2026-11-30'});
  assert.deepEqual(sync.previousMonth('2027-01-01'),{from:'2026-12-01',to:'2026-12-31'});
  assert.deepEqual(sync.previousMonth('2028-03-01'),{from:'2028-02-01',to:'2028-02-29'});

  // Make nicht erreichbar: Vorgang in DWP läuft weiter, Fehler wird nur gemeldet.
  const failing=sync.createSync({env,fetchImpl:async()=>{throw Object.assign(Error('down'),{name:'TimeoutError'});}});
  assert.deepEqual(await failing.projectCreated({id:'p',data:{name:'X'}}),{ok:false,error:'Make nicht erreichbar (Zeitüberschreitung).'});

  const pg=new PGlite();
  for(const f of ['001-project-store.sql','002-access-security.sql','003-file-store.sql','005-backups-user-validity.sql'])await pg.exec(fs.readFileSync('migrations/'+f,'utf8'));
  const query=async(s,p)=>(await pg.query(s,p)).rows,repo=repository({query}),files=fileRepository({query}),store=backupStore({query});
  const actor={id:'stephan',name:'Stephan Mangel',role:'admin',tenantId:'company'};
  const oldOwner=process.env.DWP_OWNER_USER_ID;process.env.DWP_OWNER_USER_ID=actor.id;
  const events=[];const audit=()=>({trusted:async()=>true,event:async(a,type,d)=>{events.push({type,...d});}});
  const hook=fakeFetch(),makeSync=()=>sync.createSync({env,fetchImpl:hook});
  const headers={host:'dachwerk.test',origin:'https://dachwerk.test','content-type':'application/json'};
  try {
    // Neues Projekt → Ordner aus Vorlage; Änderung eines bestehenden Projekts → keine Meldung.
    const projects=projectsApi.createHandler({sessionFromRequest:async()=>actor,repository:()=>repo,makeSync});
    const post=async body=>{const r=response();await projects({method:'POST',headers,body:{...body,revision:(await repo.read('company')).state.revision}},r);assert.equal(r.statusCode,200,JSON.stringify(r.body));return r.body;};
    const customer=(await post({method:'save',args:['customers',{name:'von Rüden'}]})).recordId;
    const created=await post({method:'save',args:['projects',{name:'Tittmoning',customerId:customer,phase:'Erfassung'}]});
    assert.equal(hook.calls.length,1);
    assert.deepEqual(hook.calls[0].body,{key:sync.webhookKey(SECRET),action:'folder',path:'/DWP/Projekte/Tittmoning',template:'/DWP/00_Verwaltung/Projektvorlage',project:'Tittmoning'});
    assert.equal(hook.calls[0].url,URL_OK);assert(!JSON.stringify(hook.calls[0]).includes(SECRET),'Secret geht nie an Make');
    const projectId=created.recordId,project=created.state.records.find(r=>r.id===projectId);
    await post({method:'save',args:['projects',{...project.data,name:'Tittmoning'},{id:projectId}]});
    assert.equal(hook.calls.length,1,'bestehendes Projekt löst keinen Ordner aus');

    // Geprüfter Upload → Projektunterordner nach Kategorie, Download über signierten Link.
    const doc=(await execute(repo,actor,{method:'save',args:['documents',{title:'Schreiben LRA',category:'Brief',recipient:'Landratsamt Traunstein',date:'2026-11-26'}],projectId,revision:(await repo.read('company')).state.revision})).recordId;
    const bytes=Buffer.alloc(CHUNK+77,65);Buffer.from('%PDF-1.7\n').copy(bytes);const sha256=createHash('sha256').update(bytes).digest('hex');
    const filesHandler=filesApi.createHandler({sessionFromRequest:async()=>actor,repository:()=>repo,fileRepository:()=>files,accessRepository:audit,makeSync});
    const fcall=async body=>{const r=response();await filesHandler({method:'POST',headers,body:{projectId,recordId:doc,...body}},r);assert.equal(r.statusCode,200,JSON.stringify(r.body));return r.body;};
    const started=await fcall({action:'start',file:{name:'LRA Traunstein.pdf',mime:'application/pdf',size:bytes.length,sha256}});
    for(let part=0;part<started.parts;part++)await fcall({action:'chunk',fileId:started.fileId,part,data:bytes.subarray(part*CHUNK,(part+1)*CHUNK).toString('base64')});
    await fcall({action:'finish',fileId:started.fileId,revision:(await repo.read('company')).state.revision});
    const fileEvent=hook.calls[1].body;
    assert.equal(fileEvent.action,'file');assert.equal(fileEvent.path,'/DWP/Projekte/Tittmoning/Behoerde');assert.equal(fileEvent.fileName,'2026-11-26_LRA Traunstein.pdf');assert.equal(fileEvent.mime,'application/pdf');
    assert.match(fileEvent.url,/^https:\/\/dachwerk\.test\/api\/make-file\?token=/);
    const download=makeFile.createHandler({env,fileRepository:()=>files,backupStore:()=>store,repository:()=>repo,accessRepository:audit,now:()=>Date.now()});
    const get=async url=>{const r=response();const u=new URL(url);await download({method:'GET',url:u.pathname+u.search,query:Object.fromEntries(u.searchParams),headers:{}},r);return r;};
    let r=await get(fileEvent.url);
    assert.equal(r.statusCode,200);assert.equal(r.headers['content-type'],'application/pdf');assert(Buffer.concat(r.chunks).equals(bytes),'Datei unverändert übertragen');
    assert(events.some(e=>e.type==='make_export' && /LRA Traunstein/.test(e.outcome)),'Abruf wird protokolliert');
    r=await get('https://dachwerk.test/api/make-file?token='+encodeURIComponent(sync.sign({t:'company',k:'file',id:started.fileId},'z'.repeat(40))));
    assert.equal(r.statusCode,403,'fremde Signatur');
    r=await get('https://dachwerk.test/api/make-file?token='+encodeURIComponent(sync.sign({t:'anderer-betrieb',k:'file',id:started.fileId},SECRET)));
    assert.equal(r.statusCode,404,'kein Zugriff auf andere Mandanten');
    const disabled=makeFile.createHandler({env:{},fileRepository:()=>files,backupStore:()=>store,repository:()=>repo,accessRepository:audit,now:()=>Date.now()});
    r=response();await disabled({method:'GET',url:new URL(fileEvent.url).pathname+new URL(fileEvent.url).search,query:{token:new URL(fileEvent.url).searchParams.get('token')},headers:{}},r);
    assert.equal(r.statusCode,404,'ohne Einrichtung abgeschaltet');

    // Manuelle Sicherung → /DWP/04_Sicherungen mit Datum/Uhrzeit, Inhalt = DWP-Sicherungsdatei.
    const backups=backupsApi.createHandler({sessionFromRequest:async()=>actor,repository:()=>repo,accessRepository:audit,backupStore:()=>store,makeSync});
    r=response();await backups({method:'POST',headers,body:{action:'create'}},r);assert.equal(r.statusCode,200);
    const backupEvent=hook.calls[2].body;
    assert.equal(backupEvent.path,'/DWP/04_Sicherungen');assert.match(backupEvent.fileName,/^DWP_Sicherung_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/);assert.equal(backupEvent.overwrite,true);
    r=await get(backupEvent.url);assert.equal(r.statusCode,200);
    assert.equal(r.body,(await store.file('company',(await store.list('company'))[0].id)).text,'Sicherungsdatei wie im Modul Sicherung');

    // Täglicher Lauf am Monatsersten: automatische Sicherung + DATEV/Journal des Vormonats.
    await execute(repo,actor,{method:'save',args:['invoices',{number:'DWP-R-202611-0100',date:'2026-11-10',gross:1190,net:1000,tax:19,customer:'von Rüden'}],projectId,revision:(await repo.read('company')).state.revision}).catch(()=>{});
    const before=hook.calls.length;
    const cron=cronApi.createHandler({db:async()=>({query:async(s,p)=>s.includes('dwp_project_state')?[{tenant_id:'company'}]:[]}),repository:()=>repo,backupStore:()=>store,sendMail:async()=>{},now:()=>new Date('2026-12-01T05:15:00Z'),env,makeSync:e=>sync.createSync({env:e,fetchImpl:hook})});
    r=response();await cron({headers:{'user-agent':'vercel-cron/1.0'}},r);
    assert.equal(r.statusCode,200,JSON.stringify(r.body));
    const cronEvents=hook.calls.slice(before).map(c=>c.body);
    assert.deepEqual(cronEvents.map(e=>e.fileName.replace(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}/,'X')),['DachWerkPro_DATEV_Buchungen_2026-11-01_2026-11-30.csv','DachWerkPro_Buchungsjournal_2026-11-01_2026-11-30.csv','DWP_Sicherung_X.json']);
    assert(cronEvents.slice(0,2).every(e=>e.path==='/DWP/03_Buchhaltung/DATEV-Export'));
    assert.deepEqual(r.body.dropbox,['Buchhaltung: übertragen','Sicherung: übertragen']);
    r=await get(cronEvents[0].url);assert.equal(r.statusCode,200);assert(r.body.startsWith('﻿"Umsatz (ohne Soll/Haben-Kz)"'),'DATEV-Kopf wie Modul 30');
    const raw=JSON.stringify((await repo.read('company')).state);
    assert.equal(r.body,sync.accountingCsv(new Store({getItem:()=>raw,setItem(){}}),'datev',{from:'2026-11-01',to:'2026-11-30'}));
    // An anderen Tagen kein Buchhaltungsexport.
    const before2=hook.calls.length;
    const cron2=cronApi.createHandler({db:async()=>({query:async(s)=>s.includes('dwp_project_state')?[{tenant_id:'company'}]:[]}),repository:()=>repo,backupStore:()=>store,sendMail:async()=>{},now:()=>new Date('2026-12-02T05:15:00Z'),env,makeSync:e=>sync.createSync({env:e,fetchImpl:hook})});
    r=response();await cron2({headers:{'user-agent':'vercel-cron/1.0'}},r);
    assert.deepEqual(hook.calls.slice(before2).map(c=>c.body.path),['/DWP/04_Sicherungen']);
    console.log('make-sync ok');
  }finally{process.env.DWP_OWNER_USER_ID=oldOwner;await pg.close();}
})().catch(e=>{console.error(e);process.exit(1);});
