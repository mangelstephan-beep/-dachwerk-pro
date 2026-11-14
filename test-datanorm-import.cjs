const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const core=require('./project-core.js'),prices=require('./material-price-import.js'),datanorm=require('./datanorm-import.js');
// Unabhängige DOS-Kodierung (CP850) der deutschen Sonderzeichen, nicht aus dem Modul übernommen.
const dos={'ä':0x84,'ö':0x94,'ü':0x81,'Ä':0x8E,'Ö':0x99,'Ü':0x9A,'ß':0xE1};
const cp850=text=>Uint8Array.from([...text].map(c=>dos[c] ?? (c.charCodeAt(0)<128?c.charCodeAt(0):(()=>{throw Error('Testzeichen '+c);})())));
const pad=(s,n)=>String(s).padEnd(n,' ').slice(0,n);
const vorlauf=({date='141126',info='Baustoffhandel Muster GmbH',version='04',currency='EUR'}={})=>'V '+date+pad(info,40)+pad('Preisliste Dach',40)+pad('',35)+version+currency;
const main=[vorlauf(),
  'A;N;ART1;00;Kehlblech Zink;0,7 mm 2 m;2;0;Stck;1590;;110;;',
  'B;N;ART1;KEHLBLECH;;;;;;4012345678901;;110;;;;;',
  'A;N;ART2;00;Dachrinnenhalter für;Rinne 333;1;2;Stck;4500;DA;120;;',
  'A;N;ART3;00;Bitumenschweißbahn;V60 S4;1;0;Rolle;12000;XX;130;;',
  'A;N;ART4;00;Ortgangziegel;links;2;0;Stck;1000;;140;;',
  'A;N;ART5;00;Auslaufartikel;;2;0;Stck;500;;140;;',
  'A;L;ART5;00;Auslaufartikel;;2;0;Stck;500;;140;;',
  'A;N;ART6;00;Dachlatte;30x50;1;0;m;300;ZZ;150;;',
  'T;N;T1;1;1;Langtext wird nicht ausgewertet;'].join('\r\n')+'\r\n\x1a';
