const assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {repository}=require('./lib/project-repository.cjs');
const {execute}=require('./lib/project-service.cjs');
(async()=>{
 const pg=new PGlite();
 try {
   await pg.exec(fs.readFileSync('migrations/001-project-store.sql','utf8'));
   const repo=repository({query:async(sql,params)=>(await pg.query(sql,params)).rows});
   const actor={id:'admin1',name:'SQL Admin',role:'admin',tenantId:'tenantA'};
   const first=await execute(repo,actor,{method:'save',args:['customers',{name:'SQL Kunde'}],revision:0});
   assert.equal(first.state.revision,1);
   const read=await repo.read('tenantA');assert.equal(read.state.records[0].data.name,'SQL Kunde');assert.equal(read.hash.length,64);
   assert.equal((await repo.read('tenantB')).state.records.length,0);
   const race={method:'save',args:['customers',{name:'Concurrent'}],revision:1};
   const results=await Promise.allSettled([execute(repo,actor,race),execute(repo,actor,race)]);
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
   assert.equal(results.filter(r=>r.status==='rejected')[0].reason.status,409);
   const audits=await pg.query('SELECT * FROM dwp_project_audit ORDER BY revision');
   assert.equal(audits.rows.length,2);assert.equal(audits.rows[1].previous_hash,audits.rows[0].event_hash);
   assert.equal((await repo.read('tenantA')).state.records.length,2);
   console.log('PostgreSQL engine: actual migration SQL, parameterized persistence, CAS concurrency, tenant isolation and atomic audit insert passed.');
 }finally{await pg.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
