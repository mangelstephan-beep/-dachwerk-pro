/* Shared customer/project records for the original application. Browser test storage. */
(() => {
  const KEY = 'dwp-entities-v1', CURRENT = 'dwp-current-entity-v1';
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const read = (key, fallback) => { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; };
  const number = v => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').trim().replace(/\s|€/g, '');
    if (s.includes(',')) s = s.replaceAll('.', '').replace(',', '.');
    const n = Number(s); return Number.isFinite(n) ? n : 0;
  };
  const entities = () => read(KEY, []);
  const current = () => entities().find(e => e.id === localStorage.getItem(CURRENT) && e.type === 'Projekt') || null;
  const uid = () => crypto.randomUUID();
  function nextNumber(type) {
    const prefix = ({Kunde:'K',Projekt:'P',Aufgabe:'A',Dokument:'D'})[type] || 'D';
    const start = `${prefix}-${new Date().getFullYear()}-`;
    const max = entities().reduce((n,e) => e.number?.startsWith(start) ? Math.max(n,Number(e.number.slice(start.length)) || 0) : n, 0);
    return start + String(max + 1).padStart(4,'0');
  }
  function saveEntity(data) {
    const list = entities();
    if (!data.name?.trim() || !data.number?.trim()) throw new Error('Bezeichnung und Nummer fehlen.');
    if (list.some(e => e.number === data.number && e.id !== data.id)) throw new Error('Diese Nummer ist bereits vergeben.');
    if (data.type === 'Projekt' && !list.some(e => e.id === data.customerId && e.type === 'Kunde')) throw new Error('Bitte einen Kunden zuordnen.');
    const old = list.find(e => e.id === data.id);
    const entry = {...old,...data,id:old?.id || uid(),createdAt:old?.createdAt || new Date().toISOString(),updatedAt:new Date().toISOString()};
    const updated = list.filter(e => e.id !== entry.id).concat(entry);
    localStorage.setItem(KEY,JSON.stringify(updated));
    if(entry.type === 'Projekt') localStorage.setItem(CURRENT,entry.id);
    return entry;
  }
  function customers(header) {
    const all = entities(), rows = all.filter(e => e.type === 'Kunde');
    return `<section class="page" data-page="customers">${header}<section class="panel"><div class="filterbar"><input class="filter-input table-filter" aria-label="Kunden suchen" placeholder="Kunde, Nummer oder Ort suchen"></div><div class="data-table-wrap"><table class="data-table searchable-table"><thead><tr><th>Nummer</th><th>Kunde</th><th>Ansprechpartner</th><th>Ort</th><th>E-Mail</th><th>Projekte</th></tr></thead><tbody>${rows.map(e=>`<tr><td>${esc(e.number)}</td><td>${esc(e.name)}</td><td>${esc(e.contact)}</td><td>${esc(e.location)}</td><td>${esc(e.email)}</td><td>${all.filter(p=>p.customerId===e.id).length}</td></tr>`).join('') || '<tr><td colspan="6">Noch keine Kunden angelegt.</td></tr>'}</tbody></table></div></section></section>`;
  }
  function projects(header) {
    const all = entities(), rows = all.filter(e => e.type === 'Projekt');
    return `<section class="page" data-page="projects">${header}<div class="filterbar panel"><input class="filter-input project-filter" aria-label="Projekte suchen" placeholder="Projekt suchen"></div><div class="board project-board">${['Anfrage','Kalkulation','Ausführung','Abnahme','Abgeschlossen'].map(phase=>`<section class="board-column"><div class="board-head">${phase} <span>${rows.filter(e=>(e.phase||'Anfrage')===phase).length}</span></div>${rows.filter(e=>(e.phase||'Anfrage')===phase).map(e=>`<article class="project-card"><span class="project-no">${esc(e.number)}</span><h3>${esc(e.name)}</h3><p>${esc(e.location)}</p><div class="project-card-footer"><span>${esc(all.find(c=>c.id===e.customerId)?.name || 'Kunde fehlt')}</span><button class="text-button" data-action="open-project" data-project-id="${esc(e.id)}">Öffnen →</button></div></article>`).join('')}</section>`).join('')}</div>${rows.length ? '' : '<p>Noch keine Projekte angelegt. Zuerst einen Kunden erfassen.</p>'}</section>`;
  }
  function context(main) {
    const page = main.querySelector('.page');
    if (!page || ['customers','projects'].includes(page.dataset.page)) return;
    const projects = entities().filter(e=>e.type==='Projekt'), active=current();
    const section=document.createElement('section'); section.className='panel panel-pad';
    section.innerHTML=`<label for="active-project">Aktuelles Projekt</label><select id="active-project"><option value="">Projekt auswählen</option>${projects.map(e=>`<option value="${esc(e.id)}" ${e.id===active?.id?'selected':''}>${esc(e.number)} · ${esc(e.name)}</option>`).join('')}</select><small class="muted">Lokaler Testbetrieb · Projektbezogene Erfassung</small>`;
    page.querySelector('.page-navigation')?.after(section);
    section.querySelector('select').onchange=e=>{localStorage.setItem(CURRENT,e.target.value); window.dispatchEvent(new Event('dwp-project-changed'));};
  }
  function extendForm() {
    const form=document.querySelector('#quick-form');
    if(!form || form.querySelector('#record-customer')) return;
    const block=document.createElement('div');block.className='field-span';
    block.innerHTML='<div><label for="record-email">E-Mail Kunde</label><input id="record-email" type="email"></div><div><label for="record-customer">Kunde zum Projekt</label><select id="record-customer"></select></div><div><label for="record-phase">Projektphase</label><select id="record-phase"><option>Anfrage</option><option>Kalkulation</option><option>Ausführung</option><option>Abnahme</option><option>Abgeschlossen</option></select></div>';
    form.querySelector('.modal-actions').before(block);
  }
  function refreshForm() {
    extendForm();const type=document.querySelector('#record-type').value;
    const sel=document.querySelector('#record-customer');
    sel.innerHTML='<option value="">Kunde auswählen</option>'+entities().filter(e=>e.type==='Kunde').map(e=>`<option value="${esc(e.id)}">${esc(e.number)} · ${esc(e.name)}</option>`).join('');
    sel.parentElement.hidden=type!=='Projekt';sel.required=type==='Projekt';
    document.querySelector('#record-phase').parentElement.hidden=type!=='Projekt';
    document.querySelector('#record-email').parentElement.hidden=type!=='Kunde';
  }
  function formRecord() {
    const value=id=>document.querySelector(id).value.trim();
    return saveEntity({type:value('#record-type'),number:value('#record-number'),name:value('#record-name'),contact:value('#record-contact'),location:value('#record-location'),email:value('#record-email'),customerId:value('#record-customer'),phase:value('#record-phase')});
  }
  const effectivePrice = p => p.ep !== '' && p.ep != null ? number(p.ep) : number(p.material) + number(p.time) / 60 * number(read('dwp-calc-settings',{hourRate:0}).hourRate);
  window.DachWerkCore={effectivePrice,esc,number,read,entities,current,nextNumber,saveEntity,customers,projects,context,refreshForm,formRecord};
})();
