(function documentRegisterModule() {
  'use strict';
  const categories=['Bestellung','Angebot','Brief','Rechnung','Gutachten','Plan','Foto','Nachweis','Vertrag','Sonstige'];
  const moduleCategory={purchase:'Bestellung',offers:'Angebot',orders:'Brief',correspondence:'Brief',invoices:'Rechnung',incoming:'Rechnung',expert:'Gutachten',diary:'Nachweis',defects:'Foto',acceptance:'Nachweis'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localDate=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  function entries(store) {
    const projects=new Map(store.data.records.filter(r=>r.module==='projects').map(r=>[r.id,r]));
    const result=[];
    const related=new Set(['documents','purchase','offers','orders','correspondence','invoices','incoming','expert','diary','defects','acceptance']);
    for(const r of store.data.records) {
      if(!r.projectId || !projects.has(r.projectId) || !related.has(r.module))continue;
      const files=(r.attachments||[]).length?r.attachments:[null];
      for(const a of files) {
        const d=r.data||{},project=projects.get(r.projectId);
        const category=r.module==='documents'?(categories.includes(d.category)?d.category:'Sonstige'):(moduleCategory[r.module]||'Nachweis');
        result.push({
          id:r.id+':'+(a?.id||'no-file'),recordId:r.id,projectId:r.projectId,
          projectName:project.data?.name||r.projectId,documentNumber:d.number||d.reportNumber||d.invoiceNumber||d.orderNumber||r.id.slice(0,8),
          date:d.date||r.createdAt?.slice(0,10)||'',category,description:d.description||d.title||d.text||d.body||'Ohne Beschreibung',
          commission:d.commission||project.data?.costCenter||project.data?.name||'',
          recipient:d.recipient||d.supplier||'',editor:d.editor||r.owner||r.createdBy||'',
          status:a?.storageId?r.status||'Neu':a?'Datei nicht zentral gespeichert':'Ohne Datei',
          fileId:a?.storageId||null,fileName:a?.name||'',versionOf:d.versionOf||'',sourceModule:r.module,record:r
        });
      }
    }
    return result.sort((a,b)=>b.date.localeCompare(a.date)||b.record.id.localeCompare(a.record.id));
  }
  function version(row,byRecord) {
    let v=1,seen=new Set([row.recordId]),parent=row.versionOf;
    while(parent && !seen.has(parent) && byRecord.has(parent)){
      v++;seen.add(parent);parent=byRecord.get(parent).data?.versionOf;
    }
    return v;
  }
  function mount({store,root,notify,showError,onSaved}) {
    if(!root)return;
    const all=entries(store),byRecord=new Map(store.data.records.map(r=>[r.id,r]));
    const projects=store.data.records.filter(r=>r.module==='projects');
    const projectOptions=projects.map(p=>`<option value="${esc(p.id)}" ${p.id===store.data.selectedProject?'selected':''}>${esc(p.data?.name||p.id)}</option>`).join('');
    const categoriesHtml=categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    root.innerHTML=`
      <section class="panel panel-pad dwp-register-panel">
        <p>Mandantenbezogenes Verzeichnis aller Dokumentbezüge aus den vorhandenen Projektakten. PDFs und Bilder bleiben ausschließlich in ihrer bestehenden zentralen Dateiablage.</p>
        <div class="dwp-register-toolbar">
          <label>Suche<input id="dwp-reg-search" type="search" placeholder="Dokumentnummer, Beschreibung, Empfänger …"></label>
          <label>Projekt<select id="dwp-reg-project"><option value="">Alle freigegebenen Projekte</option>${projects.map(p=>`<option value="${esc(p.id)}">${esc(p.data?.name||p.id)}</option>`).join('')}</select></label>
          <label>Kategorie<select id="dwp-reg-category"><option value="">Alle Kategorien</option>${categoriesHtml}</select></label>
          <label>Status<select id="dwp-reg-status"><option value="">Alle Status</option><option value="file">Datei vorhanden</option><option value="missing">Datei fehlt</option></select></label>
        </div>
        <p id="dwp-reg-count" role="status"></p>
        <div class="data-table-wrap dwp-register-table"><table class="data-table"><thead><tr>
          <th><button type="button" data-reg-sort="date">Datum ↕</button></th><th><button type="button" data-reg-sort="documentNumber">Dok.-Nr. ↕</button></th>
          <th>Kategorie</th><th>Beschreibung / Kommission</th><th>Projekt</th><th>Empfänger / Bearbeiter</th><th>Status / Version</th><th>Datei / Aktion</th>
        </tr></thead><tbody id="dwp-reg-rows"></tbody></table></div>
        <div class="dwp-register-actions"><button class="button button-secondary" type="button" id="dwp-reg-export">CSV exportieren (freigegebenes Gerät)</button><button class="button button-secondary" type="button" id="dwp-reg-refresh">Serverbestand neu laden</button></div>
      </section>
      <section class="panel panel-pad dwp-register-panel">
        <h2 id="dwp-reg-form-heading">Neues Dokument erfassen</h2>
        <p>Eine neue Fassung erhält eine eigene Dokumentnummer. Vorherige Fassungen und ihre Dateien bleiben erhalten.</p>
        <form id="dwp-reg-form" class="quick-form">
          <input name="versionOf" type="hidden">
          <label>Projekt<select name="projectId" required><option value="">Bitte auswählen</option>${projectOptions}</select></label>
          <label>Datum<input type="date" name="date" required value="${localDate()}"></label>
          <label>Kategorie<select name="category" required>${categoriesHtml}</select></label>
          <label>Bezeichnung<input name="title" required maxlength="240" placeholder="z. B. Eurofast-Bestellung"></label>
          <label>Beschreibung<input name="description" maxlength="600"></label>
          <label>Kommission<input name="commission" maxlength="240"></label>
          <label>Empfänger<input name="recipient" maxlength="240"></label>
          <label>Bearbeiter<input name="editor" maxlength="240"></label>
          <label>Datei (PDF / Bild, bis 64 MB)<input type="file" name="file" accept=".pdf,image/jpeg,image/png,image/webp,application/pdf" required></label>
          <p id="dwp-reg-save-status" role="status" aria-live="polite"></p>
          <div class="dwp-register-actions">
            <button type="submit" class="button button-primary">Dokument und Datei speichern</button>
            <button type="button" id="dwp-reg-clear" class="button button-secondary">Neue Erfassung</button>
          </div>
        </form>
        <p>Originaldateien öffnen und Tabellenexport sind gemäß bestehendem Schutzkonzept nur für den Eigentümer auf freigegebenen Geräten möglich. Ohne bestätigten Upload gilt ein Eintrag nicht als vollständig.</p>
      </section>`;
    const $=id=>root.querySelector('#'+id);
    const search=$('dwp-reg-search'),proj=$('dwp-reg-project'),cat=$('dwp-reg-category'),status=$('dwp-reg-status'),tbody=$('dwp-reg-rows');
    let sort='date',desc=true,busy=false;
    function draw() {
      const needle=search.value.trim().toLocaleLowerCase('de');
      const filtered=all.filter(r=>(!proj.value||r.projectId===proj.value)&&(!cat.value||r.category===cat.value)&&
        (!status.value||(status.value==='file'?Boolean(r.fileId):!r.fileId))&&(!needle||[r.documentNumber,r.description,r.commission,r.projectName,r.recipient,r.editor,r.fileName].some(s=>String(s).toLocaleLowerCase('de').includes(needle))));
      filtered.sort((a,b)=>(String(a[sort]).localeCompare(String(b[sort]),'de',{numeric:true}) || a.id.localeCompare(b.id))*(desc?-1:1));
      $('dwp-reg-count').textContent=filtered.length+' von '+all.length+' Dokumenteinträgen';
      tbody.innerHTML=filtered.length?filtered.map(r=>`<tr>
        <td>${esc(r.date)}</td><td><strong>${esc(r.documentNumber)}</strong></td><td>${esc(r.category)}</td>
        <td>${esc(r.description)}<small>${esc(r.commission)}</small></td><td>${esc(r.projectName)}</td>
        <td>${esc(r.recipient)}<small>${esc(r.editor)}</small></td>
        <td>${esc(r.status)} · V${version(r,byRecord)}</td>
        <td>${r.fileId?`<button type="button" class="button button-secondary" data-reg-file="${esc(r.id)}">${esc(r.fileName||'Öffnen')}</button>`:'<span>Kein Original</span>'}
        ${r.sourceModule==='documents'?`<button type="button" class="button button-secondary" data-reg-version="${esc(r.recordId)}">Neue Version</button>`:''}</td>
      </tr>`).join(''):'<tr><td colspan="8">Keine passenden Einträge.</td></tr>';
    }
    [search,proj,cat,status].forEach(el=>el.addEventListener('input',draw));
    root.querySelectorAll('[data-reg-sort]').forEach(el=>el.addEventListener('click',()=>{if(sort===el.dataset.regSort)desc=!desc;else {sort=el.dataset.regSort;desc=sort==='date';}draw();}));
    function clearForm() {
      const form=$('dwp-reg-form');form.reset();form.elements.versionOf.value='';form.elements.date.value=localDate();
      form.elements.projectId.value=store.data.selectedProject||'';
      $('dwp-reg-form-heading').textContent='Neues Dokument erfassen';
      $('dwp-reg-save-status').textContent='';
      form.elements.file.required=true;
    }
    $('dwp-reg-clear').addEventListener('click',clearForm);
    root.addEventListener('click',async event=>{
      const v=event.target.closest('[data-reg-version]');
      if(v) {
        const record=byRecord.get(v.dataset.regVersion);if(!record)return;
        const form=$('dwp-reg-form');
        form.elements.versionOf.value=record.id;form.elements.projectId.value=record.projectId;
        for(const key of ['date','category','title','description','commission','recipient','editor']) {
          if(form.elements[key])form.elements[key].value=record.data?.[key]|| (key==='date'?localDate():'');
        }
        form.elements.file.value='';
        $('dwp-reg-form-heading').textContent='Neue Fassung zu '+(record.data?.number||record.id);
        form.scrollIntoView({block:'start',behavior:'smooth'});return;
      }
      const f=event.target.closest('[data-reg-file]');
      if(!f)return;
      const row=all.find(r=>r.id===f.dataset.regFile);
      if(!row?.fileId)return;
      if(!window.DWPRemote?.active){showError(Error('Bitte zentral anmelden.'));return;}
      const newTab=window.open('about:blank','_blank');
      try {
        const file=await window.DWPRemote.originalFile(row.recordId,row.fileId,row.projectId);
        const url=URL.createObjectURL(file.blob);
        if(newTab){newTab.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),60000);}
        else {const a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
      }catch(error){if(newTab)newTab.close();showError(error);}
    });
    $('dwp-reg-form').addEventListener('submit',async event=>{
      event.preventDefault();
      if(busy)return;
      if(!window.DWPRemote?.active){showError(Error('Dokumente benötigen die zentrale Anmeldung.'));return;}
      const form=event.currentTarget,file=form.elements.file.files[0];
      if(!file){showError(Error('Bitte eine PDF- oder Bilddatei auswählen.'));return;}
      const projectId=form.elements.projectId.value;
      if(!projects.some(p=>p.id===projectId)){showError(Error('Projekt ist nicht verfügbar.'));return;}
      const mime=file.type||({pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[file.name.split('.').pop().toLowerCase()]);
      if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(mime)||file.size<1||file.size>67108864){showError(Error('Nur PDF, JPG, PNG oder WebP bis 64 MB.'));return;}
      busy=true;
      const button=form.querySelector('[type=submit]');button.disabled=true;
      const msg=$('dwp-reg-save-status');
      try{
        store.data.selectedProject=projectId;
        const year=form.elements.date.value.slice(0,4);
        const seq=store.data.records.filter(r=>r.module==='documents'&&r.projectId===projectId&&String(r.data?.number||'').startsWith(`DWP-${year}-37-`)).length+1;
        const number=`DWP-${year}-37-${String(seq).padStart(4,'0')}`;
        const values={title:form.elements.title.value,number,date:form.elements.date.value,category:form.elements.category.value,
          description:form.elements.description.value,commission:form.elements.commission.value,recipient:form.elements.recipient.value,
          editor:form.elements.editor.value,versionOf:form.elements.versionOf.value};
        msg.textContent='Dokumentdaten werden zentral gespeichert …';
        const record=await window.DWPRemote.run('save',['documents',values,{status:'Neu',owner:values.editor||''}]);
        if(!record?.id)throw Error('Server hat keine Dokument-ID bestätigt.');
        msg.textContent='Datei wird hochgeladen und geprüft …';
        await window.DWPRemote.uploadFile(record.id,file);
        msg.textContent='Dokument und Originaldatei zentral gespeichert.';
        notify('Dokument '+number+' mit Originaldatei gespeichert.');
        onSaved();
      }catch(error){
        msg.textContent='Speichern nicht vollständig: '+error.message+' — bitte die Dokumentliste prüfen, bevor du erneut speicherst.';
        showError(error);
      }finally{busy=false;button.disabled=false;}
    });
    $('dwp-reg-export').addEventListener('click',async()=>{
      try{
        if(!window.DWPRemote?.active)throw Error('Export erfordert zentrale Anmeldung.');
        const result=await window.DWPRemote.export({kind:'register',projectId:proj.value||null});
        const blob=new Blob(['\uFEFF'+result.text],{type:'text/csv;charset=utf-8'});
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='DWP_Modul37_Register.csv';a.click();
        setTimeout(()=>URL.revokeObjectURL(url),5000);
      }catch(error){showError(error);}
    });
    $('dwp-reg-refresh').addEventListener('click',async()=>{
      try{if(!window.DWPRemote?.active)throw Error('Bitte zentral anmelden.');await window.DWPRemote.reload();window.DWPWorkspace.open('register');}
      catch(error){showError(error);}
    });
    clearForm();draw();
  }
  window.DWPRegister={mount,entries,version};
})();
