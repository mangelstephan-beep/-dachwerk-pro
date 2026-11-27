const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const ocr=require('./ocr-import.js'),pdf=require('./pdf-import.js'),tesseract=require('tesseract.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
(async()=>{
  // Exercise the real WASM engine with a deterministic, image-only German scan.
  const data=path.dirname(require.resolve('@tesseract.js-data/deu/package.json'));
  let realOptions;
  const engine={createWorker:(lang,oem,opts)=>{realOptions=opts;return tesseract.createWorker(lang,oem,{...opts,
    workerPath:require.resolve('tesseract.js/src/worker-script/node/index.js'),
    corePath:path.dirname(require.resolve('tesseract.js-core/package.json')),langPath:path.join(data,'4.0.0_best_int')});}};
  const real=ocr.session({engine});let recognized;
  try{recognized=await real.recognize(require('./test-ocr-fixture.cjs'));}finally{await real.close();}
  assert.match(recognized.text,/ABNAHME 12345/);assert.match(recognized.text,/12,50 m2 Abdichtung/);
  assert(recognized.confidence>=0&&recognized.confidence<=100);
  assert.equal(realOptions.workerBlobURL,false);assert.equal(realOptions.cacheMethod,'none');
  for(const key of ['workerPath','corePath','langPath'])assert(realOptions[key].startsWith('/vendor/ocr/'));

  const controller=new AbortController(),waiting=deferred();let terminated=0;
  const cancelled=ocr.session({signal:controller.signal,engine:{createWorker:async()=>({recognize:()=>waiting.promise,terminate:async()=>{terminated++;}})}});
  const pending=cancelled.recognize('synthetic');await tick();controller.abort();
  await assert.rejects(pending,{name:'AbortError'});await cancelled.close();assert.equal(terminated,1);
  waiting.resolve({data:{text:'late',confidence:90}});await tick();
  const init=deferred(),initController=new AbortController();let lateTerminated=0;
  const initializing=ocr.session({signal:initController.signal,engine:{createWorker:()=>init.promise}});
  const initPending=initializing.recognize('synthetic');await tick();initController.abort();
  await assert.rejects(initPending,{name:'AbortError'});await initializing.close();
  init.resolve({terminate:async()=>{lateTerminated++;}});await tick();assert.equal(lateTerminated,1,'Worker finishing initialization after cancellation must be released');

  const bytes=new TextEncoder().encode('%PDF-test'),file={size:bytes.length,arrayBuffer:async()=>bytes.buffer};
  const canvases=[],progress=[];let closed=0,destroyed=0,calls=0;
  const text='A real text layer with more than thirty-five characters.';
  const makeParser=texts=>({getDocument:()=>({promise:Promise.resolve({numPages:texts.length,getPage:async n=>({
    getTextContent:async()=>({items:texts[n-1]?[{str:texts[n-1]}]:[]}),
    getViewport:({scale})=>({width:500*scale,height:700*scale}),render:()=>({promise:Promise.resolve(),cancel(){}}),cleanup(){}
  })}),destroy:async()=>{destroyed++;}})});
  const options={ocr:true,ocrProgress:(page)=>progress.push(page),canvasFactory:()=>{const canvas={getContext:()=>({})};canvases.push(canvas);return canvas;},
    ocrFactory:({progress})=>({recognize:async()=>{calls++;progress('recognizing text',.5);return recognized;},close:async()=>{closed++;}})};
  const pages=await pdf.extract(file,undefined,makeParser([text,'','x']),options);
  assert.equal(calls,2);assert.equal(closed,1);assert.equal(destroyed,1);assert.equal(pages[0].ocr,undefined);
  assert.equal(pages[1].ocr.language,'deu');assert.equal(pages[1].ocr.reviewRequired,true);assert.equal(pages[2].sourceText,'x');
  assert.deepEqual(progress,[2,2,3,3],'One worker must report the current page, not its first page');
  assert(canvases.every(c=>c.width===0&&c.height===0));
  const report=pdf.report(JSON.stringify(pages));assert.equal(report.rows.length,0);assert.equal(report.findings.length,3);
  assert.match(report.findings[1].reason,/OCR-Text/);assert.match(report.findings[1].suggestion,/Originalbild/);
  assert.throws(()=>pdf.report(JSON.stringify([{page:1,text:'bad',ocr:{language:'deu',confidence:NaN,reviewRequired:true}}])),/OCR/);
  calls=closed=0;await pdf.extract(file,undefined,makeParser(['']),{...options,ocr:false});assert.equal(calls,0);
  await assert.rejects(pdf.extract(file,undefined,makeParser(Array(21).fill('')),options),/20 Scanseiten/);assert.equal(closed,1);
  // Actual UI option -> PDF reader -> preview -> persisted blocking review and OCR evidence.
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://dachwerk.test',runScripts:'outside-only'}),w=dom.window;
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
  for(const name of ['app.js','module-fixes.js','project-core.js','module-verification.js','project-workflows.js'])vm.runInContext(fs.readFileSync(name,'utf8'),dom.getInternalVMContext());
  const db=w.DWPWorkspace.store,c=db.save('customers',{name:'OCR Synthetic customer'});db.save('projects',{name:'OCR Synthetic project',customerId:c.id,phase:'Erfassung'});w.DWPWorkspace.open('imports');
  const q=s=>w.document.querySelector(s),gate=deferred();let optionsFromUi;
  w.DWPPdfImport={report:pdf.report,extract:(_file,_progress,_parser,options)=>{optionsFromUi=options;options.ocrProgress(1,1,.5);return gate.promise;}};
  q('#dwp-import-ocr').checked=true;Object.defineProperty(q('#dwp-import-file'),'files',{value:[{...file,name:'synthetic-scan.pdf'}]});
  q('#dwp-import-file').dispatchEvent(new w.Event('change',{bubbles:true}));await tick();
  assert.equal(optionsFromUi.ocr,true);assert(q('#dwp-import-ocr').disabled);assert.match(q('#dwp-import-progress').textContent,/Texterkennung.*50 %/);
  gate.resolve([{...pages[1],page:1}]);await tick();assert(!q('#dwp-import-ocr').disabled);
  q('[data-dwp="preview-import"]').click();assert.match(q('#dwp-import-preview').textContent,/OCR-Text/);
  q('#dwp-import').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(db.list('lv').length,0);assert.equal(db.list('contract')[0].data.blocking,true);
  assert.match(db.list('imports')[0].originalText,/"ocr"/);assert.throws(()=>db.issue('offers'),/Sperren/);
  dom.window.close();
  assert(fs.readFileSync('vercel.json','utf8').includes("'wasm-unsafe-eval'"));
  assert(!fs.readFileSync('vercel.json','utf8').includes("'unsafe-eval'"));
  console.log('OCR: real German WASM recognition, same-origin assets, active/late initialization cancellation, mixed-page rendering, 20-page bound, canvas/worker cleanup, UI option/progress, persisted blocked source and offer gate passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
