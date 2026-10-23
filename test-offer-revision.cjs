const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {execute,memoryRepository}=require('./lib/project-service.cjs');
const {PDFDocument}=require('pdf-lib');
const edit=require('./offer-edit.js');
async function main(){
 const repo=memoryRepository(),actor={id:'admin',name:'Prüfer',tenantId:'offer-test',role:'admin'};
 async function command(method,args,projectId){const row=await repo.read(actor.tenantId);return execute(repo,actor,{method,args,projectId,revision:row.state.revision});}
 const customer=(await command('save',['customers',{name:'Testkunde'}])).recordId;
 const project=(await command('save',['projects',{name:'Testdach',customerId:customer,phase:'Erfassung'}])).recordId;
 await command('settings',[{wage:62,agk:12,profit:8,tax:19}]);
 await command('save',['lv',{number:'01',text:'Dachabdichtung',qty:10,unit:'m²',material:14,minutes:10},{status:'Freigegeben'}],project);
 const result=await command('issue',['offers'],project),source=result.state.records.find(r=>r.id===result.recordId),prior=JSON.stringify(source);
 const values=source.data.positions.map(p=>({...edit.defaults(p,source.data.company),material:20,product:'FLAGON ECO150'}));
 let version=(await repo.read(actor.tenantId)).state.revision;
 await assert.rejects(command('reviseOffer',[source.id,{positions:values,refreshPdf:false}],project),/PDF erneuert/);
 await assert.rejects(command('reviseOffer',[source.id,{positions:[{...values[0],material:''}],refreshPdf:true}],project),/gültigen Wert/);
 assert.equal((await repo.read(actor.tenantId)).state.revision,version);
 const next=await command('reviseOffer',[source.id,{positions:values,refreshPdf:true}],project);
 let state=(await repo.read(actor.tenantId)).state,newRecord=state.records.find(r=>r.id===next.recordId);
 assert.equal(newRecord.data.number,source.data.number+'/01');assert.equal(newRecord.status,'Prüfung');
 assert.equal(JSON.stringify(state.records.find(r=>r.id===source.id)),prior);
 assert.equal(newRecord.data.positions[0].ep,36.69);assert.equal(newRecord.data.net,366.9);assert.equal(newRecord.data.gross,436.61);
 assert.equal(newRecord.data.positions[0].calculatedWith,'FLAGON ECO150');
 const fixed={...newRecord.data.positions[0],useTargetPrice:true,ep:99,gp:990};
 assert.equal(edit.calculate(fixed,{...edit.defaults(fixed,newRecord.data.company),product:'Nur Produktname'},newRecord.data.company).ep,99);
 assert(!next.state.records.find(r=>r.id===newRecord.id).pdf.base64,'PDF bytes are behind the existing export gate');
 const bytes=Buffer.from(newRecord.pdf.base64,'base64');assert(bytes.subarray(0,4).toString()==='%PDF');
 assert.equal((await PDFDocument.load(bytes)).getPageCount(),1);
 fs.writeFileSync('/tmp/dwp-offer-revision-test.pdf',bytes);
 await assert.rejects(command('reviseOffer',[source.id,{positions:values,refreshPdf:true}],project),/neueste Fassung/);
 const nextValues=newRecord.data.positions.map(p=>({...edit.defaults(p,newRecord.data.company),minutes:12}));
 const again=await command('reviseOffer',[newRecord.id,{positions:nextValues,refreshPdf:true}],project);
 assert.equal(again.state.records.find(r=>r.id===again.recordId).data.number,source.data.number+'/02');
 // Rendering failure must not persist either the new revision or its number.
 const fresh=again.state.records.find(r=>r.id===again.recordId),pdfModule=require('./lib/offer-pdf.cjs'),generate=pdfModule.createOfferPdf;
 pdfModule.createOfferPdf=async()=>{throw Error('PDF-Testfehler');};
 version=(await repo.read(actor.tenantId)).state.revision;
 await assert.rejects(command('reviseOffer',[fresh.id,{positions:fresh.data.positions.map(p=>({...edit.defaults(p,fresh.data.company),minutes:13})),refreshPdf:true}],project),/PDF-Testfehler/);
 assert.equal((await repo.read(actor.tenantId)).state.revision,version);pdfModule.createOfferPdf=generate;
 // Mobile-sized DOM: both dialog branches, live recalculation and no save on Nein.
 const {JSDOM}=require('jsdom'),dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'}),w=dom.window;
 w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.localStorage.setItem('dwp-project-v1',JSON.stringify(state));
 for(const file of ['app.js','module-fixes.js','project-core.js','offer-edit.js','project-workflows.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
 w.DWPWorkspace.acceptServerState(state,actor);w.DWPWorkspace.store.data.selectedProject=project;
 let calls=0;w.DWPRemote={active:true,trackModule:async()=>{},run:async()=>{calls++;return {};}};
 const q=s=>w.document.querySelector(s),tick=()=>new Promise(resolve=>setTimeout(resolve,0));
 w.DWPWorkspace.open('offers');q('[data-dwp="offer-open"]').click();assert(q('dialog'));
 q('[data-answer="no"]').click();await tick();assert(q('[data-offer-input="material"]').disabled);
 q('[data-dwp="offer-edit"]').click();q('[data-answer="yes"]').click();await tick();assert(!q('[data-offer-input="material"]').disabled);
 const input=q('[data-offer-input="material"]');input.value='23';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert(q('#dwp-offer-total').textContent.includes('403,20'));
 q('#dwp-offer-edit').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));q('[data-answer="no"]').click();await tick();assert.equal(calls,0);assert.equal(input.value,'23');
 q('#dwp-offer-edit').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));q('[data-answer="yes"]').click();await tick();assert.equal(calls,1);
 dom.window.close();console.log('Offer revision: editable/read-only dialogs, live prices, No-save branch, PDF bytes, document numbering, immutable source and atomic rendering failure passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
