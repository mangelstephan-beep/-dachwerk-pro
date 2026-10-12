const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
process.env.ORIGINAL_SESSION_SECRET='original-test-session-key-32-bytes-minimum';
process.env.ORIGINAL_CREDENTIAL_HASH=createHash('sha256').update('Trainer1:test-password').digest('hex');
const handler=require('./api/original.js');
async function call(method='GET',body=null,cookie='',extra={}) {
 const response={statusCode:200,headers:{},body:'',setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},send(v){this.body=v;return this},end(){return this}};
 await handler({method,body,headers:{host:'dachwerk.test',origin:'https://dachwerk.test',cookie,...extra}},response);return response;
}
(async()=>{
 let r=await call();assert.equal(r.statusCode,200);assert.ok(r.body.includes('Original öffnen'));assert.ok(!r.body.includes('data-server-auth="true"'));
 r=await call('POST',{username:'Trainer1',password:'wrong'});assert.equal(r.statusCode,401);assert.equal(r.headers['Set-Cookie'],undefined);
 r=await call('POST',{username:'trainer1',password:'test-password'});assert.equal(r.statusCode,303);assert.equal(r.headers.Location,'/original');const cookie=r.headers['Set-Cookie'].split(';')[0];assert.ok(r.headers['Set-Cookie'].includes('HttpOnly; Secure; SameSite=Lax'));
 r=await call('GET',null,cookie);assert.ok(r.body.includes('data-server-auth="true"'));assert.ok(r.body.includes('/project-core.js'));assert.equal(r.headers['Cache-Control'],'private, no-store');assert.ok(!r.body.includes('original-test-session-key'));
 r=await call('GET',null,cookie.replace(/.$/,'x'));assert.ok(!r.body.includes('data-server-auth="true"'));
 r=await call('GET',null,cookie.replace('dwp_original','dwp_training'));assert.ok(!r.body.includes('data-server-auth="true"'));
 r=await call('POST',{username:'Trainer1',password:'test-password'},'',{origin:'https://other.test'});assert.equal(r.statusCode,403);
 r=await call('POST',{username:'Trainer1',password:'test-password'},'',{'sec-fetch-site':'cross-site'});assert.equal(r.statusCode,403);
 r=await call('DELETE');assert.equal(r.statusCode,405);
 r=await call('POST',{action:'logout'},cookie);assert.equal(r.statusCode,303);assert.ok(r.headers['Set-Cookie'].includes('Max-Age=0'));
 delete process.env.ORIGINAL_SESSION_SECRET;delete process.env.WORKSPACE_SESSION_SECRET;delete process.env.TRAINING_SESSION_SECRET;r=await call();assert.equal(r.statusCode,503);
 console.log('PASS: server login, wrong password, signed HttpOnly session, protected original HTML, forged/cross-scope cookies, origin validation, logout, unavailable configuration.');
})().catch(e=>{console.error(e);process.exit(1)});
