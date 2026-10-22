(function () {
  'use strict';
  const core=window.DWPProject, main=document.querySelector('#main-content');
  let db, current='dashboard', editing=null, search='', signatureStrokes=[], importPreview=null, excelSource=null, selectionKey=null, importRead=null;
  let priceSource=null, pricePreview=null, priceReadToken=0;
  let moduleTrail=[], renderingModule=false, subpage=false;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const money=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v||0);
  const verified=id=>window.DWPRemote?.active===true&&window.DWPVerification?.isVerified(id)===true;
  const verificationBadge=id=>verified(id)?'<strong class="dwp-module-verified">GRÜN · Fertig und geprüft</strong>':'<strong class="dwp-module-unverified">ROT · Nicht freigegeben</strong>';
  const btn=(label,action,id='',primary=false)=>`<button type="button" class="button button-${primary?'primary':'secondary'}" data-dwp="${action}" data-id="${esc(id)}" ${action==='open'&&verified(id)?'data-dwp-verified="true"':''}>${esc(label)}</button>`;
  const field=(label,control)=>`<div><label>${esc(label)}${control}</label></div>`;
  const panel=(title,body)=>`<section class="panel panel-pad dwp-panel"><h2>${esc(title)}</h2>${body}</section>`;
  const names=id=>{const r=db.get(id);return r ? (r.data.number?`${r.data.number} · `:'')+(r.data.name || r.data.title || r.data.text || '') : '';};
  const viewsToModule={customers:'customers',projects:'projects',services:'services',prices:'materials',calculation:'calculation',gaeb:'imports',measurements:'measurements',safety:'safety','site-docs':'diary',defects:'defects',documents:'documents',invoices:'invoices',communication:'correspondence','ai-check':'technical',expert:'expert',energy:'energy',rules:'knowledge',help:'help',users:'personnel',settings:'settings'};
  const special=new Set(['calculation','efb','offers','invoices','closing','controlling','imports']);
  try {db=new core.Store(localStorage);} catch(error) {
    main.innerHTML=panel('Bestand kann nicht geöffnet werden',`<p>${esc(error.message)}</p><p>Der vorhandene Speicher wird nicht überschrieben.</p>`);return;
  }
  const validModule=id=>Object.hasOwn(core.definitions,id) || ['dashboard','workflow','access','audit','help','settings'].includes(id);
  const moduleUrl=id=>{const url=new URL(window.location.href);url.searchParams.set('start','app');url.searchParams.set('module',validModule(id)?id:'dashboard');url.hash='';return url;};
  window.DWPWorkspace={get store(){return db;},open:openModule,start(){
    const requested=new URLSearchParams(window.location.search).get('module');
    moduleTrail=[];
    openModule(requested?(validModule(requested)?requested:'dashboard'):(viewsToModule[state.currentView] || 'dashboard'));
  },acceptServerState(data,user){
    const key='dwp-selected-project:'+user.id;
    let remembered=null;
    try{remembered=sessionStorage.getItem(key);}catch(_error){/* Selection remains usable when storage is unavailable. */}
    const selected=data.selectedProject || (selectionKey===key?db.data.selectedProject:null) || remembered;
    let raw=JSON.stringify(data);
    db=new core.Store({getItem:()=>raw,setItem:(_key,value)=>{raw=value;}});
    if(selected && db.get(selected)?.module==='projects')db.data.selectedProject=selected;
    selectionKey=key;rememberProject();
    state.currentUser=user.name || user.id;
  }};
  function rememberProject(){
    if(!selectionKey)return;
    try{
      if(db.project())sessionStorage.setItem(selectionKey,db.data.selectedProject);
      else sessionStorage.removeItem(selectionKey);
    }catch(_error){/* Remembering a selection must never prevent server work. */}
  }
  function updateNavigationCounts(){
    const counts={projects:db.list('projects').length,invoices:db.data.records.filter(r=>r.module==='incoming' && r.status!=='Erledigt').length};
    for(const [view,count] of Object.entries(counts)){
      const badge=document.querySelector(`.nav-item[data-view="${view}"] .nav-count, .nav-item[data-view="${view}"] .nav-alert`);
      if(badge){badge.textContent=String(count);badge.hidden=count===0;}
    }
  }
  function mutate(method,args,after=()=>{}) {
    if(window.DWPRemote?.active)return window.DWPRemote.run(method,args).then(after).catch(showError);
    if(window.DWPRemote)throw Error('Bitte zuerst zentral anmelden.');
    const result=db[method](...args);after(result);return result;
  }
  function selectProject(id) {
    if(window.DWPRemote?.active){if(db.get(id)?.module!=='projects')throw Error('Projekt fehlt.');db.data.selectedProject=id;}
    else db.select(id);
    rememberProject();
  }
  function projectBar() {
    const projects=db.list('projects'),central=window.DWPRemote?.active;
    const hint=db.project()?names(db.project().data.customerId):projects.length?'Bitte ein vorhandenes Projekt auswählen.':central?'In diesem Benutzerbestand sind noch keine Projekte gespeichert.':'Zuerst Kunde und Projekt anlegen';
    return `<div class="dwp-project-bar"><label>Aktuelles Projekt<select id="dwp-project" ${projects.length?'':'disabled'}><option value="">${projects.length?'Projekt auswählen':'Noch kein Projekt vorhanden'}</option>${projects.map(r=>`<option value="${esc(r.id)}" ${db.data.selectedProject===r.id?'selected':''}>${esc(r.data.name)}</option>`).join('')}</select></label><p class="dwp-project-context">${esc(hint)}</p><div class="dwp-project-actions">${central?btn('Projekte neu laden','server-reload'):''}${btn('+ Kunde','open','customers')}${btn('+ Projekt','open','projects')}</div></div>`;
  }
  function header(name) {
    return `<nav class="dwp-module-navigation" aria-label="Modulnavigation">${btn('← Zurück','module-back')}${btn('Alle Module','open','dashboard')}<a class="button button-secondary" data-dwp="direct-link" href="${esc(moduleUrl(current).href)}">Direktlink</a></nav><header class="page-header"><div><span class="eyebrow">DachWerk Pro · Verbundene Arbeitsmodule</span><h1 tabindex="-1">${esc(name)}</h1><p>Gemeinsame Projektakte mit nachvollziehbaren Freigaben und Dokumentfassungen.</p></div><div class="header-actions">${btn('Alle Module','open','dashboard')}${btn('Workflow','open','workflow')}${btn('Zugriff und Nutzung','open','access')}${btn('Logbuch','open','audit')}${btn('Sicherung','backup')}</div></header><p class="dwp-local-note">Lokaler Testbetrieb · Daten bleiben in diesem Browser. Produktive Benutzerrechte, Cloud-Ablage und Schnittstellen sind noch nicht freigegeben.</p>${projectBar()}`;
  }
  function shell(name,body) {
    subpage=!renderingModule;
    cancelImportRead();
    updateNavigationCounts();
    main.innerHTML=`<section class="page dwp-workspace">${header(name)}<p id="dwp-error" role="alert" class="dwp-error"></p>${body}</section>`;
    if(window.DWPRemote?.active)main.querySelector('.dwp-local-note').textContent='Zentrale Projektakte · Änderungen nach Serverspeicherung. Anmeldungen und Modulaufrufe werden protokolliert.';
    state.unsavedChanges=false;
    main.querySelector('h1')?.focus({preventScroll:true});
  }
  function showError(e) {const el=main.querySelector('#dwp-error');if(el){el.textContent=e.message || String(e);el.scrollIntoView({block:'nearest'});}}
  function notice(text) {showToast('DachWerk Pro',text);}
  function table(headers,rows) {
    return `<div class="data-table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(cells=>`<tr>${cells.map((c,i)=>`<td${/^(Menge|Einheit|EP|GP|Netto|Brutto|Betrag|USt)( |$)/.test(headers[i])?' class="dwp-numeric"':''}>${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">Noch keine Einträge im aktuellen Bestand.</td></tr>`}</tbody></table></div>`;
  }
  function workflowPanel() {
    const flow=db.workflow();
    const phases=core.definitions.projects.fields.find(f=>f.key==='phase').options;
    const next=phases[phases.indexOf(flow.phase)+1];
    return panel('Projektübergaben',`<p>Aktuelle Phase: <strong>${esc(flow.phase || 'Kein Projekt')}</strong>. Jeder Bereich arbeitet mit derselben Projektakte.</p>${table(['Schritt','Module','Bestand'],core.stages.map(stage=>[esc(stage.name),stage.modules.map(id=>btn(core.definitions[id].name,'open',id)).join(' '),esc(flow.modules.filter(m=>stage.modules.includes(m.id)).reduce((n,m)=>n+m.count,0)+' Vorgänge')]))}${next?btn('An nächste Phase übergeben: '+next,'advance-phase',next,true):flow.phase==='Abgeschlossen'?'<form id="dwp-reopen" class="quick-form"><label>Grund für Wiederöffnung<input name="reason" required></label><button class="button" type="submit">Projekt wieder öffnen</button></form>':''}`)+panel('Offene Übergaben und Abschlussprüfungen',`${btn('Nächsten offenen Bereich öffnen','open',flow.next,true)}${table(['Bereich','Prüfpunkt'],flow.issues.map(i=>[btn(core.definitions[i.module].name,'open',i.module),esc(i.message)]))}`);
  }
  function accessPanel() {
    if(!window.DWPRemote?.active)return panel('Zugriffsschutz','<p>Anmelde- und Modulprotokoll sowie Gerätefreigaben sind ausschließlich in der zentralen Betriebsfassung verfügbar. Im lokalen Modultest werden keine produktiven Anmeldungen protokolliert.</p>');
    window.DWPRemote.accessReport().then(report=>{
      const node=main.querySelector('#dwp-access-report');if(!node)return;
      node.innerHTML=panel('Modulnutzung der letzten 30 Tage',table(['Benutzer','Modul','Aufrufe','Zuletzt'],report.usage.map(r=>[esc(r.actor_name || r.actor),esc(core.definitions[r.module_id]?.name || r.module_id),esc(r.opens),esc(new Date(r.last_used).toLocaleString('de-DE'))])))+panel('Anmeldungen und Zugriffsvorgänge',table(['Wann','Wer','Vorgang','Ergebnis','Browser'],report.events.map(r=>[esc(new Date(r.created_at).toLocaleString('de-DE')),esc(r.actor_name || r.actor),esc(r.event_type),esc(r.outcome),esc(r.user_agent)])))+panel('Freigegebene Exportgeräte',table(['Gerät','Freigabe'],report.devices.map(d=>[esc(d.slot),esc(new Date(d.paired_at).toLocaleString('de-DE'))])));
    }).catch(showError);
    return panel('Eigentümer-Zugriff',`<p>Nur Stephan kann dieses Protokoll lesen. Modulaufrufe werden gezählt, nicht die aktive Arbeitszeit. Direkte API-Schreibvorgänge stehen zusätzlich im Projektlogbuch.</p><div id="dwp-access-report">Protokoll wird geladen …</div><form id="dwp-pair" class="quick-form">${field('Einmaliger Gerätefreigabecode', '<input name="token" type="password" autocomplete="off" required>')}<button class="button button-primary" type="submit">Dieses Gerät freigeben</button></form><p>Die kurz gültigen Codes werden außerhalb der App für iPhone oder HP-Laptop ausgestellt. Auf anderen Geräten bleiben Exporte gesperrt.</p>`);
  }
  function dashboard() {
    const p=db.project(), stats=p?db.controlling():null;
    shell('Alle Arbeitsmodule',`${p?panel('Aktuelles Projekt',`<h3>${esc(p.data.name)}</h3><p>${esc(names(p.data.customerId))} · ${esc(p.data.phase)}</p><div class="dwp-metrics"><span>LV: ${db.list('lv').length} Positionen</span><span>Kalkulation: ${money(db.calculation().net)}</span><span>Ist-Kosten: ${money(stats.actual)}</span><span>Offener Zahlungsbetrag: ${money(stats.outstanding)}</span></div>`):panel('Projekt starten',`<p>Lege zuerst einen Kunden und danach ein Projekt an. Wähle das Projekt oben aus; alle Fachvorgänge folgen dieser Zuordnung.</p>`)}${p?panel('Nächster Arbeitsschritt',`${btn(core.definitions[db.workflow().next].name,'open',db.workflow().next,true)}${btn('Übergaben prüfen','open','workflow')}`):''}<p class="dwp-acceptance-summary">Produktionsabnahme: ${core.modules.filter(m=>verified(m.id)).length} von ${core.modules.length} Modulen GRÜN. ${window.DWPRemote?.active?'Offene Prüfungen stehen am jeweiligen Modul.':'Im lokalen Testbetrieb werden keine Produktionsfreigaben angezeigt.'}</p><label>Modul suchen<input id="dwp-module-search" type="search" placeholder="z. B. Aufmaß, Rechnung, Gutachten" value="${esc(search)}"></label><div class="module-grid dwp-module-grid">${core.modules.map((m,i)=>`<article class="module-card" data-dwp-card data-name="${esc(m.name.toLocaleLowerCase('de'))}"><span class="eyebrow">${String(i+1).padStart(2,'0')} · ${m.scope==='global'?'Stammdaten':'Projektakte'}</span><h3>${esc(m.name)}</h3><p>${verificationBadge(m.id)}</p><p class="dwp-module-reason">${esc(verified(m.id)?'Produktiv abgenommen am '+window.DWPVerification.modules[m.id].checkedAt:window.DWPVerification?.modules[m.id]?.remaining || 'Dokumentierte Produktions- und Geräteabnahme ausstehend.')}</p><p>${db.list(m.id).length} gespeicherte Vorgänge${['imports','pricelists','correspondence','documents','tenders','acceptance','efb'].includes(m.id)?' · Spezialfunktionen in Entwicklung':''}</p>${btn('Öffnen','open',m.id)}</article>`).join('')}</div>`);
    filterModules();
  }
  function searchRecords(query) {
    if(state.unsavedChanges && !confirm('Ungespeicherte Eingaben verwerfen und Suche öffnen?'))return;
    const value=query.trim().toLocaleLowerCase('de');if(!value)return;
    const matches=db.data.records.filter(r=>JSON.stringify(r.data).toLocaleLowerCase('de').includes(value));
    current='search';state.currentView='search';
    shell('Suche im gemeinsamen Bestand',panel(`Ergebnisse für „${query.trim()}“`,table(['Vorgang','Bereich','Projekt','Status','Aktion'],matches.map(r=>[esc(names(r.id)),esc(core.definitions[r.module].name),esc(db.get(r.projectId)?.data.name || 'Stammdaten'),esc(r.status),btn('Öffnen','search-open',r.id)]))));
  }
  function filterModules() {main.querySelectorAll('[data-dwp-card]').forEach(c=>{c.hidden=!c.dataset.name.includes(search.toLocaleLowerCase('de'));});}
  function optionsFor(type) {
    const mod={customer:'customers',position:'lv',material:'materials',employee:'personnel',offer:'offers',purchase:'purchase',invoice:'invoices',subcontract:'subcontracts'}[type];
    if(type==='record')return db.data.records.filter(r=>r.projectId===db.data.selectedProject || !r.projectId);
    return db.list(mod).filter(r=>!['material','offer'].includes(type)||r.status==='Freigegeben');
  }
  function input(f,value) {
    const attr=`name="${f.key}" ${f.required?'required':''}`;
    if(f.type==='contacts')return `<textarea ${attr} rows="4" placeholder="Max Muster | Bauleitung | max@example.de | 0421 123456">${esc(Array.isArray(value)?value.map(c=>[c.name,c.role,c.email,c.phone].join(' | ')).join('\n'):value || '')}</textarea>`;
    if(f.key==='recipient') {
      const customer=db.get(db.project()?.data.customerId)?.data;
      const contacts=[...(customer?.email?[{name:customer.contact || customer.name,role:customer.contactRole,email:customer.email}]:[]),...(customer?.contacts || [])].filter(c=>c.email);
      return `<input ${attr} type="email" list="dwp-contact-emails" value="${esc(value || '')}"><datalist id="dwp-contact-emails">${contacts.map(c=>`<option value="${esc(c.email)}">${esc(c.name)} · ${esc(c.role)}</option>`).join('')}</datalist>`;
    }
    if(f.type==='checkbox') return `<input ${attr} type="checkbox" ${value?'checked':''}>`;
    if(f.type==='textarea') return `<textarea ${attr} rows="3">${esc(value)}</textarea>`;
    if(f.type==='select') return `<select ${attr}>${f.options.map(v=>`<option ${v===value?'selected':''}>${esc(v)}</option>`).join('')}</select>`;
    if(['customer','position','material','employee','offer','purchase','invoice','subcontract','record'].includes(f.type)) return `<select ${attr}><option value="">Bitte auswählen</option>${optionsFor(f.type).map(r=>`<option value="${esc(r.id)}" ${r.id===value?'selected':''}>${esc(names(r.id))}</option>`).join('')}</select>`;
    return `<input ${attr} type="${f.type==='number'?'text':f.type}" ${f.type==='number'?'inputmode="decimal"':''} value="${esc(value ?? '')}">`;
  }
  function defaults(module) {
    return {date:new Date().toISOString().slice(0,10),unit:'m²',qty:1,length:1,width:1,factor:1,consumption:1,tax:19,rate:db.data.settings.wage,phase:'Erfassung',productiveHours:db.data.settings.capacity?.productiveHours || 1,...(module==='lv'?{useNuMarkup:true,subcontractMarkup:15}:{})};
  }
  function recordForm(mod) {
    const r=editing?db.get(editing):null, values=r?.pendingPrice?.data || r?.data || defaults(mod.id);
    return panel(r?'Vorgang bearbeiten':'Vorgang anlegen',`<form id="dwp-record" class="quick-form"><input type="hidden" name="module" value="${esc(mod.id)}">${mod.fields.map(f=>field(f.label,input(f,values[f.key]))).join('')}${field('Status',`<select name="status">${core.statuses.map(s=>`<option ${s===(r?.status || 'Neu')?'selected':''}>${esc(s)}</option>`).join('')}</select>`)}${field('Verantwortlich',`<input name="owner" value="${esc(r?.owner || '')}" placeholder="Name / Rolle">`)}${field('Rückmeldefrist',`<input name="due" type="date" value="${esc(r?.due)}">`)}<div class="field-span dwp-actions"><button class="button button-primary" type="submit">Speichern</button>${r?btn('Bearbeitung abbrechen','cancel'):''}</div></form>`);
  }
  function lvTreePanel() {
    const tree=db.lvTree();
    const renderNode=node=>{
      const positionRows=node.positions.map(p=>`<li class="dwp-lv-position" data-lv-position="${esc(p.id)}"><span><strong>${esc(p.number)}</strong> · ${esc(p.text)}</span><span>${esc(p.qty)} ${esc(p.unit)} · ${esc(p.kind || 'Hauptleistung')} · ${money(p.gp)}</span></li>`).join('');
      return `<li class="dwp-lv-node" data-lv-level="${node.level}" data-lv-path="${esc(node.path)}"><details open><summary><strong>${esc(node.label)}</strong> <span>Ebene ${node.level} · Zwischensumme netto ${money(node.net)}</span></summary>${positionRows?`<ul class="dwp-lv-positions">${positionRows}</ul>`:''}${node.children.length?`<ul class="dwp-lv-branches">${node.children.map(renderNode).join('')}</ul>`:''}</details></li>`;
    };
    return panel('Hierarchischer LV-Baum',`<p>Bis zu fünf aufklappbare Titelstufen. Die Zwischensumme einer Gruppe enthält ihre Untergruppen bereits; sie wird nicht erneut zum Gesamtbetrag addiert. Bedarfs- und Alternativpositionen erscheinen zur Prüfung, jedoch nicht in den Grundsummen.</p>${tree.length?`<ul class="dwp-lv-branches" aria-label="LV-Titelhierarchie">${tree.map(renderNode).join('')}</ul>`:'<p>Für dieses Projekt sind noch keine LV-Positionen vorhanden.</p>'}`);
  }
  function records(mod) {
    const list=db.list(mod.id);
    const rows=list.map(r=>[
      `<strong>${esc(names(r.id))}</strong><small>${esc(r.id.slice(0,8))}</small>`,
      `<span class="status-pill ${r.status==='Freigegeben'?'status-green':'status-grey'}">${esc(r.status)}</span>`,
      esc(r.owner),esc(r.due),`${btn(r.pendingPrice?'Importpreis prüfen':'Bearbeiten','edit',r.id)}${btn('Drucken / PDF','print',r.id)}${['documents','defects','expert','acceptance','diary'].includes(mod.id)?btn('Datei / Foto','attach',r.id):''}${['acceptance','times'].includes(mod.id)?btn(`Unterschrift${r.signatures?.length?' ('+r.signatures.length+')':''}`,'signature',r.id):''}${mod.id==='services'?btn('Ins LV','service-lv',r.id):''}${r.importFinding && r.status!=='Erledigt'?btn('Wandlung prüfen','convert-import',r.id):''}`
    ]);
    let summary='';
    if(mod.id==='contract')summary=panel('Automatische LV-Datenprüfung',`<p>Prüft Mengen, Gliederung, Nachtragsnummern, Kostenansätze und Deckung. Befunde können einzeln als Rückfrage gespeichert werden. Vertragstexte und Fachregeln werden anhand der angegebenen Quelle separat geprüft.</p>${table(['Position','Befund','Rückfrage','Aktion'],db.contractReview().map(f=>[esc(f.number),esc(f.finding),esc(f.question),esc(f.reviewState)+' '+btn('Rückfrage anlegen','contract-finding',f.positionId+'/'+f.code)]))}`);
    if(mod.id==='lv') summary=lvTreePanel()+panel('LV-Gliederung und Zwischensummen',`<p>Gliederung je Position als Gewerk / Titel / Abschnitt erfassen. Übergeordnete Summen enthalten ihre Unterabschnitte; sie werden nicht zusätzlich zur Kalkulationssumme addiert.</p>${table(['Gliederung','Ebene','Positionen','Netto'],db.lvGroups().map(g=>[esc(g.path),esc(g.level),esc(g.positions),money(g.net)]))}`);
    if(mod.id==='measurements') summary=panel('Freigegebenes Aufmaß und Abweichung',table(['Position','LV-Menge','Aufmaß','Differenz'],db.list('lv').map(r=>[esc(r.data.number),`${r.data.qty} ${esc(r.data.unit)}`,`${db.measured(r.id)} ${esc(r.data.unit)}`,esc(core.round(db.measured(r.id)-r.data.qty))])));
    if(mod.id==='operating') summary=panel('Kosten je produktiver Stunde',table(['Kostenansatz','€/h'],list.map(r=>[esc(r.data.title),money(r.data.annualCost/r.data.productiveHours)])));
    if(mod.id==='operating') {
      const c=db.data.settings.capacity || {year:new Date().getFullYear(),headcount:1,weeklyHours:40,leaveDays:30,sickDays:0,trainingDays:0,nonproductivePercent:0,holidayDates:''};
      summary+=panel('Jährliche Produktivstunden',`<p>Fünftagewoche Montag–Freitag. Urlaub, Krankheit und Schulung je Vollzeitkraft; Personalanzahl als Vollzeitäquivalente. Feiertage des jeweiligen Standorts ausdrücklich eintragen. Wochenenden und doppelte Feiertage werden nicht mehrfach abgezogen.</p><form id="dwp-capacity" class="quick-form">${[['year','Jahr'],['headcount','Vollzeitäquivalente'],['weeklyHours','Wochenstunden'],['leaveDays','Urlaubstage'],['sickDays','Krankheitstage'],['trainingDays','Schulungstage'],['nonproductivePercent','Sonstiger unproduktiver Anteil %']].map(([key,label])=>field(label,`<input name="${key}" inputmode="decimal" value="${esc(c[key])}" required>`)).join('')}${field('Feiertage YYYY-MM-DD (eine Zeile je Datum)',`<textarea name="holidayDates" rows="5">${esc(c.holidayDates)}</textarea>`)}<button class="button button-primary" type="submit">Produktivstundenmodell speichern</button></form>${c.productiveHours?`<p>Kalenderwerktage ${c.weekdays} · Feiertage an Werktagen ${c.holidayDays} · verfügbare Arbeitstage je Kraft ${c.availableDays} · <strong>${c.productiveHours} produktive Stunden gesamt</strong></p>`:''}`);
    }
    if(mod.id==='operating')summary+=panel('Kalkulationsbasis übernehmen',`<p>Freigegebene Kosten je produktiver Stunde werden addiert und als Vollkostensatz übernommen. Der AGK-Zuschlag wird dabei auf 0 gesetzt. Dieselben Kosten nicht mehrfach erfassen.</p>${btn('Vollkostensatz übernehmen','operating-rate')}`);
    if(mod.id==='materials') summary=panel('Preisbindung und Systemprüfung',`<p>Preisbindung gilt einschließlich des angegebenen Tages. Ohne Enddatum ist keine Preisbindung dokumentiert. Eine Systemzuordnung benötigt einen Eignungsnachweis zum konkreten Aufbau. Offene Prüfungen sperren neue Angebotsfassungen mit diesem Artikel.</p>${table(['Artikel / Nummer','Lieferant / Quelle','Preisstand / Bindung','System','Herstellerunterlage','Prüfbedarf'],list.map(r=>[`${esc(r.data.name)}<br>${esc(r.data.article)}`,`${esc(r.data.supplier)}<br>${esc(r.data.source)}`,`${esc(r.data.priceDate)}<br>${esc(r.data.validUntil || 'Keine Preisbindung dokumentiert')}`,`${esc(r.data.system)}<br>${esc(r.data.compatibility || 'Keine Systemprüfung dokumentiert')}`,r.data.documentUrl?`<a href="${esc(r.data.documentUrl)}" target="_blank" rel="noopener noreferrer">Herstellerunterlage</a><br>${esc(r.data.documentEdition)}`:'Keine Unterlage hinterlegt',esc(db.materialChecks(r).join('; ') || 'Keine offene Preis- oder Systemprüfung')]))}`)+panel('Preishistorie',table(['Artikel','Aktuell','Vorherige Preisstände'],list.map(r=>[esc(r.data.name),money(r.data.price),esc((r.history || []).slice(-2).map(p=>`${p.priceDate}: ${money(p.price)}; Bindung: ${p.validUntil || 'nicht dokumentiert'}; ${p.source}`).join(' · '))])));
    if(mod.id==='energy') summary=panel('Variantenvergleich',table(['Bauteil','ΔU × Fläche (W/K)'],list.map(r=>[esc(r.data.component),esc(core.round((r.data.uBefore-r.data.uAfter)*r.data.area))]))+'<p>Dies ist ein Bauteilvergleich, kein Energieausweis und kein Förderfähigkeitsnachweis.</p>');
    if(['purchase','logistics'].includes(mod.id))summary+=panel('Materialbedarf und Lieferstand',table(['Artikel','Bedarf','Bestellt','Geliefert','Noch zu bestellen','Aktion'],db.materialDemand().map(d=>[esc(d.name),`${d.quantity} ${esc(d.unit)}`,esc(d.ordered),esc(d.delivered),esc(d.remaining),d.remaining>0?btn('Bestellentwurf anlegen','demand-purchase',d.materialId):'Bedarf gedeckt'])));
    if(['purchase','logistics'].includes(mod.id))summary+=deliveryPanel();
    if(['materials','suppliers'].includes(mod.id))summary+=quotePanel();
    if(mod.id==='personnel')summary+=schedulePanel();
    if(mod.id==='pricelists')summary+=priceImportPanel();
    let integration='';
    const missing={pricelists:'CSV, XLSX und XLS (Excel 97–2003) werden mit Blatt- und Spaltenzuordnung, Preisberechnung und verbindlicher Vorschau übernommen. Importierte Preise müssen einzeln freigegeben werden. DATANORM-Parser und Geräteabnahme sind noch offen.',correspondence:'Nachrichten werden als Entwurf geführt. Ein Versand- oder Zustellnachweis entsteht erst mit einer eingerichteten Mailanbindung.',documents:'Fotos und PDF können zugeordnet werden. Scannersteuerung und automatische OCR sind noch nicht angeschlossen.',tenders:'Vergaben mit Fundstelle und Frist können erfasst werden. Der automatische Quellenscan ist noch nicht angeschlossen.',acceptance:'Handschriftliche Unterschriften werden mit dem angezeigten Protokollstand gespeichert. Zentrale Originalablage und qualifizierte elektronische Signatur sind nicht angeschlossen.',personnel:'Einsatzzeiträume werden auf Doppelbelegung geprüft. Sensible Lohn-, Steuer- und SV-Stammdaten benötigen geschützte serverseitige Rollen.'};
    if(missing[mod.id]) integration=panel('Funktionsstand',`<p>${esc(missing[mod.id])}</p>`);
    const attachments=list.flatMap(r=>(r.attachments || []).map(a=>`<li>${esc(names(r.id))} · ${esc(a.name)} ${btn('Öffnen','file',`${r.id}/${a.id}`)}</li>`));
    shell(mod.name,`${integration}${recordForm(mod)}${panel('Gespeicherte Vorgänge',table(['Vorgang','Status','Verantwortlich','Frist','Aktionen'],rows))}${summary}${attachments.length?panel('Zugeordnete Dateien',`<ul>${attachments.join('')}</ul>`):''}`);
  }
  function deliveryPanel() {
    const rows=db.deliverySchedule();
    return panel('Liefertermine und Warnungen',`<p>Auswertung beim Öffnen mit dem aktuellen Tagesdatum. Nur freigegebene Lieferungen zählen. Eine vereinbarte Minderlieferung kann den Vorgang innerhalb der Toleranz abschließen; die Differenz zur Bestellmenge bleibt sichtbar. Ohne Vereinbarung gilt die genaue Bestellmenge. Hintergrundbenachrichtigungen sind nicht eingerichtet.</p>${table(['Bestellung / Lieferant','Termin','Status','Bestellt / Geliefert','Offen zur Bestellmenge','Vereinbarter Mengenbereich'],rows.map(d=>[esc(d.title)+'<br>'+esc(d.supplier),esc(d.due || 'Kein Termin'),`<strong>${esc(d.state)}</strong>`,`${esc(d.ordered)} / ${esc(d.delivered)} ${esc(d.unit)}`,esc(d.remaining),`${esc(d.minimum)} – ${esc(d.maximum)} ${esc(d.unit)}`]))}`);
  }
  function quotePanel() {
    const materials=db.list('materials'),suppliers=db.list('suppliers');
    const options=records=>`<option value="">Bitte auswählen</option>${records.map(r=>`<option value="${esc(r.id)}">${esc(names(r.id))}</option>`).join('')}`;
    return panel('Lieferantenpreise vergleichbar erfassen',`<p>Preis und Fracht beziehen sich auf ein Preisgebinde, z. B. eine Rolle oder 100 Stück. Gebindeinhalt in der Einheit des Artikels angeben. EK je Artikeleinheit = (Preis nach Rabatt + Fracht) / Gebindeinhalt.</p><form id="dwp-quote" class="quick-form">${field('Artikel',`<select name="materialId" required>${options(materials)}</select>`)}${field('Lieferant',`<select name="supplierId" required>${options(suppliers)}</select>`)}${field('Listenpreis je Preisgebinde netto',`<input name="price" inputmode="decimal" required>`)}${field('Rabatt %',`<input name="discount" inputmode="decimal" value="0" required>`)}${field('Fracht je Preisgebinde netto',`<input name="freight" inputmode="decimal" value="0" required>`)}${field('Bezeichnung Preisgebinde',`<input name="packageUnit" placeholder="z. B. Rolle, Sack, 100 Stück">`)}${field('Artikeleinheiten je Preisgebinde',`<input name="baseQuantity" inputmode="decimal" value="1" required>`)}${field('Preisbindung bis einschließlich',`<input name="validUntil" type="date">`)}${field('Preisstand',`<input name="date" type="date" required value="${new Date().toISOString().slice(0,10)}">`)}${field('Quelle / Angebotsnummer',`<input name="source" required>`)}<button class="button button-primary" type="submit">Preisvergleich speichern</button></form>`)+panel('Vergleich nach effektivem Einkaufspreis',table(['Artikel','Lieferant / Quelle','Preisgebinde','Preisstand / Bindung','EK je Artikeleinheit','Übernahme'],materials.flatMap(m=>db.quotes(m.id).map(q=>[esc(m.data.name),`${esc(q.supplier)}<br>${esc(q.source)}`,`${esc(q.packageUnit || q.unit)} = ${esc(q.baseQuantity ?? 1)} ${esc(q.unit)}`,`${esc(q.date)}<br>${esc(q.validUntil || 'Keine Preisbindung dokumentiert')}`,`${money(q.effectivePrice)} / ${esc(q.unit)}`,q.expired?'Preisbindung abgelaufen':q.future?'Zukünftiger Preisstand':btn('Artikelpreis freigeben','use-quote',`${q.supplierId}/${q.id}`)]))));
  }
  function schedulePanel() {
    const options=records=>`<option value="">Bitte auswählen</option>${records.map(r=>`<option value="${esc(r.id)}" ${r.id===db.data.selectedProject?'selected':''}>${esc(names(r.id))}</option>`).join('')}`;
    return panel('Einsatz planen',`<p>Zeiträume werden einschließlich Anfangs- und Endtag reserviert. Doppelbelegungen werden projektübergreifend verhindert. Feiertage und Teilzeitschichten sind noch nicht berücksichtigt.</p><form id="dwp-schedule" class="quick-form">${field('Mitarbeiter',`<select name="employeeId" required>${options(db.list('personnel'))}</select>`)}${field('Projekt',`<select name="projectId" required>${options(db.list('projects'))}</select>`)}${field('Von',`<input name="start" type="date" required>`)}${field('Bis',`<input name="end" type="date" required>`)}${field('Aufgabe',`<input name="task">`)}<button class="button button-primary" type="submit">Einsatz speichern</button></form>`)+panel('Einsatzübersicht aller Projekte',table(['Mitarbeiter','Projekt','Von','Bis','Aufgabe','Status'],db.list('personnel').flatMap(e=>(e.assignments || []).map(a=>[esc(e.data.name),esc(names(a.projectId)),esc(a.start),esc(a.end),esc(a.task),a.cancelled?'Storniert':btn('Einsatz stornieren','cancel-schedule',`${e.id}/${a.id}`)]))));
  }
  function priceImportPanel() {
    priceSource=null;pricePreview=null;priceReadToken++;
    return panel('Excel- und CSV-Preislisten prüfen',`<p>CSV, XLSX und XLS (Excel 97–2003), jeweils bis 1 MB. Blatt, Überschriften und Spalten vor der Übernahme prüfen. Alle Datenzeilen unterhalb der Überschrift müssen fehlerfrei sein. Formeln werden nicht ausgeführt. DATANORM ist noch offen.</p><p>Preis und Fracht gelten je Preisgebinde; der Gebindeinhalt wird in Artikeleinheiten angegeben. Der Import berechnet daraus den Einkaufspreis je Artikeleinheit. Bestehende freigegebene Preise bleiben bis zur Einzelpreisfreigabe erhalten.</p><div id="dwp-price-drop" class="dwp-panel"><p>Preisliste hier ablegen oder Datei auswählen.</p><label>Datei auswählen<input id="dwp-price-file" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label></div><p id="dwp-price-progress" role="status" aria-live="polite"></p><form id="dwp-price-import" class="quick-form">${field('Quelle / Dateiname',`<input name="source" required>`)}${field('Preisstand',`<input name="priceDate" type="date" required value="${new Date().toISOString().slice(0,10)}">`)}${field('Preisbindung bis einschließlich',`<input name="validUntil" type="date">`)}${field('Lieferant für leere Lieferantenspalten',`<input name="supplier">`)}<div class="field-span"><label>CSV-Inhalt (alternativ zur Datei)<textarea name="csv" id="dwp-price-csv" rows="5" placeholder="name;unit;price;article;manufacturer&#10;Abdichtungsbahn;m²;9,20;ART001;Hersteller"></textarea></label>${btn('CSV-Spalten zuordnen','price-csv')}</div><div class="field-span" id="dwp-price-controls"></div><div class="field-span dwp-actions">${btn('Preisvorschau prüfen','price-preview')}<button class="button button-primary" type="submit">Preisliste zur Prüfung übernehmen</button></div></form><div id="dwp-price-preview"></div>`);
  }
  function priceControls(sheetIndex=0,headerRow) {
    const sheet=priceSource.book.sheets[sheetIndex];if(!sheet)throw Error('Preisliste: Blatt fehlt.');
    headerRow=headerRow ?? sheet.rows.find(r=>r.values.some(c=>c && String(c.value).trim()))?.index;
    const header=sheet.rows.find(r=>r.index===headerRow);if(!header)throw Error('Preisliste: Überschriftenzeile fehlt.');
    const suggested=window.DWPMaterialPriceImport.suggest(header.values);
    const columns=header.values.map((c,i)=>c?{i,label:c.address+' · '+String(c.value)}:null).filter(Boolean);
    document.querySelector('#dwp-price-controls').innerHTML=`${field('Arbeitsblatt',`<select id="dwp-price-sheet">${priceSource.book.sheets.map((sheet,i)=>`<option value="${i}" ${sheetIndex===i?'selected':''}>${esc(sheet.name)}${sheet.hidden?' (ausgeblendet)':''}</option>`).join('')}</select>`)}${field('Zeile mit Spaltenüberschriften',`<input id="dwp-price-header" type="number" min="1" max="10000" value="${headerRow}">`)}<div class="quick-form">${Object.entries(window.DWPMaterialPriceImport.fields).map(([key,label])=>field(label+(['name','unit','price'].includes(key)?' *':''),`<select data-price-map="${key}"><option value="-1">Nicht zugeordnet</option>${columns.map(c=>`<option value="${c.i}" ${suggested[key]===c.i?'selected':''}>${esc(c.label)}</option>`).join('')}</select>`)).join('')}</div>`;
    pricePreview=null;
  }
  function priceInput() {
    const form=document.querySelector('#dwp-price-import');
    const values=Object.fromEntries(new FormData(form));delete values.csv;
    if(!priceSource || priceSource.csv!==undefined && priceSource.csv!==document.querySelector('#dwp-price-csv').value)throw Error('CSV-Spalten zuerst neu zuordnen.');
    if(priceSource.loading)throw Error('Bitte das Einlesen der Datei abwarten.');
    return {values,sheet:Number(document.querySelector('#dwp-price-sheet').value),header:Number(document.querySelector('#dwp-price-header').value),mapping:Object.fromEntries([...form.querySelectorAll('[data-price-map]')].map(s=>[s.dataset.priceMap,Number(s.value)])),token:priceReadToken,revision:db.data.revision};
  }
  function priceReport(input) {
    const report=window.DWPMaterialPriceImport.report(priceSource.book,input.sheet,input.header,input.mapping);
    if(report.findings.length)throw Error('Preisliste korrigieren: '+report.findings.map(f=>`Zeile ${f.row}: ${f.reason}`).join(' · '));
    let raw=db.backup();const staged=new core.Store({getItem:()=>raw,setItem:(_key,value)=>{raw=value;}});
    staged.importMaterials(report.rows,input.values);
    return report;
  }
  async function readPriceFile(file) {
    if(!file)return;
    const token=++priceReadToken,form=document.querySelector('#dwp-price-import');
    priceSource={loading:true};pricePreview=null;
    document.querySelector('#dwp-price-controls').textContent='';document.querySelector('#dwp-price-preview').textContent='';
    document.querySelector('#dwp-price-csv').readOnly=false;
    const progress=document.querySelector('#dwp-price-progress');progress.textContent='Datei wird gelesen …';
    const isCurrent=()=>token===priceReadToken && document.querySelector('#dwp-price-import')===form;
    try {
      if(file.size>1_000_000)throw Error('Preisliste: Datei bis 1 MB erforderlich.');
      let book,csv;
      if(/\.xlsx$/i.test(file.name))book=window.DWPSpreadsheetImport.parse(await file.arrayBuffer());
      else if(/\.xls$/i.test(file.name))book=await window.DWPXlsImport.read(await file.arrayBuffer());
      else if(/\.csv$/i.test(file.name)){csv=await file.text();book=window.DWPMaterialPriceImport.csv(csv);}
      else throw Error('Bitte CSV, XLSX oder XLS (Excel 97–2003) auswählen.');
      if(!isCurrent())return;
      priceSource={book,csv};form.elements.source.value=file.name;
      document.querySelector('#dwp-price-csv').value=csv ?? '';document.querySelector('#dwp-price-csv').readOnly=csv===undefined;
      priceControls();progress.textContent='Datei gelesen. Spaltenzuordnung und Preisvorschau prüfen.';state.unsavedChanges=true;
    }catch(error){if(isCurrent()){priceSource=null;progress.textContent=error.message;showError(error);}}
  }
  function signatureSvg(signature) {
    return `<svg class="dwp-signature-image" viewBox="0 0 640 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Handschriftliche Unterschrift">${signature.strokes.map(stroke=>`<polyline points="${stroke.map(p=>`${p[0]*640},${p[1]*240}`).join(' ')}" fill="none" stroke="#17241d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
  }
  function signatureView(id) {
    if(state.unsavedChanges && !confirm('Ungespeicherte Eingaben verwerfen und gespeicherten Vorgang unterschreiben?'))return;
    const r=db.get(id);signatureStrokes=[], importPreview=null;
    shell('Vorgang unterschreiben',panel('Diesen gespeicherten Stand bestätigen',`<h3>${esc(names(id))}</h3><p>${esc(db.project()?.data.name)} · ${esc(core.definitions[r.module].name)} · ${esc(r.status)}</p>${table(['Feld','Angabe'],core.definitions[r.module].fields.map(f=>[esc(f.label),esc(['employee','position'].includes(f.type)?names(r.data[f.key]):r.data[f.key])]))}`)+panel('Unterschrift erfassen',`<form id="dwp-sign" class="quick-form"><input name="recordId" type="hidden" value="${esc(id)}">${field('Name des Unterzeichners',`<input name="signer" required>`)}${field('Funktion',`<select name="role"><option>Auftraggeber</option><option>Auftragnehmer</option><option>Vertreter</option></select>`)}<div class="field-span"><p>Mit Finger, Stift oder Maus im Feld unterschreiben. Die Unterschrift wird mit genau dem oben angezeigten Stand gespeichert; spätere Änderungen erfordern einen neuen Vorgang.</p><canvas id="dwp-signature" width="640" height="240" aria-label="Unterschriftsfläche"></canvas><div class="dwp-actions">${btn('Unterschrift löschen','clear-signature')}<button class="button button-primary" type="submit">Unterschrift und Protokoll speichern</button>${btn('Zurück','open',r.module)}</div></div></form>`)+(r.signatures?.length?panel('Bereits gespeicherte Unterschriften',r.signatures.map(s=>`<p>${esc(s.signer)} · ${esc(s.role)} · ${esc(new Date(s.signedAt).toLocaleString('de-DE'))}</p>${signatureSvg(s)}`).join('')):''));
    const canvas=main.querySelector('#dwp-signature'),context=canvas.getContext('2d');
    if(!context){showError(Error('Unterschriftsfläche ist in diesem Browser nicht verfügbar.'));return;}
    let drawing=false,stroke=null;
    const point=e=>{const rect=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height))];};
    canvas.addEventListener('pointerdown',e=>{e.preventDefault();drawing=true;canvas.setPointerCapture(e.pointerId);stroke=[point(e)];signatureStrokes.push(stroke);state.unsavedChanges=true;});
    canvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const p=point(e),last=stroke.at(-1);if(stroke.length>=10000)return;stroke.push(p);context.beginPath();context.lineWidth=2.5;context.lineCap='round';context.moveTo(last[0]*640,last[1]*240);context.lineTo(p[0]*640,p[1]*240);context.stroke();});
    for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,e=>{drawing=false;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
  }
  function calculation() {
    const c=db.calculation(),s=db.data.settings;
    return panel('Kalkulationsbasis',`<form id="dwp-settings" class="quick-form">${[['wage','Stundenkostensatz'],['agk','AGK %'],['profit','Wagnis / Gewinn %'],['tax','USt %']].map(([k,l])=>field(l,`<input name="${k}" inputmode="decimal" value="${s[k]}" required>`)).join('')}<p class="field-span">Bei einem Vollkostensatz inklusive Gemeinkosten AGK auf 0 setzen, um doppelte Zuschläge zu vermeiden.</p><button class="button button-primary" type="submit">Basis speichern</button></form>`)+panel('LV und Preisermittlung',`${btn('LV bearbeiten','open','lv')}${btn('LV importieren','open','imports')}${btn('CSV exportieren','calc-csv')}${table(['Position','Leistung','Menge','Material / E','Lohn / E','Gerät / E','NU / E','Kalkulierter EP','Rabatt %','Ziel-/Angebots-EP','GP netto','Deckungsbeitrag'],c.positions.map(p=>[esc(p.number),esc(p.text),`${p.qty} ${esc(p.unit)}`,money(p.material),money(p.labor),money(p.equipment),money(p.subcontract),money(p.calculatedEp),esc(p.discountPercent || 0),money(p.ep),money(p.gp),money(p.contribution)]))}<h3>Summe netto ohne Bedarfspositionen ${money(c.net)}</h3><p>Alternativpositionen werden separat ohne Addition kalkuliert. Variantenwahl im Angebot.</p><p>Bedarfspositionen separat: ${money(c.optionalNet)}</p><p>Material ${money(c.material)} · Lohn ${money(c.labor)} · Geräte ${money(c.equipment)} · NU ${money(c.subcontract)}</p>`);
  }
  function nuMarkupPanel() {
    const rows=db.calculation().positions.filter(p=>p.subcontract>0);
    if(!rows.length)return '';
    return panel('NU-Leistung: Einkauf, Zuschlag und Verkauf',`<p>Neue LV-Positionen starten mit 15 % NU-Zuschlag; der Wert ist je Position änderbar. Bei eigenem NU-Zuschlag gelten die globalen AGK-/Gewinnsätze nur für die übrigen Kostenarten. Zielpreis und Positionsrabatt wirken anschließend auf den Gesamt-EP. Der NU-Verkaufspreis hier zeigt den Ansatz vor Zielpreis/Rabatt.</p>${table(['Position','NU-EK je Einheit','Zuschlag','Zuschlag je Einheit','NU-VK je Einheit','Bearbeiten'],rows.map(p=>[esc(p.number),money(p.subcontract),p.nuMarkupPercent===null?'Globale AGK/W&G':esc(p.nuMarkupPercent)+' %',money(core.round(p.nuSalePrice-p.subcontract)),money(p.nuSalePrice),btn('NU-Zuschlag ändern','edit',p.id)]))}`);
  }
  function efbBreakdown() {
    const positions=db.calculation().positions;
    return panel('Kalkulationsnachweis mit Kostenartenzuschlägen',`<p>Grundlage: Kalkulationsnachweis und Blankokalkulation 03/2025. Optional vier Materialien, Zuschnitt und Verschnitt (in Prozent), vier zusätzliche Minutenansätze, Befestiger, Entsorgung und Sonstiges je LV-Position. In der LV-Position „Kostenartenzuschläge“ aktivieren und Kalkulationslohn sowie Zuschläge erfassen. Lohn = Minuten / 60 × Kalkulationslohn. Jeder Preisbestandteil wird auf Cent gerundet, danach zum Einheitspreis addiert. Gesamtpreis = Menge × Einheitspreis.</p><p>Bei Kostenartenzuschlägen werden die globalen AGK-/Gewinnsätze durch die vier Zuschläge ersetzt. Zielpreis und Rabatt werden anschließend angewendet. Die enthaltenen Gemeinkosten deshalb vor Übernahme prüfen.</p>${table(['Position','Modus','Lohn EK / Zuschlag / Preis','Stoffe EK / Zuschlag / Preis','Geräte EK / Zuschlag / Preis','Fremd EK / Zuschlag / Preis','Kalkulierter EP','Ziel-/Angebots-EP','GP netto','Bearbeiten'],positions.map(p=>[esc(p.number),p.useEfbRates?'Kostenartenzuschläge':'Globale Kalkulationsbasis',...['labor','material','equipment','subcontract'].map(key=>`${money(p[key])} / ${p.useEfbRates?esc(p[key+'Markup'] || 0)+' % / '+money(p.priceComponents[key]):key==='subcontract' && p.useNuMarkup?esc(p.nuMarkupPercent)+' % / '+money(p.nuSalePrice):'global'}`),money(p.calculatedEp),money(p.ep),money(p.gp),btn('Ansätze bearbeiten','edit',p.id)]))}`)+panel('EFB-Formblätter','<p>Der Kalkulationsnachweis ist verfügbar. Amtliche EFB 221/222/223 mit geprüfter Feldzuordnung sind noch offen.</p>');
  }
  function offerChoices() {
    const assigned=db.list('orders').filter(r=>r.status==='Freigegeben').flatMap(o=>db.get(o.data.offerId).data.positions);
    const ids=new Set(assigned.map(p=>p.id)),groups=new Set(assigned.map(p=>p.choiceGroup).filter(Boolean));
    return db.calculation().positions.filter(p=>p.kind!=='Nachtrag' && !ids.has(p.id) && !groups.has(p.choiceGroup));
  }
  function specialOfferFields() {
    const rows=offerChoices(),groups=[...new Set(rows.map(p=>p.choiceGroup).filter(Boolean))];
    return `<div id="dwp-offer-options">${groups.map((g,i)=>`<fieldset><legend>Wahlgruppe ${esc(g)}</legend>${rows.filter(p=>p.choiceGroup===g).map(p=>`<label><input type="radio" name="choice-${i}" data-offer-position value="${esc(p.id)}" ${p.kind==='Grundposition'?'checked':''}>${esc(p.number)} · ${esc(p.text)} · ${money(p.gp)} (${esc(p.kind)})</label>`).join('')}</fieldset>`).join('')}${rows.filter(p=>p.kind==='Bedarfsposition').map(p=>`<label><input type="checkbox" data-offer-position value="${esc(p.id)}">Bedarfsposition aufnehmen: ${esc(p.number)} · ${esc(p.text)} · ${money(p.gp)}</label>`).join('')}<p>Je Wahlgruppe eine Ausführung wählen. Nicht gewählte Bedarfs- und Alternativpositionen werden im Angebot separat ohne Addition ausgewiesen. Zur späteren Beauftragung vor Auftragserteilung eine neue Angebotsfassung mit der gewünschten Auswahl freigeben.</p><strong id="dwp-choice-total"></strong></div>`;
  }
  function updateChoiceTotal() {
    const target=main.querySelector('#dwp-choice-total');if(!target)return;
    const selected=new Set([...main.querySelectorAll('[data-offer-position]:checked')].map(el=>el.value));
    const rows=offerChoices(),total=core.round(rows.filter(p=>!['Grundposition','Alternativposition','Bedarfsposition'].includes(p.kind) || selected.has(p.id)).reduce((sum,p)=>sum+p.gp,0));
    target.textContent='Gewählte Angebotsvariante netto: '+money(total);
  }
  function offerTermFields() {
    return `<div id="dwp-offer-terms" class="quick-form">${field('Angebot gültig bis einschließlich','<input name="validUntil" type="date">')}${field('Zahlungsbedingungen','<textarea name="paymentTerms" maxlength="10000"></textarea>')}${field('Ausführungsbedingungen / Termine','<textarea name="executionTerms" maxlength="10000"></textarea>')}${field('Angebotshinweise','<textarea name="offerNotes" maxlength="10000"></textarea>')}</div><p>Diese Angaben werden mit der Angebotsfassung gespeichert und in die Auftragsbestätigung übernommen. Geänderte Vereinbarungen vor der Beauftragung in einer neuen Angebotsfassung festhalten.</p>`;
  }
  function snapshots(kind) {
    const originals=db.list('offers').filter(r=>!r.data.baseOfferId);
    const orders=db.list('orders').filter(r=>r.status==='Freigegeben' && !db.get(r.data.offerId)?.data.baseOfferId);
    const originalInvoices=db.list('invoices').filter(r=>!r.data.stornoOf && !db.list('invoices').some(s=>s.data.stornoOf===r.id));
    const options=rows=>rows.map(r=>`<option value="${esc(r.id)}">${esc(names(r.id))}</option>`).join('');
    const invoiceFields=kind==='invoices'?`<div id="dwp-invoice-options" class="quick-form">${field('Hauptauftrag',`<select name="orderId"><option value="">Letzter freigegebener Hauptauftrag</option>${options(orders)}</select>`)}${field('Rechnungsart',`<select name="invoiceType"><option>Schlussrechnung</option><option>Abschlagsrechnung</option><option>Teilrechnung</option></select>`)}${field('Kumulativer Anteil des freigegebenen Aufmaßes %',`<input name="percentage" inputmode="decimal" value="100">`)}</div><p>Bei Abschlägen/Teilrechnungen den kumulativen Leistungsanteil angeben. Bereits berechnete Mengen werden abgezogen. Schlussrechnungen rechnen den verbleibenden freigegebenen Leistungsstand ab. XRechnung und ZUGFeRD sind noch nicht freigegeben.</p>`:'';
    const extra=kind==='offers'?panel('Nachtragsangebot zum Hauptauftrag',`<p>Nachtragspositionen im LV als Nachtrag kennzeichnen, technisch prüfen und freigeben. Ein Nachtragsangebot wird nach seiner Beauftragung in die Abrechnung des Hauptauftrags übernommen.</p><form id="dwp-change-offer" class="quick-form">${field('Hauptangebot',`<select name="baseOfferId" required><option value="">Bitte auswählen</option>${options(originals)}</select>`)}${field('Nachtragsnummer',`<select name="changeNumber">${[...new Set(db.list('lv').filter(r=>r.data.kind==='Nachtrag').map(r=>r.data.changeNumber || ''))].map(n=>`<option value="${esc(n)}">${esc(n || 'Ohne Nachtragsnummer')}</option>`).join('')}</select>`)}${offerTermFields().replace('id="dwp-offer-terms"','id="dwp-change-terms"')}<button class="button button-primary" type="submit">Nachtragsangebot freigeben</button></form>`):panel('Rechnung stornieren',`<p>Das Original bleibt erhalten. Die Stornorechnung führt die Gegenbuchung mit eigenem Beleg und Begründung. Bereits erhaltene Zahlungen bleiben bestehen; Rückzahlungen werden separat auf den Stornobeleg gebucht.</p><form id="dwp-storno" class="quick-form">${field('Rechnung',`<select name="invoiceId" required><option value="">Bitte auswählen</option>${options(originalInvoices)}</select>`)}${field('Stornogrund',`<input name="reason" required>`)}<button class="button button-primary" type="submit">Stornorechnung erzeugen</button></form>`);
    return panel(kind==='offers'?'Angebotsfassungen':'Rechnungsfassungen',`<p>Jede Ausgabe speichert Kunde, Projekt, Leistungspositionen, Preise und Steuer als feste Fassung. Rechnungen übernehmen beauftragte Preise und freigegebene Aufmaßmengen.</p>${invoiceFields}${kind==='offers'?specialOfferFields()+offerTermFields():''}${btn(kind==='offers'?'Angebot freigeben':'Rechnung freigeben','issue',kind,true)}${table(['Nummer','Art','Netto','USt','Brutto','Ausgabe'],db.list(kind).map(r=>[esc(r.data.number),esc(r.data.title)+(r.module==='offers'?` · ${esc(r.data.changeNumber || 'Hauptangebot')} · Version ${esc(r.data.version || 1)}${db.list('offers').some(next=>next.data.supersedesOfferId===r.id)?' · Ersetzt':''}`:''),money(r.data.net),money(r.data.taxAmount),money(r.data.gross),`${btn('Drucken / PDF','print',r.id)}${btn('CSV','snapshot-csv',r.id)}`]))}`)+extra;
  }
  function controlling() {
    const c=db.controlling();
    return panel('Projektwirtschaftlichkeit',table(['Kennzahl','Betrag'],[['Kalkulierte Einzelkosten',money(c.planned)],['Zusätzliche geplante Gemeinkosten',money(c.plannedOverhead)],['Geplante Gesamtkosten',money(c.plannedTotal)],['Erfasste Stundenkosten',money(c.times)],['Kostenrelevante Eingangsrechnungen',money(c.incoming)],['NU-Kostenansätze ohne zugeordnete Eingangsrechnung',money(c.subcontracts)],['NU-Auftrags-/Kostenansätze gesamt (nicht zusätzlich addiert)',money(c.commitments)],['Erfasste Einzelkosten und NU-Kostenansätze',money(c.directActual)],['Zusätzlich erfasste Ist-Gemeinkosten',money(c.actualOverhead)],['Ist-Kosten gesamt',money(c.actual)],['Abgerechneter Umsatz netto',money(c.revenue)],['Vorläufiges Ergebnis nach erfassten Gemeinkosten',money(c.result)],['Ausgangsrechnungen brutto',money(c.gross)],['Zahlungen brutto',money(c.paid)],['Offener Zahlungsbetrag',money(c.outstanding)]]))+panel('Vollständigkeitskontrolle der erfassten Kosten',`<p>Prüft offene Freigaben, Bestellungen ohne zugeordneten Kostenbeleg, vorläufige NU-Ansätze und fehlende Stunden-/Materialbelege. Nicht erfasste Geschäftsvorfälle und die materielle Vollständigkeit einzelner Rechnungen müssen zusätzlich anhand der Buchhaltung geprüft werden.</p>${db.costChecks().length?table(['Prüfhinweis','Bereich'],db.costChecks().map(f=>[esc(f.message),btn(core.definitions[f.module].name,'open',f.module)])):'<p>Keine offenen Prüfhinweise im erfassten Bestand.</p>'}`)+panel('Kosten vollständig erfassen',`<p>NU-Eingangsrechnungen mit dem NU-Kostenvorgang verknüpfen. Freigegebene, kostenrelevante Rechnungen ersetzen dessen vorläufigen Kostenansatz automatisch. Material und sonstige Kosten nicht zusätzlich als NU-Kosten erfassen. Zusätzliche Gemeinkosten im Projektstamm mit Abgrenzung und Nachweis erfassen. Bereits im Stundenkostensatz oder in Eingangsrechnungen enthaltene Kosten nicht nochmals ansetzen. Das Ergebnis bildet ausschließlich erfasste Kosten und freigegebene Vorgänge ab.</p>${btn('Zeiten','open','times')}${btn('Eingangsrechnungen','open','incoming')}${btn('Fremdleistungen','open','subcontracts')}${btn('Zahlungen','open','payments')}`);
  }
  function importView() {
    let legacy=[];try{legacy=JSON.parse(localStorage.getItem('dwp-lv-import-v1') || '{}').workingCopies || [];}catch{}
    return panel('LV in das aktuelle Projekt übernehmen',`<p>CSV: Pflichtspalten number;text;qty;unit. Optional: material;minutes;equipment;subcontract;groupPath;kind;changeNumber;discountPercent. GAEB: X83 / XML 3.3 mit normalen Mengenpositionen und bis fünf Titelstufen. Sonderpositionen und Vorbemerkungen werden mit Originalinhalt und Wandlungsvorschlag in die LV-/Vertragsprüfung übernommen. Offene Prüfungen sperren Angebote und Aufträge.</p><p>PDF bis 10 MB; CSV, GAEB, XLSX und XLS (Excel 97–2003) bis 1 MB.</p><label>LV-Datei<input id="dwp-import-file" type="file" accept=".csv,.xml,.x83,.xlsx,.xls,.pdf,application/pdf,text/csv,application/xml,text/xml,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label><label><input id="dwp-import-ocr" type="checkbox"> Scan-Texterkennung bei der nächsten PDF-Dateiauswahl (Deutsch)</label><p>Seiten mit weniger als 35 Textzeichen werden als Scan geprüft. Höchstens 20 Scanseiten; erkannte Texte immer am Original kontrollieren.</p><p id="dwp-import-progress" role="status" aria-live="polite"></p><button type="button" class="button button-secondary" data-dwp="cancel-import-read" hidden>Einlesen abbrechen</button><form id="dwp-import"><label>Format<select name="format" id="dwp-import-format"><option value="CSV">CSV</option><option value="GAEB XML">GAEB X83 / XML 3.3</option><option value="Excel Prüfquelle">Excel XLSX / XLS 97–2003</option><option value="PDF Prüfquelle">PDF-Text zur Prüfung</option></select></label><label>Quelle / Dateiname<input name="source" id="dwp-import-source" placeholder="Dateiname oder Herkunft"></label><div id="dwp-excel-controls"></div><label>Dateiinhalt<textarea name="csv" id="dwp-csv" rows="8" required placeholder="number;text;qty;unit;material;minutes&#10;010;Abdichtung;100;m²;15,50;10"></textarea></label><div class="dwp-actions">${btn('Vorschau prüfen','preview-import')}<button class="button button-primary" type="submit">In Projekt übernehmen</button></div></form><div id="dwp-import-preview"></div><p>GAEB-Texte werden als Klartext übernommen. Briefkopf, Textformatierung und PDF-Originale bleiben außerhalb dieser Positionsübernahme. Das eingelesene GAEB-XML bleibt im Importjournal erhalten. Alle Positionen bleiben ungeprüft; Preise und Zeitansätze anschließend ergänzen. Excel XLSX / XLS 97–2003: Blatt und Spalten zuordnen, Formeln und unklare Zeilen gesondert prüfen. PDF mit Textschicht: seitenweise Textprüfung ohne automatische Mengenübernahme. Im Importjournal wird der ausgelesene Text gespeichert; das Original-PDF bitte zusätzlich im DMS ablegen. Scan-Texterkennung Deutsch ist optional verfügbar; Scantexte bleiben gesperrte Prüfvorgänge. iPhone-Abnahme, ältere XLS-Versionen vor Excel 97, GAEB 90/2000 und weitere XML-Phasen sind noch offen.</p>${btn('Bisherigen Importmanager öffnen','legacy-import')}`)+panel('Vorhandene Arbeitskopien übernehmen',`<p>Alte Browserbestände werden erhalten. Eine Übernahme kopiert ausdrücklich gewählte Positionen in das aktuell ausgewählte Projekt. Anschließend neu prüfen und freigeben.</p>${table(['Arbeitskopie','Positionen','Übernahme'],legacy.map(w=>[esc(w.name),esc(w.positions?.length || 0),btn('In aktuelles Projekt kopieren','legacy-copy',w.id)]))}`);
  }
  function importJournal() {
    return panel('Importjournal',table(['Quelle','Format','Übernahme','Original'],db.list('imports').map(r=>[esc(r.data.source),esc(r.data.format),esc(r.data.notes),(r.originalText?btn('Originaldaten anzeigen','import-original',r.id):'')+(r.originalText && ['CSV','GAEB XML'].includes(r.data.format)?btn('Übernommene Textquelle herunterladen','import-text-download',r.id):'')+(r.hasOriginalWorkbook?btn('Excel-Original herunterladen','workbook-download',r.id):'')])));
  }
  function importInput() {
    if(importRead)throw Error('Datei wird noch eingelesen. Bitte warten oder das Einlesen abbrechen.');
    const format=document.querySelector('#dwp-import-format').value;
    const input={text:document.querySelector('#dwp-csv').value,format,source:document.querySelector('#dwp-import-source').value,projectId:db.data.selectedProject,revision:db.data.revision};
    if(format==='Excel Prüfquelle'){
      if(!excelSource)throw Error('Bitte zuerst eine XLSX- oder XLS-97–2003-Datei auswählen.');
      input.sheet=Number(document.querySelector('#dwp-excel-sheet').value);input.header=Number(document.querySelector('#dwp-excel-header').value);
      input.mapping=Object.fromEntries([...document.querySelectorAll('[data-excel-map]')].map(el=>[el.dataset.excelMap,Number(el.value)]));
      input.workbook=excelSource.base64;
    }
    return input;
  }
  function cancelImportRead() {
    const job=importRead;if(!job)return;
    importRead=null;job.controller.abort();
    for(const control of job.form.elements)control.disabled=false;
    job.form.removeAttribute('aria-busy');
    if(job.ocrToggle)job.ocrToggle.disabled=false;
    const cancel=main.querySelector('[data-dwp="cancel-import-read"]');if(cancel)cancel.hidden=true;
  }
  async function readImportFile(fileInput) {
    const file=fileInput.files[0];if(!file)return;
    cancelImportRead();
    const form=main.querySelector('#dwp-import'),projectId=db.data.selectedProject;
    const progress=main.querySelector('#dwp-import-progress'),preview=main.querySelector('#dwp-import-preview');
    const cancel=main.querySelector('[data-dwp="cancel-import-read"]');
    const ocrToggle=main.querySelector('#dwp-import-ocr'),useOcr=ocrToggle.checked;
    const job={form,ocrToggle,controller:new AbortController()};importRead=job;ocrToggle.disabled=true;
    const active=()=>importRead===job && form.isConnected && db.data.selectedProject===projectId && fileInput.files[0]===file;
    importPreview=null;excelSource=null;
    form.querySelector('#dwp-csv').value='';form.querySelector('#dwp-csv').readOnly=false;
    form.querySelector('#dwp-import-source').value='';form.querySelector('#dwp-import-format').value='CSV';
    preview.textContent='';main.querySelector('#dwp-excel-controls').textContent='';main.querySelector('#dwp-error').textContent='';
    state.unsavedChanges=true;
    for(const control of form.elements)control.disabled=true;
    form.setAttribute('aria-busy','true');cancel.hidden=false;progress.textContent='Datei wird eingelesen …';
    try {
      const isXls=/\.xls$/i.test(file.name),isExcel=/\.xlsx?$/i.test(file.name),isPdf=/\.pdf$/i.test(file.name);
      if(!file.size)throw Error('Die gewählte Datei ist leer.');
      if(file.size>(isPdf?10_000_000:1_000_000))throw Error(isPdf?'PDF-Datei höchstens 10 MB.':'LV-Datei höchstens 1 MB.');
      if(!/\.(csv|xml|x83|xlsx|xls|pdf)$/i.test(file.name))throw Error('Bitte PDF, CSV, XLSX, XLS 97–2003 oder GAEB X83 / XML wählen.');
      let text='',excel;
      if(isExcel){
        const bytes=new Uint8Array(await file.arrayBuffer());if(!active())return;
        const book=isXls?await window.DWPXlsImport.read(bytes,{signal:job.controller.signal}):window.DWPSpreadsheetImport.parse(bytes);
        if(!active())return;
        let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
        excel={book,base64:btoa(binary),name:file.name};text=JSON.stringify(book,null,2);
      }else if(isPdf){
        text=JSON.stringify(await window.DWPPdfImport.extract(file,(page,total)=>{
          if(active())progress.textContent=`PDF: Seite ${page} von ${total} eingelesen …`;
        },undefined,{signal:job.controller.signal,ocr:useOcr,ocrProgress:(page,total,value)=>{
          if(active())progress.textContent=`Texterkennung: Seite ${page} von ${total} · ${Math.round(value*100)} % …`;
        }}));
      }else text=await file.text();
      if(!active())return;
      excelSource=excel || null;
      form.querySelector('#dwp-csv').value=text;form.querySelector('#dwp-csv').readOnly=isExcel || isPdf;
      form.querySelector('#dwp-import-format').value=isExcel?'Excel Prüfquelle':isPdf?'PDF Prüfquelle':/\.(xml|x83)$/i.test(file.name)?'GAEB XML':'CSV';
      form.querySelector('#dwp-import-source').value=file.name;
      if(isExcel)excelControls();
      progress.textContent=useOcr&&isPdf?'PDF eingelesen. Erkannte Texte am Original prüfen; anschließend Vorschau prüfen.':'Datei eingelesen. Bitte Vorschau prüfen.';
    }catch(error){
      if(active()){progress.textContent='Datei konnte nicht eingelesen werden. Bitte erneut auswählen.';fileInput.value='';showError(error);}
    }finally{
      if(importRead===job)cancelImportRead();
    }
  }
  function downloadWorkbook(record) {
    if(!record?.originalWorkbook)throw Error('Excel-Original nicht verfügbar.');
    const bytes=Uint8Array.from(atob(record.originalWorkbook),c=>c.charCodeAt(0));
    download(record.workbookName || 'LV.xlsx',bytes,/\.xls$/i.test(record.workbookName || '')?'application/vnd.ms-excel':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
  function importSource(input,report) {
    return {source:input.source || input.format,format:input.format,title:'LV-Import '+(input.source || input.format),findings:report.findings,originalText:['CSV','GAEB XML','PDF Prüfquelle'].includes(input.format)?input.text:input.format==='Excel Prüfquelle'?JSON.stringify(excelSource.book):'',originalWorkbook:input.workbook,workbookName:excelSource?.name,mapping:input.format==='Excel Prüfquelle'?{sheet:input.sheet,header:input.header,columns:input.mapping}:undefined};
  }
  function downloadImportText(record) {
    if(record?.module!=='imports' || record.projectId!==db.data.selectedProject || !record.originalText || !['CSV','GAEB XML'].includes(record.data.format))throw Error('Import-Textquelle nicht verfügbar.');
    const csv=record.data.format==='CSV',extension=csv?'csv':'x83';
    // The saved, reviewed text is exported as UTF-8; it is not a byte copy of the selected file.
    const name=String(record.data.source || 'LV').split(/[\\/]/).pop().replace(/\.[^.]*$/,'').replace(/[^\p{L}\p{N}_.-]/gu,'_').slice(0,120) || 'LV';
    download(name+'.'+extension,record.originalText,csv?'text/csv;charset=utf-8':'application/xml;charset=utf-8');
  }
  function excelControls(sheetIndex=0,headerRow) {
    const sheet=excelSource.book.sheets[sheetIndex];
    const header=headerRow || sheet.rows.find(r=>r.values.some(c=>c && c.value!==''))?.index || 1;
    const columns=sheet.rows.find(r=>r.index===header)?.values || [];
    const aliases={number:['number','pos','position','oz','positionsnummer'],text:['text','leistung','leistungstext','leistungsbeschreibung'],qty:['qty','menge'],unit:['unit','einheit'],groupPath:['grouppath','titel','gliederung'],kind:['kind','leistungsart'],choiceGroup:['choicegroup','wahlgruppe'],changeNumber:['changenumber','nachtragsnummer'],material:['material'],minutes:['minutes','minuten'],equipment:['equipment','geraete','geräte'],subcontract:['subcontract','nu'],targetEp:['targetep','zielpreis'],discountPercent:['discountpercent','rabatt']};
    const fields=core.definitions.lv.fields.filter(f=>Object.hasOwn(aliases,f.key));
    const options=columns.map((c,i)=>c?{i,label:c.address+' · '+String(c.value || 'Spalte '+(i+1))}:null).filter(Boolean);
    document.querySelector('#dwp-excel-controls').innerHTML=`<p>Excel-Original bleibt erhalten. Ein Blatt pro Übernahme; Formeln werden als Prüfvorgang übernommen und nicht ausgeführt.</p>${field('Arbeitsblatt',`<select id="dwp-excel-sheet">${excelSource.book.sheets.map((b,i)=>`<option value="${i}" ${i===sheetIndex?'selected':''}>${esc(b.name)}${b.hidden?' (ausgeblendet)':''}</option>`).join('')}</select>`)}${field('Zeile mit Spaltenüberschriften',`<input id="dwp-excel-header" type="number" min="1" max="10000" value="${header}">`)}<div class="quick-form">${fields.map(f=>{const suggested=options.find(o=>aliases[f.key].includes(String(columns[o.i].value).trim().toLowerCase().replace(/[.:%]/g,'')));return field(f.label+(['number','text','qty','unit'].includes(f.key)?' *':''),`<select data-excel-map="${f.key}"><option value="-1">Nicht zugeordnet</option>${options.map(o=>`<option value="${o.i}" ${suggested?.i===o.i?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`);}).join('')}</div>`;
  }
  function parsedImport(input) {
    if(input.format==='PDF Prüfquelle')return window.DWPPdfImport.report(input.text);
    if(input.format==='CSV')return {rows:csvRows(input.text),findings:[]};
    if(input.format==='Excel Prüfquelle')return window.DWPSpreadsheetImport.report(excelSource.book,input.sheet,input.header,input.mapping);
    if(!window.DWPGaebImport)throw Error('GAEB-Parser fehlt. Bitte die Anwendung neu laden.');
    return window.DWPGaebImport.report(input.text);
  }
  function csvRows(text,required=['number','text','qty','unit']) {
    const delimiter=text.split(/\r?\n/)[0].includes(';')?';':',';
    const rows=[];let row=[],cell='',quoted=false;
    text=text.replace(/^\uFEFF/,'');
    for(let i=0;i<text.length;i++) {
      const ch=text[i];
      if(ch==='"'){if(quoted && text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
      else if(ch===delimiter && !quoted){row.push(cell);cell='';}
      else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}
      else cell+=ch;
    }
    if(quoted)throw Error('CSV: Anführungszeichen nicht geschlossen.');
    row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
    const headers=rows.shift()?.map(v=>v.trim());
    if(!headers || !required.every(k=>headers.includes(k)))throw Error(`CSV-Pflichtspalten fehlen: ${required.join(', ')}.`);
    if(new Set(headers).size!==headers.length)throw Error('CSV enthält doppelte Spaltennamen.');
    return rows.map((values,i)=>{if(values.length!==headers.length)throw Error(`CSV-Zeile ${i+2}: falsche Spaltenzahl.`);return Object.fromEntries(headers.map((h,j)=>[h,values[j]]));});
  }
  function settings() {
    const s=db.data.settings;
    return panel('Betriebsdaten',`<form id="dwp-company" class="quick-form">${field('Betrieb / Briefkopf',`<input name="company" value="${esc(s.company)}" required>`)}${field('Anschrift',`<textarea name="address">${esc(s.address || 'Upsalastraße 48 · 28719 Bremen')}</textarea>`)}${field('Inhaber',`<input name="proprietor" value="${esc(s.proprietor || 'Stephan Mangel')}">`)}${field('E-Mail',`<input name="email" type="email" value="${esc(s.email || 'info@dachwerkpro.de')}">`)}${field('Telefon',`<input name="phone" value="${esc(s.phone || '')}">`)}${field('Internetseite',`<input name="website" value="${esc(s.website || 'dachwerkpro.de')}">`)}<p class="field-span">Original-DachWerkPro-Briefpapier mit Logo, roter Kopf- und Fußlinie. Neue Belegfassungen übernehmen diese Angaben; bestehende freigegebene Fassungen behalten ihren gespeicherten Firmenstand.</p><button class="button button-primary" type="submit">Speichern</button></form>`)+panel('Sicherung und Wiederherstellung',`<p>Eine Sicherung enthält sämtliche lokalen Projektakten und zugeordneten Testdateien. Eine Wiederherstellung ersetzt den Arbeitsbestand nach ausdrücklicher Bestätigung; das aktuelle Logbuch bleibt erhalten.</p>${btn('Sicherung herunterladen','backup')}<label>Sicherung auswählen<input id="dwp-restore" type="file" accept=".json,application/json"></label>`);
  }
  function openModule(id) {
    if(state.unsavedChanges && !window.confirm('Ungespeicherte Eingaben verwerfen und Bereich wechseln?')) return;
    id=validModule(id)?id:'dashboard';
    if(moduleTrail.at(-1)!==id)moduleTrail.push(id);
    if(moduleTrail.length>100)moduleTrail.shift();
    window.history.replaceState(window.history.state,'',moduleUrl(id));
    renderingModule=true;
    try{return renderModule(id);}finally{renderingModule=false;}
  }
  function backModule() {
    if(state.unsavedChanges && !window.confirm('Ungespeicherte Eingaben verwerfen und zurückgehen?'))return;
    state.unsavedChanges=false;
    if(subpage){openModule(validModule(current)?current:(moduleTrail.at(-1)||'dashboard'));return;}
    if(moduleTrail.length>1)moduleTrail.pop();
    else moduleTrail=[];
    openModule(moduleTrail.at(-1)||'dashboard');
  }
  function renderModule(id) {
    current=id;editing=null;search='';importPreview=null;excelSource=null;
    const section=core.definitions[id]?.view || (['help','settings'].includes(id)?id:'dashboard');
    state.currentView=section;localStorage.setItem('dwp-current-view',section);
    document.querySelectorAll('.nav-item[data-view]').forEach(item=>item.classList.toggle('is-active',item.dataset.view===section));
    if(window.DWPRemote?.active && core.definitions[id])window.DWPRemote.trackModule(id,db.data.selectedProject).catch(e=>showError(Error('Nutzungsprotokoll konnte nicht gespeichert werden: '+e.message)));
    if(id==='dashboard')return dashboard();
    if(id==='workflow')return shell('Gemeinsamer Projektworkflow',workflowPanel());
    if(id==='access')return shell('Zugriff und Modulnutzung',accessPanel());
    if(id==='audit')return shell('Projektlogbuch',panel('Lokales Änderungsjournal',`<p>Im normalen Arbeitsbereich werden keine Einträge gelöscht. Der lokale Testbestand ist technisch veränderbar und daher noch kein revisionssicherer Audit-Trail.</p>${table(['Zeit','Aktion','Bereich','Vorgang'],db.data.audit.filter(r=>!db.project() || r.projectId===db.data.selectedProject || !r.projectId).slice().reverse().map(r=>[esc(new Date(r.at).toLocaleString('de-DE')),esc(r.action),esc(core.definitions[r.module]?.name || r.module),esc(r.recordId || '')]))}`));
    if(id==='help')return shell('DachWerk Hilfe',panel('Durchgängiger Ablauf',`<ol><li>Kunde und Projekt anlegen.</li><li>LV erfassen oder CSV importieren, Material und Zeitansätze ergänzen.</li><li>Fachlich prüfen, Verantwortlichen nennen und LV freigeben.</li><li>Angebotsfassung erzeugen; Auftrag mit Angebotsbezug freigeben.</li><li>Aufmaß, Bautagebuch, Mängel, Zeiten und Kosten im gleichen Projekt erfassen.</li><li>Aufmaß freigeben, Rechnung erzeugen und Zahlungen zuordnen.</li><li>Nachkalkulation und Export prüfen.</li></ol><p>Der freie KI-Assistent ist noch nicht angeschlossen. Die Hilfe erläutert den tatsächlichen Funktionsstand.</p>`));
    if(id==='settings')return shell('Einstellungen',settings());
    const mod=core.definitions[id];if(!mod)return;
    if(mod.scope==='project' && !db.project())return shell(mod.name,panel('Projektbezug erforderlich',`<p>Bitte zuerst einen Kunden und ein Projekt anlegen. Danach das Projekt oben auswählen.</p>`));
    if(!special.has(id))return records(mod);
    let body='';
    if(['calculation','efb'].includes(id))body=calculation()+nuMarkupPanel()+(id==='efb'?efbBreakdown()+panel('BFW-Übergabe',`<p>Die separate XLS-Übergabedatei enthält Pos, Menge, MEH, Kurztext, Langtext, EP und PA. Hier werden die aktuellen LV-Positionen als Excel-kompatible CSV ausgegeben. PA bleibt leer, bis die Bedeutung der Zielsystem-Schnittstelle fachlich bestätigt ist. Vor der Übernahme Bedarfs-/Alternativpositionen prüfen.</p>${btn('BFW-Übergabe CSV herunterladen','bfw-csv')}`):'');
    if(['offers','invoices'].includes(id))body=snapshots(id);
    if(id==='controlling')body=controlling();
    if(id==='closing')body=panel('Projektbezogenes Belegpaket',`<p>JSON enthält die Projektakte, CSV die Rechnungen und Kostenbelege. DATEV-Importformate und automatischer Monatsabschluss sind noch nicht freigegeben.</p>${btn('Projektakte JSON','project-json')}${btn('Belegübersicht CSV','closing-csv')}`);
    if(id==='imports')body=importView()+importJournal();
    shell(mod.name,body);
    if(id==='offers')updateChoiceTotal();
  }
  function download(name,text,type='application/json') {
    const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  function csvExport(name,rows) {
    // Protect spreadsheet consumers against formula execution from imported text.
    const cell=v=>`"${String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')}"`;
    download(name,'\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
  }
  function printRecord(r) {
    const mod=core.definitions[r.module];
    const signed=r.signatures?.[0]?.snapshot;
    let body='';
    if(['offers','invoices'].includes(r.module) || r.module==='orders' && r.confirmation) {
      const d=r.confirmation || r.data;
      body=`<h1>${esc(d.title)} ${esc(d.number)}</h1>${r.confirmation?`<p>Bezug: Angebot ${esc(d.offerNumber)} · AG-Auftrag ${esc(d.orderNumber || 'ohne Nummer')} · Datum ${esc(d.date)}</p>`:''}${r.module==='offers'?`<p>Version ${esc(d.version || 1)}</p>`:''}${d.baseOfferId?`<p>Nachtrag ${esc(d.changeNumber || 'Ohne Nummer')} · Version ${esc(d.version || 1)}</p>`:''}<p>${esc(d.customer.name)}<br>${esc(d.customer.address)}</p><h2>${esc(d.project.name)}</h2><p>${esc(d.project.address)}</p>${d.buyerReference?`<p>Käuferreferenz: ${esc(d.buyerReference)}</p>`:''}${table(['Pos.','Gliederung','Leistung','Menge','Einheit','EP netto','GP netto'],d.positions.map(p=>[esc(p.number),esc(p.groupPath || ''),esc(p.text),esc(p.qty),esc(p.unit),money(p.ep),money(p.gp)]))}${r.module==='offers'?[['Bedarfspositionen – nicht in Summe',d.optionalPositions || []],['Nicht gewählte Ausführungen – nicht in Summe',d.alternativePositions || []]].filter(([,rows])=>rows.length).map(([label,rows])=>`<h2>${esc(label)}</h2>${table(['Pos.','Leistung','Wahlgruppe','Menge','Einheit','EP netto','GP separat'],rows.map(p=>[esc(p.number),esc(p.text),esc(p.choiceGroup),esc(p.qty),esc(p.unit),money(p.ep),money(p.gp)]))}`).join(''):''}<p>Netto: ${money(d.net)}<br>USt ${d.tax}%: ${money(d.taxAmount)}<br><strong>Brutto: ${money(d.gross)}</strong></p>`;
      if(r.module==='offers' || r.confirmation)body+=[['Gültig bis einschließlich',d.validUntil],['Zahlungsbedingungen',d.paymentTerms],['Ausführungsbedingungen / Termine',d.executionTerms],['Angebotshinweise',d.offerNotes],...(r.confirmation?[['Auftragshinweise',d.notes]]:[])].filter(([,value])=>value).map(([label,value])=>`<h2>${esc(label)}</h2><p style="white-space:pre-wrap">${esc(value)}</p>`).join('');
      if(d.stornoOf)body+=`<p>Storno zu ${esc(d.originalNumber)} · Grund: ${esc(d.reason)}</p>`;
      else if(d.previouslyNet)body+=`<p>Zuvor berechnet netto: ${money(d.previouslyNet)}<br>Kumulativ einschließlich dieser Rechnung netto: ${money(core.round(d.previouslyNet+d.net))}</p>`;
    } else {
      body=`<h1>${esc(mod.name)}</h1><h2>${esc(names(r.id))}</h2><p>Projekt: ${esc(signed?.project?.name || db.get(r.projectId)?.data.name || 'Stammdaten')} · Status ${esc(r.status)}</p>${table(['Feld','Angabe'],mod.fields.map(f=>[esc(f.label),esc(signed?.labels?.[f.key] ?? (['customer','position','material','employee','offer','purchase','invoice','subcontract','record'].includes(f.type)?names(r.data[f.key]):f.type==='contacts'?(r.data[f.key] || []).map(c=>[c.name,c.role,c.email,c.phone].filter(Boolean).join(' · ')).join('\n'):r.data[f.key]))]))}<p>Verantwortlich: ${esc(r.owner)} · Frist ${esc(r.due)}</p>`;
      if(r.signatures?.length)body+=r.signatures.map(s=>`<p>${esc(s.role)}: ${esc(s.signer)} · ${esc(new Date(s.signedAt).toLocaleString('de-DE'))}</p>${signatureSvg(s)}`).join('');
      else if(r.module==='acceptance')body+='<p>Ort / Datum: __________________</p><p>Auftraggeber / Unterschrift: __________________</p><p>Auftragnehmer / Unterschrift: __________________</p>';
    }
    const company=signed?.company || r.confirmation?.company || r.data.company || db.data.settings;
    const frame=document.createElement('iframe');frame.className='dwp-print-frame';frame.title='Druckansicht';document.body.append(frame);
    const doc=frame.contentDocument;
    if(!window.DWPDocument)throw Error('Original-Briefpapier konnte nicht geladen werden. Bitte Anwendung neu laden.');
    frame.onload=()=>window.DWPDocument.ready(doc).then(()=>{frame.contentWindow.focus();frame.contentWindow.print();}).catch(showError);
    doc.open();doc.write(window.DWPDocument.render({title:r.data.number || mod.name,body,company,recordId:r.id,createdAt:r.createdAt}));doc.close();
    setTimeout(()=>frame.remove(),60000);
  }
  main.addEventListener('submit',event=>{
    if(!event.target.id.startsWith('dwp-'))return;
    event.preventDefault();event.stopImmediatePropagation();
    const form=event.target,values=Object.fromEntries(new FormData(form));
    try {
      let command,afterModule=current;
      if(form.id==='dwp-reopen')command=['reopenProject',values.reason];
      if(form.id==='dwp-record') {
        const mod=values.module;core.definitions[mod].fields.filter(f=>f.type==='checkbox').forEach(f=>values[f.key]=form.elements.namedItem(f.key).checked);
        command=['save',mod,values,{id:editing,status:values.status,owner:values.owner,due:values.due}];
      }
      if(['dwp-settings','dwp-company'].includes(form.id))command=['settings',values];
      if(form.id==='dwp-capacity')command=['settings',{capacity:core.capacity(values)}];
      if(form.id==='dwp-convert-import'){command=['convertImportFinding',values.findingId,values,{reason:values.reason,owner:state.currentUser}];afterModule='contract';}
      if(form.id==='dwp-import') {
        const input=importInput();
        if(!importPreview || JSON.stringify(input)!==JSON.stringify(importPreview))throw Error('Bitte die aktuelle Vorschau prüfen. Inhalt, Quelle, Format oder Projektbestand haben sich geändert.');
        const report=parsedImport(input);
        command=['importPositions',report.rows,importSource(input,report)];
      }
      if(form.id==='dwp-quote')command=['quote',values.supplierId,values];
      if(form.id==='dwp-schedule')command=['schedule',values.employeeId,values];
      if(form.id==='dwp-sign'){command=['sign',values.recordId,{...values,strokes:signatureStrokes}];afterModule=db.get(values.recordId).module;}
      if(form.id==='dwp-price-import'){
        const input=priceInput();
        if(!pricePreview || JSON.stringify(input)!==JSON.stringify(pricePreview))throw Error('Bitte die aktuelle Preisvorschau prüfen. Quelle, Zuordnung oder Bestand haben sich geändert.');
        command=['importMaterials',priceReport(input).rows,{...input.values,owner:state.currentUser}];
      }
      if(form.id==='dwp-change-offer')command=['issue','offers',{offerType:'Nachtragsangebot',baseOfferId:values.baseOfferId,changeNumber:values.changeNumber,validUntil:values.validUntil,paymentTerms:values.paymentTerms,executionTerms:values.executionTerms,offerNotes:values.offerNotes,owner:state.currentUser}];
      if(form.id==='dwp-storno')command=['stornoInvoice',values.invoiceId,{reason:values.reason,owner:state.currentUser}];
      if(form.id==='dwp-pair'){window.DWPRemote.pair(values.token).then(()=>{notice('Gerät freigegeben.');openModule('access');}).catch(showError);return;}
      if(!command)return;
      mutate(command[0],command.slice(1),()=>{state.unsavedChanges=false;notice('Gespeichert und der Projektakte zugeordnet.');openModule(afterModule);});
    }catch(e){showError(e);}
  },true);
  main.addEventListener('click',async event=>{
    const target=event.target.closest('[data-dwp]');if(!target)return;
    event.preventDefault();event.stopImmediatePropagation();
    const action=target.dataset.dwp,id=target.dataset.id;
    try {
      if(action==='module-back'){backModule();return;}
      if(action==='direct-link'){
        if(!confirmPageChange())return;
        window.location.assign(moduleUrl(current).href);return;
      }
      if(window.DWPRemote?.active && ['backup','project-json','calc-csv','snapshot-csv','bfw-csv','closing-csv','print','workbook-download','import-text-download'].includes(action)) {
        const kind={backup:'backup','project-json':'project','calc-csv':'calculation','snapshot-csv':'positions','bfw-csv':'calculation','closing-csv':'closing',print:'record','workbook-download':'record','import-text-download':'record'}[action];
        const output=await window.DWPRemote.export({kind,projectId:db.data.selectedProject,recordId:id});
        if(action==='import-text-download')downloadImportText(output.record);
        else if(action==='workbook-download')downloadWorkbook(output.record);
        else if(action==='print')printRecord(output.record);
        else if(action==='bfw-csv')csvExport('DachWerkPro_BFW_Uebergabe.csv',core.bfwTransferRows(output.positions || output.record?.data.positions || []));
        else if(['calc-csv','snapshot-csv'].includes(action)){const rows=output.positions || output.record.data.positions;csvExport('DachWerkPro_Positionen.csv',[['Position','Gliederung','Leistung','Menge','Einheit','EP netto','GP netto','Leistungsart','Wahlgruppe','In Summe'],...[...rows,...(output.record?.module==='offers'?[...(output.record.data.optionalPositions || []),...(output.record.data.alternativePositions || [])]:[])].map(p=>[p.number,p.groupPath || '',p.text,p.qty,p.unit,p.ep,p.gp,p.kind || 'Hauptleistung',p.choiceGroup || '',output.positions?(!['Bedarfsposition','Alternativposition'].includes(p.kind)?'Ja':'Nein'):(rows.includes(p)?'Ja':'Nein')])]);}
        else download(output.name,output.text,output.type);
        return;
      }
      if(action==='advance-phase')mutate('advancePhase',[id],()=>{notice('Projektübergabe geprüft und gespeichert.');openModule('workflow');});
      if(action==='open'){
        openModule(id);
        // The dashboard button is already on the dashboard; reveal the module cards instead.
        if(id==='dashboard')main.querySelector('#dwp-module-search')?.scrollIntoView({behavior:'smooth',block:'start'});
        if(['customers','projects'].includes(id) && current===id){
          // Put the opened form on screen without raising the mobile keyboard.
          const form=main.querySelector('#dwp-record');
          if(form){form.setAttribute('tabindex','-1');form.focus({preventScroll:true});form.scrollIntoView({block:'start'});}
        }
      }
      if(action==='workbook-download')downloadWorkbook(db.get(id));
      if(action==='import-text-download')downloadImportText(db.get(id));
      if(action==='import-original') {
        const r=db.get(id);if(r?.module!=='imports' || r.projectId!==db.data.selectedProject)throw Error('Importquelle nicht gefunden.');
        shell('Import-Originaldaten',panel(r.data.source,`<label>Unveränderter eingelesener Dateiinhalt<textarea rows="20" readonly>${esc(r.originalText)}</textarea></label>${btn('Zurück zum Importjournal','open','imports')}`));
      }
      if(action==='convert-import') {
        const r=db.get(id);if(!r?.importFinding || r.projectId!==db.data.selectedProject)throw Error('Prüfvorgang nicht gefunden.');
        const candidate=r.importFinding.candidate;
        shell('Sonderposition wandeln',panel(r.data.title,`<p>${esc(r.data.finding)}</p><p><strong>Vorschlag:</strong> ${esc(r.data.question)}</p><form id="dwp-convert-import" class="quick-form"><input type="hidden" name="findingId" value="${esc(id)}">${core.definitions.lv.fields.filter(f=>['number','text','groupPath','kind','choiceGroup','changeNumber','qty','unit'].includes(f.key)).map(f=>field(f.label,input(f,candidate[f.key] ?? ''))).join('')}${field('Begründung / Mengen- und Preisbasis', '<textarea name="reason" required></textarea>')}<p class="field-span">Menge, Leistungsart und Text anhand des Originals prüfen. Preis- und Zeitansätze anschließend im LV ergänzen. Die neue Position bleibt auf Prüfung.</p><button class="button button-primary" type="submit">Geprüfte Wandlung speichern</button></form>`));
      }
      if(action==='contract-finding'){
        const f=db.contractChecks().find(f=>f.positionId+'/'+f.code===id);
        if(!f)throw Error('Befund nicht mehr vorhanden. Bitte neu prüfen.');
        const title='LV-Prüfung '+f.number+' · '+f.code;
        if(db.list('contract').some(r=>r.data.title===title && r.data.positionId===f.positionId && r.status!=='Erledigt' && (!r.autoCheck || r.autoCheck.basis===f.basis)))throw Error('Für diesen Befund besteht bereits eine offene Rückfrage.');
        mutate('save',['contract',{title,positionId:f.positionId,finding:f.finding,question:f.question,source:'DachWerkPro LV-Datenprüfung v2',checkCode:f.code,blocking:false},{status:'Prüfung',owner:state.currentUser}],()=>{notice('Rückfrage projektbezogen gespeichert.');openModule('contract');});
      }
      if(action==='edit') {if(state.unsavedChanges&&!confirm('Ungespeicherte Eingaben verwerfen?'))return;if(['efb','calculation'].includes(current)){openModule('lv');}editing=id;records(core.definitions[current]);}
      if(action==='cancel'){state.unsavedChanges=false;openModule(current);}
      if(action==='issue'){const fields=main.querySelector(id==='offers'?'#dwp-offer-terms':'#dwp-invoice-options');const selectedPositionIds=id==='offers'?[...main.querySelectorAll('[data-offer-position]:checked')].map(el=>el.value):undefined;mutate('issue',[id,{owner:state.currentUser,...(selectedPositionIds?{selectedPositionIds}:{}),...(fields?Object.fromEntries([...fields.querySelectorAll('[name]')].map(el=>[el.name,el.value])):{})}],()=>{state.unsavedChanges=false;notice('Dokumentfassung gespeichert.');openModule(id);});}
      if(action==='print')printRecord(db.get(id));
      if(action==='demand-purchase'){mutate('createPurchase',[id,{owner:state.currentUser}],()=>{notice('Bestellentwurf aus dem offenen Bedarf angelegt.');openModule('purchase');});}
      if(action==='use-quote'){const [supplierId,quoteId]=id.split('/');mutate('useQuote',[supplierId,quoteId,state.currentUser],()=>{notice('Preisquelle freigegeben und Artikelhistorie aktualisiert.');openModule(current);});}
      if(action==='cancel-schedule'){const [employeeId,assignmentId]=id.split('/');mutate('cancelSchedule',[employeeId,assignmentId],()=>{notice('Einsatz storniert und im Logbuch erhalten.');openModule(current);});}
      if(action==='signature')signatureView(id);
      if(action==='clear-signature'){const canvas=main.querySelector('#dwp-signature');canvas.getContext('2d').clearRect(0,0,640,240);signatureStrokes=[], importPreview=null;}
      if(action==='search-open'){const r=db.get(id);if(r.projectId)selectProject(r.projectId);openModule(r.module);if(core.definitions[r.module].fields.length && r.module!=='imports'){editing=r.id;records(core.definitions[r.module]);}}
      if(action==='server-reload'){
        if(!confirmPageChange())return;
        target.disabled=true;target.textContent='Projekte werden geladen …';
        try{await window.DWPRemote.reload();}
        finally{target.disabled=false;target.textContent='Projekte neu laden';}
      }
      if(action==='operating-rate')mutate('applyOperatingCosts',[],()=>{notice('Vollkostensatz übernommen; AGK auf 0 gesetzt.');openModule('calculation');});
      if(action==='backup')download('DachWerkPro_Sicherung.json',db.backup());
      if(action==='project-json')download('DachWerkPro_Projektakte.json',JSON.stringify({project:db.project(),customer:db.get(db.project().data.customerId),records:db.data.records.filter(r=>r.projectId===db.data.selectedProject)},null,2));
      if(action==='bfw-csv')csvExport('DachWerkPro_BFW_Uebergabe.csv',core.bfwTransferRows(db.calculation().positions));
      if(action==='calc-csv' || action==='snapshot-csv') {
        const positions=action==='calc-csv'?db.calculation().positions:db.get(id).data.positions;
        csvExport('DachWerkPro_Positionen.csv',[['Position','Gliederung','Leistung','Menge','Einheit','EP netto','GP netto','Leistungsart','Wahlgruppe','In Summe'],...[...positions,...(action==='snapshot-csv'&&db.get(id).module==='offers'?[...(db.get(id).data.optionalPositions || []),...(db.get(id).data.alternativePositions || [])]:[])].map(p=>[p.number,p.groupPath || '',p.text,p.qty,p.unit,p.ep,p.gp,p.kind || 'Hauptleistung',p.choiceGroup || '',action==='calc-csv'?(!['Bedarfsposition','Alternativposition'].includes(p.kind)?'Ja':'Nein'):(positions.includes(p)?'Ja':'Nein')])]);
      }
      if(action==='closing-csv')csvExport('DachWerkPro_Belege.csv',[['Modul','Nummer','Datum','Netto','Brutto','Status'],...db.data.records.filter(r=>r.projectId===db.data.selectedProject && ['incoming','invoices','payments','times','subcontracts'].includes(r.module)).map(r=>[core.definitions[r.module].name,r.data.number || r.data.invoiceNumber || r.data.title,r.data.date || r.createdAt,r.data.net ?? r.data.cost ?? '',r.data.gross ?? r.data.amount ?? '',r.status])]);
      if(action==='cancel-import-read') {
        cancelImportRead();
        main.querySelector('#dwp-import-file').value='';
        main.querySelector('#dwp-import-progress').textContent='Einlesen abgebrochen. Bitte eine Datei auswählen.';
      }
      if(action==='preview-import') {
        importPreview=null;
        document.querySelector('#dwp-import-preview').textContent='';
        const input=importInput(),report=parsedImport(input),rows=report.rows;
        let raw=db.backup();
        const staging=new core.Store({getItem:()=>raw,setItem:(_key,value)=>{raw=value;}});
        staging.importPositions(rows,importSource(input,report));
        document.querySelector('#dwp-import-preview').innerHTML=`<p>${rows.length} LV-Positionen und ${report.findings.length} gesperrte Prüfvorgänge für ${esc(db.project().data.name)} geprüft. Übernahme setzt keine Fachfreigabe.</p>`+table(['Position','Gliederung','Leistung','Menge','Einheit','Leistungsart','Wahlgruppe'],rows.map(r=>[esc(r.number),esc(r.groupPath || ''),esc(r.text),esc(r.qty),esc(r.unit),esc(r.kind || 'Hauptleistung'),esc(r.choiceGroup)]))+table(['Sonderposition / Hinweis','Originalinhalt','Wandlungsvorschlag'],report.findings.map(f=>[esc(f.number),esc(f.text),esc(f.suggestion)]));
        importPreview=input;
      }
      if(action==='price-csv') {
        priceReadToken++;pricePreview=null;
        const csv=document.querySelector('#dwp-price-csv').value;
        priceSource=null;document.querySelector('#dwp-price-controls').textContent='';document.querySelector('#dwp-price-preview').textContent='';
        priceSource={book:window.DWPMaterialPriceImport.csv(csv),csv};priceControls();
      }
      if(action==='price-preview') {
        pricePreview=null;document.querySelector('#dwp-price-preview').textContent='';
        const input=priceInput(),report=priceReport(input);
        document.querySelector('#dwp-price-preview').innerHTML=`<p>${report.rows.length} Artikel geprüft. EK = (Preis × (1 − Rabatt / 100) + Fracht) / Gebindeinhalt. Übernahme erfolgt zur Einzelpreisprüfung.</p>`+table(['Artikel','Artikelnummer','Hersteller','Lieferant','Einheit','EK je Artikeleinheit'],report.rows.map(r=>[esc(r.name),esc(r.article),esc(r.manufacturer),esc(r.supplier || input.values.supplier),esc(r.unit),money(r.price)]))+table(['Originalzeile','Preisgebinde netto','Rabatt %','Fracht','Gebindeinhalt','Berechneter EK'],report.calculations.map(c=>[esc(c.row),money(c.price),esc(c.discount),money(c.freight),esc(c.baseQuantity),money(c.effective)]));
        pricePreview=input;
      }
      if(action==='service-lv') {
        const data=db.get(id).data;
        mutate('save',['lv',{number:`${String(db.list('lv').length+1).padStart(3,'0')}`,text:data.text,qty:1,unit:data.unit,minutes:data.minutes,material:data.material}],()=>notice('Leistungsbaustein als neue LV-Position übernommen.'));
      }
      if(action==='attach') {
        const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp,application/pdf';
        input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(window.DWPRemote?.active){notice('Originaldatei wird zentral gespeichert …');await window.DWPRemote.uploadFile(id,file);openModule(current);notice('Originaldatei gespeichert und geprüft.');return;}if(file.size>2_000_000)throw Error('Datei maximal 2 MB für lokalen Testbetrieb.');const reader=new FileReader();reader.onload=()=>{try{mutate('attach',[id,{name:file.name,dataUrl:reader.result}],()=>openModule(current));}catch(e){showError(e);}};reader.readAsDataURL(file);}catch(e){showError(e);}};input.click();
      }
      if(action==='file' && window.DWPRemote?.active) {
        const [recordId,fileId]=id.split('/');
        const metadata=db.get(recordId)?.attachments?.find(a=>a.id===fileId);
        if(metadata?.storageId){
          const file=await window.DWPRemote.originalFile(recordId,metadata.storageId);
          const url=URL.createObjectURL(file.blob),dialog=document.createElement('dialog');dialog.className='dwp-file-dialog';
          dialog.innerHTML=`<h2>${esc(file.name)}</h2><p>Geprüfte Originaldatei · Eigentümer auf freigegebenem Gerät</p>${file.blob.type==='application/pdf'?'<iframe title="Originaldokument" style="width:100%;height:70vh;border:0"></iframe>':'<img alt="Originalbild" style="max-width:100%">'}<button type="button" class="button">Schließen</button>`;
          document.body.append(dialog);dialog.querySelector('iframe,img').src=url;dialog.showModal();
          const close=()=>{dialog.remove();URL.revokeObjectURL(url);};dialog.querySelector('button').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});return;
        }
        const file=await window.DWPRemote.file({recordId,fileId,projectId:db.data.selectedProject});
        const dialog=document.createElement('dialog');dialog.className='dwp-file-dialog';
        dialog.innerHTML=`<h2>${esc(file.name)}</h2><p>Einmalige Anzeige · schließt nach ${file.displaySeconds} Sekunden</p><div class="dwp-protected-image"><img alt="${esc(file.name)}" draggable="false"><span>${esc(file.watermark)}</span></div><button type="button" class="button">Schließen</button><p>Screenshots und externe Fotos können im Browser nicht sicher verhindert werden.</p>`;
        document.body.append(dialog);dialog.querySelector('img').src=file.dataUrl;dialog.showModal();
        const close=()=>{dialog.querySelector('img').removeAttribute('src');dialog.close();dialog.remove();clearTimeout(timer);document.removeEventListener('visibilitychange',hide);};
        const hide=()=>{if(document.hidden)close();};
        const timer=setTimeout(close,file.displaySeconds*1000);
        document.addEventListener('visibilitychange',hide);dialog.querySelector('button').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('contextmenu',e=>e.preventDefault());return;
      }
      if(action==='file') {
        const [rid,aid]=id.split('/'),file=db.get(rid)?.attachments.find(a=>a.id===aid);
        if(file) {const [prefix,base64]=file.dataUrl.split(',');const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:prefix.match(/data:([^;]+)/)[1]}));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);}
      }
      if(action==='legacy-copy') {
        const work=JSON.parse(localStorage.getItem('dwp-lv-import-v1') || '{}').workingCopies?.find(w=>w.id===id);
        if(!work)throw Error('Arbeitskopie nicht gefunden.');
        mutate('importPositions',[work.positions.map(p=>({...p,kind:p.kind || p.positionType || 'Hauptleistung',choiceGroup:p.choiceGroup || '',number:p.nr || p.number || p.id,text:p.text || p.title,qty:p.qty,unit:p.unit || 'm²',material:p.material || 0,minutes:p.minutes ?? p.time ?? 0,equipment:p.equipment || 0,subcontract:p.subcontract || 0}))],()=>{notice('Arbeitskopie übernommen. Originalbestand bleibt erhalten.');openModule('lv');});
      }
      if(action==='legacy-import'){if(window.DWPRemote?.active)throw Error('Der alte lokale Importmanager ist ausschließlich im Modultest verfügbar. Für zentrale Daten den geprüften CSV-Import verwenden.');current='legacy';main.innerHTML=calculationView();bindDynamicInteractions();}
    }catch(e){showError(e);}
  },true);
  main.addEventListener('input',event=>{
    if(event.target.id==='dwp-module-search'){search=event.target.value;filterModules();return;}
    if(event.target.closest('.dwp-workspace form'))state.unsavedChanges=true;
  });
  main.addEventListener('dragover',event=>{if(event.target.closest('#dwp-price-drop'))event.preventDefault();});
  main.addEventListener('drop',event=>{
    if(!event.target.closest('#dwp-price-drop'))return;
    event.preventDefault();event.stopPropagation();
    if(event.dataTransfer.files.length!==1){showError(Error('Bitte genau eine Preisliste ablegen.'));return;}
    readPriceFile(event.dataTransfer.files[0]);
  });
  main.addEventListener('change',async event=>{
    try {
      if(event.target.matches('[data-offer-position]')){updateChoiceTotal();state.unsavedChanges=true;}
      if(event.target.id==='dwp-project') {
        if(!event.target.value){event.target.value=db.data.selectedProject || '';return;}
        if(state.unsavedChanges&&!confirm('Ungespeicherte Eingaben verwerfen und Projekt wechseln?')){event.target.value=db.data.selectedProject;return;}
        selectProject(event.target.value);state.unsavedChanges=false;openModule(current);
      }
      if(event.target.id==='dwp-excel-sheet' || event.target.id==='dwp-excel-header') {
        excelControls(Number(document.querySelector('#dwp-excel-sheet').value),event.target.id==='dwp-excel-header'?Number(event.target.value):undefined);importPreview=null;state.unsavedChanges=true;
      }
      if(event.target.id==='dwp-import-format') {
        if(event.target.value==='Excel Prüfquelle' && excelSource)excelControls();
        else document.querySelector('#dwp-excel-controls').textContent='';
        document.querySelector('#dwp-csv').readOnly=['Excel Prüfquelle','PDF Prüfquelle'].includes(event.target.value);importPreview=null;
      }
      if(event.target.id==='dwp-import-file')await readImportFile(event.target);
      if(event.target.id==='dwp-price-file')await readPriceFile(event.target.files[0]);
      if(event.target.id==='dwp-price-sheet' || event.target.id==='dwp-price-header')priceControls(Number(document.querySelector('#dwp-price-sheet').value),event.target.id==='dwp-price-header'?Number(event.target.value):undefined);
      if(event.target.id==='dwp-restore') {
        const text=await event.target.files[0].text();
        if(confirm('Aktuellen lokalen Arbeitsbestand durch diese Sicherung ersetzen?')){mutate('restore',[text],()=>{state.unsavedChanges=false;openModule('dashboard');});}
      }
      if(event.target.closest('#dwp-record, #dwp-import'))state.unsavedChanges=true;
    }catch(e){showError(e);}
  });
  // Keep the established navigation while routing each section to the shared model.
  document.querySelector('#quick-form').addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();const kind=document.querySelector('#record-type').value;closeQuickModal();openModule(kind==='Kunde'?'customers':kind==='Dokument'?'documents':'projects');notice('Bitte im gemeinsamen Fachformular erfassen und speichern.');},true);
  const legacyConfirm=confirmPageChange;
  confirmPageChange=()=>{
    if(current==='legacy')return legacyConfirm();
    if(!state.unsavedChanges)return true;
    if(!confirm('Ungespeicherte Eingaben verwerfen und Bereich wechseln?'))return false;
    state.unsavedChanges=false;return true;
  };
  for(const [view,module] of Object.entries(viewsToModule))views[view]=()=>{setTimeout(()=>openModule(module),0);return '';};
  views.dashboard=()=>{setTimeout(()=>openModule('dashboard'),0);return '';};
  document.querySelector('#f3-button')?.addEventListener('click',event=>{event.stopImmediatePropagation();closeQuickModal();openModule(state.currentView==='customers'?'customers':'projects');},true);
  document.addEventListener('keydown',event=>{if(event.key==='F3' && !document.querySelector('#app-shell').classList.contains('is-hidden')){event.preventDefault();event.stopImmediatePropagation();openModule(state.currentView==='customers'?'customers':'projects');}},true);
  const globalSearch=document.querySelector('#global-search');
  globalSearch.addEventListener('input',event=>event.stopImmediatePropagation(),true);
  globalSearch.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();try{searchRecords(globalSearch.value);}catch(e){showError(e);}}});
  document.querySelector('#notification-button').addEventListener('click',event=>{
    event.stopImmediatePropagation();
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const due=db.data.records.filter(r=>r.due && r.due<=today && !['Freigegeben','Erledigt'].includes(r.status));
    if(state.unsavedChanges && !confirm('Ungespeicherte Eingaben verwerfen und fällige Vorgänge anzeigen?'))return;
    current='notifications';state.currentView='notifications';
    shell('Fällige Vorgänge',panel('Heute fällig oder überfällig',table(['Vorgang','Projekt','Verantwortlich','Frist','Aktion'],due.map(r=>[esc(names(r.id)),esc(db.get(r.projectId)?.data.name || 'Stammdaten'),esc(r.owner),esc(r.due),btn('Öffnen','search-open',r.id)]))));
  },true);
  window.addEventListener('storage',event=>{if(!window.DWPRemote?.active && event.key===db.key){try{db=new core.Store(localStorage);if(state.unsavedChanges)showError(Error('Änderung aus einem anderen Fenster. Eingaben vor dem Speichern prüfen.'));else openModule(current);}catch(e){showError(e);}}});
  if(!document.querySelector('#app-shell').classList.contains('is-hidden'))openModule(viewsToModule[state.currentView] || 'dashboard');
})();

