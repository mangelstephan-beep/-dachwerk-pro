(function () {
  // The main application uses authenticated, authoritative server writes.
  // The separate server-rendered modultest page explicitly retains local test mode.
  if(document.querySelector('meta[name="dwp-local-preview"]'))return;
  if(new URLSearchParams(location.search).get('start')==='app' || new URLSearchParams(location.search).has('module') || window.navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches)showLogin();
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
    async uploadFile(recordId,file) {
      if(!active)throw Error('Bitte zuerst anmelden.');
      if(file.size<1 || file.size>67108864)throw Error('Originaldateien bis 64 MB möglich.');
      const bytes=await file.arrayBuffer();
      const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
      const projectId=window.DWPWorkspace.store.data.selectedProject;
      const call=body=>fetch('/api/files',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({recordId,projectId,...body})}).then(responseJson);
      const upload=await call({action:'start',file:{name:file.name,mime:file.type,size:file.size,sha256}});
      for(let part=0;part<upload.parts;part++) {
        const piece=new Uint8Array(bytes.slice(part*upload.chunkSize,(part+1)*upload.chunkSize));
        let raw='';for(let i=0;i<piece.length;i+=8192)raw+=String.fromCharCode(...piece.subarray(i,i+8192));
        await call({action:'chunk',fileId:upload.fileId,part,data:btoa(raw)});
      }
      await call({action:'finish',fileId:upload.fileId,revision});
      await load();
    },
    async originalFile(recordId,fileId) {
      const projectId=window.DWPWorkspace.store.data.selectedProject;
      const call=part=>fetch('/api/files',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'download',recordId,projectId,fileId,part})}).then(responseJson);
      const first=await call(0),parts=[];
      const decode=data=>Uint8Array.from(atob(data.replace(/\s/g,'')),c=>c.charCodeAt(0));
      parts.push(decode(first.data));
      for(let part=1;part<first.parts;part++)parts.push(decode((await call(part)).data));
      const blob=new Blob(parts,{type:first.mime});
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
      if(blob.size!==first.size || hash!==first.sha256)throw Error('Originaldatei ist unvollständig oder beschädigt.');
      return {blob,name:first.name};
    },
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
      busy=true;const shell=document.querySelector('#app-shell');
      shell.setAttribute('aria-busy','true');
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),30000);
      try {
        const payload=await responseJson(await fetch('/api/projects',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,args,revision,projectId:window.DWPWorkspace.store.data.selectedProject}),signal:controller.signal}));
        accept(payload);return payload.recordId?window.DWPWorkspace.store.get(payload.recordId):null;
      }catch(error){
        if(error.name==='AbortError')throw Error('Die Serverantwort dauert zu lange. Der Speicherstand ist unklar. Bitte Serverbestand neu laden, bevor du erneut speicherst.');
        throw error;
      }finally{clearTimeout(timeout);busy=false;shell.inert=false;shell.removeAttribute('aria-busy');}
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
