(function () {
  'use strict';
  const core=window.DWPProject, main=document.querySelector('#main-content');
  let db, current='dashboard', editing=null, search='', signatureStrokes=[];
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
  window.DWPWorkspace={get store(){return db;},open:openModule,acceptServerState(data,user){
    const selected=data.selectedProject || db.data.selectedProject;
    let raw=JSON.stringify(data);
    db=new core.Store({getItem:()=>raw,setItem:(_key,value)=>{raw=value;}});
    if(selected && db.get(selected)?.module==='projects')db.data.selectedProject=selected;
    state.currentUser=user.name || user.id;
  }};
  function mutate(method,args,after=()=>{}) {
    if(window.DWPRemote?.active)return window.DWPRemote.run(method,args).then(after).catch(showError);
    if(window.DWPRemote)throw Error('Bitte zuerst zentral anmelden.');
    const result=db[method](...args);after(result);return result;
  }
  function selectProject(id) {
    if(window.DWPRemote?.active){if(db.get(id)?.module!=='projects')throw Error('Projekt fehlt.');db.data.selectedProject=id;}
    else db.select(id);
  }
  function projectBar() {
    return `<div class="dwp-project-bar"><label>Aktuelles Projekt<select id="dwp-project"><option value="">Projekt auswählen</option>${db.list('projects').map(r=>`<option value="${esc(r.id)}" ${db.data.selectedProject===r.id?'selected':''}>${esc(r.data.name)}</option>`).join('')}</select></label><span>${esc(db.project()?names(db.project().data.customerId):'Zuerst Kunde und Projekt anlegen')}</span>${btn('+ Kunde','open','customers')}${btn('+ Projekt','open','projects')}</div>`;
  }
  function header(name) {
    return `<header class="page-header"><div><span class="eyebrow">DachWerk Pro · Verbundene Arbeitsmodule</span><h1 tabindex="-1">${esc(name)}</h1><p>Gemeinsame Projektakte mit nachvollziehbaren Freigaben und Dokumentfassungen.</p></div><div class="header-actions">${btn('Alle Module','open','dashboard')}${btn('Workflow','open','workflow')}${btn('Zugriff und Nutzung','open','access')}${btn('Logbuch','open','audit')}${btn('Sicherung','backup')}</div></header><p class="dwp-local-note">Lokaler Testbetrieb · Daten bleiben in diesem Browser. Produktive Benutzerrechte, Cloud-Ablage und Schnittstellen sind noch nicht freigegeben.</p>${projectBar()}`;
  }
  function shell(name,body) {
    main.innerHTML=`<section class="page dwp-workspace">${header(name)}<p id="dwp-error" role="alert" class="dwp-error"></p>${window.DWPRemote?.active?btn('Serverbestand neu laden','server-reload'):''}${body}</section>`;
    if(window.DWPRemote?.active)main.querySelector('.dwp-local-note').textContent='Zentrale Projektakte · Änderungen nach Serverspeicherung. Anmeldungen und Modulaufrufe werden protokolliert.';
    state.unsavedChanges=false;
    main.querySelector('h1')?.focus({preventScroll:true});
  }
  function showError(e) {const el=main.querySelector('#dwp-error');if(el){el.textContent=e.message || String(e);el.scrollIntoView({block:'nearest'});}}
  function notice(text) {showToast('DachWerk Pro',text);}
  function table(headers,rows) {
    return `<div class="data-table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(cells=>`<tr>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">Noch keine Einträge im aktuellen Bestand.</td></tr>`}</tbody></table></div>`;
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
    shell('Alle Arbeitsmodule',`${p?panel('Aktuelles Projekt',`<h3>${esc(p.data.name)}</h3><p>${esc(names(p.data.customerId))} · ${esc(p.data.phase)}</p><div class="dwp-metrics"><span>LV: ${db.list('lv').length} Positionen</span><span>Kalkulation: ${money(db.calculation().net)}</span><span>Ist-Kosten: ${money(stats.actual)}</span><span>Offener Zahlungsbetrag: ${money(stats.outstanding)}</span></div>`):panel('Projekt starten',`<p>Lege zuerst einen Kunden und danach ein Projekt an. Wähle das Projekt oben aus; alle Fachvorgänge folgen dieser Zuordnung.</p>`)}${p?panel('Nächster Arbeitsschritt',`${btn(core.definitions[db.workflow().next].name,'open',db.workflow().next,true)}${btn('Übergaben prüfen','open','workflow')}`):''}<label>Modul suchen<input id="dwp-module-search" type="search" placeholder="z. B. Aufmaß, Rechnung, Gutachten" value="${esc(search)}"></label><div class="module-grid dwp-module-grid">${core.modules.map((m,i)=>`<article class="module-card" data-dwp-card data-name="${esc(m.name.toLocaleLowerCase('de'))}"><span class="eyebrow">${String(i+1).padStart(2,'0')} · ${m.scope==='global'?'Stammdaten':'Projektakte'}</span><h3>${esc(m.name)}</h3><p>${verificationBadge(m.id)}</p><p>${db.list(m.id).length} gespeicherte Vorgänge${['imports','pricelists','correspondence','documents','tenders','acceptance','efb'].includes(m.id)?' · Spezialfunktionen in Entwicklung':''}</p>${btn('Öffnen','open',m.id)}</article>`).join('')}</div>`);
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
    return {date:new Date().toISOString().slice(0,10),unit:'m²',qty:1,length:1,width:1,factor:1,consumption:1,tax:19,rate:db.data.settings.wage,phase:'Erfassung',productiveHours:db.data.settings.capacity?.productiveHours || 1};
  }
  function recordForm(mod) {
    const r=editing?db.get(editing):null, values=r?.pendingPrice?.data || r?.data || defaults(mod.id);
    return panel(r?'Vorgang bearbeiten':'Vorgang anlegen',`<form id="dwp-record" class="quick-form"><input type="hidden" name="module" value="${esc(mod.id)}">${mod.fields.map(f=>field(f.label,input(f,values[f.key]))).join('')}${field('Status',`<select name="status">${core.statuses.map(s=>`<option ${s===(r?.status || 'Neu')?'selected':''}>${esc(s)}</option>`).join('')}</select>`)}${field('Verantwortlich',`<input name="owner" value="${esc(r?.owner || '')}" placeholder="Name / Rolle">`)}${field('Rückmeldefrist',`<input name="due" type="date" value="${esc(r?.due)}">`)}<div class="field-span dwp-actions"><button class="button button-primary" type="submit">Speichern</button>${r?btn('Bearbeitung abbrechen','cancel'):''}</div></form>`);
  }
  function records(mod) {
    const list=db.list(mod.id);
    const rows=list.map(r=>[
      `<strong>${esc(names(r.id))}</strong><small>${esc(r.id.slice(0,8))}</small>`,
      `<span class="status-pill ${r.status==='Freigegeben'?'status-green':'status-grey'}">${esc(r.status)}</span>`,
      esc(r.owner),esc(r.due),`${btn(r.pendingPrice?'Importpreis prüfen':'Bearbeiten','edit',r.id)}${btn('Drucken / PDF','print',r.id)}${['documents','defects','expert','acceptance','diary'].includes(mod.id)?btn('Datei / Foto','attach',r.id):''}${['acceptance','times'].includes(mod.id)?btn(`Unterschrift${r.signatures?.length?' ('+r.signatures.length+')':''}`,'signature',r.id):''}${mod.id==='services'?btn('Ins LV','service-lv',r.id):''}`
    ]);
    let summary='';
    if(mod.id==='measurements') summary=panel('Freigegebenes Aufmaß und Abweichung',table(['Position','LV-Menge','Aufmaß','Differenz'],db.list('lv').map(r=>[esc(r.data.number),`${r.data.qty} ${esc(r.data.unit)}`,`${db.measured(r.id)} ${esc(r.data.unit)}`,esc(core.round(db.measured(r.id)-r.data.qty))])));
    if(mod.id==='operating') summary=panel('Kosten je produktiver Stunde',table(['Kostenansatz','€/h'],list.map(r=>[esc(r.data.title),money(r.data.annualCost/r.data.productiveHours)])));
    if(mod.id==='operating') {
      const c=db.data.settings.capacity || {year:new Date().getFullYear(),headcount:1,weeklyHours:40,leaveDays:30,sickDays:0,trainingDays:0,nonproductivePercent:0,holidayDates:''};
      summary+=panel('Jährliche Produktivstunden',`<p>Fünftagewoche Montag–Freitag. Urlaub, Krankheit und Schulung je Vollzeitkraft; Personalanzahl als Vollzeitäquivalente. Feiertage des jeweiligen Standorts ausdrücklich eintragen. Wochenenden und doppelte Feiertage werden nicht mehrfach abgezogen.</p><form id="dwp-capacity" class="quick-form">${[['year','Jahr'],['headcount','Vollzeitäquivalente'],['weeklyHours','Wochenstunden'],['leaveDays','Urlaubstage'],['sickDays','Krankheitstage'],['trainingDays','Schulungstage'],['nonproductivePercent','Sonstiger unproduktiver Anteil %']].map(([key,label])=>field(label,`<input name="${key}" inputmode="decimal" value="${esc(c[key])}" required>`)).join('')}${field('Feiertage YYYY-MM-DD (eine Zeile je Datum)',`<textarea name="holidayDates" rows="5">${esc(c.holidayDates)}</textarea>`)}<button class="button button-primary" type="submit">Produktivstundenmodell speichern</button></form>${c.productiveHours?`<p>Kalenderwerktage ${c.weekdays} · Feiertage an Werktagen ${c.holidayDays} · verfügbare Arbeitstage je Kraft ${c.availableDays} · <strong>${c.productiveHours} produktive Stunden gesamt</strong></p>`:''}`);
    }
    if(mod.id==='operating')summary+=panel('Kalkulationsbasis übernehmen',`<p>Freigegebene Kosten je produktiver Stunde werden addiert und als Vollkostensatz übernommen. Der AGK-Zuschlag wird dabei auf 0 gesetzt. Dieselben Kosten nicht mehrfach erfassen.</p>${btn('Vollkostensatz übernehmen','operating-rate')}`);
    if(mod.id==='materials') summary=panel('Preishistorie',table(['Artikel','Aktuell','Vorherige Preisstände'],list.map(r=>[esc(r.data.name),money(r.data.price),esc((r.history || []).slice(-2).map(p=>`${p.priceDate}: ${money(p.price)}`).join(' · '))])));
    if(mod.id==='energy') summary=panel('Variantenvergleich',table(['Bauteil','ΔU × Fläche (W/K)'],list.map(r=>[esc(r.data.component),esc(core.round((r.data.uBefore-r.data.uAfter)*r.data.area))]))+'<p>Dies ist ein Bauteilvergleich, kein Energieausweis und kein Förderfähigkeitsnachweis.</p>');
    if(['purchase','logistics'].includes(mod.id))summary+=panel('Materialbedarf und Lieferstand',table(['Artikel','Bedarf','Bestellt','Geliefert','Noch zu bestellen','Aktion'],db.materialDemand().map(d=>[esc(d.name),`${d.quantity} ${esc(d.unit)}`,esc(d.ordered),esc(d.delivered),esc(d.remaining),d.remaining>0?btn('Bestellentwurf anlegen','demand-purchase',d.materialId):'Bedarf gedeckt'])));
    if(['materials','suppliers'].includes(mod.id))summary+=quotePanel();
    if(mod.id==='personnel')summary+=schedulePanel();
    if(mod.id==='pricelists')summary+=priceImportPanel();
    let integration='';
    const missing={pricelists:'CSV-Preislisten werden mit Vorschau, Artikelabgleich und Preisquelle übernommen. Importierte Preise müssen einzeln freigegeben werden. DATANORM-Parser und Excel-Spaltenmapping sind noch nicht freigegeben.',correspondence:'Nachrichten werden als Entwurf geführt. Ein Versand- oder Zustellnachweis entsteht erst mit einer eingerichteten Mailanbindung.',documents:'Fotos und PDF können zugeordnet werden. Scannersteuerung und automatische OCR sind noch nicht angeschlossen.',tenders:'Vergaben mit Fundstelle und Frist können erfasst werden. Der automatische Quellenscan ist noch nicht angeschlossen.',acceptance:'Handschriftliche Unterschriften werden mit dem angezeigten Protokollstand gespeichert. Zentrale Originalablage und qualifizierte elektronische Signatur sind nicht angeschlossen.',personnel:'Einsatzzeiträume werden auf Doppelbelegung geprüft. Sensible Lohn-, Steuer- und SV-Stammdaten benötigen geschützte serverseitige Rollen.'};
    if(missing[mod.id]) integration=panel('Funktionsstand',`<p>${esc(missing[mod.id])}</p>`);
    const attachments=list.flatMap(r=>(r.attachments || []).map(a=>`<li>${esc(names(r.id))} · ${esc(a.name)} ${btn('Öffnen','file',`${r.id}/${a.id}`)}</li>`));
    shell(mod.name,`${integration}${recordForm(mod)}${panel('Gespeicherte Vorgänge',table(['Vorgang','Status','Verantwortlich','Frist','Aktionen'],rows))}${summary}${attachments.length?panel('Zugeordnete Dateien',`<ul>${attachments.join('')}</ul>`):''}`);
  }
  function quotePanel() {
    const materials=db.list('materials'),suppliers=db.list('suppliers');
    const options=records=>`<option value="">Bitte auswählen</option>${records.map(r=>`<option value="${esc(r.id)}">${esc(names(r.id))}</option>`).join('')}`;
    return panel('Lieferantenpreise vergleichbar erfassen',`<p>Alle Preise beziehen sich auf die Einheit des gewählten Artikels. Fracht wird als Betrag je Einheit erfasst. Umrechnungen von Gebinden vorher prüfen.</p><form id="dwp-quote" class="quick-form">${field('Artikel',`<select name="materialId" required>${options(materials)}</select>`)}${field('Lieferant',`<select name="supplierId" required>${options(suppliers)}</select>`)}${field('Listenpreis je Einheit netto',`<input name="price" inputmode="decimal" required>`)}${field('Rabatt %',`<input name="discount" inputmode="decimal" value="0" required>`)}${field('Fracht je Einheit netto',`<input name="freight" inputmode="decimal" value="0" required>`)}${field('Preisstand',`<input name="date" type="date" required value="${new Date().toISOString().slice(0,10)}">`)}${field('Quelle / Angebotsnummer',`<input name="source" required>`)}<button class="button button-primary" type="submit">Preisvergleich speichern</button></form>`)+panel('Vergleich nach effektivem Einkaufspreis',table(['Artikel','Lieferant','Einheit','Preisstand','EK inkl. Fracht','Übernahme'],materials.flatMap(m=>db.quotes(m.id).map(q=>[esc(m.data.name),esc(q.supplier),esc(q.unit),esc(q.date),money(q.effectivePrice),btn('Artikelpreis freigeben','use-quote',`${q.supplierId}/${q.id}`)]))));
  }
  function schedulePanel() {
    const options=records=>`<option value="">Bitte auswählen</option>${records.map(r=>`<option value="${esc(r.id)}" ${r.id===db.data.selectedProject?'selected':''}>${esc(names(r.id))}</option>`).join('')}`;
    return panel('Einsatz planen',`<p>Zeiträume werden einschließlich Anfangs- und Endtag reserviert. Doppelbelegungen werden projektübergreifend verhindert. Feiertage und Teilzeitschichten sind noch nicht berücksichtigt.</p><form id="dwp-schedule" class="quick-form">${field('Mitarbeiter',`<select name="employeeId" required>${options(db.list('personnel'))}</select>`)}${field('Projekt',`<select name="projectId" required>${options(db.list('projects'))}</select>`)}${field('Von',`<input name="start" type="date" required>`)}${field('Bis',`<input name="end" type="date" required>`)}${field('Aufgabe',`<input name="task">`)}<button class="button button-primary" type="submit">Einsatz speichern</button></form>`)+panel('Einsatzübersicht aller Projekte',table(['Mitarbeiter','Projekt','Von','Bis','Aufgabe','Status'],db.list('personnel').flatMap(e=>(e.assignments || []).map(a=>[esc(e.data.name),esc(names(a.projectId)),esc(a.start),esc(a.end),esc(a.task),a.cancelled?'Storniert':btn('Einsatz stornieren','cancel-schedule',`${e.id}/${a.id}`)]))));
  }
  function priceImportPanel() {
    return panel('CSV-Preisliste prüfen und übernehmen',`<p>Pflichtspalten: name;unit;price. Optional: article;manufacturer;supplier. Ein vorhandener Artikel wird über Hersteller, Artikelnummer (ersatzweise Name), Lieferant und Einheit erkannt. Jede Übernahme setzt den Artikelpreis auf Prüfung.</p><label>CSV-Datei<input id="dwp-price-file" type="file" accept=".csv,text/csv"></label><form id="dwp-price-import" class="quick-form">${field('Quelle / Dateiname',`<input name="source" required>`)}${field('Preisstand',`<input name="priceDate" type="date" required value="${new Date().toISOString().slice(0,10)}">`)}${field('Lieferant für leere Lieferantenspalten',`<input name="supplier">`)}<div class="field-span"><label>CSV-Inhalt<textarea name="csv" id="dwp-price-csv" rows="7" required placeholder="name;unit;price;article;manufacturer&#10;Abdichtungsbahn;m²;9,20;ART001;Hersteller"></textarea></label></div><div class="field-span dwp-actions">${btn('Preisvorschau prüfen','price-preview')}<button class="button button-primary" type="submit">Preisliste zur Prüfung übernehmen</button></div></form><div id="dwp-price-preview"></div>`);
  }
  function signatureSvg(signature) {
    return `<svg class="dwp-signature-image" viewBox="0 0 640 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Handschriftliche Unterschrift">${signature.strokes.map(stroke=>`<polyline points="${stroke.map(p=>`${p[0]*640},${p[1]*240}`).join(' ')}" fill="none" stroke="#17241d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
  }
  function signatureView(id) {
    if(state.unsavedChanges && !confirm('Ungespeicherte Eingaben verwerfen und gespeicherten Vorgang unterschreiben?'))return;
    const r=db.get(id);signatureStrokes=[];
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
    return panel('Kalkulationsbasis',`<form id="dwp-settings" class="quick-form">${[['wage','Stundenkostensatz'],['agk','AGK %'],['profit','Wagnis / Gewinn %'],['tax','USt %']].map(([k,l])=>field(l,`<input name="${k}" inputmode="decimal" value="${s[k]}" required>`)).join('')}<p class="field-span">Bei einem Vollkostensatz inklusive Gemeinkosten AGK auf 0 setzen, um doppelte Zuschläge zu vermeiden.</p><button class="button button-primary" type="submit">Basis speichern</button></form>`)+panel('LV und Preisermittlung',`${btn('LV bearbeiten','open','lv')}${btn('LV importieren','open','imports')}${btn('CSV exportieren','calc-csv')}${table(['Position','Leistung','Menge','Material / E','Lohn / E','Gerät / E','NU / E','Kalkulierter EP','Ziel-/Angebots-EP','GP netto','Deckungsbeitrag'],c.positions.map(p=>[esc(p.number),esc(p.text),`${p.qty} ${esc(p.unit)}`,money(p.material),money(p.labor),money(p.equipment),money(p.subcontract),money(p.calculatedEp),money(p.ep),money(p.gp),money(p.contribution)]))}<h3>Summe netto ${money(c.net)}</h3><p>Material ${money(c.material)} · Lohn ${money(c.labor)} · Geräte ${money(c.equipment)} · NU ${money(c.subcontract)}</p>`);
  }
  function snapshots(kind) {
    const originals=db.list('offers').filter(r=>!r.data.baseOfferId);
    const orders=db.list('orders').filter(r=>r.status==='Freigegeben' && !db.get(r.data.offerId)?.data.baseOfferId);
    const originalInvoices=db.list('invoices').filter(r=>!r.data.stornoOf && !db.list('invoices').some(s=>s.data.stornoOf===r.id));
    const options=rows=>rows.map(r=>`<option value="${esc(r.id)}">${esc(names(r.id))}</option>`).join('');
    const invoiceFields=kind==='invoices'?`<div id="dwp-invoice-options" class="quick-form">${field('Hauptauftrag',`<select name="orderId"><option value="">Letzter freigegebener Hauptauftrag</option>${options(orders)}</select>`)}${field('Rechnungsart',`<select name="invoiceType"><option>Schlussrechnung</option><option>Abschlagsrechnung</option><option>Teilrechnung</option></select>`)}${field('Kumulativer Anteil des freigegebenen Aufmaßes %',`<input name="percentage" inputmode="decimal" value="100">`)}</div><p>Bei Abschlägen/Teilrechnungen den kumulativen Leistungsanteil angeben. Bereits berechnete Mengen werden abgezogen. Schlussrechnungen rechnen den verbleibenden freigegebenen Leistungsstand ab. XRechnung und ZUGFeRD sind noch nicht freigegeben.</p>`:'';
    const extra=kind==='offers'?panel('Nachtragsangebot zum Hauptauftrag',`<p>Nachtragspositionen im LV als Nachtrag kennzeichnen, technisch prüfen und freigeben. Ein Nachtragsangebot wird nach seiner Beauftragung in die Abrechnung des Hauptauftrags übernommen.</p><form id="dwp-change-offer" class="quick-form">${field('Hauptangebot',`<select name="baseOfferId" required><option value="">Bitte auswählen</option>${options(originals)}</select>`)}<button class="button button-primary" type="submit">Nachtragsangebot freigeben</button></form>`):panel('Rechnung stornieren',`<p>Das Original bleibt erhalten. Die Stornorechnung führt die Gegenbuchung mit eigenem Beleg und Begründung. Bereits erhaltene Zahlungen bleiben bestehen; Rückzahlungen werden separat auf den Stornobeleg gebucht.</p><form id="dwp-storno" class="quick-form">${field('Rechnung',`<select name="invoiceId" required><option value="">Bitte auswählen</option>${options(originalInvoices)}</select>`)}${field('Stornogrund',`<input name="reason" required>`)}<button class="button button-primary" type="submit">Stornorechnung erzeugen</button></form>`);
    return panel(kind==='offers'?'Angebotsfassungen':'Rechnungsfassungen',`<p>Jede Ausgabe speichert Kunde, Projekt, Leistungspositionen, Preise und Steuer als feste Fassung. Rechnungen übernehmen beauftragte Preise und freigegebene Aufmaßmengen.</p>${invoiceFields}${btn(kind==='offers'?'Angebot freigeben':'Rechnung freigeben','issue',kind,true)}${table(['Nummer','Art','Netto','USt','Brutto','Ausgabe'],db.list(kind).map(r=>[esc(r.data.number),esc(r.data.title),money(r.data.net),money(r.data.taxAmount),money(r.data.gross),`${btn('Drucken / PDF','print',r.id)}${btn('CSV','snapshot-csv',r.id)}`]))}`)+extra;
  }
  function controlling() {
    const c=db.controlling();
    return panel('Projektwirtschaftlichkeit',table(['Kennzahl','Betrag'],[['Kalkulierte Einzelkosten',money(c.planned)],['Erfasste Stundenkosten',money(c.times)],['Kostenrelevante Eingangsrechnungen',money(c.incoming)],['NU-Kostenansätze ohne zugeordnete Eingangsrechnung',money(c.subcontracts)],['NU-Auftrags-/Kostenansätze gesamt (nicht zusätzlich addiert)',money(c.commitments)],['Ist-Kosten gesamt',money(c.actual)],['Abgerechneter Umsatz netto',money(c.revenue)],['Vorläufiges Ergebnis vor übrigen Gemeinkosten',money(c.result)],['Ausgangsrechnungen brutto',money(c.gross)],['Zahlungen brutto',money(c.paid)],['Offener Zahlungsbetrag',money(c.outstanding)]]))+panel('Kosten vollständig erfassen',`<p>NU-Eingangsrechnungen mit dem NU-Kostenvorgang verknüpfen. Freigegebene, kostenrelevante Rechnungen ersetzen dessen vorläufigen Kostenansatz automatisch. Material und sonstige Kosten nicht zusätzlich als NU-Kosten erfassen. Das Ergebnis bildet ausschließlich erfasste und freigegebene Vorgänge ab.</p>${btn('Zeiten','open','times')}${btn('Eingangsrechnungen','open','incoming')}${btn('Fremdleistungen','open','subcontracts')}${btn('Zahlungen','open','payments')}`);
  }
  function importView() {
    let legacy=[];try{legacy=JSON.parse(localStorage.getItem('dwp-lv-import-v1') || '{}').workingCopies || [];}catch{}
    return panel('CSV-LV in das aktuelle Projekt übernehmen',`<p>Pflichtspalten: number;text;qty;unit. Optional: material;minutes;equipment;subcontract. Dezimalpunkt oder Dezimalkomma möglich. Zuerst Vorschau prüfen, danach übernehmen.</p><label>CSV-Datei<input id="dwp-import-file" type="file" accept=".csv,text/csv"></label><form id="dwp-import"><label>CSV-Inhalt<textarea name="csv" id="dwp-csv" rows="8" required placeholder="number;text;qty;unit;material;minutes&#10;010;Abdichtung;100;m²;15,50;10"></textarea></label><div class="dwp-actions">${btn('Vorschau prüfen','preview-import')}<button class="button button-primary" type="submit">In Projekt übernehmen</button></div></form><div id="dwp-import-preview"></div><p>PDF-, Excel-, OCR- und GAEB-Varianten benötigen weiterhin Parserprüfungen. Der bisherige Importmanager bleibt als separate Testfunktion erhalten.</p>${btn('Bisherigen Importmanager öffnen','legacy-import')}`)+panel('Vorhandene Arbeitskopien übernehmen',`<p>Alte Browserbestände werden erhalten. Eine Übernahme kopiert ausdrücklich gewählte Positionen in das aktuell ausgewählte Projekt. Anschließend neu prüfen und freigeben.</p>${table(['Arbeitskopie','Positionen','Übernahme'],legacy.map(w=>[esc(w.name),esc(w.positions?.length || 0),btn('In aktuelles Projekt kopieren','legacy-copy',w.id)]))}`);
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
    return panel('Betriebsdaten',`<form id="dwp-company" class="quick-form">${field('Betrieb / Briefkopf',`<input name="company" value="${esc(s.company)}" required>`)}${field('Anschrift',`<textarea name="address">${esc(s.address)}</textarea>`)}<button class="button button-primary" type="submit">Speichern</button></form>`)+panel('Sicherung und Wiederherstellung',`<p>Eine Sicherung enthält sämtliche lokalen Projektakten und zugeordneten Testdateien. Eine Wiederherstellung ersetzt den Arbeitsbestand nach ausdrücklicher Bestätigung; das aktuelle Logbuch bleibt erhalten.</p>${btn('Sicherung herunterladen','backup')}<label>Sicherung auswählen<input id="dwp-restore" type="file" accept=".json,application/json"></label>`);
  }
  function openModule(id) {
    if(state.unsavedChanges && !window.confirm('Ungespeicherte Eingaben verwerfen und Bereich wechseln?')) return;
    current=id;editing=null;search='';
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
    if(['calculation','efb'].includes(id))body=calculation()+(id==='efb'?panel('EFB-Funktionsstand','<p>Die Komponentenübersicht ist verfügbar. Amtliche EFB 221/222/223 mit geprüfter Feldzuordnung sind noch nicht umgesetzt.</p>'):'');
    if(['offers','invoices'].includes(id))body=snapshots(id);
    if(id==='controlling')body=controlling();
    if(id==='closing')body=panel('Projektbezogenes Belegpaket',`<p>JSON enthält die Projektakte, CSV die Rechnungen und Kostenbelege. DATEV-Importformate und automatischer Monatsabschluss sind noch nicht freigegeben.</p>${btn('Projektakte JSON','project-json')}${btn('Belegübersicht CSV','closing-csv')}`);
    if(id==='imports')body=importView();
    shell(mod.name,body);
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
    if(['offers','invoices'].includes(r.module)) {
      const d=r.data;
      body=`<h1>${esc(d.title)} ${esc(d.number)}</h1><p>${esc(d.customer.name)}<br>${esc(d.customer.address)}</p><h2>${esc(d.project.name)}</h2><p>${esc(d.project.address)}</p>${d.buyerReference?`<p>Käuferreferenz: ${esc(d.buyerReference)}</p>`:''}${table(['Pos.','Leistung','Menge','Einheit','EP netto','GP netto'],d.positions.map(p=>[esc(p.number),esc(p.text),esc(p.qty),esc(p.unit),money(p.ep),money(p.gp)]))}<p>Netto: ${money(d.net)}<br>USt ${d.tax}%: ${money(d.taxAmount)}<br><strong>Brutto: ${money(d.gross)}</strong></p>`;
      if(d.stornoOf)body+=`<p>Storno zu ${esc(d.originalNumber)} · Grund: ${esc(d.reason)}</p>`;
      else if(d.previouslyNet)body+=`<p>Zuvor berechnet netto: ${money(d.previouslyNet)}<br>Kumulativ einschließlich dieser Rechnung netto: ${money(core.round(d.previouslyNet+d.net))}</p>`;
    } else {
      body=`<h1>${esc(mod.name)}</h1><h2>${esc(names(r.id))}</h2><p>Projekt: ${esc(signed?.project?.name || db.get(r.projectId)?.data.name || 'Stammdaten')} · Status ${esc(r.status)}</p>${table(['Feld','Angabe'],mod.fields.map(f=>[esc(f.label),esc(signed?.labels?.[f.key] ?? (['customer','position','material','employee','offer','purchase','invoice','subcontract','record'].includes(f.type)?names(r.data[f.key]):f.type==='contacts'?(r.data[f.key] || []).map(c=>[c.name,c.role,c.email,c.phone].filter(Boolean).join(' · ')).join('\n'):r.data[f.key]))]))}<p>Verantwortlich: ${esc(r.owner)} · Frist ${esc(r.due)}</p>`;
      if(r.signatures?.length)body+=r.signatures.map(s=>`<p>${esc(s.role)}: ${esc(s.signer)} · ${esc(new Date(s.signedAt).toLocaleString('de-DE'))}</p>${signatureSvg(s)}`).join('');
      else if(r.module==='acceptance')body+='<p>Ort / Datum: __________________</p><p>Auftraggeber / Unterschrift: __________________</p><p>Auftragnehmer / Unterschrift: __________________</p>';
    }
    const company=signed?.company || r.data.company || db.data.settings;
    const frame=document.createElement('iframe');frame.className='dwp-print-frame';frame.title='Druckansicht';document.body.append(frame);
    const doc=frame.contentDocument;
    doc.open();doc.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(r.data.number || mod.name)}</title><link rel="stylesheet" href="/project-print.css"></head><body><header><strong>${esc(company.company)}</strong><p>${esc(company.address)}</p></header><p class="test-note">TESTFASSUNG · Keine produktiv freigegebene Geschäftsunterlage</p>${body}<footer>Erstellt ${esc(new Date(r.createdAt).toLocaleString('de-DE'))} · Vorgangs-ID ${esc(r.id)}</footer></body></html>`);doc.close();
    frame.onload=()=>{frame.contentWindow.focus();frame.contentWindow.print();};
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
      if(form.id==='dwp-import')command=['importPositions',csvRows(values.csv)];
      if(form.id==='dwp-quote')command=['quote',values.supplierId,values];
      if(form.id==='dwp-schedule')command=['schedule',values.employeeId,values];
      if(form.id==='dwp-sign'){command=['sign',values.recordId,{...values,strokes:signatureStrokes}];afterModule=db.get(values.recordId).module;}
      if(form.id==='dwp-price-import')command=['importMaterials',csvRows(values.csv,['name','unit','price']),{...values,owner:state.currentUser}];
      if(form.id==='dwp-change-offer')command=['issue','offers',{offerType:'Nachtragsangebot',baseOfferId:values.baseOfferId,owner:state.currentUser}];
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
      if(window.DWPRemote?.active && ['backup','project-json','calc-csv','snapshot-csv','closing-csv','print'].includes(action)) {
        const kind={backup:'backup','project-json':'project','calc-csv':'calculation','snapshot-csv':'positions','closing-csv':'closing',print:'record'}[action];
        const output=await window.DWPRemote.export({kind,projectId:db.data.selectedProject,recordId:id});
        if(action==='print')printRecord(output.record);
        else if(['calc-csv','snapshot-csv'].includes(action)){const rows=output.positions || output.record.data.positions;csvExport('DachWerkPro_Positionen.csv',[['Position','Leistung','Menge','Einheit','EP netto','GP netto'],...rows.map(p=>[p.number,p.text,p.qty,p.unit,p.ep,p.gp])]);}
        else download(output.name,output.text,output.type);
        return;
      }
      if(action==='advance-phase')mutate('advancePhase',[id],()=>{notice('Projektübergabe geprüft und gespeichert.');openModule('workflow');});
      if(action==='open')openModule(id);
      if(action==='edit') {if(state.unsavedChanges&&!confirm('Ungespeicherte Eingaben verwerfen?'))return;editing=id;records(core.definitions[current]);}
      if(action==='cancel'){state.unsavedChanges=false;openModule(current);}
      if(action==='issue'){const fields=main.querySelector('#dwp-invoice-options');mutate('issue',[id,{owner:state.currentUser,...(fields?Object.fromEntries([...fields.querySelectorAll('[name]')].map(el=>[el.name,el.value])):{})}],()=>{state.unsavedChanges=false;notice('Dokumentfassung gespeichert.');openModule(id);});}
      if(action==='print')printRecord(db.get(id));
      if(action==='demand-purchase'){mutate('createPurchase',[id,{owner:state.currentUser}],()=>{notice('Bestellentwurf aus dem offenen Bedarf angelegt.');openModule('purchase');});}
      if(action==='use-quote'){const [supplierId,quoteId]=id.split('/');mutate('useQuote',[supplierId,quoteId,state.currentUser],()=>{notice('Preisquelle freigegeben und Artikelhistorie aktualisiert.');openModule(current);});}
      if(action==='cancel-schedule'){const [employeeId,assignmentId]=id.split('/');mutate('cancelSchedule',[employeeId,assignmentId],()=>{notice('Einsatz storniert und im Logbuch erhalten.');openModule(current);});}
      if(action==='signature')signatureView(id);
      if(action==='clear-signature'){const canvas=main.querySelector('#dwp-signature');canvas.getContext('2d').clearRect(0,0,640,240);signatureStrokes=[];}
      if(action==='search-open'){const r=db.get(id);if(r.projectId)selectProject(r.projectId);openModule(r.module);if(core.definitions[r.module].fields.length && r.module!=='imports'){editing=r.id;records(core.definitions[r.module]);}}
      if(action==='server-reload')window.DWPRemote.reload().catch(showError);
      if(action==='operating-rate')mutate('applyOperatingCosts',[],()=>{notice('Vollkostensatz übernommen; AGK auf 0 gesetzt.');openModule('calculation');});
      if(action==='backup')download('DachWerkPro_Sicherung.json',db.backup());
      if(action==='project-json')download('DachWerkPro_Projektakte.json',JSON.stringify({project:db.project(),customer:db.get(db.project().data.customerId),records:db.data.records.filter(r=>r.projectId===db.data.selectedProject)},null,2));
      if(action==='calc-csv' || action==='snapshot-csv') {
        const positions=action==='calc-csv'?db.calculation().positions:db.get(id).data.positions;
        csvExport('DachWerkPro_Positionen.csv',[['Position','Leistung','Menge','Einheit','EP netto','GP netto'],...positions.map(p=>[p.number,p.text,p.qty,p.unit,p.ep,p.gp])]);
      }
      if(action==='closing-csv')csvExport('DachWerkPro_Belege.csv',[['Modul','Nummer','Datum','Netto','Brutto','Status'],...db.data.records.filter(r=>r.projectId===db.data.selectedProject && ['incoming','invoices','payments','times','subcontracts'].includes(r.module)).map(r=>[core.definitions[r.module].name,r.data.number || r.data.invoiceNumber || r.data.title,r.data.date || r.createdAt,r.data.net ?? r.data.cost ?? '',r.data.gross ?? r.data.amount ?? '',r.status])]);
      if(action==='preview-import') {
        const rows=csvRows(document.querySelector('#dwp-csv').value);
        document.querySelector('#dwp-import-preview').innerHTML=table(['Position','Leistung','Menge','Einheit'],rows.map(r=>[esc(r.number),esc(r.text),esc(r.qty),esc(r.unit)]));
      }
      if(action==='price-preview') {
        const rows=csvRows(document.querySelector('#dwp-price-csv').value,['name','unit','price']);
        document.querySelector('#dwp-price-preview').innerHTML=table(['Artikel','Artikelnummer','Hersteller','Lieferant','Einheit','Preis'],rows.map(r=>[esc(r.name),esc(r.article),esc(r.manufacturer),esc(r.supplier),esc(r.unit),esc(r.price)]));
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
        mutate('importPositions',[work.positions.map(p=>({number:p.nr || p.number || p.id,text:p.text || p.title,qty:p.qty,unit:p.unit || 'm²',material:p.material || 0,minutes:p.minutes ?? p.time ?? 0,equipment:p.equipment || 0,subcontract:p.subcontract || 0}))],()=>{notice('Arbeitskopie übernommen. Originalbestand bleibt erhalten.');openModule('lv');});
      }
      if(action==='legacy-import'){if(window.DWPRemote?.active)throw Error('Der alte lokale Importmanager ist ausschließlich im Modultest verfügbar. Für zentrale Daten den geprüften CSV-Import verwenden.');current='legacy';main.innerHTML=calculationView();bindDynamicInteractions();}
    }catch(e){showError(e);}
  },true);
  main.addEventListener('input',event=>{
    if(event.target.id==='dwp-module-search'){search=event.target.value;filterModules();return;}
    if(event.target.closest('.dwp-workspace form'))state.unsavedChanges=true;
  });
  main.addEventListener('change',async event=>{
    try {
      if(event.target.id==='dwp-project') {
        if(!event.target.value)return;
        if(state.unsavedChanges&&!confirm('Ungespeicherte Eingaben verwerfen und Projekt wechseln?')){event.target.value=db.data.selectedProject;return;}
        selectProject(event.target.value);state.unsavedChanges=false;openModule(current);
      }
      if(event.target.id==='dwp-import-file')document.querySelector('#dwp-csv').value=await event.target.files[0].text();
      if(event.target.id==='dwp-price-file') {const file=event.target.files[0];if(file){document.querySelector('#dwp-price-csv').value=await file.text();document.querySelector('#dwp-price-import [name="source"]').value=file.name;}}
      if(event.target.id==='dwp-restore') {
        const text=await event.target.files[0].text();
        if(confirm('Aktuellen lokalen Arbeitsbestand durch diese Sicherung ersetzen?')){mutate('restore',[text],()=>{state.unsavedChanges=false;openModule('dashboard');});}
      }
      if(event.target.closest('#dwp-record'))state.unsavedChanges=true;
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
