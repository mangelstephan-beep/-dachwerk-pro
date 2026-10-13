(function () {
  // The main application uses authenticated, authoritative server writes.
  // The separate server-rendered modultest page explicitly retains local test mode.
  if(document.querySelector('meta[name="dwp-local-preview"]'))return;
  if(new URLSearchParams(location.search).get('start')==='app' || window.navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches)showLogin();
  let active=false,busy=false,revision=0;
  async function responseJson(response) {
    const body=await response.json();
    if(!response.ok)throw Error(body.error?.message || body.error || body.message || 'Anfrage konnte nicht abgeschlossen werden.');
    return body;
  }
  function accept(payload) {
    revision=payload.state.revision;active=true;
    state.currentUser=payload.user.name || payload.user.id;
    state.currentRole=payload.user.role;
    document.querySelector('#profile-button .profile-copy strong').textContent=state.currentUser;
    document.querySelector('#profile-button .profile-copy small').textContent=payload.user.role;
    document.querySelector('#profile-button .avatar').textContent=state.currentUser.split(/\s+/).map(s=>s[0]).slice(0,2).join('');
    window.DWPWorkspace.acceptServerState(payload.state,payload.user);
  }
  async function load() {
    accept(await responseJson(await fetch('/api/projects',{credentials:'same-origin',cache:'no-store'})));
  }
  async function access(body) {return responseJson(await fetch('/api/access',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));}
  window.DWPRemote={
    trackModule(module,projectId){return access({action:'module',module,projectId});},
    accessReport(){return fetch('/api/access',{credentials:'same-origin',cache:'no-store'}).then(responseJson);},
    pair(token){return access({action:'pair',token});},
    export(options){return access({action:'export',...options});},
    file(options){return access({action:'file',...options});},
    get active(){return active;},
    async login(email,password) {
      await responseJson(await fetch('/api/auth/sign-in/email',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}));
      await load();
    },
    async logout() {
      await responseJson(await fetch('/api/auth/sign-out',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'}));
      active=false;window.location.reload();
    },
    async run(method,args) {
      if(!active)throw Error('Bitte zuerst anmelden.');
      if(busy)throw Error('Der vorherige Vorgang wird noch gespeichert.');
      busy=true;const shell=document.querySelector('#app-shell');shell.inert=true;
      try {
        const payload=await responseJson(await fetch('/api/projects',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,args,revision,projectId:window.DWPWorkspace.store.data.selectedProject})}));
        accept(payload);return payload.recordId?window.DWPWorkspace.store.get(payload.recordId):null;
      }finally{busy=false;shell.inert=false;}
    },
    async reload(){await load();window.DWPWorkspace.open('dashboard');}
  };
  document.querySelector('#login-form').addEventListener('submit',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    const error=document.querySelector('#login-error');error.textContent='Anmeldung wird geprüft …';
    try{await window.DWPRemote.login(document.querySelector('#username').value.trim(),document.querySelector('#password').value);document.querySelector('#password').value='';error.textContent='';startApp();}catch(e){error.textContent=e.message;}
  },true);
  document.querySelector('#logout-button').addEventListener('click',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    if(!confirmPageChange())return;
    try{await window.DWPRemote.logout();}catch(e){showToast('Abmeldung fehlgeschlagen',e.message);}
  },true);
  // Cookie sessions can resume only after the server confirms access to the tenant.
  load().then(()=>startApp()).catch(()=>{});
})();
