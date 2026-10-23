const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {Store}=require('./project-core.js');
const {execute,memoryRepository}=require('./lib/project-service.cjs');
const {JSDOM}=require('jsdom');

(async()=>{
  const repository=memoryRepository(),actor={id:'kalk8',name:'Prüfer',role:'admin',tenantId:'kalkulation-03-25'};
  let state=(await repository.read(actor.tenantId)).state,projectId;
  const run=async(method,args)=>{
    const result=await execute(repository,actor,{method,args,revision:state.revision,projectId});
    state=result.state;return state.records.find(r=>r.id===result.recordId);
  };
  const model=()=>new Store({getItem:()=>JSON.stringify({...state,selectedProject:projectId}),setItem:()=>{}});
  const customer=await run('save',['customers',{name:'Kalkulationskunde'}]);
  projectId=(await run('save',['projects',{name:'Kalkulation 03/25',customerId:customer.id,phase:'Erfassung'}])).id;
  await run('settings',[{wage:40,agk:10,profit:0}]);
  const source={number:'01',text:'Mehrschichtaufbau',qty:2,unit:'m²',material:0,minutes:0,
    useDetailedMaterials:true,useEfbRates:true,efbWage:60,laborMarkup:0,materialMarkup:0,equipmentMarkup:0,subcontractMarkup:0,
    materialName1:'Bahn',materialPrice1:10,materialCut1:1.1,materialWaste1:10,materialMinutes1:5,
    materialName2:'Dämmung',materialPrice2:5,materialCut2:0,materialWaste2:20,materialMinutes2:7,
    fasteners:1,disposal:2,miscellaneous:3,otherMarkup:10,detailSource:'Blanko Kalkulation 03/25'};
  const r=await run('save',['lv',source,{status:'Freigegeben'}]);
  const p=model().position(r);
  assert.equal(p.material,19.1,'Vier Materialansätze und Befestiger bilden die Materialkosten');
  assert.equal(p.totalMinutes,12,'Materialminuten werden ohne zusätzliche allgemeine Minuten übernommen');
  assert.equal(p.materialBreakdown[0].cost,12.1);
  assert.equal(p.materialBreakdown[1].cost,6);
  assert.equal(p.labor,12);
  assert.equal(p.other,5);
  assert.equal(p.direct,36.1);
  assert.equal(p.priceComponents.other,5.5);
  assert.equal(p.calculatedEp,36.6);
  assert.equal(p.gp,73.2);
  assert.equal(model().calculation().material,38.2);
  const legacy=await run('save',['lv',{number:'02',text:'Unveränderte Altposition',qty:1,unit:'m²',minutes:6,material:12.3,
    useEfbRates:true,efbWage:54,materialMarkup:35},{status:'Freigegeben'}]);
  assert.equal(model().position(legacy).calculatedEp,22.01);
  assert.deepEqual(Object.keys(model().position(legacy).priceComponents),['labor','material','equipment','subcontract']);
  const before=state.revision;
  await assert.rejects(run('save',['lv',{...source,number:'03',materialId:'bereits-bestellt'}]),/Materialartikel/);
  assert.equal(state.revision,before);
  await assert.rejects(run('save',['lv',{...source,number:'04',materialWaste1:110}]),/Verschnitt/);
  assert.equal(state.revision,before);
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'}),w=dom.window;
  w.localStorage.setItem('dwp-project-core-v1',model().backup());w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
  for(const file of ['app.js','module-fixes.js','project-core.js','module-verification.js','project-workflows.js'])
    vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
  w.DWPWorkspace.open('efb');
  const href=w.document.querySelector('#main-content a[href*="Blanko-Kalkulation-ab-03-25"]');
  assert(href);assert.equal(href.rel,'noopener noreferrer');
  assert(w.document.querySelector('#main-content').textContent.includes('36,60'));
  w.DWPWorkspace.open('lv');
  w.document.querySelector('[data-dwp="edit"][data-id="'+r.id+'"]').click();
  const detail=w.document.querySelector('#dwp-record');
  assert(detail);
  assert.equal(detail.querySelector('[name="materialPrice1"]').value,'10');
  assert(detail.querySelector('[name="useDetailedMaterials"]').checked);
  assert.equal(require('./module-verification.js').isVerified('efb'),false);
  dom.window.close();
  console.log('Modul 08: vier Materialien, Verschnitt, Minuten, Nebenkosten, Preise, Legacy, Validierung, DOM und ROT bestanden.');
})().catch(error=>{console.error(error);process.exitCode=1;});
