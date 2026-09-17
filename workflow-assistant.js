(() => {
  const main = document.querySelector('#main-content');
  if (!main) return;

  const PERSONNEL_KEY = 'dwp-personnel-v1';
  const MATERIAL_KEY = 'dwp-material-db-v1';
  const esc = (v) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const num = (v) => Number(String(v ?? '').replace(/\./g,'').replace(',','.')) || 0;
  const money = (v) => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(num(v));
  const read = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const uid = (p='id') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

  const viewAliases = {
    'übersicht':'dashboard','dashboard':'dashboard','kunden':'customers','kunde':'customers','projekte':'projects','projekt':'projects',
    'leistungen':'services','leistung':'services','preise':'prices','preisliste':'prices','material':'prices','materialdatenbank':'prices',
    'kalkulation':'calculation','lv':'calculation','leistungsverzeichnis':'calculation','gaeb':'gaeb','aufmaß':'measurements','drohne':'measurements',
    'sicherheit':'safety','gefährdungscheck':'safety','bautenstand':'site-docs','dokumentation':'site-docs','mängel':'defects','dokumente':'documents',
    'mail':'documents','rechnungen':'invoices','eingangsrechnungen':'invoices','kommunikation':'communication','analyse':'ai-check','fehlercheck':'ai-check',
    'sachverständigenwesen':'expert','gutachten':'expert','energieberatung':'energy','regelwerk':'rules','vertragsgrundlagen':'rules','hilfe':'help',
    'anwender':'users','benutzer':'users','einstellungen':'settings'
  };

  function toast(title, text){
    const region=document.querySelector('#toast-region'); if(!region) return;
    const el=document.createElement('div'); el.className='toast';
    el.innerHTML=`<span class="toast-mark">✓</span><div><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`;
    region.append(el); setTimeout(()=>el.remove(),3600);
  }

  function go(view){
    const btn=document.querySelector(`.nav-item[data-view="${CSS.escape(view)}"]`);
    if(btn){ btn.click(); return true; }
    return false;
  }

  function pageShell(title, subtitle, body, actions=''){
    return `<section class="page" data-page="workflow-custom">
      <header class="page-header"><div><span class="eyebrow">DachWerk Pro · Arbeitsbereich</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="header-actions">${actions}</div></header>
      <nav class="page-navigation"><button class="page-nav-button" data-wa-home>⌂ Übersicht</button></nav>${body}</section>`;
  }

  function renderPersonnel(newRecord=false){
    const rows=read(PERSONNEL_KEY,[]);
    const form=`<section class="panel panel-pad" style="margin-bottom:16px"><div class="panel-head"><div><h2>${newRecord?'Personal anlegen':'Personal erfassen / bearbeiten'}</h2><p>Stammdaten lokal in DachWerk Pro speichern.</p></div></div>
      <form data-personnel-form class="quick-form" style="margin-top:14px">
        <div><label>Personal-Nr.</label><input name="number" placeholder="P-001"></div>
        <div><label>Name</label><input name="name" required placeholder="Vor- und Nachname"></div>
        <div><label>Funktion</label><input name="role" placeholder="Dachdecker / Bauleiter / Verwaltung"></div>
        <div><label>Stundenlohn</label><input name="wage" inputmode="decimal" placeholder="0,00"></div>
        <div><label>Telefon</label><input name="phone"></div>
        <div><label>E-Mail</label><input name="email"></div>
        <div class="field-span"><label>Notiz</label><textarea name="note" rows="3"></textarea></div>
        <div class="field-span"><button class="button button-primary" type="submit">Personal speichern</button></div>
      </form></section>`;
    const table=`<section class="panel"><div class="panel-head"><div><h2>Personalordner</h2><p>${rows.length} Datensätze</p></div></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Nr.</th><th>Name</th><th>Funktion</th><th>Stundenlohn</th><th>Kontakt</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.number)}</td><td><strong>${esc(r.name)}</strong></td><td>${esc(r.role)}</td><td>${money(r.wage)}</td><td>${esc(r.phone||r.email||'')}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">Noch kein Personal angelegt.</td></tr>'}</tbody></table></div></section>`;
    main.innerHTML=pageShell('Personal','Personalordner, Stammdaten und Lohnbasis.',form+table);
    main.querySelector('[data-personnel-form]')?.addEventListener('submit',e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); const list=read(PERSONNEL_KEY,[]); list.push({id:uid('person'),number:fd.get('number')||'',name:fd.get('name')||'',role:fd.get('role')||'',wage:num(fd.get('wage')),phone:fd.get('phone')||'',email:fd.get('email')||'',note:fd.get('note')||'',createdAt:new Date().toISOString()}); write(PERSONNEL_KEY,list); toast('Personal gespeichert',`${fd.get('name')} wurde angelegt.`); renderPersonnel(false);});
    bindHome();
  }

  function parsePastedPrices(text){
    return String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(line=>{
      const cells=line.split(/\t|;|\s{2,}/).map(x=>x.trim()).filter(Boolean);
      if(cells.length<2) return null;
      const priceIndex=[...cells].reverse().findIndex(x=>/^-?[\d.]+,?\d*$/.test(x));
      const idx=priceIndex<0?-1:cells.length-1-priceIndex;
      if(idx<1) return null;
      const price=num(cells[idx]);
      const product=cells.slice(0,idx).join(' ');
      return {id:uid('mat'),product,manufacturer:'',supplier:'',unit:'',price,searchTerms:product.toLowerCase(),updatedAt:new Date().toISOString()};
    }).filter(Boolean);
  }

  function renderPrices(focusPaste=false){
    const materials=read(MATERIAL_KEY,[]);
    const body=`<div class="dashboard-grid"><div class="dashboard-main">
      <section class="panel panel-pad"><div class="panel-head"><div><h2>Preisliste einpflegen</h2><p>Zeilen aus Excel, PDF-Tabellen oder Lieferantenlisten direkt einkopieren.</p></div></div>
        <textarea data-price-paste rows="8" style="width:100%;margin-top:12px" placeholder="Beispiel:\nBauder PYE PV 200 S5    7,85\nSoprema Elastomerbahn    8,20"></textarea>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="button button-primary" data-price-import>Preise übernehmen</button><button class="button button-secondary" data-price-add>Material einzeln anlegen</button></div>
      </section>
      <section class="panel panel-pad" data-single-material style="display:none;margin-top:16px"><div class="quick-form">
        <div><label>Hersteller</label><input data-mat="manufacturer"></div><div><label>Produkt</label><input data-mat="product"></div><div><label>Lieferant</label><input data-mat="supplier"></div><div><label>Einheit</label><input data-mat="unit" placeholder="m² / Stk / kg"></div><div><label>Preis netto</label><input data-mat="price"></div><div><label>Suchbegriffe</label><input data-mat="searchTerms"></div><div class="field-span"><button class="button button-primary" data-material-save>Material speichern</button></div>
      </div></section>
      <section class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>Materialdatenbank</h2><p>${materials.length} Preisdatensätze</p></div></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Hersteller</th><th>Produkt</th><th>Lieferant</th><th>Einheit</th><th>Preis netto</th></tr></thead><tbody>${materials.map(m=>`<tr><td>${esc(m.manufacturer||'')}</td><td><strong>${esc(m.product||m.name||'')}</strong></td><td>${esc(m.supplier||'')}</td><td>${esc(m.unit||'')}</td><td>${money(m.price??m.ek??0)}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">Noch keine Materialien hinterlegt.</td></tr>'}</tbody></table></div></section>
    </div><aside class="dashboard-side"><section class="panel panel-pad"><span class="eyebrow">Verknüpft</span><h2 class="section-title">LV-Kalkulation</h2><p class="muted">Gespeicherte Preise stehen dem automatischen Materialabgleich im LV zur Verfügung.</p></section></aside></div>`;
    main.innerHTML=pageShell('Preis- & Materialdatenbank','Preise eingeben, einkopieren und für LV-Kalkulationen bereitstellen.',body);
    const paste=main.querySelector('[data-price-paste]'); if(focusPaste) setTimeout(()=>paste?.focus(),0);
    main.querySelector('[data-price-import]')?.addEventListener('click',()=>{const added=parsePastedPrices(paste.value); if(!added.length){toast('Keine Preise erkannt','Bitte Produkt und Preis zeilenweise einfügen.');return;} const db=read(MATERIAL_KEY,[]); db.push(...added); write(MATERIAL_KEY,db); toast('Preisliste übernommen',`${added.length} Materialpreise wurden gespeichert.`); renderPrices(false);});
    main.querySelector('[data-price-add]')?.addEventListener('click',()=>{main.querySelector('[data-single-material]').style.display='block';});
    main.querySelector('[data-material-save]')?.addEventListener('click',()=>{const get=(f)=>main.querySelector(`[data-mat="${f}"]`)?.value||''; const product=get('product').trim(); if(!product){toast('Produkt fehlt','Bitte Produktbezeichnung eingeben.');return;} const db=read(MATERIAL_KEY,[]); db.push({id:uid('mat'),manufacturer:get('manufacturer'),product,supplier:get('supplier'),unit:get('unit'),price:num(get('price')),searchTerms:get('searchTerms')||product.toLowerCase(),updatedAt:new Date().toISOString()}); write(MATERIAL_KEY,db); toast('Material gespeichert',product); renderPrices(false);});
    bindHome();
  }

  function bindHome(){ main.querySelector('[data-wa-home]')?.addEventListener('click',()=>go('dashboard')); }

  function normalizeCommand(text){return String(text||'').toLowerCase().replace(/[.,!?]/g,' ').replace(/\s+/g,' ').trim();}

  function runCommand(raw){
    const text=normalizeCommand(raw);
    if(!text) return;
    if(/personal/.test(text) && /(anlegen|neu|erfassen)/.test(text)){renderPersonnel(true);toast('Sprachhilfe','Personal anlegen geöffnet.');return;}
    if(/personal/.test(text) && /(öffne|offne|ordner|anzeigen|zeigen)/.test(text)){renderPersonnel(false);toast('Sprachhilfe','Personalordner geöffnet.');return;}
    if(/(preisliste|preise|material)/.test(text) && /(einpflegen|eingeben|einfügen|einfugen|kopieren|einkopieren|anlegen)/.test(text)){renderPrices(true);toast('Sprachhilfe','Preisliste zur Eingabe geöffnet.');return;}
    if(/(preisliste|materialdatenbank|preise)/.test(text) && /(öffne|offne|anzeigen|zeigen)/.test(text)){renderPrices(false);return;}
    const target=Object.entries(viewAliases).find(([alias])=>text.includes(alias));
    if(target){go(target[1]);toast('Sprachhilfe',`${target[0]} geöffnet.`);return;}
    toast('Befehl nicht erkannt',`„${raw}“ konnte keinem Bereich zugeordnet werden.`);
  }

  function installVoice(){
    if(document.querySelector('[data-dwp-voice]')) return;
    const wrap=document.createElement('div'); wrap.dataset.dwpVoice='true'; wrap.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;display:flex;gap:8px;align-items:center';
    wrap.innerHTML='<button type="button" class="button button-primary" data-voice-btn title="Sprachhilfe">🎤 Sprachhilfe</button>';
    document.body.appendChild(wrap);
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    wrap.querySelector('[data-voice-btn]').addEventListener('click',()=>{
      if(!SpeechRecognition){const cmd=prompt('Befehl eingeben, z. B. „Personal anlegen“ oder „Preisliste einpflegen“'); if(cmd) runCommand(cmd); return;}
      const rec=new SpeechRecognition(); rec.lang='de-DE'; rec.interimResults=false; rec.maxAlternatives=1;
      rec.onstart=()=>toast('Sprachhilfe','Ich höre zu …');
      rec.onresult=e=>runCommand(e.results[0][0].transcript);
      rec.onerror=()=>toast('Sprachhilfe','Spracheingabe nicht verfügbar.');
      rec.start();
    });
  }

  window.DachWerkCommand = runCommand;
  installVoice();
})();