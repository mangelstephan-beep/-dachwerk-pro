(() => {
  const main = document.querySelector('#main-content');
  if (!main) return;

  const DB_KEY = 'dwp-lv-import-v1';
  const ENTITY_KEY = 'dwp-entities-v1';
  const CURRENT_KEY = 'dwp-current-entity-v1';
  const pendingFiles = new Map();

  const esc = (v) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const uid = (p='id') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const money = (v) => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v)||0);
  const num = (v) => Number(String(v ?? '').replace(/\./g,'').replace(',','.')) || 0;

  function getDb(){ return read(DB_KEY,{documents:[],workingCopies:[]}); }
  function saveDb(db){ write(DB_KEY,db); }
  function getEntities(){ return read(ENTITY_KEY,[]); }
  function saveEntities(x){ write(ENTITY_KEY,x); }
  function currentEntity(){ const id=localStorage.getItem(CURRENT_KEY); return getEntities().find(x=>x.id===id) || null; }

  function seedIfEmpty(){
    const db=getDb();
    if(db.documents.length) return;
    db.documents.push({
      id:'stadler-lv-1-source', name:'Stadler LV 1', originalName:'Garnmagazin – Alternativer Aufbau', type:'source', format:'DachWerk-Bestand', createdAt:new Date().toISOString(), pages:[], selectedPages:[], status:'Bestand', entityId:null,
      rawText:'Bestehender, bereits in DachWerk Pro erfasster Stadler-LV-Stand. Das Original bleibt getrennt von der Kalkulations-Arbeitskopie.'
    });
    db.workingCopies.push({
      id:'lv-1-work', sourceId:'stadler-lv-1-source', name:'LV 1', createdAt:new Date().toISOString(), entityId:null, positions:[], note:'Arbeitskopie – unabhängig vom unveränderten Ursprung „Stadler LV 1“. Hier werden Mengen, Zeiten, Material und Preise bearbeitet.'
    });
    saveDb(db);
  }
  seedIfEmpty();

  function extension(name=''){ return (name.split('.').pop() || '').toLowerCase(); }
  function supported(file){ return ['pdf','png','jpg','jpeg','webp','txt','csv','xml','x83','x84','d83','d84','xlsx','xls'].includes(extension(file.name)); }

  async function extractPdf(file, onProgress){
    if(!window.pdfjsLib) throw new Error('PDF-Modul konnte nicht geladen werden.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.min.mjs';
    const data=await file.arrayBuffer();
    const pdf=await window.pdfjsLib.getDocument({data}).promise;
    const pages=[];
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i);
      const tc=await page.getTextContent();
      const text=tc.items.map(x=>x.str).join(' ').replace(/\s+/g,' ').trim();
      pages.push({page:i,text,needsOcr:text.length<35,selected:true});
      onProgress?.(i,pdf.numPages);
    }
    return pages;
  }

  async function ocrPdfPages(file, pageNumbers, onProgress){
    if(!window.pdfjsLib || !window.Tesseract) throw new Error('OCR-Modul konnte nicht geladen werden.');
    const data=await file.arrayBuffer();
    const pdf=await window.pdfjsLib.getDocument({data}).promise;
    const out={}; let done=0;
    for(const pno of pageNumbers){
      const page=await pdf.getPage(pno);
      const viewport=page.getViewport({scale:1.8});
      const canvas=document.createElement('canvas');
      canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      const res=await window.Tesseract.recognize(canvas,'deu+eng');
      out[pno]=(res.data?.text || '').replace(/\s+/g,' ').trim();
      done++; onProgress?.(done,pageNumbers.length);
    }
    return out;
  }

  async function extractImage(file){
    if(!window.Tesseract) throw new Error('OCR-Modul konnte nicht geladen werden.');
    const res=await window.Tesseract.recognize(file,'deu+eng');
    return [{page:1,text:(res.data?.text||'').replace(/\s+/g,' ').trim(),needsOcr:false,selected:true}];
  }

  async function extractSpreadsheet(file){
    if(!window.XLSX) throw new Error('Excel-Modul konnte nicht geladen werden.');
    const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array'});
    const chunks=[];
    wb.SheetNames.forEach((name,idx)=>{
      const ws=wb.Sheets[name];
      chunks.push({page:idx+1,text:window.XLSX.utils.sheet_to_csv(ws,{FS:';'}),needsOcr:false,selected:true,label:name});
    });
    return chunks;
  }

  async function extractText(file){
    return [{page:1,text:await file.text(),needsOcr:false,selected:true}];
  }

  function parsePositions(text){
    const lines=String(text||'').split(/\r?\n|(?=\b\d{1,3}(?:[.\s]\d{1,4})+[).]?\s)/).map(s=>s.trim()).filter(Boolean);
    const positions=[];
    const unitRx='(m²|m2|m³|m3|m|Stk\.?|St\.?|kg|t|h|Std\.?|pausch|Psch\.?)';
    const rx=new RegExp('^(\\d{1,3}(?:[.\\s]\\d{1,4})+[).]?)\\s+(?:(\\d{1,3}(?:[. ]\\d{3})*(?:,\\d+)?)\\s*'+unitRx+')?\\s*(.*)$','i');
    for(const line of lines){
      const m=line.match(rx); if(!m) continue;
      const nr=m[1].replace(/\s+/g,'.').replace(/[)]$/,'');
      const qty=num(m[2]||0); const unit=(m[3]||'').replace('m2','m²').replace('m3','m³'); const txt=(m[4]||'').trim();
      if(!txt && !qty) continue;
      positions.push({id:uid('pos'),nr,qty,unit,title:txt.slice(0,120)||'Leistungsposition',text:txt,time:0,material:0,ep:0});
    }
    // GAEB/XML often has compact text: fall back to item blocks if no classic rows were found.
    if(!positions.length){
      try{
        const xml=new DOMParser().parseFromString(text,'text/xml');
        [...xml.querySelectorAll('Item,BoQCtgy,Description,OutlineText')].slice(0,500).forEach((node,i)=>{
          const t=node.textContent?.replace(/\s+/g,' ').trim();
          if(t && t.length>8) positions.push({id:uid('pos'),nr:String(i+1).padStart(3,'0'),qty:0,unit:'',title:t.slice(0,120),text:t,time:0,material:0,ep:0});
        });
      }catch{}
    }
    return positions.slice(0,1000);
  }

  async function importFile(file, entityId=null){
    if(!supported(file)) throw new Error('Dateiformat noch nicht unterstützt.');
    const ext=extension(file.name); let pages=[];
    setStatus(`Lese ${file.name} …`);
    if(ext==='pdf') pages=await extractPdf(file,(a,b)=>setStatus(`PDF wird gelesen: Seite ${a}/${b}`));
    else if(['png','jpg','jpeg','webp'].includes(ext)) pages=await extractImage(file);
    else if(['xlsx','xls'].includes(ext)) pages=await extractSpreadsheet(file);
    else pages=await extractText(file);
    const db=getDb();
    const sourceId=uid('source');
    const sourceName=db.documents.length===1 && db.documents[0].id==='stadler-lv-1-source' ? 'Stadler LV 2' : `Stadler LV ${db.documents.length+1}`;
    db.documents.push({id:sourceId,name:sourceName,originalName:file.name,type:'source',format:ext.toUpperCase(),createdAt:new Date().toISOString(),pages,selectedPages:pages.map(p=>p.page),status:'eingelesen',entityId,rawText:pages.map(p=>p.text).join('\n')});
    const workingId=uid('work');
    const selectedText=pages.map(p=>p.text).join('\n');
    db.workingCopies.push({id:workingId,sourceId,name:`LV ${db.workingCopies.length+1}`,createdAt:new Date().toISOString(),entityId,positions:parsePositions(selectedText),note:'Bearbeitbare Arbeitskopie'});
    saveDb(db); pendingFiles.set(sourceId,file); setStatus(`${file.name} wurde als Original + Arbeitskopie übernommen.`); render();
  }

  function setStatus(text){ const el=document.querySelector('[data-lv-import-status]'); if(el) el.textContent=text; }

  function render(){
    const page=main.querySelector('.page[data-page="calculation"]'); if(!page) return;
    let root=page.querySelector('[data-lv-import-manager]');
    const anchor=page.querySelector('.page-navigation')||page.querySelector('.page-header'); if(!anchor) return;
    if(!root){ root=document.createElement('section'); root.dataset.lvImportManager='true'; root.className='panel panel-pad'; root.style.marginBottom='16px'; anchor.insertAdjacentElement('afterend',root); }
    const db=getDb(); const ent=currentEntity();
    root.innerHTML=`
      <div class="panel-head"><div><span class="eyebrow">LV-Importzentrale · Original bleibt unverändert</span><h2>Drag & Drop → prüfen → Arbeitskopie kalkulieren</h2><p>${ent?`Zuordnung: <strong>${esc(ent.type)} ${esc(ent.number)} · ${esc(ent.name)}</strong>`:'Noch keinem Kunden/Projekt fest zugeordnet.'}</p></div><span class="status-pill status-green">${db.documents.length} Originale · ${db.workingCopies.length} Arbeitskopien</span></div>
      <div data-lv-drop style="border:2px dashed #9fb2c8;border-radius:14px;padding:22px;text-align:center;margin:14px 0;background:#f8fafc;cursor:pointer">
        <strong style="display:block;font-size:1.08rem">LV hier hineinziehen oder anklicken</strong><span class="muted">PDF/Scan, Bild, GAEB/XML/X83/X84, Excel, CSV oder TXT</span><input data-lv-file type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.xml,.x83,.x84,.d83,.d84,.xlsx,.xls,.csv,.txt" hidden>
      </div>
      <p data-lv-import-status class="muted">Importbereit. Bei gescannten PDFs können einzelne Seiten gewählt und per OCR gelesen werden.</p>
      <div style="display:grid;grid-template-columns:minmax(260px,.75fr) minmax(500px,1.6fr);gap:14px;margin-top:14px">
        <div>${db.documents.map(sourceCard).join('')}</div>
        <div>${db.workingCopies.map(workCard).join('') || '<div class="panel panel-pad"><span class="muted">Noch keine Arbeitskopie.</span></div>'}</div>
      </div>`;
    bind(root);
  }

  function sourceCard(s){
    const pages=s.pages||[]; const selected=new Set(s.selectedPages||pages.map(p=>p.page));
    return `<article class="panel panel-pad" style="margin-bottom:10px" data-source-card="${esc(s.id)}"><div class="panel-head"><div><strong>${esc(s.name)}</strong><small style="display:block">Original: ${esc(s.originalName)} · ${esc(s.format)}</small></div><span class="status-pill">Original</span></div>
      ${pages.length>1?`<details style="margin-top:8px"><summary>Seitenwahl (${selected.size}/${pages.length})</summary><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px">${pages.map(p=>`<label style="border:1px solid #d5dee8;border-radius:8px;padding:5px 8px"><input type="checkbox" data-page-select="${p.page}" ${selected.has(p.page)?'checked':''}> S.${p.page}${p.needsOcr?' · Scan?':''}</label>`).join('')}</div><button class="button button-secondary" data-source-action="apply-pages" data-source-id="${esc(s.id)}" style="margin-top:8px">Seiten übernehmen</button> <button class="button button-secondary" data-source-action="ocr" data-source-id="${esc(s.id)}">Scan-Seiten OCR</button></details>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="button button-secondary" data-source-action="new-copy" data-source-id="${esc(s.id)}">Neue Arbeitskopie</button><button class="button button-secondary" data-source-action="assign" data-source-id="${esc(s.id)}">Aktuellem Projekt zuordnen</button></div></article>`;
  }

  function workCard(w){
    const db=getDb(); const src=db.documents.find(s=>s.id===w.sourceId); const positions=w.positions||[];
    return `<article class="panel panel-pad" style="margin-bottom:12px" data-work-card="${esc(w.id)}"><div class="panel-head"><div><span class="eyebrow">Bearbeitbare Kalkulationskopie</span><h3 style="margin:3px 0">${esc(w.name)}</h3><small>Ursprung: ${esc(src?.name||'unbekannt')} · ${positions.length} erkannte Positionen</small></div><input data-work-name="${esc(w.id)}" value="${esc(w.name)}" style="max-width:150px"></div>
      <div class="data-table-wrap" style="max-height:500px;overflow:auto"><table class="data-table"><thead><tr><th>Pos.</th><th>Menge</th><th>Leistungstext</th><th>min/E</th><th>Mat. €/E</th><th>EP</th><th>GP</th></tr></thead><tbody>${positions.map(p=>row(w,p)).join('')}</tbody></table></div>
      <div style="display:flex;justify-content:flex-end;margin-top:10px"><strong data-work-total="${esc(w.id)}">${money(calcTotal(w))}</strong></div>
      <div style="margin-top:10px;display:flex;gap:8px"><button class="button button-secondary" data-work-action="add-row" data-work-id="${esc(w.id)}">+ Position</button><button class="button button-primary" data-work-action="save" data-work-id="${esc(w.id)}">Arbeitskopie speichern</button></div></article>`;
  }

  function row(w,p){ const ep=num(p.ep)||(num(p.material)+(num(p.time)/60)*num(read('dwp-calc-settings',{hourRate:0}).hourRate)); const gp=ep*num(p.qty); return `<tr data-pos-id="${esc(p.id)}"><td><input data-f="nr" value="${esc(p.nr)}" style="width:75px"></td><td><input data-f="qty" value="${esc(p.qty)}" style="width:80px"> ${esc(p.unit)}</td><td><textarea data-f="text" rows="2" style="min-width:260px">${esc(p.text||p.title)}</textarea></td><td><input data-f="time" value="${esc(p.time||'')}" style="width:70px"></td><td><input data-f="material" value="${esc(p.material||'')}" style="width:85px"></td><td><input data-f="ep" value="${esc(p.ep||'')}" placeholder="auto" style="width:85px"></td><td data-gp>${money(gp)}</td></tr>`; }
  function calcTotal(w){ return (w.positions||[]).reduce((s,p)=>s+(num(p.ep)||num(p.material))*num(p.qty),0); }

  function bind(root){
    const dz=root.querySelector('[data-lv-drop]'), fi=root.querySelector('[data-lv-file]');
    dz.onclick=()=>fi.click(); fi.onchange=()=>[...fi.files].forEach(f=>importFile(f,currentEntity()?.id||null).catch(e=>setStatus(e.message)));
    ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.style.background='#eef5ff'}));
    ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.style.background='#f8fafc'}));
    dz.addEventListener('drop',e=>[...e.dataTransfer.files].forEach(f=>importFile(f,currentEntity()?.id||null).catch(err=>setStatus(err.message))));

    root.querySelectorAll('[data-source-action]').forEach(btn=>btn.onclick=async()=>{
      const db=getDb(), s=db.documents.find(x=>x.id===btn.dataset.sourceId); if(!s) return;
      if(btn.dataset.sourceAction==='apply-pages'){
        const card=btn.closest('[data-source-card]'); s.selectedPages=[...card.querySelectorAll('[data-page-select]:checked')].map(x=>Number(x.dataset.pageSelect));
        const text=(s.pages||[]).filter(p=>s.selectedPages.includes(p.page)).map(p=>p.text).join('\n');
        const w=db.workingCopies.find(x=>x.sourceId===s.id); if(w) w.positions=parsePositions(text); saveDb(db); setStatus(`Seiten ${s.selectedPages.join(', ')} wurden in ${w?.name||'die Arbeitskopie'} übernommen.`); render();
      }
      if(btn.dataset.sourceAction==='ocr'){
        const file=pendingFiles.get(s.id); if(!file){ setStatus('OCR benötigt die Datei erneut: Original bitte noch einmal in die Dropzone ziehen.'); return; }
        const targets=(s.pages||[]).filter(p=>p.needsOcr && (s.selectedPages||[]).includes(p.page)).map(p=>p.page); if(!targets.length){setStatus('Keine ausgewählten Scan-Seiten erkannt.');return;}
        const texts=await ocrPdfPages(file,targets,(a,b)=>setStatus(`OCR läuft ${a}/${b}`)); Object.entries(texts).forEach(([n,t])=>{const p=s.pages.find(x=>x.page===Number(n));if(p){p.text=t;p.needsOcr=false;}}); s.rawText=s.pages.map(p=>p.text).join('\n'); saveDb(db); setStatus('OCR abgeschlossen. Jetzt „Seiten übernehmen“ klicken.'); render();
      }
      if(btn.dataset.sourceAction==='new-copy'){ db.workingCopies.push({id:uid('work'),sourceId:s.id,name:`LV ${db.workingCopies.length+1}`,createdAt:new Date().toISOString(),entityId:s.entityId,positions:parsePositions((s.pages||[]).filter(p=>(s.selectedPages||[]).includes(p.page)).map(p=>p.text).join('\n')),note:'Neue getrennte Arbeitskopie'}); saveDb(db); render(); }
      if(btn.dataset.sourceAction==='assign'){ const e=currentEntity(); if(!e){setStatus('Bitte zuerst einen Kunden oder ein Projekt anlegen/auswählen.');return;} s.entityId=e.id; db.workingCopies.filter(w=>w.sourceId===s.id).forEach(w=>w.entityId=e.id); saveDb(db); setStatus(`${s.name} ist ${e.number} · ${e.name} zugeordnet.`); render(); }
    });

    root.querySelectorAll('[data-work-card]').forEach(card=>{
      card.addEventListener('input',()=>recalcCard(card));
    });
    root.querySelectorAll('[data-work-action]').forEach(btn=>btn.onclick=()=>{
      const db=getDb(), w=db.workingCopies.find(x=>x.id===btn.dataset.workId); if(!w) return;
      if(btn.dataset.workAction==='add-row'){w.positions.push({id:uid('pos'),nr:'',qty:0,unit:'',title:'',text:'',time:0,material:0,ep:0});saveDb(db);render();return;}
      syncWorkFromCard(btn.closest('[data-work-card]'),w); saveDb(db); setStatus(`${w.name} wurde gespeichert.`); render();
    });
    root.querySelectorAll('[data-work-name]').forEach(inp=>inp.onchange=()=>{const db=getDb(),w=db.workingCopies.find(x=>x.id===inp.dataset.workName);if(w){w.name=inp.value.trim()||w.name;saveDb(db);render();}});
  }

  function syncWorkFromCard(card,w){
    const byId=new Map((w.positions||[]).map(p=>[p.id,p]));
    card.querySelectorAll('tbody tr[data-pos-id]').forEach(tr=>{const p=byId.get(tr.dataset.posId); if(!p)return; tr.querySelectorAll('[data-f]').forEach(i=>{const f=i.dataset.f; p[f]=['qty','time','material','ep'].includes(f)?num(i.value):i.value;});});
  }
  function recalcCard(card){
    let total=0; card.querySelectorAll('tbody tr').forEach(tr=>{const q=num(tr.querySelector('[data-f="qty"]')?.value), mat=num(tr.querySelector('[data-f="material"]')?.value), ep=num(tr.querySelector('[data-f="ep"]')?.value); const gp=(ep||mat)*q; total+=gp; const out=tr.querySelector('[data-gp]');if(out)out.textContent=money(gp);}); const out=card.querySelector('[data-work-total]');if(out)out.textContent=money(total);
  }

  function extendQuickModal(){
    const form=document.querySelector('#quick-form'); if(!form || form.querySelector('[data-lv-entity-drop]')) return;
    const actions=form.querySelector('.modal-actions'); if(!actions)return;
    const wrap=document.createElement('div'); wrap.className='field-span'; wrap.dataset.lvEntityDrop='true'; wrap.innerHTML=`<label>Leistungsverzeichnis direkt zuordnen (optional)</label><div data-entity-drop style="border:2px dashed #b9c7d6;border-radius:10px;padding:12px;text-align:center">LV hier ablegen oder Datei wählen<input data-entity-file type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.xml,.x83,.x84,.d83,.d84,.xlsx,.xls,.csv,.txt" multiple style="display:block;margin:8px auto 0"></div><small class="muted">Beim Speichern von Kunde/Projekt wird das Original dort abgelegt und gleichzeitig eine getrennte Kalkulationskopie angelegt.</small>`; actions.before(wrap);
    form.addEventListener('submit',e=>{
      const type=document.querySelector('#record-type').value, number=document.querySelector('#record-number').value, name=document.querySelector('#record-name').value.trim(), location=document.querySelector('#record-location').value.trim();
      if(!['Kunde','Projekt'].includes(type)||!name)return;
      const entities=getEntities(); const ent={id:uid(type==='Projekt'?'project':'customer'),type,number,name,location,createdAt:new Date().toISOString()}; entities.push(ent);saveEntities(entities);localStorage.setItem(CURRENT_KEY,ent.id);
      const files=[...(form.querySelector('[data-entity-file]')?.files||[])]; setTimeout(()=>files.forEach(f=>importFile(f,ent.id).catch(err=>setStatus(err.message))),50);
    },true);
    const drop=wrap.querySelector('[data-entity-drop]'), input=wrap.querySelector('[data-entity-file]');
    ['dragover','drop'].forEach(ev=>drop.addEventListener(ev,e=>e.preventDefault())); drop.addEventListener('drop',e=>{try{const dt=new DataTransfer();[...e.dataTransfer.files].forEach(f=>dt.items.add(f));input.files=dt.files;drop.firstChild.textContent=`${dt.files.length} Datei(en) ausgewählt `;}catch{}});
  }

  const observer=new MutationObserver(()=>{render();extendQuickModal();}); observer.observe(document.body,{childList:true,subtree:true}); render();extendQuickModal();
})();