const {sessionFromRequest}=require('../lib/auth.cjs');
const {repository}=require('../lib/project-repository.cjs');
const {execute,projectAccess}=require('../lib/project-service.cjs');
const security=require('../lib/access-security.cjs');
const {fileRepository,failure}=require('../lib/file-store.cjs');
function createHandler(deps={sessionFromRequest,repository,fileRepository,accessRepository:security.accessRepository}) {
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Cookie');
  try {
   const actor=await deps.sessionFromRequest(req);
   if(req.method!=='POST')return res.status(405).setHeader('Allow','POST').end();
   security.sameOrigin(req);
   if(!String(req.headers['content-type'] || '').startsWith('application/json'))throw failure('JSON erforderlich.',415);
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!body||JSON.stringify(body).length>750000)throw failure('Dateianfrage zu groß.',413);
   const db=deps.repository(),files=deps.fileRepository(),access=deps.accessRepository();
   const current=await db.read(actor.tenantId);
   const record=current.state.records.find(r=>r.id===body.recordId&&r.projectId===body.projectId);
   if(!record)throw failure('Projektvorgang fehlt.',403);
   if(!projectAccess(actor,current.state.records.find(r=>r.id===record.projectId&&r.module==='projects')))throw failure('Keine Projektmitgliedschaft.',403);
   if(body.action==='start') {
    if(!['admin','manager','editor'].includes(actor.role)||!['documents','expert','defects','diary','acceptance'].includes(record.module))throw failure('Dateiupload nicht zugelassen.',403);
    if(current.state.records.find(r=>r.id===record.projectId)?.data.phase==='Abgeschlossen')throw failure('Abgeschlossenes Projekt zuerst wieder öffnen.');
    return res.status(200).json(await files.start(actor,record,body.file));
   }
   const file=await files.read(actor,body.fileId);
   if(file.record_id!==record.id||file.project_id!==record.projectId)throw failure('Dateizuordnung ungültig.',403);
   if(['chunk','finish'].includes(body.action)) {
    if(!['admin','manager','editor'].includes(actor.role)||file.actor!==actor.id)throw failure('Uploadberechtigung fehlt.',403);
    if(body.action==='chunk')return res.status(200).json(await files.put(actor,file.id,body.part,body.data));
    await files.validate(actor,file.id);
    if(!record.attachments?.some(a=>a.storageId===file.id))await execute(db,actor,{method:'attach',args:[record.id,{id:file.id,storageId:file.id,name:file.name,mime:file.mime,size:file.size,sha256:file.sha256}],projectId:record.projectId,revision:body.revision},{allowStoredFile:true});
    await files.ready(actor,file.id);
    await access.event(actor,'file_uploaded',{projectId:record.projectId,userAgent:req.headers['user-agent']});
    return res.status(200).json({ok:true,fileId:file.id});
   }
   if(body.action==='download') {
    await security.requireExport(actor,req,access);
    if(!record.attachments?.some(a=>a.storageId===file.id))throw failure('Datei noch nicht zugeordnet.',404);
    const output=await files.chunk(actor,file.id,body.part);
    if(body.part===0)await access.event(actor,'file_export',{projectId:record.projectId,userAgent:req.headers['user-agent']});
    return res.status(200).json({...output,name:file.name,mime:file.mime,size:file.size,sha256:file.sha256,parts:Math.ceil(file.size/524288)});
   }
   throw failure('Dateivorgang ungültig.');
  }catch(e){return res.status(e.status || (e instanceof SyntaxError?400:503)).json({error:e.status&&e.status<500?e.message:'Zentrale Dateiablage ist derzeit nicht verfügbar.'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
