const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {Store}=require('./project-core.js');
const {execute,memoryRepository}=require('./lib/project-service.cjs');
(async()=>{
 const repo=memoryRepository(),actor={id:'reviewer',name:'Prüfer',role:'admin',tenantId:'special-tests'};
 let state=(await repo.read(actor.tenantId)).state,projectId;
 const run=async(method,args)=>{const out=await execute(repo,actor,{method,args,revision:state.revision,projectId});state=out.state;return state.records.find(r=>r.id===out.recordId);};
 const model=()=>{let raw=JSON.stringify({...state,selectedProject:projectId});return new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});};
 await run('settings',[{wage:60,agk:0,profit:0}]);
 const customer=await run('save',['customers',{name:'Test AG'}]);
 const project=await run('save',['projects',{name:'Variantenprüfung',customerId:customer.id,phase:'Erfassung'}]);projectId=project.id;
 const ok={status:'Freigegeben'};
 const materialBase=await run('save',['materials',{name:'Grundsystem',unit:'m²',price:10,priceDate:'2026-10-13',source:'Test'},ok]);
 const materialAlt=await run('save',['materials',{name:'Alternativsystem',unit:'m²',price:15,priceDate:'2026-10-13',source:'Test'},ok]);
 const lv={text:'Ausführung',qty:10,unit:'m²',material:10,groupPath:'Dach / Abdichtung'};
 const base=await run('save',['lv',{...lv,number:'G1',kind:'Grundposition',choiceGroup:'Abdichtung',materialId:materialBase.id,consumption:1},ok]);
 const alt=await run('save',['lv',{...lv,number:'A1',kind:'Alternativposition',choiceGroup:'Abdichtung',material:15,materialId:materialAlt.id,consumption:1},ok]);
 const optional=await run('save',['lv',{...lv,number:'B1',kind:'Bedarfsposition',qty:2,material:20},ok]);
 const regular=await run('save',['lv',{...lv,number:'H1',qty:1,material:5},ok]);
 assert.equal(model().calculation().net,105);assert.equal(model().calculation().direct,105);
 assert.equal(model().lvGroups().find(g=>g.path==='Dach').net,105);
 const baseline=await run('issue',['offers']);assert.equal(baseline.data.net,105);
 assert.equal(baseline.data.optionalPositions[0].id,optional.id);assert.equal(baseline.data.alternativePositions[0].id,alt.id);
 for(const selection of [[],[base.id,alt.id],[alt.id,alt.id],['foreign-id'],[regular.id]]) {
   const revision=state.revision;await assert.rejects(run('issue',['offers',{selectedPositionIds:selection}]),/ausw|ungültig/);assert.equal(state.revision,revision);
 }
 const selected=await run('issue',['offers',{selectedPositionIds:[alt.id,optional.id]}]);
 assert.equal(selected.data.net,195);assert.equal(selected.data.supersedesOfferId,baseline.id);
 assert.deepEqual(selected.data.positions.map(p=>p.id),[alt.id,optional.id,regular.id]);
 assert.equal(selected.data.optionalPositions.length,0);assert.equal(selected.data.alternativePositions[0].id,base.id);
 await assert.rejects(run('save',['orders',{title:'Altfassung',offerId:baseline.id,date:'2026-10-13'},ok]),/ersetzt/);
 const order=await run('save',['orders',{title:'Variante beauftragt',offerId:selected.id,date:'2026-10-13'},ok]);
 assert.equal(order.confirmation.net,195);assert.equal(model().materialDemand().length,1);assert.equal(model().materialDemand()[0].materialId,materialAlt.id);assert.equal(model().materialDemand()[0].quantity,10);
 await run('settings',[{wage:120,profit:100}]);assert.equal(model().controlling().planned,195);
 for(const [p,qty] of [[alt,12],[optional,2],[regular,1]])await run('save',['measurements',{title:'Aufmaß',positionId:p.id,length:qty,width:1,factor:1,date:'2026-10-13'},ok]);
 const invoice=await run('issue',['invoices']);assert.equal(invoice.data.net,225);
 assert.equal(invoice.data.positions.some(p=>p.id===base.id),false);assert.equal(invoice.data.positions.find(p=>p.id===alt.id).ep,15);
 await assert.rejects(run('issue',['offers',{selectedPositionIds:[base.id]}]),/bereits beauftragt/);
 // Old stored offers without a version link cannot order the other choice of an assigned group.
 let db=model();const forged=JSON.parse(db.backup());forged.records.find(r=>r.id===selected.id).data.supersedesOfferId=null;forged.records.find(r=>r.id===baseline.id).data.positions=forged.records.find(r=>r.id===baseline.id).data.positions.filter(p=>p.id===base.id);
 let raw=JSON.stringify(forged);db=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});
 assert.throws(()=>db.save('orders',{title:'Doppelte Wahl',offerId:baseline.id,date:'2026-10-13'},{...ok,owner:'Prüfer'}),/Wahlgruppe/);
 // Atomic import preserves all special fields; invalid rows leave the state unchanged.
 const other=await run('save',['projects',{name:'Import',customerId:customer.id,phase:'Erfassung'}]);projectId=other.id;
 await run('importPositions',[[{...lv,number:'I1',kind:'Grundposition',choiceGroup:'Import',useTargetPrice:'false',targetEp:999},{...lv,number:'I2',kind:'Alternativposition',choiceGroup:'Import',useTargetPrice:'ja',targetEp:'12,50',discountPercent:10}]]);
 db=model();assert.equal(db.list('lv')[0].data.useTargetPrice,false);assert.equal(db.list('lv')[1].data.choiceGroup,'Import');assert.equal(db.position(db.list('lv')[1]).ep,11.25);
 const revision=state.revision;
 await assert.rejects(run('importPositions',[[{...lv,number:'I3'},{...lv,number:'I4',kind:'Unbekannte Sonderposition'}]]),/Leistungsart/);assert.equal(state.revision,revision);
 await assert.rejects(run('save',['lv',{...lv,number:'I5',useTargetPrice:'vielleicht'}]),/Zielpreis verwenden/);
 await assert.rejects(run('save',['lv',{...lv,number:'I5',kind:'Alternativposition'}]),/Wahlgruppe/);
 const corrupted=JSON.parse(db.backup());corrupted.records.find(r=>r.module==='lv').data.choiceGroup='';assert.throws(()=>db.restore(JSON.stringify(corrupted)),/Wahlgruppe/);
 // Drive radio selection, offer creation and separate print sections through the UI.
 projectId=project.id;db=model();const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'}),w=dom.window;
 const snapshot=JSON.parse(db.backup());snapshot.records=snapshot.records.filter(r=>!['offers','orders','invoices','measurements'].includes(r.module));snapshot.settings.profit=0;
 w.localStorage.setItem('dwp-project-core-v1',JSON.stringify(snapshot));w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
 for(const file of ['app.js','module-fixes.js','project-core.js','module-verification.js','document-layout.js','project-workflows.js'])vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
 w.DWPWorkspace.open('offers');assert(w.document.querySelector('#dwp-choice-total').textContent.includes('105,00'));
 const radio=w.document.querySelector(`[data-offer-position][value="${alt.id}"]`);radio.checked=true;radio.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert(w.document.querySelector('#dwp-choice-total').textContent.includes('155,00'));
 w.document.querySelector('[data-dwp="issue"]').click();const offered=w.DWPWorkspace.store.list('offers')[0];assert.equal(offered.data.net,155);
 w.document.querySelector(`[data-dwp="print"][data-id="${offered.id}"]`).click();const printed=w.document.querySelector('iframe').contentDocument.body.textContent;
 assert(printed.includes('Bedarfspositionen – nicht in Summe'));assert(printed.includes('Nicht gewählte Ausführungen – nicht in Summe'));assert(printed.includes('155,00'));
 dom.window.close();console.log('Special positions: atomic import, explicit variant/optional selection, separate totals, immutable snapshots, permission-backed orders, group duplication prevention, frozen pricing, measured billing and UI/print passed.');
})().catch(e=>{console.error(e);process.exit(1);});
