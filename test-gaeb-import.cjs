const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {parse,report}=require('./gaeb-import.js');
const {execute,memoryRepository}=require('./lib/project-service.cjs');
const {Store}=require('./project-core.js');
const xmlWindow=new JSDOM('').window,Parser=xmlWindow.DOMParser;
const item=(number='0010',qty='12.500')=>`<Item ID="i${number}" RNoPart="${number}"><Qty>${qty}</Qty><QU>m2</QU><Description><CompleteText><OutlineText><OutlTxt><TextOutlTxt>Abdichtung &amp; Anschluss</TextOutlTxt></OutlTxt></OutlineText><DetailTxt><Text><p>Erste Lage<br/>zweite Lage</p><p>Überlappung prüfen.</p></Text></DetailTxt></CompleteText></Description></Item>`;
const fixture=content=>`<?xml version="1.0" encoding="UTF-8"?><GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.3"><Award><DP>83</DP><BoQ><BoQBody><BoQCtgy ID="c1" RNoPart="01"><LblTx><p>Dach</p></LblTx><BoQBody><BoQCtgy ID="c2" RNoPart="02"><LblTx><p>Abdichtung</p></LblTx><BoQBody><Itemlist>${content}</Itemlist></BoQBody></BoQCtgy></BoQBody></BoQCtgy></BoQBody></BoQ></Award></GAEB>`;
const xml=fixture(item()),rows=parse(xml,Parser);
assert.equal(rows[0].number,'01.02.0010');assert.equal(rows[0].qty,12.5);assert.equal(rows[0].unit,'m²');
assert.equal(rows[0].groupPath,'01 Dach / 02 Abdichtung');
assert.equal(rows[0].text,'Abdichtung & Anschluss\nErste Lage\nzweite Lage\nÜberlappung prüfen.');
// Namespace prefixes cannot change the interpretation.
const prefixed=xml.replace(/<(\/?)([A-Za-z][A-Za-z0-9]*)(?=[\s>])/g,'<$1g:$2').replace('xmlns=','xmlns:g=');
assert.deepEqual(parse(prefixed,Parser),rows);
// Award metadata (including foreign namespace children) must produce blocking review findings.
for(const extra of ['<AwardInfo><Text>Vergabehinweis</Text></AwardInfo>','<custom:Rules xmlns:custom="urn:external">Vertragsregel</custom:Rules>']){
 const extended=xml.replace('<DP>83</DP>','<DP>83</DP>'+extra);
 assert.throws(()=>parse(extended,Parser),/Award-Elemente/);
 const inspected=report(extended,Parser);
 assert.equal(inspected.rows.length,1);
 assert.equal(inspected.findings.length,1);
 assert.equal(inspected.findings[0].number,'Award');
 assert.match(inspected.findings[0].text,/Vergabehinweis|Vertragsregel/);
}

