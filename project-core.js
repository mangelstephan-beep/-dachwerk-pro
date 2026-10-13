/* Shared, browser-local project model. This is not a production authorization layer. */
(function (root) {
  'use strict';
  const statuses = ['Neu', 'Zugewiesen', 'In Bearbeitung', 'Rückmeldung ausstehend', 'Prüfung', 'Freigegeben', 'Erledigt'];
  const f = (key, label, type = 'text', required = false, options) => ({key, label, type, required, options});
  const title = f('title', 'Bezeichnung', 'text', true);
  const note = f('notes', 'Bemerkung / Ergebnis', 'textarea');
  const date = f('date', 'Datum', 'date', true);
  const cost = f('cost', 'Kosten netto', 'number');
  const blocking = f('blocking','Sperrt nächsten Arbeitsschritt bis Erledigung','checkbox');
  const modules = [
    ['customers', 'Kunden und Kontakte', 'customers', [f('name','Firma / Name','text',true),f('contact','Hauptansprechpartner'),f('contactRole','Rolle des Hauptkontakts','select',false,['Auftraggeber','Hausverwaltung','Planer','Bauleitung','Buchhaltung','Versicherung','Sonstige']),f('phone','Telefon'),f('email','E-Mail','email'),f('contacts','Weitere Kontakte: Name | Rolle | E-Mail | Telefon (eine Person je Zeile)','contacts'),f('address','Anschrift'),f('location','Ort'),f('buyerReference','Leitweg-ID / Käuferreferenz'),f('publicCustomer','Öffentlicher Auftraggeber','checkbox')], 'global'],
    ['projects','Projekte und Kostenstellen','projects',[f('name','Projektname','text',true),f('customerId','Kunde','customer',true),f('address','Objektanschrift'),f('costCenter','Kostenstelle'),f('memberIds','Freigegebene Benutzer-IDs (kommagetrennt; Administratoren haben Zugriff)','textarea'),f('phase','Projektphase','select',true,['Erfassung','Kalkulation','Beauftragt','Ausführung','Abnahme','Abgeschlossen']),f('buyerReference','Leitweg-ID / Käuferreferenz'),note], 'global'],
    ['operating','Betriebs- und Lohnkosten','prices',[title,f('annualCost','Jahreskosten netto','number',true),f('productiveHours','Produktive Stunden','number',true),note]],
    ['lv','Leistungsverzeichnisse','calculation',[f('number','Positionsnummer','text',true),f('text','Leistungsbeschreibung','textarea',true),f('groupPath','Gliederung: Gewerk / Titel / Abschnitt'),f('kind','Leistungsart','select',false,['Hauptleistung','Nachtrag','Bedarfsposition','Grundposition','Alternativposition']),f('choiceGroup','Wahlgruppe (Grund-/Alternativposition)'),f('changeNumber','Nachtragsnummer'),f('qty','LV-Menge','number',true),f('unit','Einheit','text',true),f('material','Material je Einheit','number'),f('minutes','Minuten je Einheit','number'),f('equipment','Geräte je Einheit','number'),f('subcontract','NU je Einheit','number'),f('materialId','Freigegebener Materialartikel','material'),f('consumption','Materialverbrauch je Einheit','number'),f('useTargetPrice','Zielpreis verwenden','checkbox'),f('targetEp','Zielpreis netto je Einheit vor Rabatt','number'),f('discountPercent','Positionsrabatt %','number')]],
    ['imports','Importmanager','gaeb',[title,f('source','Quelle / Dateiname'),f('format','Format','select',false,['CSV','GAEB XML','PDF Prüfquelle','Excel Prüfquelle','Sonstige']),note]],
    ['contract','LV- und Vertragsprüfung','rules',[title,f('positionId','LV-Position','position'),f('finding','Feststellung','textarea',true),f('question','Rückfrage','textarea'),f('source','Vertrag / Quelle / Fassung'),blocking,note]],
    ['calculation','Kalkulation und Zielpreis','calculation',[]],
    ['efb','EFB und Kalkulationsblätter','calculation',[]],
    ['services','Leistungskatalog und Zeitwerte','services',[title,f('text','Leistungstext','textarea',true),f('unit','Einheit','text',true),f('minutes','Zeitwert Minuten','number'),f('material','Materialansatz','number'),f('source','Quelle / Fassung'),note],'global'],
    ['materials','Material und Systeme','prices',[f('name','Artikel / System','text',true),f('article','Artikelnummer'),f('manufacturer','Hersteller'),f('supplier','Lieferant'),f('unit','Einheit','text',true),f('price','Einkaufspreis netto','number',true),f('priceDate','Preisstand','date',true),f('source','Preisquelle','text',true),note],'global'],
    ['suppliers','Lieferanten und Preisvergleich','prices',[f('name','Lieferant','text',true),f('contact','Ansprechpartner'),f('email','E-Mail','email'),f('phone','Telefon'),f('address','Anschrift'),note],'global'],
    ['pricelists','DATANORM und Preislisten','prices',[title,f('supplier','Lieferant'),f('source','Dateiname / Quelle','text',true),f('priceDate','Preisstand','date',true),note],'global'],
    ['offers','Angebote','calculation',[]],
    ['orders','Auftrag und Bestätigung','projects',[title,f('offerId','Angebot','offer',true),f('orderNumber','AG-Auftragsnummer'),date,note]],
    ['correspondence','Schriftverkehr und E-Mail','communication',[title,f('recipient','Empfänger','email'),f('body','Nachricht','textarea',true),f('direction','Richtung','select',false,['Ausgehend – Entwurf','Eingehend']),note]],
    ['purchase','Einkauf und Bestellung','prices',[title,f('materialId','Material','material',true),f('quantity','Bestellmenge','number',true),f('supplier','Lieferant'),f('unitPrice','Preis netto je Einheit','number',true),f('deliveryDate','Wunschliefertermin','date'),note]],
    ['logistics','Liefertermine und Logistik','projects',[title,f('purchaseId','Bestellung','purchase'),f('deliveryDate','Lieferdatum','date',true),f('quantity','Gelieferte Menge','number',true),f('location','Lieferort'),f('receipt','Lieferscheinnummer'),note]],
    ['personnel','Personal und Termine','users',[f('name','Mitarbeiter','text',true),f('number','Personalnummer','text',true),f('employment','Beschäftigungsart','select',true,['Arbeiter','Angestellte','Auszubildende','Teilzeit','Aushilfe']),f('role','Tätigkeit'),f('wage','Stundenkostensatz','number'),f('start','Eintritt','date'),f('qualification','Qualifikationen'),note],'global'],
    ['technical','Technische Prüfung','ai-check',[title,f('positionId','LV-Position','position'),f('finding','Prüfpunkt / Feststellung','textarea',true),f('source','Regel / Hersteller / Fassung'),f('decision','Fachliche Entscheidung','textarea'),blocking,note]],
    ['safety','Arbeitsschutz und Unterweisung','safety',[title,f('hazard','Gefährdung','textarea',true),f('measure','Schutzmaßnahme','textarea',true),f('participants','Unterwiesene Personen'),blocking,date,note]],
    ['diary','Mobile Bauleitung','site-docs',[title,date,f('weather','Wetter'),f('team','Personal / Geräte'),f('work','Ausgeführte Leistungen','textarea',true),f('obstruction','Behinderungen','textarea'),f('progress','Bautenstand %','number'),note]],
    ['defects','Fotos und Mängel','defects',[title,f('component','Bauteil'),f('positionId','LV-Position','position'),f('finding','Feststellung','textarea',true),f('remedy','Beseitigung / Erledigungsnachweis','textarea'),note]],
    ['times','Zeiten und Regie','site-docs',[title,date,f('employeeId','Mitarbeiter','employee',true),f('hours','Stunden','number',true),f('rate','Kostensatz je Stunde','number',true),f('work','Leistungsbeschreibung','textarea',true),f('customerConfirmation','Kundenbestätigung'),note]],
    ['subcontracts','Fremdleistungen','services',[title,f('contractor','Nachunternehmer','text',true),cost,f('scope','Leistungsumfang','textarea',true),date,note]],
    ['measurements','Aufmaß und Plan','measurements',[title,f('positionId','LV-Position','position',true),f('length','Länge / Anzahl','number',true),f('width','Breite / Faktor','number',true),f('factor','Wiederholungen','number',true),f('deduction','Abzug','number'),f('plan','Plan / Bauteil / Messnachweis'),date,note]],
    ['acceptance','Abnahme und Unterschrift','site-docs',[title,date,f('participants','Teilnehmer','text',true),f('result','Ergebnis','select',true,['Abgenommen','Mit Restpunkten','Abnahme verweigert']),f('remaining','Restleistungen / Vorbehalte','textarea'),f('signer','Unterzeichner'),note]],
    ['invoices','Ausgangsrechnungen','invoices',[]],
    ['incoming','Eingangsrechnungen','invoices',[title,f('supplier','Rechnungssteller','text',true),f('invoiceNumber','Belegnummer','text',true),date,f('net','Nettobetrag','number',true),f('tax','USt %','number',true),f('purchaseId','Bestellung','purchase'),f('subcontractId','NU-Kostenvorgang (ersetzt dessen Kostenansatz)','subcontract'),f('receipt','Lieferscheinnummer'),f('includeInCosts','Als Ist-Kosten erfassen','checkbox'),note]],
    ['payments','Zahlung und Kontierung','invoices',[title,f('invoiceId','Ausgangsrechnung','invoice',true),f('direction','Buchungsart','select',false,['Zahlungseingang','Rückzahlung']),date,f('amount','Zahlungsbetrag brutto','number',true),f('account','Konto / Buchungshinweis'),note]],
    ['closing','Monatsabschluss und Export','invoices',[]],
    ['controlling','Nachkalkulation und Controlling','calculation',[]],
    ['documents','DMS, Scanner, OCR und Barcode','documents',[title,f('category','Kategorie','select',true,['Plan','Foto','Nachweis','Vertrag','Rechnung','Sonstige']),f('barcode','Barcode / Referenz'),f('description','Beschreibung','textarea'),note]],
    ['knowledge','Technik und Wissensregister','rules',[title,f('source','Quelle / Fundstelle','text',true),f('edition','Fassung / Stand','text',true),f('scope','Geltungsbereich'),f('conclusion','Projektbezogener Hinweis','textarea'),note]],
    ['tenders','Ausschreibungsmonitor','projects',[title,f('client','Auftraggeber'),f('location','Ort'),f('deadline','Angebotsfrist','date',true),f('url','Fundstelle','url'),f('decision','Teilnahmeentscheidung','select',false,['Offen','Teilnehmen','Nicht teilnehmen']),note]],
    ['expert','Sachverständigenwesen','expert',[title,f('reportNumber','Gutachtennummer','text',true),date,f('assignment','Prüfauftrag','textarea',true),f('finding','Feststellungen','textarea'),f('assessment','Bewertung / Vorbehalt','textarea'),note]],
    ['energy','Energieberatung','energy',[title,f('component','Bauteil / Anlage'),f('area','Fläche m²','number'),f('uBefore','U-Wert Bestand','number'),f('uAfter','U-Wert Variante','number'),f('measure','Maßnahme','textarea',true),f('funding','Fördervorgang / Quelle'),note]]
  ].map(([id, name, view, fields, scope]) => ({id,name,view,fields,scope:scope || 'project'}));
  for(const m of modules) if(m.scope==='project' && m.fields.length && !['projects','lv'].includes(m.id)) m.fields.push(f('relatedRecordId','Zugehöriger Fachvorgang / Nachweis','record'));
  const stages=[
    {id:'intake',name:'Kunde und Projekt',modules:['customers','projects','tenders']},
    {id:'pricing',name:'LV und Kalkulation',modules:['operating','lv','imports','contract','calculation','efb','services','materials','suppliers','pricelists','knowledge']},
    {id:'contracting',name:'Angebot und Auftrag',modules:['offers','orders','correspondence']},
    {id:'execution',name:'Beschaffung und Ausführung',modules:['purchase','logistics','personnel','technical','safety','diary','times','subcontracts','documents']},
    {id:'handover',name:'Aufmaß und Abnahme',modules:['measurements','defects','acceptance','expert','energy']},
    {id:'billing',name:'Rechnung und Zahlung',modules:['invoices','incoming','payments']},
    {id:'closing',name:'Abschluss und Nachkalkulation',modules:['closing','controlling']}
  ];
  const definitions = Object.fromEntries(modules.map(m=>[m.id,m]));
  const parseContacts=value=>{
    const rows=Array.isArray(value)?value:String(value || '').split('\n').filter(s=>s.trim()).map(s=>{const [name,role,email,phone,...extra]=s.split('|').map(x=>x.trim());if(extra.length)throw Error('Kontaktzeile enthält mehr als vier Felder.');return {name,role,email,phone};});
    if(rows.length>50)throw Error('Maximal 50 zusätzliche Kontakte.');
    return rows.map(c=>{const clean=Object.fromEntries(['name','role','email','phone'].map(k=>[k,String(c[k] || '').trim()]));if(!clean.name || Object.values(clean).some(v=>v.length>300)||clean.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email))throw Error('Kontaktname oder E-Mail ungültig.');return clean;});
  };
  const num = value => {
    if (typeof value === 'number') { if (!Number.isFinite(value)) throw Error('Ungültige Zahl.'); return value; }
    let s=String(value ?? '').trim().replace(/\s/g,'');
    if (!s) return 0;
    if (s.includes(',')) s=s.replace(/\./g,'').replace(',','.');
    if (!/^-?\d+(\.\d+)?$/.test(s)) throw Error(`Ungültige Zahl: ${value}`);
    const n=Number(s);if(!Number.isFinite(n))throw Error('Ungültige Zahl.');return n;
  };
  const round = n => {if(!Number.isFinite(n) || Math.abs(n)>Number.MAX_SAFE_INTEGER/100)throw Error('Betrag oder Menge außerhalb des sicheren Zahlenbereichs.');return Math.round((n + Math.sign(n)*Number.EPSILON)*100)/100;};
  const capacity=values=>{
    const v=Object.fromEntries(['year','headcount','weeklyHours','leaveDays','sickDays','trainingDays','nonproductivePercent'].map(k=>[k,num(values[k])]));
    if(!Number.isInteger(v.year)||v.year<2000||v.year>2100||v.headcount<=0||v.headcount>10000||v.weeklyHours<=0||v.weeklyHours>120||['leaveDays','sickDays','trainingDays'].some(k=>v[k]<0)||v.nonproductivePercent<0||v.nonproductivePercent>=100)throw Error('Produktivstundenmodell enthält ungültige Werte.');
    const holidays=[...new Set(String(values.holidayDates || '').split(/[\s,;]+/).filter(Boolean))];
    for(const date of holidays)if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date.slice(0,4)!==String(v.year)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Feiertage müssen gültige Daten des gewählten Jahres sein.');
    let weekdays=0;for(let day=new Date(Date.UTC(v.year,0,1));day.getUTCFullYear()===v.year;day.setUTCDate(day.getUTCDate()+1))if(day.getUTCDay()!==0&&day.getUTCDay()!==6)weekdays++;
    const holidayDays=holidays.filter(d=>![0,6].includes(new Date(d).getUTCDay())).length;
    const availableDays=weekdays-holidayDays-v.leaveDays-v.sickDays-v.trainingDays;
    if(availableDays<=0)throw Error('Ausfalltage überschreiten die verfügbaren Arbeitstage.');
    return {...v,holidayDates:holidays.sort().join('\n'),weekdays,holidayDays,availableDays,productiveHours:round(availableDays*(v.weeklyHours/5)*v.headcount*(1-v.nonproductivePercent/100))};
  };
  const empty = () => ({schema:1, revision:0, selectedProject:null, settings:{wage:55,agk:0,profit:10,tax:19,company:'DachWerk Pro',address:''}, records:[], audit:[]});
  const uid = () => root.crypto?.randomUUID?.() || `dwp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  class Store {
    constructor(storage, key='dwp-project-core-v1') {
      this.storage=storage; this.key=key;
      const raw=storage.getItem(key);
      this.data=raw ? JSON.parse(raw) : empty();
      this.validate(this.data);
    }
    validate(data) {
      if(data.schema!==1 || !Number.isInteger(data.revision) || !Array.isArray(data.records) || !Array.isArray(data.audit) || !data.settings) throw Error('Projektbestand ist beschädigt. Vor Wiederherstellung bitte sichern.');
      const ids=new Set();
      for(const r of data.records) {
        if(!definitions[r.module] || typeof r.id!=='string' || ids.has(r.id) || !r.data || typeof r.data!=='object') throw Error('Ungültiger oder doppelter Datensatz.');
        ids.add(r.id);
      }
      for(const r of data.records) {
        if(definitions[r.module].scope==='project' && !data.records.some(p=>p.module==='projects' && p.id===r.projectId)) throw Error('Projektbezug fehlt.');
        if(r.module==='projects' && !data.records.some(c=>c.module==='customers' && c.id===r.data.customerId)) throw Error('Kundenzuordnung fehlt.');
        for(const field of definitions[r.module].fields) {
          const value=r.data[field.key];
          if(field.type==='contacts' && value!==undefined)parseContacts(value);
          if(field.required && (value===undefined || value===null || value==='')) throw Error(`Sicherung: ${field.label} fehlt.`);
          if(field.type==='number' && value!==undefined && (typeof value!=='number' || !Number.isFinite(value) || value<0 || value>Number.MAX_SAFE_INTEGER/100)) throw Error(`Sicherung: ${field.label} ist ungültig.`);
          const target={customer:'customers',position:'lv',material:'materials',employee:'personnel',offer:'offers',purchase:'purchase',invoice:'invoices',subcontract:'subcontracts'}[field.type];
          if((target || field.type==='record') && value) {
            const ref=data.records.find(x=>x.id===value && (!target || x.module===target));
            if(!ref || (ref.projectId && ref.projectId!==r.projectId) || ref?.id===r.id) throw Error('Sicherung: ungültiger Querverweis.');
          }
        }
        if(r.module==='lv' && r.data.kind && !definitions.lv.fields.find(f=>f.key==='kind').options.includes(r.data.kind))throw Error('Sicherung: Leistungsart unbekannt.');
        if(r.module==='lv' && (['Grundposition','Alternativposition'].includes(r.data.kind) ? !r.data.choiceGroup : r.data.choiceGroup))throw Error('Sicherung: Wahlgruppe und Leistungsart passen nicht zusammen.');
        if(r.module==='lv' && (r.data.discountPercent || 0)>100)throw Error('Sicherung: Positionsrabatt höchstens 100 %.');
        if(['offers','invoices'].includes(r.module) && (!Array.isArray(r.data.positions) || ['net','gross','tax','taxAmount'].some(k=>typeof r.data[k]!=='number' || !Number.isFinite(r.data[k])))) throw Error('Sicherung: Dokumentfassung ungültig.');
        for(const q of r.quotes || []) {
          if(r.module!=='suppliers' || !data.records.some(m=>m.module==='materials' && m.id===q.materialId) || ['price','discount','freight'].some(k=>typeof q[k]!=='number' || !Number.isFinite(q[k]) || q[k]<0) || q.discount>100) throw Error('Sicherung: Lieferantenpreis ungültig.');
        }
        for(const a of r.assignments || [])if(r.module!=='personnel' || !data.records.some(p=>p.module==='projects' && p.id===a.projectId) || !a.start || !a.end || a.start>a.end)throw Error('Sicherung: Einsatzplanung ungültig.');
        for(const s of r.signatures || []) {
          if(!['acceptance','times'].includes(r.module) || !s.signer || !Array.isArray(s.strokes) || !s.strokes.some(a=>Array.isArray(a) && a.length>=2) || JSON.stringify(s.snapshot?.data)!==JSON.stringify(r.data))throw Error('Sicherung: unterschriebener Dokumentstand ungültig.');
          for(const stroke of s.strokes)for(const p of stroke)if(!Array.isArray(p) || p.length!==2 || p.some(n=>typeof n!=='number' || !Number.isFinite(n) || n<0 || n>1))throw Error('Sicherung: Unterschrift ungültig.');
        }
      }
      if(data.selectedProject && !data.records.some(p=>p.module==='projects' && p.id===data.selectedProject)) throw Error('Ausgewähltes Projekt fehlt.');
      for(const k of ['wage','agk','profit','tax'])if(typeof data.settings[k]!=='number' || !Number.isFinite(data.settings[k]) || data.settings[k]<0)throw Error('Kalkulationsbasis ungültig.');
      if(data.settings.capacity)capacity(data.settings.capacity);
    }
    transaction(action, module, recordId, change) {
      const raw=this.storage.getItem(this.key);
      if(raw && JSON.parse(raw).revision!==this.data.revision) throw Error('Der Bestand wurde in einem anderen Fenster geändert. Bitte neu laden.');
      const next=JSON.parse(JSON.stringify(this.data));
      const result=change(next);
      next.revision++;
      next.audit.push({id:uid(),at:new Date().toISOString(),actor:'Lokaler Testanwender',action,module,recordId,projectId:next.selectedProject});
      this.validate(next);
      // Update in-memory state only when the durable browser write succeeds.
      this.storage.setItem(this.key,JSON.stringify(next));
      this.data=next;
      return result;
    }
    list(module, projectId=this.data.selectedProject) {
      return this.data.records.filter(r=>r.module===module && (definitions[module].scope==='global' || r.projectId===projectId));
    }
    get(id) { return this.data.records.find(r=>r.id===id); }
    project() { return this.get(this.data.selectedProject); }
    select(id) {
      if(!this.get(id) || this.get(id).module!=='projects') throw Error('Projekt nicht gefunden.');
      return this.transaction('Projekt ausgewählt','projects',id,d=>{d.selectedProject=id;});
    }
    save(module, values, options={}) {
      const def=definitions[module];
      if(!def || !def.fields.length) throw Error('Dieser Bereich wird aus dem Projektbestand abgeleitet.');
      const projectId=def.scope==='project' ? this.data.selectedProject : null;
      if(def.scope==='project' && this.project()?.data.phase==='Abgeschlossen')throw Error('Abgeschlossenes Projekt zuerst mit Begründung wieder öffnen.');
      if(def.scope==='project' && !this.project()) throw Error('Bitte zuerst ein Projekt anlegen und auswählen.');
      const before=options.id ? this.get(options.id) : null;
      if(before?.module==='projects' && before.data.phase==='Abgeschlossen')throw Error('Abgeschlossenes Projekt zuerst mit Begründung wieder öffnen.');
      if(options.id && (!before || before.module!==module || before.projectId!==projectId)) throw Error('Datensatz gehört nicht zum aktuellen Bereich.');
      if(before?.signatures?.length || (before?.status==='Freigegeben' && ['lv','measurements','orders','times','incoming','subcontracts','payments','purchase','logistics','acceptance'].includes(module))) throw Error('Freigegebene oder unterschriebene Daten bleiben unverändert. Bitte einen Korrekturvorgang erfassen.');
      const data={};
      for(const field of def.fields) {
        const value=values[field.key];
        if(field.required && (value===undefined || value===null || String(value).trim()==='')) throw Error(`${field.label} fehlt.`);
        data[field.key]=field.type==='contacts' ? parseContacts(value) : field.type==='number' ? num(value) : field.type==='checkbox' ? (field.key==='useTargetPrice' && typeof value==='string' ? /^(true|1|ja)$/i.test(value.trim()) : Boolean(value)) : String(value ?? '').trim();
        if(field.type==='email' && data[field.key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[field.key]))throw Error(`${field.label} ist ungültig.`);
        if(field.type==='number' && data[field.key]>Number.MAX_SAFE_INTEGER/100)throw Error(`${field.label} außerhalb des sicheren Zahlenbereichs.`);
        if(field.type==='number' && data[field.key]<0) throw Error(`${field.label} darf nicht negativ sein.`);
        if(field.type==='select' && data[field.key] && !field.options.includes(data[field.key])) throw Error(`${field.label} ist ungültig.`);
        if(field.type==='date' && data[field.key] && (!/^\d{4}-\d{2}-\d{2}$/.test(data[field.key]) || Number.isNaN(Date.parse(data[field.key])) || new Date(data[field.key]).toISOString().slice(0,10)!==data[field.key])) throw Error(`${field.label} ist ungültig.`);
        const refModule={customer:'customers',position:'lv',material:'materials',employee:'personnel',offer:'offers',purchase:'purchase',invoice:'invoices',subcontract:'subcontracts'}[field.type];
        if((refModule || field.type==='record') && data[field.key]) {
          const ref=this.get(data[field.key]);
          if(!ref || (refModule && ref.module!==refModule) || (ref.projectId && ref.projectId!==projectId) || ref?.id===options.id) throw Error(`${field.label}: Zuordnung ungültig.`);
          if(['material','offer'].includes(field.type) && ref.status!=='Freigegeben') throw Error(`${field.label} muss freigegeben sein.`);
        }
      }
      if(module==='projects' && !before && data.phase!=='Erfassung')throw Error('Neue Projekte beginnen in der Erfassung.');
      if(module==='projects' && before && data.phase!==before.data.phase) {
        const selected=this.data.selectedProject;this.data.selectedProject=before.id;
        try{this.assertPhase(data.phase);}finally{this.data.selectedProject=selected;}
      }
      if(module==='lv' && values.useTargetPrice!==undefined && typeof values.useTargetPrice==='string' && !/^(true|false|1|0|ja|nein|)$/i.test(values.useTargetPrice.trim()))throw Error('Zielpreis verwenden: true/false, 1/0 oder ja/nein angeben.');
      if(module==='lv' && data.discountPercent>100)throw Error('Positionsrabatt höchstens 100 %.');
      if(module==='lv' && ['Grundposition','Alternativposition'].includes(data.kind) && !data.choiceGroup)throw Error('Grund- und Alternativposition benötigen eine gemeinsame Wahlgruppe.');
      if(module==='lv' && data.choiceGroup && !['Grundposition','Alternativposition'].includes(data.kind))throw Error('Wahlgruppe nur für Grund- und Alternativposition verwenden.');
      if(module==='lv' && data.groupPath) {
        const parts=data.groupPath.split('/').map(x=>x.trim());
        if(parts.length>5 || parts.some(x=>!x || x.length>120))throw Error('LV-Gliederung: 1 bis 5 nicht leere Ebenen, höchstens 120 Zeichen je Ebene.');
        data.groupPath=parts.join(' / ');
      }
      if(module==='lv' && this.list('lv').some(r=>r.id!==options.id && r.data.number===data.number)) throw Error('Positionsnummer bereits vorhanden.');
      if(module==='measurements' && data.deduction>data.length*data.width*data.factor) throw Error('Der Abzug überschreitet die gemessene Menge.');
      if(module==='operating' && data.productiveHours<=0) throw Error('Produktive Stunden müssen größer als null sein.');
      if(module==='diary' && data.progress>100) throw Error('Bautenstand höchstens 100 %.');
      if(['incoming'].includes(module) && data.tax>100) throw Error('Ungültiger Umsatzsteuersatz.');
      const status=options.status || before?.status || 'Neu';
      if(!statuses.includes(status)) throw Error('Ungültiger Status.');
      if((status==='Freigegeben' || status==='Erledigt' && data.blocking) && !options.owner?.trim()) throw Error('Zur Freigabe muss ein Verantwortlicher genannt werden.');
      if(['contract','technical','safety'].includes(module) && status==='Erledigt' && (data.blocking || before?.data.blocking) && !(data.decision || data.measure || data.notes)?.trim())throw Error('Fachliche Erledigung mit Entscheidung oder Nachweis dokumentieren.');
      if(module==='defects' && status==='Erledigt' && !data.remedy?.trim())throw Error('Mängelbeseitigung dokumentieren.');
      if(['times','incoming','subcontracts','payments','orders','measurements','purchase','logistics'].includes(module) && status==='Erledigt')throw Error('Kaufmännische und mengenbezogene Vorgänge ausdrücklich freigeben.');
      if(module==='orders' && status==='Freigegeben' && this.list('orders').some(r=>r.id!==options.id && r.status==='Freigegeben' && r.data.offerId===data.offerId))throw Error('Dieses Angebot ist bereits beauftragt.');
      if(module==='orders' && status==='Freigegeben') {
        this.assertClear(['contract','technical']);
        const offer=this.get(data.offerId);
        if(this.list('offers').some(r=>r.data.supersedesOfferId===offer.id))throw Error('Diese Angebotsfassung wurde durch eine neue Version ersetzt.');
        const assigned=new Set(this.list('orders').filter(r=>r.id!==options.id && r.status==='Freigegeben').flatMap(r=>this.get(r.data.offerId).data.positions.map(p=>p.id)));
        if(offer.data.positions.some(p=>assigned.has(p.id)))throw Error('Mindestens eine Angebotsposition ist bereits in einem anderen Auftrag beauftragt.');
        const assignedGroups=new Set(this.list('orders').filter(r=>r.id!==options.id && r.status==='Freigegeben').flatMap(r=>this.get(r.data.offerId).data.positions.map(p=>p.choiceGroup).filter(Boolean)));
        if(offer.data.positions.some(p=>p.choiceGroup && assignedGroups.has(p.choiceGroup)))throw Error('Diese Wahlgruppe ist bereits in einem anderen Auftrag beauftragt.');
        if(offer.data.baseOfferId && !this.list('orders').some(o=>o.status==='Freigegeben' && o.data.offerId===offer.data.baseOfferId))throw Error('Hauptangebot vor dem Nachtrag beauftragen.');
      }
      if(module==='incoming' && data.subcontractId && this.get(data.subcontractId).data.contractor.trim().toLocaleLowerCase('de')!==data.supplier.trim().toLocaleLowerCase('de'))throw Error('Rechnungssteller stimmt nicht mit dem NU-Kostenvorgang überein.');
      if(module==='incoming' && this.list('incoming').some(r=>r.id!==options.id && r.data.supplier===data.supplier && r.data.invoiceNumber===data.invoiceNumber)) throw Error('Eingangsbeleg bereits vorhanden.');
      if(module==='logistics' && status==='Freigegeben' && data.purchaseId) {
        const order=this.get(data.purchaseId);
        if(order.status!=='Freigegeben') throw Error('Bestellung vor Lieferung freigeben.');
        const delivered=this.list('logistics').filter(r=>r.id!==options.id && r.status==='Freigegeben' && r.data.purchaseId===order.id).reduce((n,r)=>n+r.data.quantity,0);
        if(data.quantity<=0 || round(delivered+data.quantity)>order.data.quantity) throw Error('Liefermenge muss positiv sein und darf die offene Bestellmenge nicht überschreiten.');
      }
      if(module==='payments' && status==='Freigegeben') {
        const invoice=this.get(data.invoiceId);
        const paid=this.list('payments').filter(r=>r.id!==options.id && r.status==='Freigegeben' && r.data.invoiceId===invoice.id).reduce((n,r)=>n+r.data.amount,0);
        if(data.direction==='Rückzahlung') {
          if(!invoice.data.stornoOf)throw Error('Rückzahlungen müssen einer Stornorechnung zugeordnet werden.');
          const received=this.list('payments').filter(r=>r.status==='Freigegeben' && r.data.invoiceId===invoice.data.stornoOf && r.data.direction!=='Rückzahlung').reduce((n,r)=>n+r.data.amount,0);
          if(data.amount<=0 || round(paid+data.amount)>Math.min(Math.abs(invoice.data.gross),received))throw Error('Rückzahlung überschreitet das tatsächliche Guthaben.');
        } else {
          if(invoice.data.stornoOf || this.list('invoices').some(r=>r.data.stornoOf===invoice.id))throw Error('Auf stornierte Rechnungen können keine neuen Zahlungseingänge gebucht werden.');
          if(data.amount<=0 || round(paid+data.amount)>invoice.data.gross) throw Error('Zahlungsbetrag muss positiv sein und darf den offenen Rechnungsbetrag nicht überschreiten.');
        }
      }
      if(options.due && (!/^\d{4}-\d{2}-\d{2}$/.test(options.due) || Number.isNaN(Date.parse(options.due)) || new Date(options.due).toISOString().slice(0,10)!==options.due))throw Error('Rückmeldefrist ungültig.');
      const record={...(before || {}),id:before?.id || uid(),module,projectId,data,status,owner:options.owner || '',due:options.due || '',createdAt:before?.createdAt || new Date().toISOString(),updatedAt:new Date().toISOString()};
      if(module==='materials')delete record.pendingPrice;
      if(module==='orders' && status==='Freigegeben') {
        const offer=this.get(data.offerId);
        record.confirmation=JSON.parse(JSON.stringify({...offer.data,title:'Auftragsbestätigung',offerNumber:offer.data.number,orderNumber:data.orderNumber,date:data.date,notes:data.notes}));
      }
      return this.transaction(before?'Geändert':'Angelegt',module,record.id,d=>{
        if(module==='materials') record.history=[...(before?.history || []),...(before ? [{price:before.data.price,priceDate:before.data.priceDate,source:before.data.source}] : [])].slice(-3);
        const i=d.records.findIndex(r=>r.id===record.id);
        if(i<0) d.records.push(record); else d.records[i]=record;
        if(module==='projects') d.selectedProject=record.id;
        d.audit.push({id:uid(),at:record.updatedAt,action:'Werte',module,recordId:record.id,projectId, before:before || null,after:record});
        return record;
      });
    }
    settings(values) {
      const clean={...this.data.settings, ...values};
      if(values.capacity)clean.capacity=capacity(values.capacity);
      for(const k of ['wage','agk','profit','tax']) { clean[k]=num(clean[k]); if(clean[k]<0 || (k==='tax' && clean[k]>100)) throw Error('Ungültige Kalkulationswerte.'); }
      return this.transaction('Einstellungen gespeichert','operating',null,d=>{d.settings=clean;});
    }
    blockers(moduleIds) {
      return moduleIds.flatMap(m=>this.list(m).filter(r=>r.data.blocking && r.status!=='Erledigt'));
    }
    assertClear(moduleIds) {
      const open=this.blockers(moduleIds);
      if(open.length)throw Error('Offene fachliche Sperren: '+open.map(r=>r.data.title).join(', '));
    }
    workflow() {
      const project=this.project();
      const moduleStates=modules.map(m=>{
        const rows=this.list(m.id), approved=rows.filter(r=>r.status==='Freigegeben' || r.status==='Erledigt').length;
        return {id:m.id,name:m.name,stage:stages.find(s=>s.modules.includes(m.id)).id,count:rows.length,approved,pending:rows.length-approved,derived:!m.fields.length,scope:m.scope};
      });
      const issues=[];
      const add=(module,message,recordId=null)=>issues.push({module,message,recordId});
      if(!project)return {projectId:null,phase:null,modules:moduleStates,stages,issues:[{module:'projects',message:'Kunde und Projekt anlegen oder auswählen.'}],next:'customers'};
      for(const r of this.blockers(['contract','technical','safety']))add(r.module,'Fachliche Sperre: '+r.data.title,r.id);
      const lv=this.list('lv');
      if(!lv.length)add('lv','Leistungsverzeichnis fehlt.');
      for(const r of lv.filter(r=>r.status!=='Freigegeben'))add('lv','Position '+r.data.number+' ist noch nicht freigegeben.',r.id);
      const orders=this.list('orders').filter(r=>r.status==='Freigegeben');
      if(!orders.length)add('orders','Freigegebene Beauftragung fehlt.');
      const assigned=new Map();
      for(const o of orders)for(const p of this.get(o.data.offerId).data.positions)assigned.set(p.id,p);
      for(const p of assigned.values())if(this.measured(p.id)<=0)add('measurements','Freigegebenes Aufmaß für Position '+p.number+' fehlt.',p.id);
      for(const r of this.list('defects').filter(r=>r.status!=='Erledigt'))add('defects','Offener Mangel: '+r.data.title,r.id);
      if(!this.list('acceptance').some(r=>r.status==='Freigegeben' && r.data.result==='Abgenommen' && r.signatures?.length))add('acceptance','Freigegebene, unterschriebene Abnahme ohne offene Restpunkte fehlt.');
      for(const o of this.list('purchase').filter(r=>r.status==='Freigegeben')) {
        const delivered=this.list('logistics').filter(r=>r.status==='Freigegeben' && r.data.purchaseId===o.id).reduce((n,r)=>n+r.data.quantity,0);
        if(round(o.data.quantity-delivered)>0)add('logistics','Offene Lieferung: '+o.data.title,o.id);
      }
      for(const m of ['times','incoming','subcontracts','payments','orders','measurements','purchase','logistics'])for(const r of this.list(m).filter(r=>!['Freigegeben','Erledigt'].includes(r.status)))add(m,'Vorgang noch zu prüfen: '+(r.data.title || r.data.number),r.id);
      const invoices=this.list('invoices'),cancelled=new Set(invoices.map(r=>r.data.stornoOf).filter(Boolean));
      for(const o of orders.filter(o=>!this.get(o.data.offerId).data.baseOfferId))if(!invoices.some(r=>r.data.sourceOfferId===o.data.offerId && r.data.invoiceType==='Schlussrechnung' && !r.data.stornoOf && !cancelled.has(r.id)))add('invoices','Schlussrechnung für '+o.data.title+' fehlt.',o.id);
      const c=this.controlling();if(c.outstanding!==0)add('payments',c.outstanding>0?'Offene Zahlung: '+c.outstanding.toFixed(2)+' EUR':'Guthaben / Rückzahlung offen: '+Math.abs(c.outstanding).toFixed(2)+' EUR');
      return {projectId:project.id,phase:project.data.phase,modules:moduleStates,stages,issues,next:issues[0]?.module || 'closing'};
    }
    assertPhase(phase) {
      const phases=definitions.projects.fields.find(f=>f.key==='phase').options;
      if(!phases.includes(phase))throw Error('Projektphase ungültig.');
      const current=this.project()?.data.phase;
      if(phase===current)return;
      if(phases.indexOf(phase)!==phases.indexOf(current)+1)throw Error('Projektphasen nacheinander übergeben.');
      const report=this.workflow();
      const requirements={Kalkulation:['customers','projects'],Beauftragt:['lv','contract','technical','orders'],Ausführung:['orders','contract','technical','safety'],Abnahme:['measurements','contract','technical','safety'],Abgeschlossen:modules.map(m=>m.id)}[phase];
      const blocked=report.issues.filter(i=>requirements.includes(i.module));
      if(blocked.length)throw Error('Projektübergabe noch nicht möglich: '+blocked.map(i=>i.message).join(' '));
    }
    advancePhase(phase) {
      if(!this.project())throw Error('Projekt auswählen.');
      this.assertPhase(phase);
      const project=this.project();
      return this.transaction('Projektphase übergeben','projects',project.id,d=>{const r=d.records.find(r=>r.id===project.id);r.data.phase=phase;r.updatedAt=new Date().toISOString();return r;});
    }
    reopenProject(reason) {
      const project=this.project();
      if(project?.data.phase!=='Abgeschlossen' || !String(reason || '').trim())throw Error('Abgeschlossenes Projekt und Begründung erforderlich.');
      return this.transaction('Projekt wieder geöffnet: '+String(reason).trim(),'projects',project.id,d=>{const p=d.records.find(r=>r.id===project.id);p.data.phase='Ausführung';p.updatedAt=new Date().toISOString();return p;});
    }
    position(record) {
      const p=record.data, s=this.data.settings;
      let material=p.material || 0;
      if(p.materialId) {
        const m=this.get(p.materialId);
        if(m?.status!=='Freigegeben') throw Error(`Material zu Position ${p.number} ist nicht freigegeben.`);
        material=m.data.price*(p.consumption || 1);
      }
      const labor=p.minutes/60*s.wage;
      const direct=material+labor+p.equipment+p.subcontract;
      const calculatedEp=round(direct*(1+s.agk/100)*(1+s.profit/100));
      const undiscountedEp=p.useTargetPrice?round(p.targetEp || 0):calculatedEp;
      const discountPercent=num(p.discountPercent || 0);
      if(discountPercent<0 || discountPercent>100)throw Error('Positionsrabatt zwischen 0 und 100 %.');
      const ep=round(undiscountedEp*(1-discountPercent/100));
      return {...p,id:record.id,material,labor,direct,calculatedEp,undiscountedEp,discountPercent,ep,gp:round(p.qty*ep),contribution:round(p.qty*(ep-direct))};
    }
    calculation() {
      const positions=this.list('lv').map(r=>this.position(r));
      const included=positions.filter(p=>!['Bedarfsposition','Alternativposition'].includes(p.kind));
      const sum=k=>round(included.reduce((n,p)=>n+p.qty*p[k],0));
      return {positions,optionalNet:round(positions.filter(p=>p.kind==='Bedarfsposition').reduce((n,p)=>n+p.gp,0)),net:round(included.reduce((n,p)=>n+p.gp,0)),material:sum('material'),labor:sum('labor'),equipment:sum('equipment'),subcontract:sum('subcontract'),direct:sum('direct')};
    }
    lvGroups() {
      const groups=new Map();
      for(const position of this.calculation().positions) {
        const parts=(position.groupPath || 'Ohne Gliederung').split(' / ');
        for(let level=1;level<=parts.length;level++) {
          const path=parts.slice(0,level).join(' / ');
          if(!groups.has(path))groups.set(path,{path,level,net:0,positions:0});
          const group=groups.get(path);if(!['Bedarfsposition','Alternativposition'].includes(position.kind))group.net=round(group.net+position.gp);group.positions++;
        }
      }
      return [...groups.values()].sort((a,b)=>a.path.localeCompare(b.path,'de',{numeric:true}));
    }
    contractChecks() {
      if(!this.project())throw Error('Projekt auswählen.');
      const findings=[];
      const add=(r,code,finding,question)=>findings.push({positionId:r.id,number:r.data.number,code,finding,question});
      for(const r of this.list('lv')) {
        const p=r.data;
        if(p.qty===0)add(r,'quantity','LV-Menge ist null.','Ist diese Leistung erforderlich oder nur optional?');
        if(p.kind==='Nachtrag' && !p.changeNumber)add(r,'change-number','Nachtragsnummer fehlt.','Welchem Nachtrag ist die Leistung zugeordnet?');
        if(!p.groupPath)add(r,'group','Gliederung fehlt.','Welchem Gewerk und Titel gehört die Position an?');
        try {
          const priced=this.position(r);
          if(priced.direct===0)add(r,'costs','Keine Einzelkosten angesetzt.','Material, Zeit, Gerät oder Fremdleistung prüfen.');
          if(priced.ep<priced.direct)add(r,'margin','Angebots-EP liegt unter den Einzelkosten.','Zielpreis und Rabatt fachlich prüfen und begründen.');
        } catch(e) { add(r,'material',e.message,'Materialquelle und Preisfreigabe prüfen.'); }
      }
      return findings;
    }
    measured(positionId) {
      return round(this.list('measurements').filter(r=>r.status==='Freigegeben' && r.data.positionId===positionId).reduce((sum,r)=>sum+r.data.length*r.data.width*r.data.factor-r.data.deduction,0));
    }
    issue(kind, options={}) {
      if(this.project()?.data.phase==='Abgeschlossen')throw Error('Abgeschlossenes Projekt zuerst mit Begründung wieder öffnen.');
      if(!['offers','invoices'].includes(kind)) throw Error('Ausgabeart ungültig.');
      const project=this.project(); if(!project) throw Error('Projekt auswählen.');
      const customer=this.get(project.data.customerId);
      let positions=[],optionalPositions=[],alternativePositions=[],sourceOfferId=null,invoiceType=null,baseOfferId=null,percentage=100,previous=[],tax=this.data.settings.tax,changeNumber='',version=1,supersedesOfferId=null;
      this.assertClear(['contract','technical']);
      if(kind==='offers') {
        const assigned=new Set(this.list('orders').filter(r=>r.status==='Freigegeben').flatMap(o=>this.get(o.data.offerId).data.positions.map(p=>p.id)));
        let candidates=this.list('lv').filter(r=>options.offerType==='Nachtragsangebot'?r.data.kind==='Nachtrag':r.data.kind!=='Nachtrag');
        if(options.offerType!=='Nachtragsangebot') {
          const groups=new Map();
          for(const r of candidates.filter(r=>['Grundposition','Alternativposition'].includes(r.data.kind))) {
            if(!r.data.choiceGroup)throw Error('Wahlgruppe fehlt.');
            if(!groups.has(r.data.choiceGroup))groups.set(r.data.choiceGroup,[]);
            groups.get(r.data.choiceGroup).push(r);
          }
          const selections=options.selectedPositionIds;
          if(selections!==undefined && (!Array.isArray(selections) || new Set(selections).size!==selections.length || selections.some(id=>!candidates.some(r=>r.id===id && ['Grundposition','Alternativposition','Bedarfsposition'].includes(r.data.kind)))))throw Error('Sonderpositionsauswahl ungültig.');
          const selected=new Set(selections || candidates.filter(r=>r.data.kind==='Grundposition').map(r=>r.id));
          const assignedGroups=new Set(this.list('orders').filter(r=>r.status==='Freigegeben').flatMap(o=>this.get(o.data.offerId).data.positions.map(p=>p.choiceGroup).filter(Boolean)));
          for(const [group,rows] of groups) {
            if(rows.filter(r=>r.data.kind==='Grundposition').length!==1)throw Error('Jede Wahlgruppe benötigt genau eine Grundposition.');
            if(!assignedGroups.has(group) && rows.filter(r=>selected.has(r.id)).length!==1)throw Error('Je Wahlgruppe genau eine Position auswählen.');
          }
          const available=candidates.filter(r=>!assigned.has(r.id) && !assignedGroups.has(r.data.choiceGroup));
          optionalPositions=available.filter(r=>r.data.kind==='Bedarfsposition' && !selected.has(r.id)).map(r=>this.position(r));
          alternativePositions=available.filter(r=>r.data.choiceGroup && !selected.has(r.id)).map(r=>this.position(r));
          if(available.filter(r=>['Bedarfsposition','Grundposition','Alternativposition'].includes(r.data.kind)).some(r=>r.status!=='Freigegeben'))throw Error('Sonderpositionen vor der Angebotsausgabe freigeben.');
          candidates=available.filter(r=>!['Bedarfsposition','Grundposition','Alternativposition'].includes(r.data.kind) || selected.has(r.id));
        }
        if(options.offerType==='Nachtragsangebot') {
          const numbers=[...new Set(candidates.map(r=>r.data.changeNumber || ''))];
          if(options.changeNumber===undefined && numbers.length>1)throw Error('Mehrere Nachträge vorhanden. Bitte eine Nachtragsnummer auswählen.');
          changeNumber=String(options.changeNumber ?? numbers[0] ?? '').trim();
          candidates=candidates.filter(r=>(r.data.changeNumber || '')===changeNumber);
          const prior=this.list('offers').filter(r=>r.data.baseOfferId===options.baseOfferId && (r.data.changeNumber || '')===changeNumber).at(-1);
          version=(prior?.data.version || (prior?1:0))+1;
          if(prior && !this.list('orders').some(o=>o.status==='Freigegeben' && o.data.offerId===prior.id))supersedesOfferId=prior.id;
        } else {
          const prior=this.list('offers').filter(r=>!r.data.baseOfferId).at(-1);
          version=(prior?.data.version || (prior?1:0))+1;
          if(prior && !this.list('orders').some(o=>o.status==='Freigegeben' && o.data.offerId===prior.id))supersedesOfferId=prior.id;
        }
        candidates=candidates.filter(r=>!assigned.has(r.id));
        if(!candidates.length && assigned.size)throw Error('Diese LV-Positionen sind bereits beauftragt.');
        if(!candidates.length)throw Error('Mindestens eine passende LV-Position erforderlich.');
        if(candidates.some(r=>r.status!=='Freigegeben'))throw Error('Alle LV-Positionen dieser Angebotsfassung müssen zuerst freigegeben werden.');
        if(options.offerType==='Nachtragsangebot') {
          const base=this.get(options.baseOfferId);
          if(base?.module!=='offers' || base.projectId!==project.id || base.data.baseOfferId)throw Error('Hauptangebot für den Nachtrag auswählen.');
          baseOfferId=base.id;
          tax=base.data.tax;
          positions=candidates.filter(r=>!assigned.has(r.id)).map(r=>this.position(r));
        } else positions=candidates.map(r=>this.position(r));
        if(!positions.length)throw Error('Diese Nachtragspositionen sind bereits beauftragt.');
      }
      if(kind==='invoices') {
        const roots=this.list('orders').filter(r=>r.status==='Freigegeben' && !this.get(r.data.offerId)?.data.baseOfferId);
        if(!options.orderId && roots.length>1)throw Error('Mehrere Hauptaufträge vorhanden. Bitte den abzurechnenden Auftrag auswählen.');
        const order=options.orderId?roots.find(r=>r.id===options.orderId):roots.at(-1);
        const offer=this.get(order?.data.offerId);
        if(!offer || offer.status!=='Freigegeben') throw Error('Eine freigegebene Beauftragung mit Angebotsbezug fehlt.');
        sourceOfferId=offer.id;tax=offer.data.tax;
        invoiceType=options.invoiceType || 'Schlussrechnung';
        if(!['Abschlagsrechnung','Teilrechnung','Schlussrechnung'].includes(invoiceType))throw Error('Rechnungsart ungültig.');
        percentage=invoiceType==='Schlussrechnung'?100:num(options.percentage ?? 100);
        if(percentage<=0 || percentage>100)throw Error('Kumulativer Leistungsanteil muss größer als 0 und höchstens 100 % sein.');
        previous=this.list('invoices').filter(r=>r.status==='Freigegeben' && r.data.sourceOfferId===offer.id);
        const cancelled=new Set(previous.map(r=>r.data.stornoOf).filter(Boolean));
        if(previous.some(r=>(r.data.invoiceType || 'Schlussrechnung')==='Schlussrechnung' && !r.data.stornoOf && !cancelled.has(r.id)))throw Error('Dieser Auftrag wurde bereits abgerechnet. Schlussrechnung zuerst stornieren.');
        const changeOffers=this.list('orders').filter(r=>r.status==='Freigegeben').map(r=>this.get(r.data.offerId)).filter(r=>r?.data.baseOfferId===offer.id);
        const all=[...offer.data.positions,...changeOffers.flatMap(r=>r.data.positions)];
        if(new Set(all.map(p=>p.id)).size!==all.length)throw Error('Beauftragte Position mehrfach vorhanden.');
        positions=all.map(p=>{
          const measured=this.measured(p.id),cumulativeQty=round(measured*percentage/100);
          if(measured<=0 && invoiceType==='Schlussrechnung')throw Error('Für jede beauftragte Position ist ein freigegebenes Aufmaß erforderlich.');
          const billedQty=round(previous.reduce((n,r)=>n+r.data.positions.filter(x=>x.id===p.id).reduce((a,x)=>a+x.qty,0),0));
          const billedGrossPosition=round(previous.reduce((n,r)=>n+r.data.positions.filter(x=>x.id===p.id).reduce((a,x)=>a+x.gp,0),0));
          if(cumulativeQty<billedQty)throw Error('Kumulativer Leistungsstand liegt unter bereits berechneten Mengen.');
          return {...p,qty:round(cumulativeQty-billedQty),cumulativeQty,previousQty:billedQty,gp:round(round(cumulativeQty*p.ep)-billedGrossPosition)};
        }).filter(p=>p.qty>0 || p.gp!==0);
        if(!positions.length)throw Error('Keine noch nicht berechnete Leistung vorhanden.');
        if(customer.data.publicCustomer && !(project.data.buyerReference || customer.data.buyerReference)) throw Error('Leitweg-ID / Käuferreferenz fehlt.');
      }
      const net=round(positions.reduce((n,p)=>n+p.gp,0));
      const previouslyNet=round(previous.reduce((n,r)=>n+r.data.net,0)),previouslyTax=round(previous.reduce((n,r)=>n+r.data.taxAmount,0));
      const taxAmount=round(round((previouslyNet+net)*tax/100)-previouslyTax);
      const record={id:uid(),module:kind,projectId:project.id,status:'Freigegeben',owner:options.owner || 'Lokaler Testanwender',createdAt:new Date().toISOString(),data:{title:kind==='offers'?(baseOfferId?'Nachtragsangebot':'Angebot'):invoiceType,invoiceType,percentage,baseOfferId,changeNumber,version,supersedesOfferId,number:`${kind==='offers'?'AN':'RE'}-${new Date().getFullYear()}-${String(this.data.records.filter(r=>r.module===kind).length+1).padStart(4,'0')}`,project:JSON.parse(JSON.stringify(project.data)),customer:JSON.parse(JSON.stringify(customer.data)),company:JSON.parse(JSON.stringify(this.data.settings)),buyerReference:project.data.buyerReference || customer.data.buyerReference || '',sourceOfferId,positions,optionalPositions,alternativePositions,previouslyNet,previouslyTax,net,tax,taxAmount,gross:round(net+taxAmount)}};
      return this.transaction('Dokumentfassung freigegeben',kind,record.id,d=>{d.records.push(record);return record;});
    }
    stornoInvoice(id, options={}) {
      if(this.project()?.data.phase==='Abgeschlossen')throw Error('Abgeschlossenes Projekt zuerst mit Begründung wieder öffnen.');
      const invoice=this.get(id);
      if(invoice?.module!=='invoices' || invoice.projectId!==this.data.selectedProject || invoice.data.stornoOf)throw Error('Rechnung im aktuellen Projekt auswählen.');
      if(!options.reason?.trim())throw Error('Stornogrund erforderlich.');
      if(this.list('invoices').some(r=>r.data.stornoOf===id))throw Error('Rechnung wurde bereits storniert.');
      const data=JSON.parse(JSON.stringify(invoice.data));
      data.title='Stornorechnung';data.invoiceType='Stornorechnung';data.stornoOf=id;data.originalNumber=invoice.data.number;data.reason=options.reason.trim();
      data.number=`RE-${new Date().getFullYear()}-${String(this.data.records.filter(r=>r.module==='invoices').length+1).padStart(4,'0')}`;
      data.net=-data.net;data.taxAmount=-data.taxAmount;data.gross=-data.gross;data.positions=data.positions.map(p=>({...p,qty:-p.qty,gp:-p.gp}));
      const record={id:uid(),module:'invoices',projectId:invoice.projectId,status:'Freigegeben',owner:options.owner || 'Lokaler Testanwender',createdAt:new Date().toISOString(),data};
      return this.transaction('Rechnung storniert','invoices',record.id,d=>{d.records.push(record);return record;});
    }
    controlling() {
      const calc=this.calculation();
      const times=round(this.list('times').filter(r=>r.status==='Freigegeben').reduce((n,r)=>n+r.data.hours*r.data.rate,0));
      const incoming=round(this.list('incoming').filter(r=>r.status==='Freigegeben' && r.data.includeInCosts).reduce((n,r)=>n+r.data.net,0));
      const billedSubcontracts=new Set(this.list('incoming').filter(r=>r.status==='Freigegeben' && r.data.includeInCosts && r.data.subcontractId).map(r=>r.data.subcontractId));
      const commitments=round(this.list('subcontracts').filter(r=>r.status==='Freigegeben').reduce((n,r)=>n+r.data.cost,0));
      const subcontracts=round(this.list('subcontracts').filter(r=>r.status==='Freigegeben' && !billedSubcontracts.has(r.id)).reduce((n,r)=>n+r.data.cost,0));
      const invoices=this.list('invoices').filter(r=>r.status==='Freigegeben');
      const revenue=round(invoices.reduce((n,r)=>n+r.data.net,0));
      const gross=round(invoices.reduce((n,r)=>n+r.data.gross,0));
      const paid=round(this.list('payments').filter(r=>r.status==='Freigegeben').reduce((n,r)=>n+(r.data.direction==='Rückzahlung'?-1:1)*r.data.amount,0));
      const contracted=this.list('orders').filter(r=>r.status==='Freigegeben').flatMap(o=>this.get(o.data.offerId).data.positions);
      const planned=contracted.length?round(contracted.reduce((n,p)=>n+p.qty*p.direct,0)):calc.direct;
      return {planned,times,incoming,subcontracts,commitments,actual:round(times+incoming+subcontracts),revenue,result:round(revenue-times-incoming-subcontracts),gross,paid,outstanding:round(gross-paid)};
    }
    materialDemand() {
      const demand=new Map();
      const contracted=this.list('orders').filter(r=>r.status==='Freigegeben').flatMap(o=>this.get(o.data.offerId).data.positions);
      const positions=contracted.length?contracted:this.list('lv').filter(r=>!['Bedarfsposition','Alternativposition'].includes(r.data.kind)).map(r=>r.data);
      for(const p of positions) {
        if(!p.materialId)continue;
        const material=this.get(p.materialId), item=demand.get(material.id) || {materialId:material.id,name:material.data.name,unit:material.data.unit,supplier:material.data.supplier,unitPrice:material.data.price,quantity:0,ordered:0,delivered:0};
        item.quantity+=p.qty*(p.consumption || 1);demand.set(material.id,item);
      }
      for(const order of this.list('purchase').filter(r=>r.status==='Freigegeben')) {
        const item=demand.get(order.data.materialId);if(!item)continue;
        item.ordered+=order.data.quantity;
        item.delivered+=this.list('logistics').filter(r=>r.status==='Freigegeben' && r.data.purchaseId===order.id).reduce((n,r)=>n+r.data.quantity,0);
      }
      return [...demand.values()].map(item=>({...item,quantity:round(item.quantity),ordered:round(item.ordered),delivered:round(item.delivered),remaining:round(Math.max(0,item.quantity-item.ordered))}));
    }
    applyOperatingCosts() {
      const costs=this.list('operating').filter(r=>r.status==='Freigegeben');
      if(!costs.length)throw Error('Kostenansätze zuerst prüfen und freigeben.');
      const hours=this.data.settings.capacity?capacity(this.data.settings.capacity).productiveHours:null;
      const rate=round(hours?costs.reduce((n,r)=>n+r.data.annualCost,0)/hours:costs.reduce((n,r)=>n+r.data.annualCost/r.data.productiveHours,0));
      if(rate<=0)throw Error('Kostenansatz muss größer als null sein.');
      return this.settings({wage:rate,agk:0});
    }
    createPurchase(materialId, options={}) {
      const demand=this.materialDemand().find(d=>d.materialId===materialId);
      if(!demand || demand.remaining<=0)throw Error('Kein offener Materialbedarf für diesen Artikel.');
      if(this.get(materialId).status!=='Freigegeben')throw Error('Materialpreis zuerst freigeben.');
      const draft=this.list('purchase').find(r=>r.data.materialId===materialId && r.status!=='Freigegeben' && r.status!=='Erledigt');
      if(draft)throw Error('Für diesen Artikel gibt es bereits eine offene Bestellung. Bitte diese prüfen.');
      return this.save('purchase',{title:`Bestellung ${demand.name}`,materialId,quantity:demand.remaining,supplier:demand.supplier,unitPrice:demand.unitPrice,deliveryDate:options.deliveryDate || ''},{owner:options.owner || '',status:'Neu'});
    }
    quotes(materialId) {
      return this.list('suppliers').flatMap(s=>(s.quotes || []).filter(q=>q.materialId===materialId).map(q=>({...q,supplierId:s.id,supplier:s.data.name,effectivePrice:round(q.price*(1-q.discount/100)+q.freight)}))).sort((a,b)=>a.effectivePrice-b.effectivePrice);
    }
    quote(supplierId, values) {
      const supplier=this.get(supplierId), material=this.get(values.materialId);
      if(supplier?.module!=='suppliers' || material?.module!=='materials')throw Error('Lieferant oder Artikel fehlt.');
      const price=num(values.price),discount=num(values.discount),freight=num(values.freight);
      if(price<0 || discount<0 || discount>100 || freight<0)throw Error('Preis, Rabatt oder Fracht sind ungültig.');
      if(!values.source?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(values.date || '') || Number.isNaN(Date.parse(values.date)) || new Date(values.date).toISOString().slice(0,10)!==values.date)throw Error('Preisquelle und gültiger Preisstand erforderlich.');
      const quote={id:uid(),materialId:material.id,unit:material.data.unit,price,discount,freight,date:values.date,source:values.source.trim()};
      return this.transaction('Lieferantenpreis erfasst','suppliers',supplier.id,d=>{d.records.find(r=>r.id===supplier.id).quotes=[...(supplier.quotes || []),quote];return quote;});
    }
    useQuote(supplierId, quoteId, owner) {
      const supplier=this.get(supplierId),quote=supplier?.quotes?.find(q=>q.id===quoteId),material=this.get(quote?.materialId);
      if(!quote || !material)throw Error('Preisvergleich nicht gefunden.');
      if(quote.unit!==material.data.unit)throw Error('Einheit des Preisvergleichs stimmt nicht mit dem Artikel überein.');
      return this.save('materials',{...material.data,price:round(quote.price*(1-quote.discount/100)+quote.freight),supplier:supplier.data.name,priceDate:quote.date,source:quote.source},{id:material.id,status:'Freigegeben',owner});
    }
    schedule(employeeId, values) {
      const employee=this.get(employeeId),project=this.get(values.projectId);
      if(employee?.module!=='personnel' || project?.module!=='projects')throw Error('Mitarbeiter und Projekt auswählen.');
      const start=values.start,end=values.end;
      if(![start,end].every(v=>/^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v) || start>end)throw Error('Einsatzzeitraum ungültig.');
      if((employee.assignments || []).some(a=>!a.cancelled && a.start<=end && start<=a.end))throw Error('Mitarbeiter ist in diesem Zeitraum bereits eingeplant.');
      const assignment={id:uid(),projectId:project.id,start,end,task:String(values.task || '').trim(),createdAt:new Date().toISOString()};
      return this.transaction('Einsatz geplant','personnel',employee.id,d=>{d.records.find(r=>r.id===employee.id).assignments=[...(employee.assignments || []),assignment];return assignment;});
    }
    cancelSchedule(employeeId, assignmentId) {
      const employee=this.get(employeeId);
      if(!employee?.assignments?.some(a=>a.id===assignmentId && !a.cancelled))throw Error('Aktiver Einsatz nicht gefunden.');
      return this.transaction('Einsatz storniert','personnel',employeeId,d=>{const a=d.records.find(r=>r.id===employeeId).assignments.find(a=>a.id===assignmentId);a.cancelled=true;a.cancelledAt=new Date().toISOString();});
    }
    sign(recordId, values) {
      if(this.project()?.data.phase==='Abgeschlossen')throw Error('Abgeschlossenes Projekt zuerst mit Begründung wieder öffnen.');
      const record=this.get(recordId);
      if(!record || !['acceptance','times'].includes(record.module) || record.projectId!==this.data.selectedProject)throw Error('Unterschrift gehört nicht zum aktuellen Projekt.');
      if(!values.signer?.trim())throw Error('Name des Unterzeichners erforderlich.');
      if(!Array.isArray(values.strokes) || !values.strokes.length || values.strokes.length>200 || !values.strokes.some(s=>Array.isArray(s) && s.length>=2))throw Error('Bitte zuerst auf der Unterschriftsfläche unterschreiben.');
      let count=0;
      for(const stroke of values.strokes) {
        if(!Array.isArray(stroke))throw Error('Unterschrift ungültig.');
        for(const point of stroke) {
          count++;
          if(count>10000 || !Array.isArray(point) || point.length!==2 || point.some(n=>typeof n!=='number' || !Number.isFinite(n) || n<0 || n>1))throw Error('Unterschrift ungültig.');
        }
      }
      const labels={};
      for(const field of definitions[record.module].fields) {
        if(['employee','position','material','customer'].includes(field.type)) {
          const ref=this.get(record.data[field.key]);
          if(ref)labels[field.key]=(ref.data.number?`${ref.data.number} · `:'')+(ref.data.name || ref.data.title || ref.data.text || '');
        }
      }
      const snapshot=JSON.parse(JSON.stringify({data:record.data,status:record.status,owner:record.owner,due:record.due,project:this.project().data,customer:this.get(this.project().data.customerId).data,company:this.data.settings,labels}));
      const signature={id:uid(),signer:values.signer.trim(),role:String(values.role || ''),signedAt:new Date().toISOString(),strokes:JSON.parse(JSON.stringify(values.strokes)),snapshot};
      return this.transaction('Unterschrift erfasst',record.module,record.id,d=>{d.records.find(r=>r.id===record.id).signatures=[...(record.signatures || []),signature];return signature;});
    }
    attach(id, file) {
      if(this.project()?.data.phase==='Abgeschlossen')throw Error('Abgeschlossenes Projekt zuerst mit Begründung wieder öffnen.');
      const record=this.get(id);
      if(!record || record.projectId!==this.data.selectedProject || !['documents','defects','expert','acceptance','diary'].includes(record.module)) throw Error('Dateizuordnung ungültig.');
      if(file?.storageId) {
        if(typeof file.name!=='string'||file.name.length>240||!Number.isInteger(file.size)||file.size<1||file.size>67108864||!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.mime)||! /^[a-f0-9]{64}$/.test(file.sha256 || '')||typeof file.storageId!=='string')throw Error('Gespeicherte Dateimetadaten ungültig.');
        return this.transaction('Originaldatei zentral zugeordnet',record.module,id,d=>{const r=d.records.find(x=>x.id===id);if(!r.attachments?.some(a=>a.storageId===file.storageId))r.attachments=[...(r.attachments || []),{...file,id:file.storageId}];});
      }
      if(!file || typeof file.name!=='string' || typeof file.dataUrl!=='string' || !/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,/.test(file.dataUrl)) throw Error('Bitte JPG, PNG, WebP oder PDF wählen.');
      if(file.dataUrl.length>2_800_000) throw Error('Datei zu groß für den lokalen Testbestand (max. 2 MB).');
      return this.transaction('Datei zugeordnet',record.module,id,d=>{const r=d.records.find(x=>x.id===id);r.attachments=[...(r.attachments || []),{...file,id:uid()}];});
    }
    backup() { return JSON.stringify(this.data,null,2); }
    importPositions(rows, source) {
      if(!this.project()) throw Error('Projekt auswählen.');
      const findings=source?.findings || [];
      if(!Array.isArray(rows) || !Array.isArray(findings) || rows.length+findings.length<1 || rows.length+findings.length>5000) throw Error('Bitte 1 bis 5000 Positionen oder Prüfvorgänge importieren.');
      if(source?.originalText && (typeof source.originalText!=='string' || source.originalText.length>1_000_000))throw Error('Import-Originaldaten höchstens 1 MB.');
      if(source?.originalWorkbook && (typeof source.originalWorkbook!=='string' || source.originalWorkbook.length>1_333_340 || !/^[A-Za-z0-9+/]+={0,2}$/.test(source.originalWorkbook)))throw Error('Excel-Original ungültig oder größer als 1 MB.');
      // Stage the entire batch to prevent partial imports on validation errors.
      let staging=this.backup();
      const staged=new Store({getItem:()=>staging,setItem:(_k,v)=>{staging=v;}});
      const imported=rows.map(row=>staged.save('lv',row));
      const provenance=source?staged.save('imports',{title:source.title || 'LV-Import',source:source.source,format:source.format,notes:`${imported.length} LV-Positionen; ${findings.length} Sonder-/Hinweisvorgänge. Fachliche Freigabe ausstehend.`}):null;
      if(findings.length && !provenance)throw Error('Quelle für Sonderpositionen erforderlich.');
      if(provenance){provenance.originalText=source.originalText || '';if(source.originalWorkbook){provenance.originalWorkbook=source.originalWorkbook;provenance.hasOriginalWorkbook=true;provenance.workbookName=String(source.workbookName || source.source || 'LV.xlsx');}if(source.mapping)provenance.importMapping=JSON.parse(JSON.stringify(source.mapping));}
      const reviews=findings.map(f=>{
        if(!f || typeof f.text!=='string' || typeof f.suggestion!=='string' || typeof f.reason!=='string' || !f.candidate || typeof f.candidate!=='object')throw Error('Sonderpositions-Prüfvorgang ungültig.');
        const r=staged.save('contract',{title:(source.format==='Excel Prüfquelle'?'Excel-Prüfung ':'GAEB-Prüfung ')+String(f.number || f.type),finding:f.reason+'\nOriginalinhalt:\n'+f.text,question:f.suggestion,source:source.source || source.format || 'Import',blocking:true,relatedRecordId:provenance.id},{status:'Prüfung'});
        r.importFinding=JSON.parse(JSON.stringify(f));return r;
      });
      return this.transaction(findings.length?'LV samt Sonderpositionen importiert':'LV importiert','lv',null,d=>{d.records.push(...imported);if(provenance)d.records.push(provenance);d.records.push(...reviews);return imported;});
    }
    convertImportFinding(id,values,options={}) {
      const original=this.get(id);
      if(!original?.importFinding || original.module!=='contract' || original.projectId!==this.data.selectedProject)throw Error('Sonderposition gehört nicht zum aktuellen Projekt.');
      if(original.status==='Erledigt' || original.data.positionId)throw Error('Sonderposition bereits bearbeitet oder gewandelt.');
      if(!options.owner?.trim() || !options.reason?.trim())throw Error('Wandlung mit Verantwortlichem und Begründung dokumentieren.');
      let raw=this.backup();const staged=new Store({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}});
      const position=staged.save('lv',values,{status:'Prüfung',owner:options.owner});
      const review=staged.save('contract',{...original.data,positionId:position.id,notes:options.reason},{id,status:'Erledigt',owner:options.owner});
      return this.transaction('Sonderposition dokumentiert ins LV gewandelt','contract',id,d=>{d.records.push(position);d.records[d.records.findIndex(r=>r.id===id)]=review;return position;});
    }
    importMaterials(rows, source) {
      if(!Array.isArray(rows) || !rows.length || rows.length>5000)throw Error('Bitte 1 bis 5000 Artikel importieren.');
      let staging=this.backup();
      const staged=new Store({getItem:()=>staging,setItem:(_k,v)=>{staging=v;}});
      const seen=new Set();
      const imported=rows.map(row=>{
        const values={...row,source:source.source,priceDate:source.priceDate,supplier:row.supplier || source.supplier || ''};
        const key=[values.manufacturer || '',values.article || values.name,values.supplier,values.unit].join('|');
        if(seen.has(key))throw Error('Doppelter Artikel innerhalb der Preisliste.');seen.add(key);
        const existing=staged.list('materials').find(m=>[m.data.manufacturer,m.data.article || m.data.name,m.data.supplier,m.data.unit].join('|')===key);
        if(existing?.status==='Freigegeben') {
          // Validate the proposed price in isolation without invalidating approved live prices.
          const proposed=staged.save('materials',values,{status:'Prüfung',owner:source.owner || ''});
          const pending={...existing,pendingPrice:{data:proposed.data,importedAt:new Date().toISOString(),status:'Prüfung'}};
          staged.data.records=staged.data.records.filter(r=>r.id!==proposed.id);
          return pending;
        }
        return staged.save('materials',values,{id:existing?.id,status:'Prüfung',owner:source.owner || ''});
      });
      const list=staged.save('pricelists',{title:source.title || source.source,source:source.source,priceDate:source.priceDate,supplier:source.supplier || '',notes:`${imported.length} Artikel importiert – Einzelpreise vor Kalkulationsübernahme freigeben.`},{status:'Prüfung',owner:source.owner || ''});
      return this.transaction('Preisliste importiert','pricelists',list.id,d=>{
        // Imported updates remain in review; no automatic approval of new prices.
        for(const record of imported){const i=d.records.findIndex(r=>r.id===record.id);if(i<0)d.records.push(record);else d.records[i]=record;}
        d.records.push(list);return imported;
      });
    }
    restore(text) {
      const data=JSON.parse(text);this.validate(data);
      return this.transaction('Sicherung wiederhergestellt','projects',null,d=>{
        d.records=data.records;d.selectedProject=data.selectedProject;d.settings=data.settings;
        d.audit.push(...data.audit);
      });
    }
  }
  const api={Store,modules,definitions,statuses,stages,num,round,empty,capacity};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.DWPProject=api;
})(typeof globalThis!=='undefined'?globalThis:this);
