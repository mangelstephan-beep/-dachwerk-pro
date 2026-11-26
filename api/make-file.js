// Download-Endpunkt für Make (DWP → Make → Dropbox).
// Make ruft hier mit einem signierten, 24 Stunden gültigen Link die Datei ab, die DWP gemeldet hat:
// geprüft hochgeladene Originaldatei, Serversicherung oder Buchhaltungsexport (DATEV/Journal).
// Kein Login nötig, aber ohne gültige Signatur (DWP_MAKE_SECRET) gibt es nichts. Jeder Abruf
// wird im Zugriffsprotokoll vermerkt. Abgeschaltet, solange die Make-Verbindung nicht eingerichtet ist.
const {config,verify,accountingCsv}=require('../lib/make-sync.cjs');
const {fileRepository}=require('../lib/file-store.cjs');
const {backupStore}=require('../lib/backup-store.cjs');
const {repository}=require('../lib/project-repository.cjs');
const security=require('../lib/access-security.cjs');
const {Store,cp1252}=require('../project-core.js');
const disposition=name=>`attachment; filename="${String(name).replace(/[^\x20-\x7e]/g,'_').replace(/["\\]/g,'_')}"; filename*=UTF-8''${encodeURIComponent(name)}`;
function createHandler(deps={env:process.env,fileRepository,backupStore:()=>backupStore(),repository,accessRepository:security.accessRepository,now:()=>Date.now()}) {
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    res.setHeader('X-Robots-Tag','noindex');
    try {
      if(req.method!=='GET')return res.status(405).setHeader('Allow','GET').end();
      const cfg=config(deps.env);
      if(!cfg.enabled)return res.status(404).json({error:'Nicht verfügbar.'});
      const token=String(req.query?.token || new URL(req.url,'https://x').searchParams.get('token') || '');
      const data=verify(token,cfg.secret,deps.now());
      const actor={id:'make',name:'Make (Dropbox-Ablage)',tenantId:data.t,role:'system'};
      const log=detail=>Promise.resolve().then(()=>deps.accessRepository().event(actor,'make_export',{module:'make',outcome:detail,userAgent:req.headers?.['user-agent']})).catch(()=>{});
      if(data.k==='file') {
        const files=deps.fileRepository(),file=await files.read(actor,data.id,true),parts=Math.ceil(Number(file.size)/524288);
        res.status(200);res.setHeader('Content-Type',file.mime);res.setHeader('Content-Length',String(file.size));res.setHeader('Content-Disposition',disposition(file.name));
        await log('Datei '+file.name);
        for(let part=0;part<parts;part++)res.write(Buffer.from((await files.chunk(actor,file.id,part)).data,'base64'));
        return res.end();
      }
      if(data.k==='backup') {
        const file=await deps.backupStore().file(data.t,data.id);
        await log('Sicherung '+file.name);
        res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Content-Disposition',disposition(file.name));
        return res.status(200).send(file.text);
      }
      if(!/^\d{4}-\d{2}-\d{2}$/.test(data.from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(data.to || ''))throw Object.assign(Error('Link ungültig.'),{status:403});
      const {state}=await deps.repository().read(data.t);
      const raw=JSON.stringify(state),store=new Store({getItem:()=>raw,setItem(){}});
      if(data.k==='extf') {
        const file=store.datevExport({from:data.from,to:data.to});
        await log('DATEV-Buchungsstapel '+data.from+' bis '+data.to);
        res.setHeader('Content-Type','text/csv; charset=windows-1252');res.setHeader('Content-Disposition',disposition(file.fileName));
        return res.status(200).send(Buffer.from(cp1252(file.text)));
      }
      const text=accountingCsv(store,data.k,{from:data.from,to:data.to});
      await log((data.k==='datev'?'DATEV-Export ':'Buchungsjournal ')+data.from+' bis '+data.to);
      res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',disposition('DachWerkPro_'+data.k+'_'+data.from+'_'+data.to+'.csv'));
      return res.status(200).send(text);
    }catch(error) {
      if(res.headersSent)return res.end();
      const status=error.status && error.status<500?error.status:503;
      return res.status(status).json({error:status<500?error.message:'Datei derzeit nicht verfügbar.'});
    }
  };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
