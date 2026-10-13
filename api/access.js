const security=require('../lib/access-security.cjs');
const {sessionFromRequest}=require('../lib/auth.cjs');
const {repository}=require('../lib/project-repository.cjs');
const {projectAccess}=require('../lib/project-service.cjs');
function createHandler(deps={sessionFromRequest,repository,accessRepository:security.accessRepository}) {
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');
  try {
   const actor=await deps.sessionFromRequest(req),audit=deps.accessRepository();
   if(req.method==='GET') {security.owner(actor);return res.status(200).json(await audit.report(actor));}
   if(req.method!=='POST')return res.status(405).setHeader('Allow','GET, POST').end();
   security.sameOrigin(req);
   if(!String(req.headers['content-type'] || '').startsWith('application/json'))throw Object.assign(Error('JSON erforderlich.'),{status:415});
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!body || JSON.stringify(body).length>12000)throw Object.assign(Error('Anfrage ungültig.'),{status:413});
   if(body.action==='module') {
    if(!security.definitions[body.module])throw Object.assign(Error('Modul ungültig.'),{status:422});
    if(body.projectId && !projectAccess(actor,(await deps.repository().read(actor.tenantId)).state.records.find(r=>r.module==='projects' && r.id===body.projectId)))throw Object.assign(Error('Projektmitgliedschaft fehlt.'),{status:403});
    await audit.event(actor,'module_open',{module:body.module,projectId:body.projectId,userAgent:req.headers['user-agent']});return res.status(200).json({ok:true});
   }
   if(body.action==='pair') {
    security.owner(actor);
    if(!/^[a-f0-9]{64}$/.test(body.token || ''))throw Object.assign(Error('Gerätefreigabe ungültig.'),{status:422});
    const token=security.randomBytes(32).toString('hex'),slot=await audit.pair(actor,body.token,token);
    if(!slot)throw Object.assign(Error('Gerätefreigabe ist abgelaufen oder bereits verwendet.'),{status:403});
    await audit.event(actor,'device_paired',{userAgent:req.headers['user-agent']});
    res.setHeader('Set-Cookie',`${security.COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`);
    return res.status(200).json({ok:true,slot});
   }
   if(body.action==='export') {
    await security.requireExport(actor,req,audit);
    const current=await deps.repository().read(actor.tenantId),output=security.exportData(current.state,body);
    await audit.event(actor,'export',{projectId:body.projectId,userAgent:req.headers['user-agent']});
    return res.status(200).json(output);
   }
   if(body.action==='file') {
    const {state}=await deps.repository().read(actor.tenantId),record=state.records.find(r=>r.id===body.recordId && r.projectId===body.projectId);
    if(!projectAccess(actor,state.records.find(r=>r.module==='projects'&&r.id===body.projectId)))throw Object.assign(Error('Projektmitgliedschaft fehlt.'),{status:403});
    const file=record?.attachments?.find(f=>f.id===body.fileId);
    if(file && !file.dataUrl.startsWith('data:image/'))throw Object.assign(Error('Dokumente ausschließlich über Eigentümerexport abrufen.'),{status:403});
    if(!file)throw Object.assign(Error('Datei nicht verfügbar.'),{status:404});
    if(!await audit.consumeFile(actor,file.id))throw Object.assign(Error('Diese Datei wurde für dein Konto bereits einmal angezeigt.'),{status:410});
    await audit.event(actor,'file_view',{projectId:record.projectId,userAgent:req.headers['user-agent']});
    return res.status(200).json({name:file.name,dataUrl:file.dataUrl,watermark:`${actor.name || actor.id} · ${new Date().toISOString()}`,displaySeconds:30});
   }
   throw Object.assign(Error('Vorgang ungültig.'),{status:422});
  }catch(e){return res.status(e.status || (e instanceof SyntaxError?400:503)).json({error:e.status && e.status<500?e.message:'Zugriffsschutz ist noch nicht verfügbar.'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
