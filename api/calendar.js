// Kalender-Abo (Outlook, iPhone, Google):
//   GET  /kalender/<link>.ics   → iCalendar-Feed, ohne Anmeldung, nur mit gültigem persönlichem Link
//   GET  /api/calendar          → Status des eigenen Links (angemeldet)
//   POST /api/calendar          → {action:'create'} neuer Link (ersetzt den alten), {action:'revoke'} Link sperren
const {sessionFromRequest,authDb}=require('../lib/auth.cjs');
const {repository}=require('../lib/project-repository.cjs');
const feed=require('../lib/calendar-feed.cjs');
const security=require('../lib/access-security.cjs');
function feedToken(req) {
  const fromQuery=req.query?.file;
  const raw=typeof fromQuery==='string'?fromQuery:(String(req.url || '').match(/\/kalender\/([^/?#]+)/) || [])[1] || new URL(req.url || '/','https://x').searchParams.get('file') || '';
  return decodeURIComponent(raw).replace(/\.ics$/i,'');
}
function createHandler(deps={sessionFromRequest,authDb,repository,accessRepository:security.accessRepository}) {
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    try {
      const token=feedToken(req);
      if(req.method==='GET' && token) {
        const db=await deps.authDb(),actor=await feed.owner(db,token);
        if(!actor){res.setHeader('Content-Type','text/plain; charset=utf-8');return res.status(404).end('Kalender-Link ungültig oder gesperrt. Bitte in DachwerkPro, Modul 18, einen neuen Link erstellen.');}
        const {state}=await deps.repository().read(actor.tenantId);
        res.setHeader('Content-Type','text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition','inline; filename="dachwerkpro.ics"');
        res.setHeader('X-Robots-Tag','noindex');
        return res.status(200).end(feed.buildIcs(state,actor,{origin:`https://${req.headers.host}`}));
      }
      res.setHeader('Vary','Cookie');
      const actor=await deps.sessionFromRequest(req);
      const db=await deps.authDb();
      if(req.method==='GET')return res.status(200).json(await feed.info(db,actor));
      if(req.method!=='POST')return res.status(405).setHeader('Allow','GET, POST').end();
      security.sameOrigin(req);
      if(!String(req.headers['content-type'] || '').startsWith('application/json'))throw Object.assign(Error('JSON erforderlich.'),{status:415});
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
      const log=type=>deps.accessRepository().event(actor,type,{module:'personnel',userAgent:req.headers['user-agent']}).catch(()=>{});
      if(body?.action==='create') {
        const created=await feed.create(db,actor);await log('calendar_feed_created');
        return res.status(200).json({...await feed.info(db,actor),url:`https://${req.headers.host}/kalender/${created}.ics`});
      }
      if(body?.action==='revoke'){await feed.revoke(db,actor);await log('calendar_feed_revoked');return res.status(200).json(await feed.info(db,actor));}
      throw Object.assign(Error('Vorgang ungültig.'),{status:422});
    }catch(error) {
      const status=error.status || (error instanceof SyntaxError?400:503);
      return res.status(status).json({error:status<500?error.message:'Kalender-Abo ist gerade nicht verfügbar.'});
    }
  };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
