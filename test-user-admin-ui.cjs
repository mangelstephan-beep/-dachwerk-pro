// Oberfläche Benutzerverwaltung und erster Login mit Pflicht-Passwortwechsel.
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {JSDOM}=require(process.env.DWP_TEST_JSDOM || 'jsdom');
const tick=()=>new Promise(r=>setTimeout(r,0));
function boot(withCentral=false,fetchImpl) {
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test/?start=app',runScripts:'outside-only'});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
  if(fetchImpl)w.fetch=fetchImpl;
  for(const f of ['app.js','password-reset.js','module-fixes.js','project-core.js','material-price-import.js','project-workflows.js',...(withCentral?['central-entry.js']:[])])vm.runInContext(fs.readFileSync(f,'utf8'),dom.getInternalVMContext(),{filename:f});
  return w;
}
const json=(status,body)=>({ok:status<400,status,json:async()=>body});
(async()=>{
  // 1) Benutzerverwaltung als Administrator.
  const w=boot(),q=s=>w.document.querySelector('#main-content').querySelector(s);
  const calls=[];
  let list={domain:'dachwerkpro.de',roles:{admin:'Administrator',manager:'Bauleitung',editor:'Mitarbeiter (bearbeiten)',hr:'Personal',viewer:'Mitarbeiter (nur lesen)'},users:[{id:'boss',name:'Stephan Mangel',username:'admin',login:'admin@dachwerkpro.de',role:'admin',blocked:false,mustChangePassword:false,self:true}]};
  w.DWPRemote={active:true,trackModule:async()=>{},users:async()=>list,
    userAction:async body=>{calls.push(body);if(body.action==='create'){list={...list,users:[...list.users,{id:'u9',name:body.name,username:body.username,login:body.username+'@dachwerkpro.de',role:body.role,blocked:false,mustChangePassword:true,self:false}]};return {id:'u9',username:body.username,...list};}
      if(body.action==='block')list.users.find(u=>u.id===body.userId).blocked=true;return {...list};},
    run:async(method,args)=>{calls.push({method,args});w.DWPWorkspace.store[method](...args);return null;}};
  w.eval("state.currentRole='admin'");
  const db=w.DWPWorkspace.store,c=db.save('customers',{name:'K'});
  const p1=db.save('projects',{name:'Teamdach',customerId:c.id,phase:'Erfassung'});db.save('projects',{name:'Anderes Dach',customerId:c.id,phase:'Erfassung'});
  const pe=db.save('personnel',{name:'Peter Meier',number:'P1',employment:'Arbeiter'});
  w.DWPWorkspace.open('users');await tick();await tick();
  assert(q('#dwpu-create'),'Formular Benutzer anlegen');
  assert(q('#dwpu-create [name="password"]').value.length>=12,'Startpasswort-Vorschlag');
  const form=q('#dwpu-create');
  form.elements.name.value='Peter Meier';form.elements.username.value='meier';form.elements.role.value='viewer';form.elements.password.value='Ziegel-Rinne-4821!';
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();await tick();
  assert.equal(calls[0].action,'create');assert.equal(calls[0].username,'meier');
  assert(q('.dwp-credentials').textContent.includes('Ziegel-Rinne-4821!'),'Startpasswort einmal angezeigt');
  assert(q('.dwp-credentials a[href^="https://wa.me/?text="]'),'Zugangsdaten per WhatsApp');
  // Nach dem Anlegen öffnen sich Rechte: Projekt anhaken und Personalsatz verknüpfen.
  const edit=q('#dwpu-edit');assert(edit,'Rechte-Formular geöffnet');
  edit.querySelector(`[name="projectIds"][value="${p1.id}"]`).checked=true;
  edit.elements.personnelId.value=pe.id;edit.elements.allCalendars.checked=true;
  edit.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));for(let i=0;i<5;i++)await tick();
  const access=calls.find(x=>x.method==='setUserAccess');
  assert.deepEqual(JSON.parse(JSON.stringify(access.args)),['u9',{projectIds:[p1.id],personnelId:pe.id,allCalendars:true,hidePhone:false}]);
  assert.equal(db.get(p1.id).data.memberIds,'u9');assert.equal(db.get(pe.id).data.userId,'u9');
  // Sperren.
  q('[data-dwp="user-block"][data-id="u9"]').click();await tick();await tick();
  assert.equal(calls.at(-1).action,'block');assert(q('.dwp-user-card.is-blocked'),'gesperrt markiert');
  assert(!q('[data-dwp="user-block"][data-id="boss"]'),'Admin kann sich nicht selbst sperren');

  // 2) Erster Login: Kurzname wird zur Anmeldeadresse, Startpasswort erzwingt Wechsel.
  const requests=[];let changed=false;
  const v=boot(true,async(url,init={})=>{
    requests.push({url,body:init.body?JSON.parse(init.body):null});
    if(url==='/api/auth/sign-in/email')return json(200,{user:{id:'u9'}});
    if(url==='/api/users')return init.body && JSON.parse(init.body).action==='change-own-password'?(changed=true,json(200,{ok:true})):json(428,{error:'Bitte zuerst ein eigenes Passwort festlegen.'});
    if(url==='/api/projects')return changed?json(200,{state:{schema:1,revision:1,selectedProject:null,settings:{wage:55,agk:0,profit:10,tax:19,company:'D',address:''},records:[],audit:[],calendarScope:'team',calendarEntries:[]},user:{id:'u9',name:'Peter Meier',role:'viewer'}}):json(428,{error:'Bitte zuerst ein eigenes Passwort festlegen.',code:'PASSWORD_CHANGE_REQUIRED'});
    if(url==='/api/access')return json(200,{ok:true});
    return json(404,{error:'unbekannt'});
  });
  for(let i=0;i<5;i++)await tick();
  const d=v.document;
  d.querySelector('#username').value='Meier';d.querySelector('#password').value='Ziegel-Rinne-4821!';
  d.querySelector('#login-form').dispatchEvent(new v.Event('submit',{bubbles:true,cancelable:true}));for(let i=0;i<6;i++)await tick();
  assert.equal(requests.find(r=>r.url==='/api/auth/sign-in/email').body.email,'meier@dachwerkpro.de');
  assert(!d.querySelector('#password-change-form').classList.contains('is-hidden'),'Passwortwechsel wird verlangt');
  assert(d.querySelector('#login-form').classList.contains('is-hidden'));
  d.querySelector('#change-new').value='Mein-eigenes-Passwort-1';d.querySelector('#change-repeat').value='Mein-anderes-Passwort';
  d.querySelector('#password-change-form').dispatchEvent(new v.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.match(d.querySelector('#change-error').textContent,/stimmen nicht/);
  d.querySelector('#change-repeat').value='Mein-eigenes-Passwort-1';
  d.querySelector('#password-change-form').dispatchEvent(new v.Event('submit',{bubbles:true,cancelable:true}));for(let i=0;i<8;i++)await tick();
  const change=requests.find(r=>r.body?.action==='change-own-password').body;
  assert.deepEqual(change,{action:'change-own-password',currentPassword:'Ziegel-Rinne-4821!',newPassword:'Mein-eigenes-Passwort-1'});
  assert(!d.querySelector('#app-shell').classList.contains('is-hidden'),'nach dem Wechsel startet DWP');
  console.log('Benutzerverwaltung-Oberfläche und erster Login bestanden');
})().catch(e=>{console.error(e);process.exitCode=1;});
