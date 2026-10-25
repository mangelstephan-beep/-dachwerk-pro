const {randomBytes,createHash}=require('node:crypto');
const {definitions}=require('../project-core.js');
const COOKIE='__Host-dwp-device';
const hash=s=>createHash('sha256').update(s).digest('hex');
function owner(actor) {
 if(!process.env.DWP_OWNER_USER_ID || actor.id!==process.env.DWP_OWNER_USER_ID || actor.role!=='admin')throw Object.assign(Error('Nur Stephan darf Daten exportieren oder Zugriffsprotokolle lesen.'),{status:403});
}
function sameOrigin(req) {
 const h=req.headers || {},expected=`${process.env.NODE_ENV==='development'?'http':'https'}://${h.host}`;
 if(h.origin!==expected || h['sec-fetch-site']==='cross-site')throw Object.assign(Error('Ungültiger Anfrageursprung.'),{status:403});
}
function deviceToken(req) {
 const value=String(req.headers?.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 return /^[a-f0-9]{64}$/.test(value || '')?value:null;
}
function accessRepository({query}={}) {
 if(!query && !process.env.DATABASE_URL)throw Object.assign(Error('Zugriffsschutz noch nicht eingerichtet.'),{status:503});
 const sql=query?{query}:require('@neondatabase/serverless').neon(process.env.DATABASE_URL);
 return {
  async event(actor,type,details={}) {
   await sql.query('INSERT INTO dwp_access_events(tenant_id,actor,actor_name,event_type,module_id,project_id,outcome,user_agent) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[actor.tenantId,actor.id,actor.name || '',type,details.module || null,details.projectId || null,details.outcome || 'ok',String(details.userAgent || '').slice(0,300)]);
  },
  async trusted(actor,token) {
   if(!token)return false;
   return (await sql.query("SELECT slot FROM dwp_trusted_devices WHERE tenant_id=$1 AND actor=$2 AND token_hash=$3 AND paired_at>now()-interval '30 days'",[actor.tenantId,actor.id,hash(token)])).length===1;
  },
  async pair(actor,pairToken,deviceSecret) {
   const rows=await sql.query(`WITH used AS (
    UPDATE dwp_device_pairings SET consumed_at=now() WHERE token_hash=$1 AND tenant_id=$2 AND actor=$3 AND consumed_at IS NULL AND expires_at>now() RETURNING slot
   ) INSERT INTO dwp_trusted_devices(tenant_id,actor,slot,token_hash) SELECT $2,$3,slot,$4 FROM used
     ON CONFLICT(tenant_id,actor,slot) DO UPDATE SET token_hash=EXCLUDED.token_hash,paired_at=now() RETURNING slot`,[hash(pairToken),actor.tenantId,actor.id,hash(deviceSecret)]);
   return rows[0]?.slot;
  },
  async consumeFile(actor,fileId) {
   const rows=await sql.query('INSERT INTO dwp_file_views(tenant_id,actor,file_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING file_id',[actor.tenantId,actor.id,fileId]);
   return rows.length===1;
  },
  async report(actor) {
   const events=await sql.query('SELECT actor,actor_name,event_type,module_id,project_id,outcome,user_agent,created_at FROM dwp_access_events WHERE tenant_id=$1 ORDER BY created_at DESC,id DESC LIMIT 200',[actor.tenantId]);
   const usage=await sql.query("SELECT actor,actor_name,module_id,count(*)::int AS opens,max(created_at) AS last_used FROM dwp_access_events WHERE tenant_id=$1 AND event_type='module_open' AND created_at>=now()-interval '30 days' GROUP BY actor,actor_name,module_id ORDER BY opens DESC",[actor.tenantId]);
   const devices=await sql.query('SELECT slot,paired_at FROM dwp_trusted_devices WHERE tenant_id=$1 AND actor=$2',[actor.tenantId,actor.id]);
   return {events,usage,devices,periodDays:30};
  }
 };
}
async function requireExport(actor,req,repo) {
 owner(actor);
 if(!await repo.trusted(actor,deviceToken(req))) {
  await repo.event(actor,'export_denied',{userAgent:req.headers?.['user-agent'],outcome:'untrusted_device'});
  throw Object.assign(Error('Export nur auf dem freigegebenen iPhone oder HP-Laptop.'),{status:403});
 }
}
function cleanState(state) {
 // No file bytes in GET state, audit before/after snapshots, or mutation responses.
 const clean=value=>{
  if(Array.isArray(value))return value.map(clean);
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!['dataUrl','originalWorkbook','base64'].includes(k)).map(([k,v])=>[k,clean(v)]));
  return value;
 };
 return clean(state);
}
function exportData(state,body) {
 if(body.kind==='backup')return {name:'DachWerkPro_Sicherung.json',type:'application/json',text:JSON.stringify(state,null,2)};
 if(body.kind==='register')return {name:'DWP_Modul37_Register.csv',type:'text/csv',text:require('./document-register.cjs').csv(state,{projectId:body.projectId||undefined})};
 const project=state.records.find(r=>r.id===body.projectId && r.module==='projects');
 if(!project)throw Object.assign(Error('Projekt fehlt.'),{status:422});
 if(body.kind==='project')return {name:'DachWerkPro_Projektakte.json',type:'application/json',text:JSON.stringify({project,customer:state.records.find(r=>r.id===project.data.customerId),records:state.records.filter(r=>r.projectId===project.id)},null,2)};
 if(['record','positions'].includes(body.kind)) {
  const record=state.records.find(r=>r.id===body.recordId && r.projectId===project.id);
  if(!record)throw Object.assign(Error('Beleg fehlt.'),{status:422});
  return {name:'DachWerkPro_Beleg.json',type:'application/json',text:JSON.stringify(record,null,2),record};
 }
 if(body.kind==='closing')return {name:'DachWerkPro_Belege.json',type:'application/json',text:JSON.stringify(state.records.filter(r=>r.projectId===project.id && ['incoming','invoices','payments','times','subcontracts'].includes(r.module)),null,2)};
 if(body.kind==='calculation') {
  const {Store}=require('../project-core.js');let raw=JSON.stringify({...state,selectedProject:project.id});
  const model=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});
  return {name:'DachWerkPro_Kalkulation.json',type:'application/json',text:JSON.stringify(model.calculation(),null,2),positions:model.calculation().positions};
 }
 throw Object.assign(Error('Exportart ungültig.'),{status:422});
}
module.exports={accessRepository,owner,sameOrigin,deviceToken,requireExport,cleanState,exportData,COOKIE,hash,randomBytes,definitions};
