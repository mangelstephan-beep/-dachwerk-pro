const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {JSDOM}=require(process.env.DWP_TEST_JSDOM||'jsdom');
const handler=require('./api/training.js');
process.env.TRAINING_SESSION_SECRET=crypto.randomBytes(48).toString('hex');
process.env.TRAINING_CREDENTIAL_HASH=crypto.createHash('sha256').update('Trainer:trainieren').digest('hex');
async function request(method='GET',body='',cookie='',headers={}) {
 const result={statusCode:200,headers:{},body:''};
 const res={status(code){result.statusCode=code;return this},setHeader(key,value){result.headers[key.toLowerCase()]=value;return this},send(body){result.body=body;return this},end(){return this}};
 await handler({method,body,headers:{host:'dachwerk.test',cookie,...headers}},res);return result;
}
(async()=>{
 const guest=await request();assert(guest.body.includes('Dein Trainingszugang'));assert.equal(guest.headers['cache-control'],'private, no-store');
 assert.equal((await request('POST','username=Trainer&password=falsch')).statusCode,401);
 assert.equal((await request('POST','username=Trainer&password=trainieren','',{origin:'https://other.test'})).statusCode,403);
 const auth=await request('POST','username=Trainer&password=trainieren');assert.equal(auth.statusCode,303);assert.equal(auth.headers.location,'/training');const cookie=auth.headers['set-cookie'];assert(cookie.includes('HttpOnly; Secure; SameSite=Lax'));
 const page=await request('GET','',cookie);assert(page.body.includes('id="steps"'));const forged=await request('GET','',cookie.replace(/dwp_training=\d+\./,'dwp_training=9999999999999.'));assert(forged.body.includes('Dein Trainingszugang'));
 assert.equal((await request('DELETE')).statusCode,405);
 const secret=process.env.TRAINING_SESSION_SECRET;delete process.env.TRAINING_SESSION_SECRET;assert.equal((await request()).statusCode,503);process.env.TRAINING_SESSION_SECRET=secret;
 const dom=new JSDOM(page.body,{url:'https://dachwerk.test/training',runScripts:'outside-only'});const w=dom.window;w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.URL.createObjectURL=()=> 'blob:demo';w.URL.revokeObjectURL=()=>{};let download;w.HTMLAnchorElement.prototype.click=function(){download=this.download;};w.eval(fs.readFileSync('demo.js','utf8'));
 const q=s=>w.document.querySelector(s),click=s=>q(s).click();const set=(name,value)=>{const input=q(`[name="${name}"]`);if(input.type==='checkbox')input.checked=value;else input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));};
 assert.equal(w.document.querySelectorAll('[data-step]').length,8);set('customer','Training Musterbetrieb');click('#next');set('project','Mein Testdach');click('#next');
 for(const [key,value] of Object.entries({quantity:100,material:20,minutes:30,hourly:60,agk:10,profit:10}))set(key,value);
 assert(q('#calc-result').textContent.includes('6.050,00'));click('#next');assert(q('#step-content').textContent.includes('Training Musterbetrieb'));set('accepted',true);click('#next');set('measured',110);assert(q('#measurement-result').textContent.includes('6.655,00'));click('#next');set('note','Trainingsbericht');set('checked',true);click('#next');assert(q('#step-content').textContent.includes('7.919,45'));click('#next');set('hours',40);set('actualMaterial',2000);assert(q('#final-result').textContent.includes('2.255,00'));
 const saved=w.localStorage.getItem('dwp-guided-demo-v1');assert(JSON.parse(saved).note==='Trainingsbericht');
 const resumed=new JSDOM(page.body,{url:'https://dachwerk.test/training',runScripts:'outside-only'});resumed.window.localStorage.setItem('dwp-guided-demo-v1',saved);resumed.window.eval(fs.readFileSync('demo.js','utf8'));assert(resumed.window.document.querySelector('#final-result').textContent.includes('2.255,00'));resumed.window.close();
 click('#help-open');assert(q('#help-dialog').open);click('[data-topic="1"]');assert(q('#answer').textContent.includes('ausgeführte Menge'));q('#question').value='Nachkalkulation';q('#question-form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert(q('#answer').textContent.includes('Nettoerlös'));q('#question').value='<img src=x onerror=alert(1)> unbekannt';q('#question-form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert(q('#answer').textContent.includes('noch keine passende Antwort'));assert.equal(q('#answer img'),null);click('#help-close');
 click('[data-step="2"]');set('material',21);click('[data-step="3"]');assert.equal(q('[name=accepted]').checked,false);
 click('[data-step="2"]');set('quantity',-1);click('#next');assert(q('#demo-quantity'));assert.equal(JSON.parse(w.localStorage.getItem('dwp-guided-demo-v1')).quantity,100);set('quantity',100);
 w.localStorage.setItem('dwp-existing-test','keep');click('#reset');assert.equal(w.localStorage.getItem('dwp-existing-test'),'keep');assert.equal(q('[name=customer]').value,'Musterbau Nord (fiktiv)');click('#download');assert.equal(download,'DachWerkPro_Musterprojekt.json');
 const logout=await request('POST','action=logout',cookie);assert(logout.headers['set-cookie'].includes('Max-Age=0'));assert((await request()).body.includes('Dein Trainingszugang'));
 dom.window.close();console.log('PASS: server authentication, wrong credentials, cross-origin rejection, cookie tampering, no-store, logout, 8-step shared data flow, pricing/invoice/result calculations, persistence/resume, FAQ and unknown questions, output escaping, invalid quantities, price-change invalidation, reset isolation, JSON download.');
})().catch(e=>{console.error(e);process.exit(1)});
