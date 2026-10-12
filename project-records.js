/* Project-specific construction records; no simulated cloud or approval claims. */
(() => {
  const core=DachWerkCore, esc=core.esc, KEY='dwp-project-records-v1';
  const types={
    'Digitales Aufmaß':{kind:'measurement',fields:[['length','Länge','number'],['width','Breite / Faktor','number'],['count','Anzahl','number'],['deduction','Abzug','number']]},
    'Bautagebuch':{kind:'diary',fields:[['weather','Wetter'],['personnel','Personal / Kolonne'],['hours','Arbeitsstunden','number'],['work','Ausgeführte Leistungen','textarea'],['obstruction','Behinderungen','textarea']]},
    'Festgestellte Mängel':{kind:'defect',fields:[['component','Bauteil'],['finding','Feststellung','textarea'],['measure','Maßnahme','textarea']]},
    'Abweichungen':{kind:'deviation',fields:[['expected','Soll','textarea'],['actual','Ist','textarea'],['measure','Maßnahme','textarea']]},
    'Abnahmen & Übergaben':{kind:'acceptance',fields:[['participants','Teilnehmer'],['scope','Abgenommene Leistungen','textarea'],['remaining','Restleistungen / Vorbehalte','textarea']]},
    'Leckage & Ortung':{kind:'leak',fields:[['method','Prüfverfahren'],['component','Prüfbereich'],['finding','Feststellung','textarea'],['measure','Maßnahme','textarea']]},
    'Nachweise':{kind:'evidence',fields:[['component','Bauteil'],['reference','Dokument / Charge / Ablageverweis'],['finding','Prüfergebnis','textarea']]},
  };
  const read=()=>core.read(KEY,[]);
  const money=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v);
  const unitQuantity=(r)=>core.number(r.length)*core.number(r.width)*core.number(r.count)-core.number(r.deduction);
  const positions=project=>core.read('dwp-lv-import-v1',{workingCopies:[]}).workingCopies.filter(w=>w.entityId===project.id).flatMap(w=>(w.positions||[]).map(p=>({...p,workId:w.id,ref:`${w.id}:${p.id}`})));
  function csv(records) {
    const fields=['number','date','title','status','owner','due','workId','positionId','unit','quantity','notes'];
    const cell=value=>{let s=String(value??'');if(/^[=+@-]/.test(s)) s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
    return '\ufeff'+[fields,...records.map(r=>fields.map(f=>r[f]))].map(row=>row.map(cell).join(';')).join('\r\n');
  }
  function download(text,name) {
    const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function render(ctx, editId=null) {
    const spec=types[ctx.title];if(!spec) return false;
    const main=document.querySelector('#main-content'), project=core.current();
    if(!project){main.innerHTML=`<section class="page"><h1>${esc(ctx.title)}</h1><p>Bitte zuerst ein Projekt auswählen.</p><button class="button" data-record-projects>Projekte öffnen</button></section>`;main.querySelector('button').onclick=()=>document.querySelector('[data-view="projects"]').click();return true;}
    const records=read().filter(r=>r.projectId===project.id&&r.kind===spec.kind);
    const edit=records.find(r=>r.id===editId)||{}, ps=positions(project);
    const field=(key,label,type='text')=>`<div class="${type==='textarea'?'field-span':''}"><label for="pr-${key}">${esc(label)}</label>${type==='textarea'?`<textarea id="pr-${key}" name="${key}" rows="3">${esc(edit[key])}</textarea>`:`<input id="pr-${key}" name="${key}" ${type==='number'?'inputmode="decimal"':''} value="${esc(edit[key]??({width:1,count:1,length:0,deduction:0}[key]??''))}">`}</div>`;
    main.innerHTML=`<section class="page" data-page="${esc(ctx.view)}" data-project-records><header class="page-header"><div><h1>${esc(ctx.title)}</h1><p>${esc(project.number)} · ${esc(project.name)} · lokaler Testbetrieb</p></div><button class="button" data-record-back>Modulübersicht</button></header><section class="panel"><form class="quick-form" data-project-record-form>
      <div><label for="pr-title">Bezeichnung</label><input id="pr-title" name="title" required value="${esc(edit.title)}"></div><div><label for="pr-date">Datum</label><input id="pr-date" name="date" type="date" required value="${esc(edit.date||new Date().toLocaleDateString('sv-SE'))}"></div>
      <div><label for="pr-position">LV-Position ${spec.kind==='measurement'?'(Pflicht)':'(optional)'}</label><select id="pr-position" name="position" ${spec.kind==='measurement'?'required':''}><option value="">Auswählen</option>${ps.map(p=>`<option value="${esc(p.ref)}" ${p.ref===`${edit.workId}:${edit.positionId}`?'selected':''}>${esc(p.nr)} · ${esc(p.text||p.title)} (${esc(p.unit)})</option>`).join('')}</select></div>
      <div><label for="pr-status">Status</label><select id="pr-status" name="status">${['Offen','In Bearbeitung','Prüfung','Erledigt'].map(s=>`<option ${s===edit.status?'selected':''}>${s}</option>`).join('')}</select></div>${field('owner','Verantwortlich')}
      <div><label for="pr-due">Frist</label><input id="pr-due" name="due" type="date" value="${esc(edit.due)}"></div>${spec.fields.map(f=>field(...f)).join('')}${field('notes','Bemerkungen','textarea')}
      <div class="field-span"><p role="alert" data-record-error></p><button class="button button-primary" type="submit">${edit.id?'Änderungen speichern':'Vorgang speichern'}</button></div></form></section>
      <section class="panel"><div class="panel-head"><h2>${records.length} Vorgänge</h2><button class="button" data-record-export>CSV exportieren</button></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Nummer</th><th>Datum</th><th>Bezeichnung</th><th>Status</th><th>Menge</th><th>Aktion</th></tr></thead><tbody>${records.map(r=>`<tr><td>${esc(r.number)}</td><td>${esc(r.date)}</td><td>${esc(r.title)}</td><td>${esc(r.status)}</td><td>${r.kind==='measurement'?`${esc(r.quantity)} ${esc(r.unit)}`:'–'}</td><td><button class="text-button" data-record-edit="${esc(r.id)}">Bearbeiten</button></td></tr>`).join('')||'<tr><td colspan="6">Noch keine Vorgänge.</td></tr>'}</tbody></table></div></section></section>`;
    main.querySelector('[data-record-back]').onclick=()=>document.querySelector(`[data-view="${ctx.view}"]`).click();
    main.querySelectorAll('[data-record-edit]').forEach(b=>b.onclick=()=>render(ctx,b.dataset.recordEdit));
    main.querySelector('[data-record-export]').onclick=()=>download(csv(records),`${project.number}-${spec.kind}.csv`);
    main.querySelector('form').onsubmit=e=>{
      e.preventDefault();
      const form=e.currentTarget;if(!form.reportValidity())return;
      const values=Object.fromEntries(new FormData(form)), position=ps.find(p=>p.ref===values.position);
      const record={...edit,...values,kind:spec.kind,projectId:project.id,workId:position?.workId||null,positionId:position?.id||null,unit:position?.unit||'',id:edit.id||crypto.randomUUID(),createdAt:edit.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
      if(spec.kind==='measurement') {
        for(const key of ['length','width','count','deduction']) {const raw=values[key].trim();if(!raw || !/^-?\d+(?:[.,]\d+)?$/.test(raw) || core.number(raw)<0){main.querySelector('[data-record-error]').textContent='Maße, Anzahl und Abzug müssen gültige, nicht negative Zahlen sein.';return;}}
        record.quantity=unitQuantity(record);
        if(record.quantity<0){main.querySelector('[data-record-error]').textContent='Der Abzug ist größer als die erfasste Menge.';return;}
      }
      const all=read();record.number=edit.number||`${project.number}-${spec.kind}-${String(all.filter(r=>r.projectId===project.id&&r.kind===spec.kind).length+1).padStart(3,'0')}`;
      try{localStorage.setItem(KEY,JSON.stringify(all.filter(r=>r.id!==record.id).concat(record)));render(ctx);}catch(error){main.querySelector('[data-record-error]').textContent='Speichern fehlgeschlagen: '+error.message;}
    };
    return true;
  }
  window.DachWerkRecords={render,types,quantity:unitQuantity,csv};
})();
