const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const handler=require('./api/workspace.js');
process.env.WORKSPACE_SESSION_SECRET=crypto.randomBytes(48).toString('hex');
process.env.WORKSPACE_CREDENTIAL_HASH=crypto.createHash('sha256').update('Trainer1:test-only-password').digest('hex');
async function request(method='GET',body='',cookie='',headers={}) {
 const result={statusCode:200,headers:{},body:''};
 const res={status(code){result.statusCode=code;return this;},setHeader(key,value){result.headers[key.toLowerCase()]=value;return this;},send(body){result.body=body;return this;},end(){return this;}};
 await handler({method,body,headers:{host:'dachwerk.test',cookie,...headers}},res);return result;
}
(async()=>{
 const guest=await request();assert(guest.body.includes('DachWerk Pro · Modultest'));assert(!guest.body.includes('workspace-entry.js'));
 assert.equal(guest.headers['cache-control'],'private, no-store');
 assert.equal((await request('POST','username=Trainer1&password=falsch')).statusCode,401);
 assert.equal((await request('POST','username=Trainer1&password=test-only-password','',{origin:'https://other.test'})).statusCode,403);
 const auth=await request('POST','username=trainer1&password=test-only-password');assert.equal(auth.statusCode,303);assert.equal(auth.headers.location,'/workspace');
 const cookie=auth.headers['set-cookie'];assert(cookie.includes('HttpOnly; Secure; SameSite=Lax'));
 const page=await request('GET','',cookie);assert(page.body.includes('workspace-entry.js'));assert(page.body.includes('project-core.js'));
 const forged=await request('GET','',cookie.replace(/dwp_workspace=\d+\./,'dwp_workspace=9999999999999.'));assert(!forged.body.includes('workspace-entry.js'));
 const logout=await request('POST','action=logout',cookie);assert(logout.headers['set-cookie'].includes('Max-Age=0'));assert.equal(logout.headers.location,'/workspace');
 assert.equal((await request('DELETE')).statusCode,405);
 delete process.env.WORKSPACE_SESSION_SECRET;assert.equal((await request()).statusCode,503);
 console.log('Workspace authentication: server login, invalid credentials, cross-origin rejection, signed secure cookie, protected module page, logout and fail-closed setup passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
