(()=>{
  const backdrop=document.getElementById('password-reset-backdrop');
  const requestForm=document.getElementById('password-reset-request-form');
  const completeForm=document.getElementById('password-reset-complete-form');
  const requestStatus=document.getElementById('password-reset-status');
  const completeStatus=document.getElementById('password-reset-complete-status');
  const token=new URLSearchParams(location.search).get('token');
  const hasResetRoute=location.pathname==='/reset-password';
  function open(complete=false) {
    backdrop.classList.remove('is-hidden');
    requestForm.classList.toggle('is-hidden',complete);
    completeForm.classList.toggle('is-hidden',!complete);
    if(!complete)document.getElementById('password-reset-email').value=document.getElementById('username')?.value||'';
  }
  function close(){backdrop.classList.add('is-hidden')}
  document.getElementById('forgot-password-button')?.addEventListener('click',()=>open(false));
  document.getElementById('password-reset-close')?.addEventListener('click',close);
  document.getElementById('password-reset-cancel')?.addEventListener('click',close);
  if(hasResetRoute && token)open(true);
  requestForm?.addEventListener('submit',async e=>{
    e.preventDefault();requestStatus.textContent='Anfrage wird verarbeitet …';
    const submit=requestForm.querySelector('[type=submit]');submit.disabled=true;
    try{
      const email=document.getElementById('password-reset-email').value.trim();
      const res=await fetch('/api/auth/request-password-reset',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,redirectTo:location.origin+'/reset-password'})
      });
      if(!res.ok)throw Error('Versand derzeit nicht verfügbar. Bitte Administrator kontaktieren.');
      requestStatus.textContent='Falls für diese Adresse ein Konto existiert, erhältst du einen Link zum Zurücksetzen.';
    }catch(err){requestStatus.textContent=err.message}
    finally{submit.disabled=false}
  });
  completeForm?.addEventListener('submit',async e=>{
    e.preventDefault();completeStatus.textContent='Neues Passwort wird gespeichert …';
    const submit=completeForm.querySelector('[type=submit]');submit.disabled=true;
    try{
      const newPassword=document.getElementById('password-reset-new').value;
      const res=await fetch('/api/auth/reset-password',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({newPassword,token})
      });
      if(!res.ok)throw Error('Der Link ist ungültig oder abgelaufen. Bitte neuen Link anfordern.');
      completeStatus.textContent='Passwort geändert. Du kannst dich jetzt anmelden.';
      history.replaceState({},'', '/');
      setTimeout(()=>{close();document.getElementById('password-reset-new').value=''},2000);
    }catch(err){completeStatus.textContent=err.message}
    finally{submit.disabled=false}
  });
})();