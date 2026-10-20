const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {Store}=require('./project-core.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'}),w=dom.window;
 w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
 for(const file of ['app.js','module-fixes.js','project-core.js','module-verification.js','gaeb-import.js','project-workflows.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
 const db=w.DWPWorkspace.store,c=db.save('customers',{name:'Textquellen-Test'});
 db.save('projects',{name:'Dach',customerId:c.id,phase:'Erfassung'});
 const q=s=>w.document.querySelector(s);
 const csv='number;text;qty;unit\n0010;"Abdichtung; Anschlüsse äöü";12,5;m²';
 const xml='<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.3"><Award><DP>83</DP><BoQ><BoQBody><Itemlist><Item RNoPart="0020"><Qty>2</Qty><QU>m</QU><Description><CompleteText><DetailTxt><Text>Randabschluss ü</Text></DetailTxt></CompleteText></Description></Item></Itemlist></BoQBody></BoQ></Award></GAEB>';
 for(const [format,text,source] of [['CSV',csv,'Dach.csv'],['GAEB XML',xml,'Dach.x83']]){
  w.DWPWorkspace.open('imports');q('#dwp-import-format').value=format;q('#dwp-import-source').value=source;q('#dwp-csv').value=text;
  q('[data-dwp="preview-import"]').click();q('#dwp-import').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(q('#dwp-error').textContent,'');assert.equal(db.list('imports').at(-1).originalText,text);
 }
 let raw=db.backup();const reloaded=new Store({getItem:()=>raw,setItem:(_k,value)=>{raw=value;}});
 assert.equal(reloaded.list('imports')[0].originalText,csv);assert.equal(reloaded.list('imports')[1].originalText,xml);
 // Later LV edits cannot modify the archived source.
 const lv=db.list('lv')[0];db.save('lv',{...lv.data,text:'Bearbeitete Leistung'},{id:lv.id});assert.equal(db.list('imports')[0].originalText,csv);
 let blob,filename,downloads=0;w.URL.createObjectURL=b=>{blob=b;downloads++;return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){filename=this.download;};
 for(const [index,text,source,type] of [[0,csv,'Dach.csv','text/csv;charset=utf-8'],[1,xml,'Dach.x83','application/xml;charset=utf-8']]){
  w.DWPWorkspace.open('imports');q(`[data-dwp="import-text-download"][data-id="${db.list('imports')[index].id}"]`).click();await tick();
  assert.equal(filename,source);assert.equal(blob.type,type);
  const reader=new w.FileReader();const content=new Promise(resolve=>{reader.onload=()=>resolve(reader.result);});reader.readAsText(blob);assert.equal(await content,text);
 }
 const journal=db.list('imports')[0];let request;
 w.DWPRemote={active:true,trackModule:async()=>{},export:async input=>{request=input;throw Error('Export nur auf dem freigegebenen iPhone oder HP-Laptop.');}};
 w.DWPWorkspace.open('imports');q(`[data-dwp="import-text-download"][data-id="${journal.id}"]`).click();await tick();
 assert.deepEqual(JSON.parse(JSON.stringify(request)),{kind:'record',projectId:db.data.selectedProject,recordId:journal.id});
 assert.equal(downloads,2);assert.match(q('#dwp-error').textContent,/freigegebenen/);
 w.DWPRemote.export=async()=>({record:journal});q(`[data-dwp="import-text-download"][data-id="${journal.id}"]`).click();await tick();assert.equal(downloads,3);
 dom.window.close();console.log('CSV/GAEB text sources: preview import, reload, immutable provenance, UTF-8 download and central export denial/allowance passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
