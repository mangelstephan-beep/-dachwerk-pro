// Modul 09: Dach-Kalkulationspreisliste V8 als Leistungskatalog, Übernahme ins LV und Deckungsbeitrag (Kurzform).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {Store}=require('./project-core.js');
const {execute,memoryRepository}=require('./lib/project-service.cjs');
const v8=require('./preisliste-v8.js');
(async()=>{
  // Datenbestand: 93 Positionen, 18 Bereiche, eindeutige Nummern, Referenz-EP nachrechenbar.
  assert.equal(v8.rows.length,93);
  assert.equal(new Set(v8.rows.map(r=>r.number)).size,93);
  assert.equal(new Set(v8.rows.map(r=>r.group)).size,18);
  for(const r of v8.rows){
    assert(r.title && r.text && r.unit,'Kurztext, Langtext und Einheit '+r.number);
    const ep=(r.minutes*0.958904+r.material+r.equipment)*1.1;
    assert(Math.abs(ep-r.ep)<0.011,`Referenz-EP ${r.number}: ${ep} statt ${r.ep}`);
  }
  const rows=v8.rows.map(({ep,...row})=>row),source={source:v8.source,note:v8.note};

  // Server: nur Freigabeberechtigte dürfen den Katalog einspielen; Verantwortlicher kommt vom Server.
  const repo=memoryRepository(),admin={id:'stephan',name:'Stephan Mangel',role:'admin',tenantId:'v8'};
  let state=(await repo.read(admin.tenantId)).state,projectId=null;
  const run=async(actor,method,args)=>{const out=await execute(repo,actor,{method,args,revision:state.revision,projectId});state=out.state;return out;};
  await assert.rejects(run({...admin,id:'kolonne',name:'Kolonne',role:'editor'},'importServices',[rows,source]),/Freigabeberechtigung/);
  await run(admin,'settings',[{wage:57.53,agk:0,profit:10}]);
  await run(admin,'importServices',[rows,{...source,owner:'Fremder Name'}]);
  const model=()=>{let raw=JSON.stringify({...state,selectedProject:projectId});return new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});};
  let db=model();
  const catalog=db.list('services');
  assert.equal(catalog.length,93);
  assert(catalog.every(r=>r.status==='Freigegeben' && r.owner==='Stephan Mangel'));
  const pye=catalog.find(r=>r.data.number==='0020.0010');
  assert.equal(pye.data.title,'Bitumen-Unterlagsbahn PYE');assert.equal(pye.data.group,'0020 Bitumenabdichtung');assert.equal(pye.data.minutes,8);assert.equal(pye.data.material,10.5);
  // Mit V8-Basis entspricht der Katalog-EP der Preisliste (Rundung des Kalkulationslohns höchstens 1 Cent).
  for(const r of catalog)assert(Math.abs(db.serviceEp(r).ep-v8.rows.find(x=>x.number===r.data.number).ep)<=0.011,r.data.number);
  assert.equal(db.serviceEp(pye).ep,19.99);

  // Erneutes Einspielen aktualisiert, statt zu verdoppeln; eigene Änderungen an anderen Nummern bleiben.
  const own=await run(admin,'save',['services',{number:'9000.0010',title:'Eigener Baustein',text:'Sonderleistung',unit:'Stk.',minutes:60,material:5}]);
  await run(admin,'importServices',[rows,source]);
  db=model();assert.deepEqual(db.importServices(rows,source),{created:0,updated:93,total:93});assert.equal(db.list('services').length,94);assert(db.get(own.recordId));
  // Doppelte Nummer in der Datei: nichts wird übernommen.
  const before=state.revision;
  await assert.rejects(run(admin,'importServices',[[rows[0],rows[0]],source]),/doppelt/);
  assert.equal(state.revision,before);
  await assert.rejects(run(admin,'save',['services',{number:'0020.0010',title:'Doppelt',text:'x',unit:'m²'}]),/bereits vergeben/);

  // Übernahme ins LV: Position rechnet mit denselben Werten wie der Katalog.
  const customer=await run(admin,'save',['customers',{name:'Bauherr Test'}]);
  projectId=(await run(admin,'save',['projects',{name:'Flachdach Test',customerId:customer.recordId,phase:'Erfassung'}])).recordId;
  db=model();
  const values=db.serviceLvValues(pye.id);
  assert.equal(values.text.split('\n')[0],'Bitumen-Unterlagsbahn PYE');assert.equal(values.groupPath,'Bitumenabdichtung');
  assert.equal(values.catalogRef,'0020.0010 Bitumen-Unterlagsbahn PYE');
  const {catalogRef,...lvValues}=values;
  const position=await run(admin,'save',['lv',{...lvValues,number:'01.010',qty:100}]);
  db=model();
  const priced=db.position(db.get(position.recordId));
  assert.equal(priced.ep,19.99);assert.equal(priced.gp,1999);

  // Deckungsbeitrag Kurzform: Prozent und je Stunde beziehen sich auf denselben DB.
  const kran=catalog.find(r=>r.data.number==='0160.0020');
  await run(admin,'save',['lv',{...db.serviceLvValues(kran.id),number:'01.020',qty:100}]);
  await run(admin,'save',['lv',{number:'01.030',text:'Bedarfsposition',qty:10,unit:'m²',minutes:60,material:10,kind:'Bedarfsposition'}]);
  db=model();
  const d=db.contributionSummary();
  assert.equal(d.revenue,2439);
  assert.equal(d.material,1450);assert.equal(d.hours,13.33);
  assert.equal(d.gross,989);assert.equal(d.labor,767.07);
  assert.equal(d.contribution,221.93);
  assert.equal(d.percent,Math.round(d.contribution/d.revenue*10000)/100);
  assert.equal(d.perHour,Math.round(d.contribution/d.hours*100)/100);

  // Oberfläche: Einspielen, Suchen, „Ins LV“ mit Vorbelegung und Katalogwerte in bestehende Position.
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'}),w=dom.window;
  const fresh=JSON.parse(db.backup());fresh.records=fresh.records.filter(r=>r.module!=='services');
  w.localStorage.setItem('dwp-project-core-v1',JSON.stringify(fresh));w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
  for(const file of ['app.js','module-fixes.js','project-core.js','module-verification.js','document-layout.js','preisliste-v8.js','project-workflows.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
  const main=w.document.querySelector('#main-content'),click=(action,id='')=>{const b=[...main.querySelectorAll(`[data-dwp="${action}"]`)].find(x=>x.dataset.id===id);assert(b,'Schaltfläche '+action+' '+id);b.click();};
  const settle=()=>new Promise(r=>setTimeout(r,0));
  w.DWPWorkspace.open('services');
  assert(main.textContent.includes('Noch nicht eingespielt'));
  click('services-v8');await settle();
  assert.equal(main.querySelectorAll('[data-catalog-row]').length,93);
  assert(main.textContent.includes('93 V8-Bausteine im Katalog'));
  assert(w.document.querySelector('#toast-region').textContent.includes('93 neu, 0 aktualisiert'));
  assert(main.textContent.includes('Entspricht der V8-Referenz'));
  assert(main.textContent.includes('V8: 19,99'));
  const filter=main.querySelector('#dwp-catalog-filter');filter.value='fallrohr kupfer';filter.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(main.querySelectorAll('[data-catalog-row]:not([hidden])').length,3);
  assert(main.querySelector('#dwp-catalog-feedback').textContent.includes('3 von 93'));
  const store=w.DWPWorkspace.store,rinne=store.list('services').find(r=>r.data.number==='0140.0020');
  click('service-lv',rinne.id);
  let form=main.querySelector('#dwp-record');
  assert.equal(form.elements.module.value,'lv');
  assert(form.elements.text.value.startsWith('Hängedachrinne Titanzink, 6-teilig / 333 mm'));
  assert.equal(form.elements.unit.value,'lfm');assert.equal(form.elements.minutes.value,'20');assert.equal(form.elements.material.value,'20');
  assert.equal(form.elements.qty.value,'');assert.equal(form.elements.number.value,'004');
  // Katalogwerte in eine bestehende (z. B. importierte) Position übernehmen, Nummer/Menge/Text bleiben.
  const existing=store.list('lv').find(r=>r.data.number==='01.030');
  click('edit',existing.id);form=main.querySelector('#dwp-record');
  const pick=main.querySelector('#dwp-catalog-pick');assert(pick.querySelectorAll('optgroup').length>=18);
  pick.value=store.list('services').find(r=>r.data.number==='0080.0010').id;
  click('catalog-apply');
  assert.equal(form.elements.minutes.value,'9');assert.equal(form.elements.material.value,'13');assert.equal(form.elements.number.value,'01.030');assert.equal(form.elements.qty.value,'10');assert.equal(form.elements.text.value,'Bedarfsposition');
  // Kalkulation zeigt die Deckungsbeitragsrechnung.
  w.confirm=()=>true;w.DWPWorkspace.open('calculation');
  assert(main.textContent.includes('Deckungsbeitrag (Kurzform)'));assert(main.textContent.includes('Roherlös je Stunde'));
  console.log('Preisliste V8, Katalog-Import, LV-Übernahme und Deckungsbeitrag geprüft.');
})().catch(error=>{console.error(error);process.exit(1);});