const preis=[vorlauf({date:'011226'}),'P;A;ART3;1;12000;2;0800;;;;;ART4;2;1250;;;;;;;','P;A;ART9;2;999;;;;;;;'].join('\r\n');
const rab=[vorlauf(),'R;A;DA;1;3500;Dachzubehör;'].join('\r\n');
const files=[{name:'DATANORM.001',bytes:cp850(main)},{name:'DATPREIS.001',bytes:cp850(preis)},{name:'DATANORM.RAB',bytes:cp850(rab)}];
(async()=>{
  // Lesen: Fassung, Datum, Kodierung, Lösch- und Preissätze.
  const parsed=datanorm.read(files);
  assert.equal(parsed.version,'4');assert.equal(parsed.date,'2026-11-14');assert.deepEqual(parsed.info,['Baustoffhandel Muster GmbH','Preisliste Dach']);
  assert.equal(parsed.sources[0].encoding,'CP850 (DOS)');assert.deepEqual(parsed.sources.map(s=>s.role),['Artikel','Preise','Rabattgruppen']);
  assert.equal(parsed.articles.get('ART2').a.name,'Dachrinnenhalter für Rinne 333','CP850-Umlaut ü');
  assert.equal(parsed.articles.get('ART3').a.name,'Bitumenschweißbahn V60 S4','CP850 ß');
  assert.equal(parsed.articles.get('ART5').deleted,true);
  assert.match(parsed.notes.join(' '),/1 Preis- oder Zusatzsätze ohne Artikelsatz/);
  assert.match(parsed.notes.join(' '),/1 Löschsätze/);
  // Umrechnung: blockiert, solange ein Listenpreis ohne Rabatt bleibt (ART6).
  let result=datanorm.book(parsed);
  assert.deepEqual(result.book.sheets[0].rows[0].values.map(c=>c.value),datanorm.COLUMNS);
  let mapping=prices.suggest(result.book.sheets[0].rows[0].values);
  assert.deepEqual([mapping.article,mapping.name,mapping.unit,mapping.price,mapping.discount,mapping.baseQuantity],[0,1,2,3,4,5],'Zuordnung vorbelegt');
  let report=prices.report(result.book,0,1,mapping,core);
  assert.equal(report.findings.length,1);assert.match(report.findings[0].reason,/D6: Listenpreis ohne Rabatt/);
  const byArticle=rows=>Object.fromEntries(rows.map(r=>[r.article,r]));
  let rows=byArticle(report.rows);
  assert.equal(rows.ART1.price,15.9,'Nettopreis je 1, Cent ohne Komma');
  assert.equal(rows.ART2.price,29.25,'Listenpreis 45,00 je 100 abzüglich 35 % Rabattgruppe');
  assert.equal(rows.ART2.unit,'100 Stck','Unter 1 Cent genau: Preis je Preiseinheit');
  assert.equal(rows.ART3.price,96,'Preissatz mit Multiplikator 0,8 ersetzt A-Preis');
  assert.equal(rows.ART4.price,12.5,'Zweiter Artikel in derselben P-Zeile');
  assert.equal(rows.ART5,undefined,'Löschsatz wird nicht übernommen');assert.equal(rows.ART9,undefined,'Preis ohne Artikelsatz wird nicht übernommen');
  const art2=result.book.sheets[0].rows.find(r=>r.values[0].value==='ART2').values;
  assert.match(art2[7].value,/Rabattgruppe DA „Dachzubehör“: Rabattsatz 35 %/);assert.match(art2[12].value,/0,2925 €/);
  assert.equal(result.book.sheets[0].rows.find(r=>r.values[0].value==='ART1').values[10].value,'4012345678901','EAN aus B-Satz');
  // Bewusste Übernahme des Listenpreises, Suchfilter und Materialstamm-Abgleich.
  report=prices.report(datanorm.book(parsed,{allowListPrice:true}).book,0,1,mapping,core);
  assert.equal(report.findings.length,0);assert.equal(byArticle(report.rows).ART6.price,3);
  result=datanorm.book(parsed,{filter:'rinne 120'});assert.equal(result.selected,1);assert.match(result.summary,/4 durch Filter ausgeblendet/);
  result=datanorm.book(parsed,{known:new Set(['ART1','ART4'])});assert.equal(result.selected,2);
  assert.throws(()=>datanorm.book(parsed,{known:new Set(['X'])}),/Materialstamm/);
  // Fassung, Währung, Struktur.
  assert.throws(()=>datanorm.read([{name:'D5.001',bytes:cp850('V;050;A;20070316;EUR;;\r\nA;N;1;;;Stck;2;1;2736;')}]),/DATANORM 5/);
  assert.throws(()=>datanorm.read([{name:'D3.001',bytes:cp850(vorlauf({version:'03'})+'\r\n')}]),/DATANORM 3/);
  assert.throws(()=>datanorm.read([{name:'DM.001',bytes:cp850(vorlauf({currency:'DEM'})+'\r\n')}]),/Währung „DEM“/);
  assert.throws(()=>datanorm.read([{name:'kurz.001',bytes:cp850('V 141126 kurz\r\n')}]),/unvollständig/);
  assert.throws(()=>datanorm.read([{name:'DATPREIS.001',bytes:cp850(preis)}]),/Keine Artikelsätze/);
  assert.throws(()=>datanorm.read([{name:'liste.txt',bytes:cp850('Artikel;Preis\r\n')}]),/Vorlaufsatz/);
  // Kodierung: UTF-8 und Windows-1252 werden erkannt.
  assert.equal(datanorm.decode(new TextEncoder().encode('Kehle für Ziegel')).encoding,'UTF-8');
  const win=datanorm.decode(Uint8Array.from([...'Schweißbahn grün'].map(c=>c.charCodeAt(0))));
  assert.equal(win.encoding,'Windows-1252');assert.equal(win.text,'Schweißbahn grün');
  // Mehr als 5000 Artikel benötigen einen Filter.
  const many=[vorlauf(),...Array.from({length:5001},(_,i)=>`A;N;M${i};00;Schraube ${i<10?'Edelstahl':'verzinkt'};;2;0;Stck;10;;200;;`)].join('\r\n');
  const big=datanorm.read([{name:'GROSS.001',bytes:cp850(many)}]);
  assert.throws(()=>datanorm.book(big),/5.001 Artikel ausgewählt. Höchstens 5000/);
  assert.equal(datanorm.book(big,{filter:'edelstahl'}).selected,10);

  // Oberfläche: Mehrfachauswahl, Vorschau, Übernahme zur Einzelpreisprüfung.
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'}),w=dom.window;
  assert(fs.readFileSync('index.html','utf8').includes('<script src="/datanorm-import.js"></script>'));
  const store=new core.Store({getItem:()=>null,setItem:()=>{}});
  store.save('materials',{name:'Kehlblech Zink 0,7 mm 2 m',article:'ART1',unit:'Stck',price:14,priceDate:'2026-01-01',source:'Alt'},{status:'Freigegeben',owner:'Prüfer'});
  w.localStorage.setItem('dwp-project-core-v1',store.backup());w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;w.TextDecoder=TextDecoder;
  for(const file of ['app.js','module-fixes.js','project-core.js','module-verification.js','material-price-import.js','datanorm-import.js','project-workflows.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
  w.DWPWorkspace.open('pricelists');
  const $=s=>w.document.querySelector(s),settle=()=>new Promise(r=>setTimeout(r,0));
  assert.match($('#main-content').textContent,/DATANORM 4 vom Händler/);assert($('#dwp-datanorm-options').hidden);
  const asFile=f=>({name:f.name,size:f.bytes.length,arrayBuffer:async()=>f.bytes.buffer.slice(f.bytes.byteOffset,f.bytes.byteOffset+f.bytes.length)});
  const input=$('#dwp-datanorm-file');Object.defineProperty(input,'files',{value:files.map(asFile)});
  input.dispatchEvent(new w.Event('change',{bubbles:true}));for(let i=0;i<5;i++)await settle();
  assert.equal($('#dwp-datanorm-options').hidden,false);
  assert.match($('#dwp-price-progress').textContent,/Listenpreis|DATANORM 4 vom 14\.11\.2026/);
  const form=$('#dwp-price-import');
  assert.equal(form.elements.priceDate.value,'2026-11-14');assert.match(form.elements.source.value,/DATANORM\.001 \+ DATPREIS\.001 \+ DATANORM\.RAB · Baustoffhandel Muster GmbH/);
  assert.equal($('[data-price-map="price"]').value,'3');
  const saved=()=>JSON.parse(w.localStorage.getItem('dwp-project-core-v1')),before=saved().revision,click=a=>$(`[data-dwp="${a}"]`).click();
  click('price-preview');assert.match($('#dwp-error').textContent,/Listenpreis ohne Rabatt/);
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(saved().revision,before,'Gesperrt bis zur Klärung');
  const listprice=$('#dwp-datanorm-listprice');listprice.checked=true;listprice.dispatchEvent(new w.Event('change',{bubbles:true}));
  click('price-preview');assert.match($('#dwp-price-preview').textContent,/29,25/);assert.match($('#dwp-price-preview').textContent,/96,00/);
  form.elements.supplier.value='Baustoffhandel Muster';
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert.match($('#dwp-error').textContent,/aktuelle Preisvorschau/,'Geänderter Lieferant braucht neue Vorschau');assert.equal(saved().revision,before);
  click('price-preview');form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const state=saved();assert.equal(state.revision,before+1);
  const materials=state.records.filter(r=>r.module==='materials');
  const art1=materials.find(m=>m.data.article==='ART1');
  assert.equal(materials.find(m=>m.data.article==='ART3').status,'Prüfung');assert.equal(materials.find(m=>m.data.article==='ART3').data.price,96);
  assert.match(materials.find(m=>m.data.article==='ART2').data.priceBasis,/45 EUR × \(1 − 35 \/ 100\)/);
  assert.equal(materials.find(m=>m.data.article==='ART5'),undefined);
  assert.ok(art1,'Artikel 1 vorhanden');
  // Abgleich: Nur Artikel aus dem Materialstamm.
  w.DWPWorkspace.open('pricelists');
  const again=$('#dwp-datanorm-file');Object.defineProperty(again,'files',{value:files.map(asFile)});
  again.dispatchEvent(new w.Event('change',{bubbles:true}));for(let i=0;i<5;i++)await settle();
  const known=$('#dwp-datanorm-known');known.checked=true;known.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.match($('#dwp-price-progress').textContent,/ausgewählt/);
  const filter=$('#dwp-datanorm-filter');filter.value='gibt es nicht';filter.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.match($('#dwp-error').textContent,/Keine Artikel|Materialstamm/);
  click('price-preview');assert.match($('#dwp-error').textContent,/Auswahl eingrenzen/);
  // DATANORM 5 und einzelne DATANORM-Datei über das Hauptfeld.
  w.DWPWorkspace.open('pricelists');
  const single=$('#dwp-price-file');Object.defineProperty(single,'files',{value:[asFile({name:'D5.001',bytes:cp850('V;050;A;20070316;EUR;;\r\n')})]});
  single.dispatchEvent(new w.Event('change',{bubbles:true}));for(let i=0;i<5;i++)await settle();
  assert.match($('#dwp-price-progress').textContent,/DATANORM 5/);
  dom.window.close();
  console.log('Modul 12 DATANORM 4: Lesen, CP850, Preiseinheit, Rabattgruppen, Preissätze, Filter, Abgleich und Oberfläche ok');
})().catch(error=>{console.error(error);process.exitCode=1;});
