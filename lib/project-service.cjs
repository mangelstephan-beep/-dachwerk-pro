const {Store,empty}=require('../project-core.js');
const {createHash}=require('node:crypto');
const METHODS=new Set(['save','settings','applyOperatingCosts','issue','stornoInvoice','quote','useQuote','schedule','cancelSchedule','sign','attach','createPurchase','importPositions','importMaterials','restore','advancePhase','reopenProject']);
const APPROVERS=new Set(['admin','manager']);
const PERSONNEL=new Set(['admin','hr']);
function permission(actor, command) {
  if(!actor?.id || !/^[a-zA-Z0-9_-]{1,100}$/.test(actor.tenantId || ''))throw Object.assign(Error('Mandantenzuordnung fehlt.'),{status:403});
  if(!METHODS.has(command.method) || !Array.isArray(command.args))throw Object.assign(Error('Vorgang ungültig.'),{status:400});
  if(actor.role==='viewer' || !['admin','manager','editor','hr'].includes(actor.role))throw Object.assign(Error('Für Änderungen fehlt die Berechtigung.'),{status:403});
  const module=command.method==='save'?command.args[0]:null;
  if((module==='personnel' || ['schedule','cancelSchedule'].includes(command.method)) && !PERSONNEL.has(actor.role) && !(actor.role==='manager' && ['schedule','cancelSchedule'].includes(command.method)))throw Object.assign(Error('Personalberechtigung erforderlich.'),{status:403});
  if(actor.role==='hr' && module!=='personnel' && !['schedule','cancelSchedule'].includes(command.method))throw Object.assign(Error('Berechtigung nur für Personal.'),{status:403});
  if(['restore','settings','applyOperatingCosts'].includes(command.method) && actor.role!=='admin')throw Object.assign(Error('Administratorberechtigung erforderlich.'),{status:403});
  if((['issue','stornoInvoice','useQuote','advancePhase','reopenProject'].includes(command.method) || module && ['Freigegeben','Erledigt'].includes(command.args[2]?.status)) && !APPROVERS.has(actor.role) && !(module==='personnel' && actor.role==='hr'))throw Object.assign(Error('Freigabeberechtigung erforderlich.'),{status:403});
}
function visibleState(state, actor) {
  const copy=require('./access-security.cjs').cleanState(state);
  if(!PERSONNEL.has(actor.role)) {
    copy.records.filter(r=>r.module==='personnel').forEach(r=>{r.data.wage=0;});
    copy.audit=copy.audit.filter(e=>e.module!=='personnel');
  }
  return copy;
}
function ownerArgs(command, actor) {
  const args=JSON.parse(JSON.stringify(command.args));
  if(command.method==='save' && ['Freigegeben','Erledigt'].includes(args[2]?.status))args[2].owner=actor.name || actor.id;
  const ownerIndex={issue:1,stornoInvoice:1,createPurchase:1,importMaterials:1}[command.method];
  if(ownerIndex!==undefined)args[ownerIndex]={...(args[ownerIndex] || {}),owner:actor.name || actor.id};
  if(command.method==='useQuote')args[2]=actor.name || actor.id;
  return args;
}
async function execute(repository, actor, command) {
  permission(actor,command);
  const existing=await repository.read(actor.tenantId);
  if(command.revision!==existing.state.revision)throw Object.assign(Error('Der Bestand wurde geändert. Bitte neu laden und erneut prüfen.'),{status:409});
  if(command.method==='save') {
    const prior=existing.state.records.find(r=>r.id===command.args[2]?.id);
    if((['Freigegeben','Erledigt'].includes(prior?.status) || command.args[0]==='projects' && prior && prior.data.phase!==command.args[1]?.phase || prior?.data.blocking && (!command.args[1]?.blocking || command.args[2]?.status==='Erledigt')) && !APPROVERS.has(actor.role) && !(command.args[0]==='personnel' && actor.role==='hr'))throw Object.assign(Error('Freigabeberechtigung erforderlich.'),{status:403});
  }
  let raw=JSON.stringify(existing.state);
  const model=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});
  if(command.projectId) {
    if(model.get(command.projectId)?.module!=='projects')throw Object.assign(Error('Projekt gehört nicht zum aktuellen Bestand.'),{status:403});
    model.data.selectedProject=command.projectId;
  }
  const count=model.data.audit.length;
  let result;
  try{result=model[command.method](...ownerArgs(command,actor));}catch(error){error.status=error.status || 422;throw error;}
  const events=model.data.audit.slice(count).map(e=>({...e,actor:actor.id,actorName:actor.name,tenantId:actor.tenantId}));
  model.data.audit.splice(count,model.data.audit.length-count,...events);
  const returned=visibleState(model.data,actor);
  const persisted=JSON.parse(JSON.stringify(model.data));persisted.selectedProject=null;
  const ledger={tenantId:actor.tenantId,revision:persisted.revision,actor:actor.id,method:command.method,events,previousHash:existing.hash || ''};
  ledger.hash=createHash('sha256').update(JSON.stringify(ledger)).digest('hex');
  if(!await repository.compareAndSwap(actor.tenantId,command.revision,persisted,ledger))throw Object.assign(Error('Gleichzeitige Änderung erkannt. Der Vorgang wurde nicht gespeichert.'),{status:409});
  // Never return the unredacted model's mutation result to a less privileged role.
  return {state:returned,recordId:result?.id || null,user:{id:actor.id,name:actor.name,role:actor.role}};
}
function memoryRepository() {
  const rows=new Map(),ledger=[];
  return {ledger,async read(tenant){return rows.get(tenant) || {state:empty(),hash:''};},async compareAndSwap(tenant,revision,state,event){const prior=rows.get(tenant);if((prior?.state.revision || 0)!==revision)return false;rows.set(tenant,{state:JSON.parse(JSON.stringify(state)),hash:event.hash});ledger.push(JSON.parse(JSON.stringify(event)));return true;}};
}
module.exports={execute,permission,visibleState,memoryRepository};
