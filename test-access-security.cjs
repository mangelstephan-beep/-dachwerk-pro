const fs=require('node:fs'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {accessRepository,hash,COOKIE,cleanState}=require('./lib/access-security.cjs');
const {repository}=require('./lib/project-repository.cjs');
const {execute,visibleState}=require('./lib/project-service.cjs');
const {createHandler}=require('./api/access.js');
const {modules}=require('./project-core.js');
function response(){return {statusCode:200,headers:{},status(n){this.statusCode=n;return this;},setHeader(k,v){this.headers[k]=v;return this;},json(v){this.body=v;return this;},end(){return this;}};}
(async()=>{
 const pg=new PGlite(),oldOwner=process.env.DWP_OWNER_USER_ID;process.env.DWP_OWNER_USER_ID='stephan';
 try {
  await pg.exec(fs.readFileSync('migrations/001-project-store.sql','utf8'));await pg.exec(fs.readFileSync('migrations/002-access-security.sql','utf8'));
  const query=async(sql,params)=>(await pg.query(sql,params)).rows;
  const audit=accessRepository({query}),repo=repository({query});
  const actor={id:'stephan',name:'Stephan Mangel',role:'admin',tenantId:'company'};
  async function cmd(method,args,projectId){return execute(repo,actor,{method,args,projectId,revision:(await repo.read(actor.tenantId)).state.revision});}
  const c=await cmd('save',['customers',{name:'AG'}]);const p=await cmd('save',['projects',{name:'Dach',customerId:c.recordId,phase:'Erfassung'}]);
  const d=await cmd('save',['documents',{title:'Bild',category:'Foto'}],p.recordId);
  await cmd('attach',[d.recordId,{name:'dach.png',dataUrl:'data:image/png;base64,eA=='}],p.recordId);
  const state=(await repo.read(actor.tenantId)).state,file=state.records.find(r=>r.id===d.recordId).attachments[0];
  assert(!JSON.stringify(visibleState(state,actor)).includes('data:image/'),'GET and audit snapshots contain no image bytes');
  assert.equal(cleanState({nested:{dataUrl:'secret',name:'image'}}).nested.name,'image');
  const handlerFor=who=>createHandler({sessionFromRequest:async()=>who,repository:()=>repo,accessRepository:()=>audit});
  async function request(who,body,extra={}){const res=response();await handlerFor(who)({method:'POST',body,headers:{host:'dachwerk.test',origin:'https://dachwerk.test','content-type':'application/json',...extra}},res);return res;}
  const viewer={...actor,id:'viewer',name:'Gast',role:'viewer'};
  assert.equal((await request(viewer,{action:'export',kind:'backup'})).statusCode,403);
  assert.equal((await request({...actor,id:'second-admin'},{action:'export',kind:'backup'})).statusCode,403);
  assert.equal((await request(actor,{action:'export',kind:'backup'})).statusCode,403);
  const pairing='1'.repeat(64);
  await query("INSERT INTO dwp_device_pairings(token_hash,tenant_id,actor,slot,expires_at) VALUES($1,$2,$3,'iphone',now()+interval '10 minutes')",[hash(pairing),actor.tenantId,actor.id]);
  assert.equal((await request(viewer,{action:'pair',token:pairing})).statusCode,403);
  const paired=await request(actor,{action:'pair',token:pairing});assert.equal(paired.statusCode,200);assert.equal(paired.body.slot,'iphone');
  const cookie=paired.headers['Set-Cookie'].split(';')[0];assert(paired.headers['Set-Cookie'].includes('HttpOnly'));assert(paired.headers['Set-Cookie'].includes('Secure'));assert(paired.headers['Set-Cookie'].includes('SameSite=Strict'));
  assert.equal((await request(actor,{action:'pair',token:pairing})).statusCode,403,'Pair code is single-use');
  const exported=await request(actor,{action:'export',kind:'backup'},{cookie});assert.equal(exported.statusCode,200);assert(exported.body.text.includes('data:image/png'));
  assert.equal((await request(actor,{action:'export',kind:'backup'},{cookie:`${COOKIE}=${'0'.repeat(64)}`})).statusCode,403);
  assert.equal((await request({...actor,tenantId:'other'},{action:'export',kind:'backup'},{cookie})).statusCode,403);
  const body={action:'file',recordId:d.recordId,fileId:file.id,projectId:p.recordId};
  const results=await Promise.all([request(viewer,body),request(viewer,body)]);
  assert.equal(results.filter(r=>r.statusCode===200).length,1,'Concurrent image fetch delivers once');assert.equal(results.filter(r=>r.statusCode===410).length,1);
  assert(results.find(r=>r.statusCode===200).body.watermark.includes('Gast'));
  assert.equal((await request(viewer,body)).statusCode,410);
  assert.equal((await request({...viewer,tenantId:'other'},body)).statusCode,404);
  for(const mod of modules)assert.equal((await request(viewer,{action:'module',module:mod.id,projectId:p.recordId})).statusCode,200);
  assert.equal((await request(viewer,{action:'module',module:'invented'})).statusCode,422);
  assert.equal((await request(viewer,{action:'module',module:'lv',projectId:'foreign'})).statusCode,403);
  await pg.exec('CREATE TABLE IF NOT EXISTS "user"(id text PRIMARY KEY,name text,"tenantId" text)');
  await query('INSERT INTO "user"(id,name,"tenantId") VALUES($1,$2,$3)',[actor.id,actor.name,actor.tenantId]);
  await require('./lib/auth.cjs').auditSessionLogin({query:async(sql,params)=>pg.query(sql,params)},{userId:actor.id,userAgent:'Synthetic iPhone test'});
  const report=response();await handlerFor(actor)({method:'GET',headers:{}},report);assert.equal(report.statusCode,200);assert.equal(report.body.usage.length,36);assert(report.body.events.some(e=>e.event_type==='login' && e.actor==='stephan'));
  const denied=response();await handlerFor(viewer)({method:'GET',headers:{}},denied);assert.equal(denied.statusCode,403);
  assert.equal((await request(actor,{action:'export',kind:'backup'},{cookie,origin:'https://evil.invalid'})).statusCode,403);
  const failClosed=createHandler({sessionFromRequest:async()=>actor,repository:()=>repo,accessRepository:()=>{throw Error('secret database value');}}),failure=response();
  await failClosed({method:'GET',headers:{}},failure);assert.equal(failure.statusCode,503);assert(!failure.body.error.includes('secret'));
  await query("UPDATE dwp_trusted_devices SET paired_at=now()-interval '31 days'",[]);
  assert.equal((await request(actor,{action:'export',kind:'backup'},{cookie})).statusCode,403,'Device trust expires server-side');
  console.log('Access security SQL: owner/two-slot device export policy, replay/forgery/tenant/expiry denial, no embedded image leakage, atomic once-only viewing, 36 usage counters, login audit, private reports, origin and fail-closed checks passed.');
 }finally{if(oldOwner===undefined)delete process.env.DWP_OWNER_USER_ID;else process.env.DWP_OWNER_USER_ID=oldOwner;await pg.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
