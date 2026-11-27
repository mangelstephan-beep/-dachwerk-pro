// Modul „Sicherung“ serverseitig: Verlauf nach Datum/Uhrzeit, datierte Datei, Download nur auf
// freigegebenem Gerät, Wiederherstellung aus Verlauf und aus hochgeladener (gepackter) Datei,
// automatische Sicherung vor jeder Wiederherstellung, Rechte. Echtes PostgreSQL (PGlite).
const assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib');
const {PGlite}=require('@electric-sql/pglite');
const {repository}=require('./lib/project-repository.cjs');
const {execute}=require('./lib/project-service.cjs');
const {backupStore}=require('./lib/backup-store.cjs');
const {accessRepository,hash,COOKIE,exportData}=require('./lib/access-security.cjs');
const {createHandler}=require('./api/backups.js');
const {Store,backupFormat}=require('./project-core.js');
function response(){return {statusCode:200,status(n){this.statusCode=n;return this;},setHeader(){return this;},json(v){this.body=v;return this;},end(){return this;}};}
(async()=>{
  const pg=new PGlite(),oldOwner=process.env.DWP_OWNER_USER_ID;process.env.DWP_OWNER_USER_ID='stephan';
  try {
    await pg.exec(fs.readFileSync('migrations/001-project-store.sql','utf8'));await pg.exec(fs.readFileSync('migrations/002-access-security.sql','utf8'));
    const query=async(sql,params)=>(await pg.query(sql,params)).rows;
    const repo=repository({query}),store=backupStore({query}),audit=accessRepository({query});
    const actor={id:'stephan',name:'Stephan Mangel',role:'admin',tenantId:'company'};
    const cmd=async(method,args)=>execute(repo,actor,{method,args,revision:(await repo.read('company')).state.revision});
    const handlerFor=who=>createHandler({sessionFromRequest:async()=>who,repository:()=>repo,accessRepository:()=>audit,backupStore:()=>store});
    async function call(who,body,extra={}){const res=response();await handlerFor(who)({method:body?'POST':'GET',body,headers:{host:'dachwerk.test',origin:'https://dachwerk.test','content-type':'application/json',...extra}},res);return res;}
    const names=async()=>(await repo.read('company')).state.records.filter(r=>r.module==='customers').map(r=>r.data.name).sort();

    // Dateiname und Format.
    assert.equal(backupFormat.fileName(new Date('2026-11-21T05:41:00Z')),'DWP_Sicherung_2026-11-21_06-41.json');
    assert.equal(backupFormat.fileName(new Date('2026-07-01T20:05:00Z')),'DWP_Sicherung_2026-07-01_22-05.json','Sommerzeit');
    assert.throws(()=>backupFormat.unwrap({foo:1}),/keine DachWerkPro-Sicherung/);

    await cmd('save',['customers',{name:'Kunde A'}]);
    // Rechte: nur der Eigentümer.
    assert.equal((await call({...actor,id:'viewer',role:'viewer'})).statusCode,403);
    assert.equal((await call({...actor,id:'zweiter-admin'},{action:'create'})).statusCode,403);
    assert.equal((await call(actor,{action:'create'},{origin:'https://evil.invalid'})).statusCode,403);

    // Sichern: Eintrag mit Datum, Uhrzeit, Ersteller und Umfang.
    let res=await call(actor,{action:'create'});assert.equal(res.statusCode,200);
    const first=res.body.created;
    assert.equal(first.kind,'manuell');assert.equal(first.createdBy,'Stephan Mangel');assert.equal(first.records,1);assert.match(first.fileName,/^DWP_Sicherung_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/);
    assert.equal(res.body.backups.length,1);
    await cmd('save',['customers',{name:'Kunde B'}]);
    assert.deepEqual(await names(),['Kunde A','Kunde B']);

    // Download nur auf freigegebenem Gerät; Datei trägt Datum/Uhrzeit im Namen und Kopf.
    assert.equal((await call(actor,{action:'download',id:first.id})).statusCode,403);
    const pairing='1'.repeat(64),device='2'.repeat(64);
    await query("INSERT INTO dwp_trusted_devices(tenant_id,actor,slot,token_hash) VALUES('company','stephan','iphone',$1)",[hash(device)]);void pairing;
    res=await call(actor,{action:'download',id:first.id},{cookie:`${COOKIE}=${device}`});assert.equal(res.statusCode,200);
    assert.equal(res.body.name,first.fileName);
    const file=JSON.parse(res.body.text);
    assert.equal(file.format,'DachWerkPro-Sicherung');assert.equal(file.createdBy,'Stephan Mangel');assert.equal(file.summary.customers,1);assert.equal(file.createdAt,first.createdAt);
    assert.equal((await call(actor,{action:'download',id:'999'},{cookie:`${COOKIE}=${device}`})).statusCode,404);

    // Wiederherstellen aus dem Verlauf: vorher automatische Sicherung, danach Stand der Sicherung.
    res=await call(actor,{action:'restore',id:first.id});assert.equal(res.statusCode,200);
    assert.deepEqual(await names(),['Kunde A']);
    assert(res.body.state.records.some(r=>r.data.name==='Kunde A') && !res.body.state.records.some(r=>r.data.name==='Kunde B'),'Antwort enthält neuen Bestand');
    const safety=res.body.backups.find(b=>b.kind==='vor Wiederherstellung');assert(safety);assert.equal(safety.records,2);
    assert((await repo.read('company')).state.audit.some(e=>e.action==='Sicherung wiederhergestellt' || JSON.stringify(e).includes('Sicherung wiederhergestellt')),'Logbuch');

    // Rückgängig: die automatische Sicherung wieder einspielen.
    res=await call(actor,{action:'restore',id:safety.id});assert.equal(res.statusCode,200);assert.deepEqual(await names(),['Kunde A','Kunde B']);

    // Aus Datei (Dropbox/Drive): gepackt hochladen, Datum aus der Datei im Verlauf.
    const gzip=zlib.gzipSync(Buffer.from(JSON.stringify(file))).toString('base64');
    res=await call(actor,{action:'upload',gzip});assert.equal(res.statusCode,200);assert.deepEqual(await names(),['Kunde A']);
    const uploaded=res.body.backups.find(b=>b.kind==='hochgeladen');assert.equal(uploaded.sourceCreatedAt,first.createdAt);assert.equal(uploaded.fileName,first.fileName);
    // Ältere Sicherung ohne Kopf (reiner Bestand) wird weiterhin angenommen.
    const old=new Store({getItem:()=>null,setItem(){}});old.save('customers',{name:'Altkunde'});
    res=await call(actor,{action:'upload',text:old.backup()});assert.equal(res.statusCode,200);assert.deepEqual(await names(),['Altkunde']);
    // Kaputte oder fremde Dateien verändern nichts.
    for(const body of [{action:'upload',text:'{"a":1}'},{action:'upload',text:'kein json'},{action:'upload',gzip:'AAAA'},{action:'upload',text:JSON.stringify({...file,state:{...file.state,records:'x'}})}]) {
      res=await call(actor,body);assert.equal(res.statusCode,422,JSON.stringify(res.body));
    }
    assert.deepEqual(await names(),['Altkunde']);
    // Der Arbeitsbestand akzeptiert das neue Dateiformat auch lokal.
    let raw=null;const local=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});local.restore(JSON.stringify(file));
    assert.deepEqual(local.data.records.filter(r=>r.module==='customers').map(r=>r.data.name),['Kunde A']);

    // Verlauf: neueste zuerst, nur eigener Betrieb.
    res=await call(actor);const list=res.body.backups;
    assert(list.length>=6);assert(list.every((b,i)=>i===0 || list[i-1].createdAt>=b.createdAt));
    assert.equal((await call({...actor,tenantId:'anderer'})).body.backups.length,0);
    // Export „Sicherung“ aus dem Zugriffsschutz liefert dasselbe datierte Format.
    const exported=exportData((await repo.read('company')).state,{kind:'backup',createdBy:'Stephan Mangel'});
    assert.match(exported.name,/^DWP_Sicherung_/);assert.equal(JSON.parse(exported.text).format,'DachWerkPro-Sicherung');
    // Aufbewahrung: automatische Sicherungen älter als 35 Tage werden entfernt.
    await query("INSERT INTO dwp_backups(tenant_id,kind,created_at,data) VALUES('company','automatisch',now()-interval '40 days','{}'::jsonb)");
    await store.prune('company');assert.equal((await query("SELECT count(*)::int AS n FROM dwp_backups WHERE created_at<now()-interval '35 days'"))[0].n,0);
    console.log('Sicherung: Verlauf nach Datum/Uhrzeit, datierte Datei für Dropbox/Drive, Gerätefreigabe, Wiederherstellung aus Verlauf und Datei mit Vorab-Sicherung bestanden');
  }finally{await pg.close();if(oldOwner===undefined)delete process.env.DWP_OWNER_USER_ID;else process.env.DWP_OWNER_USER_ID=oldOwner;}
})().catch(e=>{console.error(e);process.exitCode=1;});
