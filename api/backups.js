// Modul „Sicherung“: Sicherungsverlauf nach Datum und Uhrzeit, Sicherung anlegen,
// als datierte Datei für Dropbox/Drive/eigene Cloud herunterladen und wieder einspielen
// (aus dem Verlauf oder aus einer hochgeladenen Datei). Nur der Eigentümer (Administrator).
// Vor jeder Wiederherstellung wird der aktuelle Stand automatisch gesichert.
const zlib=require('node:zlib');
const {sessionFromRequest}=require('../lib/auth.cjs');
const security=require('../lib/access-security.cjs');
const {repository}=require('../lib/project-repository.cjs');
const {execute}=require('../lib/project-service.cjs');
const {backupStore}=require('../lib/backup-store.cjs');
const {Store,backupFormat}=require('../project-core.js');
const {createSync}=require('../lib/make-sync.cjs');
const fail=(status,message)=>Object.assign(Error(message),{status});
function readUpload(body) {
  let text;
  if(typeof body.gzip==='string') {
    if(!/^[A-Za-z0-9+/]+={0,2}$/.test(body.gzip))throw fail(422,'Sicherungsdatei ist beschädigt.');
    try{text=zlib.gunzipSync(Buffer.from(body.gzip,'base64'),{maxOutputLength:256*1024*1024}).toString('utf8');}
    catch{throw fail(422,'Sicherungsdatei ist beschädigt.');}
  }else if(typeof body.text==='string')text=body.text;
  else throw fail(422,'Sicherungsdatei fehlt.');
  let parsed;try{parsed=JSON.parse(text);}catch{throw fail(422,'Diese Datei ist keine DachWerkPro-Sicherung.');}
  let result;try{result=backupFormat.unwrap(parsed);}catch(e){throw fail(422,e.message);}
  try{new Store({getItem:()=>JSON.stringify(result.state),setItem(){}});}catch(e){throw fail(422,'Sicherung ist unvollständig: '+e.message);}
  return result;
}
function createHandler(deps={sessionFromRequest,repository,accessRepository:security.accessRepository,backupStore:()=>backupStore(),makeSync:()=>createSync()}) {
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');
    try {
      const actor=await deps.sessionFromRequest(req);
      security.owner(actor);
      const store=deps.backupStore(),tenant=actor.tenantId,audit=deps.accessRepository();
      const log=(type,outcome)=>audit.event(actor,type,{module:'backup',outcome,userAgent:req.headers['user-agent']}).catch(()=>{});
      if(req.method==='GET')return res.status(200).json({backups:await store.list(tenant)});
      if(req.method!=='POST')return res.status(405).setHeader('Allow','GET, POST').end();
      security.sameOrigin(req);
      if(!String(req.headers['content-type'] || '').startsWith('application/json'))throw fail(415,'JSON erforderlich.');
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
      if(!body || typeof body!=='object')throw fail(400,'Anfrage ungültig.');
      const repo=deps.repository();
      const restore=async(state,outcome)=>{
        const current=await repo.read(tenant);
        await store.create(tenant,actor,current.state,'vor Wiederherstellung');
        const result=await execute(repo,actor,{method:'restore',args:[JSON.stringify(state)],revision:current.state.revision});
        await log('backup_restored',outcome);
        return res.status(200).json({...result,backups:await store.list(tenant)});
      };
      if(body.action==='create') {
        const {state}=await repo.read(tenant),created=await store.create(tenant,actor,state,'manuell');
        await log('backup_created',created.fileName);
        // Datierte Kopie nach Dropbox /DWP/04_Sicherungen (über Make, falls eingerichtet).
        if(deps.makeSync)await deps.makeSync().backupCreated({tenantId:tenant,backup:created}).catch(()=>{});
        return res.status(200).json({created,backups:await store.list(tenant)});
      }
      if(body.action==='download') {
        // Daten verlassen den Server nur auf dem freigegebenen iPhone oder HP-Laptop.
        await security.requireExport(actor,req,audit);
        const file=await store.file(tenant,body.id);
        await log('backup_download',file.name);
        return res.status(200).json(file);
      }
      if(body.action==='restore') {
        const backup=await store.get(tenant,body.id);
        return restore(backup.state,'Sicherung vom '+backupFormat.label(backup.sourceCreatedAt || backup.createdAt));
      }
      if(body.action==='upload') {
        const {state,meta}=readUpload(body);
        await store.create(tenant,actor,state,'hochgeladen',{sourceCreatedAt:meta.createdAt});
        return restore(state,'Datei '+(meta.createdAt?'vom '+backupFormat.label(meta.createdAt):'ohne Datum (ältere Sicherung)'));
      }
      throw fail(422,'Vorgang ungültig.');
    }catch(error) {
      const status=error.status || (error instanceof SyntaxError?400:503);
      return res.status(status).json({error:status<500?error.message:'Sicherung ist gerade nicht verfügbar.'});
    }
  };
}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.readUpload=readUpload;
