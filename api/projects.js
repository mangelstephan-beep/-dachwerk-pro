const {sessionFromRequest}=require('../lib/auth.cjs');
const {repository}=require('../lib/project-repository.cjs');
const {execute,visibleState}=require('../lib/project-service.cjs');
function createHandler(deps={sessionFromRequest,repository}) {
  return async function(req,res) {
    res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Cookie');
    try {
      const actor=await deps.sessionFromRequest(req);
      if(!actor.tenantId)throw Object.assign(Error('Mandant fehlt.'),{status:403});
      const db=deps.repository();
      if(req.method==='GET') {
        const current=await db.read(actor.tenantId);
        return res.status(200).json({state:visibleState(current.state,actor),user:{id:actor.id,name:actor.name,role:actor.role}});
      }
      if(req.method!=='POST')return res.status(405).setHeader('Allow','GET, POST').end();
      const origin=req.headers.origin,host=req.headers.host;
      if(!origin || origin!==`https://${host}` && !(process.env.NODE_ENV==='development' && origin===`http://${host}`) || req.headers['sec-fetch-site']==='cross-site')throw Object.assign(Error('Ungültiger Anfrageursprung.'),{status:403});
      if(!String(req.headers['content-type'] || '').startsWith('application/json'))throw Object.assign(Error('JSON-Anfrage erforderlich.'),{status:415});
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
      if(!body || JSON.stringify(body).length>3_500_000)throw Object.assign(Error('Vorgang zu groß oder ungültig.'),{status:413});
      return res.status(200).json(await execute(db,actor,body));
    }catch(error) {
      const status=error.status || (error instanceof SyntaxError?400:503);
      return res.status(status).json({error:status>=500?'Zentrale Speicherung ist noch nicht verfügbar.':error.message});
    }
  };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