for(const [broken,rx] of [
 [xml.replace('</GAEB>',''),/wohlgeformt/],
 [xml.replace('DA83/3.3','DA84/3.3'),/X83/],
 [xml.replace('<DP>83','<DP>84'),/Austauschphase/],
 [xml.replace('UTF-8','UTF-16'),/UTF-8/],
 ['<!DOCTYPE GAEB [<!ENTITY private SYSTEM "file:///etc/passwd">]>'+xml,/DTD/],
 [fixture(item('0010','12,500')),/Menge/],
 [xml.replace('<Qty>12.500</Qty>',''),/Menge/],
 [xml.replace('<QU>m2</QU>',''),/Einheit/],
 [fixture(item()+item()),/doppelt/],
 [xml.replace('<Qty>','<QtyTBD>Yes</QtyTBD><Qty>'),/QtyTBD/],
 [xml.replace('<Qty>','<Provis>Yes</Provis><Qty>'),/Provis/],
 [xml.replace('<Qty>','<CONo>N01</CONo><Qty>'),/CONo/],
 [xml.replace('<Itemlist>','<Remark><Text>Vorbemerkung</Text></Remark><Itemlist>'),/Remark/],
 [xml.replace('<DetailTxt>','<DetailTxt><TextComplement>Erzeugnis</TextComplement>'),/TextComplement/],
 [xml.replace('<Qty>','<Other xmlns="urn:other"/><Qty>'),/Other/]
])assert.throws(()=>parse(broken,Parser),rx);
(async()=>{
 const repo=memoryRepository(),actor={id:'gaeb-admin',name:'Prüfer',role:'admin',tenantId:'gaeb-tests'};
 let state=(await repo.read(actor.tenantId)).state,projectId;
 const run=async(method,args)=>{const result=await execute(repo,actor,{method,args,revision:state.revision,projectId});state=result.state;return state.records.find(r=>r.id===result.recordId);};
 const customer=await run('save',['customers',{name:'GAEB Muster AG'}]);
 const project=await run('save',['projects',{name:'GAEB Dach',customerId:customer.id,phase:'Erfassung'}]);projectId=project.id;
 await run('importPositions',[rows,{title:'X83 LV',source:'dach.x83',format:'GAEB XML'}]);
 const before=JSON.stringify(state);
 await assert.rejects(run('importPositions',[parse(fixture(item('0020')+item('0010')),Parser)]),/bereits vorhanden/);
 assert.equal(JSON.stringify((await repo.read(actor.tenantId)).state.records),JSON.stringify(state.records),'Kein Teilimport trotz erst gültiger neuer Position');
 assert.equal(JSON.stringify(state),before);
 let raw=JSON.stringify({...state,selectedProject:projectId}),db=new Store({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}});
 assert.equal(db.list('imports')[0].data.source,'dach.x83');assert.equal(db.list('lv')[0].status,'Neu');
 const position=db.list('lv')[0];
 await run('save',['lv',{...position.data,material:20},{id:position.id,status:'Freigegeben'}]);
 const offer=await run('issue',['offers']);assert.equal(offer.data.positions[0].qty,12.5);assert.equal(offer.data.positions[0].groupPath,rows[0].groupPath);
 const second=await run('save',['projects',{name:'Anderes Dach',customerId:customer.id,phase:'Erfassung'}]);
 projectId=second.id;await run('importPositions',[rows]);
 assert.equal(state.records.filter(r=>r.module==='lv' && r.projectId===project.id).length,1);
 assert.equal(state.records.filter(r=>r.module==='lv' && r.projectId===second.id).length,1);
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'}),w=dom.window;
 w.localStorage.setItem('dwp-project-core-v1',JSON.stringify({...state,selectedProject:project.id}));w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
 for(const file of ['app.js','module-fixes.js','project-core.js','module-verification.js','gaeb-import.js','project-workflows.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
 const q=selector=>w.document.querySelector(selector),submit=()=>q('#dwp-import').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 w.DWPWorkspace.open('imports');q('#dwp-import-format').value='GAEB XML';q('#dwp-csv').value=fixture(item('0030'));q('#dwp-import-source').value='weiter.x83';
 submit();assert.match(q('#dwp-error').textContent,/Vorschau/);assert.equal(w.DWPWorkspace.store.list('lv').length,1);
 q('[data-dwp="preview-import"]').click();assert(q('#dwp-import-preview').textContent.includes('01 Dach / 02 Abdichtung'));
 q('#dwp-csv').value=fixture(item('0040'));submit();assert.match(q('#dwp-error').textContent,/Vorschau/);
 q('[data-dwp="preview-import"]').click();
 w.DWPWorkspace.store.save('diary',{title:'Zwischenänderung',work:'Arbeit',date:'2026-10-13'});
 submit();assert.match(q('#dwp-error').textContent,/Vorschau/);
 q('[data-dwp="preview-import"]').click();submit();assert.equal(w.DWPWorkspace.store.list('lv').length,2);
 assert.equal(w.DWPWorkspace.store.list('imports').at(-1).data.source,'weiter.x83');
 q('#dwp-import-format').value='GAEB XML';q('#dwp-csv').value=fixture(item('0050')+item('0040'));
 q('[data-dwp="preview-import"]').click();assert.match(q('#dwp-error').textContent,/bereits vorhanden/);
 submit();assert.equal(w.DWPWorkspace.store.list('lv').length,2,'Abgelehnte Vorschau kann nicht importiert werden');
 const hosted=require('./api/workspace-page.cjs');assert(hosted.includes('/gaeb-import.js'));assert(fs.readFileSync('index.html','utf8').includes('/gaeb-import.js'));
 assert.equal(require('./module-verification.js').isVerified('imports'),false);
 // Preserve special positions, including unknown kinds, without fabricated quantities/prices.
 const specialXml=fixture(item('0100')+item('0200').replace('<Qty>12.500</Qty>','<QtyTBD>Yes</QtyTBD>')+item('0300').replace('<Qty>12.500</Qty>','<LumpSumItem>Yes</LumpSumItem>')+item('0400').replace('<Qty>','<Provis>Yes</Provis><Qty>')+'<MarkupItem ID="mark" RNoPart="0500"><MarkupType>AllInCat</MarkupType><MarkupPcnt>2</MarkupPcnt></MarkupItem>'+item('0600').replace('<Qty>','<UnknownRule>Originalmerkmal</UnknownRule><Qty>'));
 const special=report(specialXml,Parser);
 assert.equal(special.rows.length,1);assert.equal(special.findings.length,5);
 assert.equal(special.findings[0].candidate.qty,'');assert.match(special.findings[0].suggestion,/Keine Menge/);
 assert.match(special.findings[1].suggestion,/1 psch/);assert.equal(special.findings[1].candidate.qty,'','Vorschlag ist keine erfundene Menge');
 assert.equal(special.findings[2].candidate.kind,'Bedarfsposition');assert.match(special.findings[2].suggestion,/Gesamtbetrag/);
 assert.match(special.findings[3].suggestion,/Noch kein Zuschlagsbetrag/);assert.match(special.findings[4].reason,/UnknownRule/);
 await run('importPositions',[special.rows,{title:'Sonder-LV',source:'sonder.x83',format:'GAEB XML',findings:special.findings,originalText:specialXml}]);
 const free=state.records.find(r=>r.importFinding?.reason.includes('QtyTBD'));
 assert(free.data.blocking);assert.equal(free.status,'Prüfung');
 assert.equal(state.records.find(r=>r.module==='imports' && r.data.source==='sonder.x83').originalText,specialXml);
 await assert.rejects(run('issue',['offers']),/Sperren/);
 const conversion={number:'01.02.0200',text:'Freie Menge nach Planprüfung',qty:18,unit:'m²',kind:'Hauptleistung',groupPath:'01 Dach / 02 Abdichtung'};
 await assert.rejects(execute(repo,{...actor,role:'editor'},{method:'convertImportFinding',args:[free.id,conversion,{reason:'Plan geprüft',owner:'gefälscht'}],projectId,revision:state.revision}),/Freigabeberechtigung/);
 await assert.rejects(run('convertImportFinding',[free.id,conversion,{reason:''}]),/Begründung/);
 await assert.rejects(run('convertImportFinding',[free.id,{...conversion,number:'01.02.0100'},{reason:'Prüfung'}]),/bereits vorhanden/);
 const converted=await run('convertImportFinding',[free.id,conversion,{reason:'18 m² aus dokumentierter Planprüfung',owner:'gefälscht'}]);
 assert.equal(converted.status,'Prüfung');assert.equal(converted.owner,'Prüfer');
 const resolved=state.records.find(r=>r.id===free.id);
 assert.equal(resolved.status,'Erledigt');assert.equal(resolved.data.positionId,converted.id);assert.equal(resolved.importFinding.candidate.qty,'');
 await assert.rejects(run('convertImportFinding',[free.id,conversion,{reason:'Noch einmal'}]),/bereits/);
 await assert.rejects(run('issue',['offers']),/Sperren/,'Übrige Sonderpositionen bleiben gesperrt');
 projectId=project.id;
 await assert.rejects(run('convertImportFinding',[state.records.find(r=>r.importFinding?.reason.includes('LumpSumItem')).id,conversion,{reason:'Falsches Projekt'}]),/aktuellen Projekt/);
 // Browser form keeps the suggested free quantity blank and explicitly records the review.
 w.DWPWorkspace.acceptServerState({...state,selectedProject:second.id},actor);w.DWPWorkspace.open('contract');
 const pending=state.records.find(r=>r.importFinding?.reason.includes('LumpSumItem'));
 q(`[data-dwp="convert-import"][data-id="${pending.id}"]`).click();assert.equal(q('#dwp-convert-import [name="qty"]').value,'');
 q('#dwp-convert-import [name="qty"]').value='1';q('#dwp-convert-import [name="unit"]').value='psch';q('#dwp-convert-import [name="reason"]').value='Pauschalumfang geprüft, 1 psch; Preisansatz noch offen';
 q('#dwp-convert-import').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(w.DWPWorkspace.store.get(pending.id).status,'Erledigt');
 assert.equal(w.DWPWorkspace.store.get(w.DWPWorkspace.store.get(pending.id).data.positionId).data.qty,1);
 w.DWPWorkspace.open('imports');q('[data-dwp="import-original"]').click();assert.equal(q('textarea[readonly]').value,specialXml);
 dom.window.close();xmlWindow.close();
 console.log('GAEB X83: hierarchy/text/quantities, atomic import/original preservation, project isolation, preview guard; special/unknown positions retained with blocked proposals, explicit conversion, permissions, duplicate prevention and UI passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
