(function(root){
  'use strict';
  let loading;
  function ensure(){
    if(root.Tesseract)return Promise.resolve(root.Tesseract);
    if(!loading)loading=new Promise((resolve,reject)=>{
      const script=root.document.createElement('script');script.src='/vendor/ocr/tesseract.min.js';
      script.onload=()=>root.Tesseract?resolve(root.Tesseract):reject(Error('Texterkennung konnte nicht geladen werden.'));
      script.onerror=()=>{script.remove();reject(Error('Texterkennung nicht verfügbar. Bitte neu versuchen.'));};
      root.document.head.append(script);
    }).catch(error=>{loading=null;throw error;});
    return loading;
  }
  function session({signal,progress,engine}={}){
    let worker,initializing,closed=false,closing;
    const abortError=()=>{const error=Error('Texterkennung abgebrochen.');error.name='AbortError';return error;};
    const terminate=()=>{
      closed=true;
      if(worker&&!closing)closing=Promise.resolve().then(()=>worker.terminate());
      return closing || Promise.resolve();
    };
    const onAbort=()=>{void terminate().catch(()=>{});};
    signal?.addEventListener('abort',onAbort,{once:true});
    function run(promise){
      return new Promise((resolve,reject)=>{
        let settled=false;
        const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);fn(value);};
        const abort=()=>finish(reject,abortError());
        const timer=setTimeout(()=>{void terminate().catch(()=>{});finish(reject,Error('Texterkennung dauert zu lange. Bitte PDF aufteilen und erneut versuchen.'));},90000);
        signal?.addEventListener('abort',abort,{once:true});
        if(signal?.aborted||closed)abort();
        Promise.resolve(promise).then(value=>finish(resolve,value),error=>finish(reject,error));
      });
    }
    async function recognize(image){
      if(signal?.aborted||closed)throw abortError();
      if(!initializing)initializing=(async()=>{
        const implementation=engine || await ensure();
        if(signal?.aborted||closed)throw abortError();
        worker=await implementation.createWorker('deu',1,{
          workerPath:'/vendor/ocr/worker.min.js',corePath:'/vendor/ocr/core',langPath:'/vendor/ocr/lang',
          workerBlobURL:false,cacheMethod:'none',gzip:true,
          logger:message=>{if(!closed&&!signal?.aborted)progress?.(message.status,Math.max(0,Math.min(1,Number(message.progress)||0)));},
          errorHandler:()=>{}
        });
        if(signal?.aborted||closed){await terminate();throw abortError();}
        return worker;
      })();
      const ready=await run(initializing);
      const result=await run(ready.recognize(image));
      if(typeof result?.data?.text!=='string'||!Number.isFinite(result.data.confidence))throw Error('Texterkennung lieferte kein gültiges Ergebnis.');
      return {text:result.data.text.trim(),confidence:Math.max(0,Math.min(100,result.data.confidence))};
    }
    return {recognize,async close(){signal?.removeEventListener('abort',onAbort);await terminate();}};
  }
  const api={ensure,session};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPOcrImport=api;
})(typeof window!=='undefined'?window:globalThis);
