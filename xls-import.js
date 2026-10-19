(function(root){
 'use strict';
 function parse(input,{engine=root.XLSX}={}){
  const bytes=new Uint8Array(input);
  if(bytes.length<512||bytes.length>1_000_000)throw Error('XLS: Excel-97–2003-Datei bis 1 MB erforderlich.');
  const signature=[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1];
  if(!signature.every((n,i)=>bytes[i]===n))throw Error('XLS: Nur binäres Excel 97–2003 (BIFF8) unterstützt. Bitte sonst als XLSX speichern.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),shift=view.getUint16(30,true);
  if(view.getUint16(28,true)!==0xfffe||![9,12].includes(shift)||view.getUint16(32,true)!==6)throw Error('XLS: Containerformat ungültig.');
  const sectors=Math.ceil(bytes.length/2**shift);
  for(const offset of [40,44,64,72])if(view.getUint32(offset,true)>sectors)throw Error('XLS: Containergrenzen überschritten.');
  if(!engine?.CFB?.read||!engine.read)throw Error('XLS: Parser fehlt. Bitte Anwendung neu laden.');
  let container;
  try{container=engine.CFB.read(bytes,{type:'array'});}catch{throw Error('XLS: Dateicontainer beschädigt.');}
  if(!Array.isArray(container?.FullPaths)||!Array.isArray(container?.FileIndex))throw Error('XLS: Dateicontainer beschädigt.');
  if(container.FullPaths.some(p=>/(?:^|\/)(?:VBA|_VBA_PROJECT_CUR|Macros)(?:\/|$)/i.test(p)))throw Error('XLS: Makrodateien werden nicht übernommen. Bitte makrofreie XLSX-Datei verwenden.');
  const streams=container.FileIndex.filter(f=>f.type===2&&/^(Workbook|Book)$/i.test(f.name));
  if(streams.length!==1)throw Error('XLS: Eindeutiger Workbook-Datenstrom fehlt.');
  const data=new Uint8Array(streams[0].content),records=new DataView(data.buffer,data.byteOffset,data.byteLength);
  if(data.length<8||records.getUint16(0,true)!==0x0809||records.getUint16(4,true)!==0x0600||records.getUint16(6,true)!==5)throw Error('XLS: Nur BIFF8 (Excel 97–2003) unterstützt. Ältere Dateien vorher als XLSX speichern.');
  for(let offset=0,count=0;offset<data.length;){
   if(data[offset]===0&&data.subarray(offset).every(n=>n===0))break;
   if(offset+4>data.length)throw Error('XLS: Unvollständiger Datensatz.');
   const id=records.getUint16(offset,true),length=records.getUint16(offset+2,true);
   if(++count>100000||offset+4+length>data.length)throw Error('XLS: Ungültige Datensatzgrenze.');
   if(id===0x002f)throw Error('XLS: Verschlüsselte Dateien werden nicht übernommen.');
   offset+=4+length;
  }
  let workbook;
  try{workbook=engine.read(bytes,{type:'array',cellFormula:true,cellNF:true,cellStyles:true,cellDates:false,cellHTML:false,cellText:false,bookVBA:true,xlfn:true,WTF:true});}
  catch{throw Error('XLS: Datei beschädigt oder nicht unterstützt. Bitte als XLSX speichern.');}
  if(workbook.vbaraw)throw Error('XLS: Makrodateien werden nicht übernommen.');
  if(!workbook.SheetNames.length||workbook.SheetNames.length>30)throw Error('XLS: 1 bis 30 Blätter erforderlich.');
  let cells=0;
  const sheets=workbook.SheetNames.map((name,sheetIndex)=>{
   const ws=Object.hasOwn(workbook.Sheets,name)?workbook.Sheets[name]:null;
   if(!ws||ws['!type']&&ws['!type']!=='sheet')throw Error('XLS: Nur normale Tabellenblätter unterstützt.');
   const rows=new Map();
   for(const address of Object.keys(ws).filter(k=>!k.startsWith('!'))){
    if(++cells>100000)throw Error('XLS: Höchstens 100000 Zellen unterstützt.');
    const point=engine.utils.decode_cell(address),cell=ws[address];
    if(point.r<0||point.r>=10000||point.c<0||point.c>=80)throw Error('XLS: Höchstens 10000 Zeilen und 80 Spalten unterstützt.');
    let value=cell.v ?? '',issue='',formula='';
    if(cell.f!==undefined||cell.F){formula=String(cell.f || cell.F);value='='+formula;issue='Formel benötigt Prüfung';}
    else if(cell.t==='e'){value=String(cell.w || cell.v || '');issue='Excel-Fehler';}
    else if(!['s','str','n','z'].includes(cell.t)){value=String(value);issue='Nicht passende Zellart '+cell.t;}
    else if(cell.t==='n'){
     if(typeof value!=='number'||!Number.isFinite(value))issue='Ungültige Zahl';
     if(engine.SSF.is_date(cell.z || ''))issue='Datum/Zeit statt Leistungswert';
     if(Number.isInteger(value)&&/^0+$/.test(cell.z || '')&&cell.z.length<=20)value=String(value).padStart(cell.z.length,'0');
    }
    if(ws['!cols']?.[point.c]?.hidden)issue+=(issue?'; ':'')+'Ausgeblendete Spalte';
    if(typeof value!=='string'&&typeof value!=='number')throw Error('XLS: Zellinhalt nicht unterstützt.');
    if(String(value).length>32767)throw Error('XLS: Zelltext zu lang.');
    const index=point.r+1,row=rows.get(index)||{index,hidden:Boolean(ws['!rows']?.[point.r]?.hidden),values:[]};
    row.values[point.c]={address,value,issue,formula};rows.set(index,row);
   }
   return {name,hidden:Boolean(workbook.Workbook?.Sheets?.[sheetIndex]?.Hidden),rows:[...rows.values()].sort((a,b)=>a.index-b.index),merged:(ws['!merges'] || []).map(range=>engine.utils.encode_range(range))};
  });
  return {sourceFormat:'XLS BIFF8',sheets};
 }
 function read(input,{signal,workerFactory=()=>new root.Worker('/xls-import-worker.js')}={}){
  return new Promise((resolve,reject)=>{
   const bytes=new Uint8Array(input);
   if(bytes.length<512||bytes.length>1_000_000){reject(Error('XLS: Excel-97–2003-Datei bis 1 MB erforderlich.'));return;}
   if(signal?.aborted){const e=Error('XLS-Einlesen abgebrochen.');e.name='AbortError';reject(e);return;}
   let worker,settled=false;
   const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker?.terminate();error?reject(error):resolve(result);};
   const abort=()=>{const e=Error('XLS-Einlesen abgebrochen.');e.name='AbortError';finish(e);};
   const timer=setTimeout(()=>finish(Error('XLS-Verarbeitung dauert zu lange. Bitte Datei verkleinern oder als XLSX speichern.')),15000);
   signal?.addEventListener('abort',abort,{once:true});
   try{
    worker=workerFactory();
    worker.onmessage=event=>event.data?.error?finish(Error(event.data.error)):event.data?.book?.sourceFormat==='XLS BIFF8'?finish(null,event.data.book):finish(Error('XLS: Parser-Ergebnis ungültig.'));
    worker.onerror=()=>finish(Error('XLS-Modul konnte nicht verarbeitet werden. Bitte neu versuchen.'));
    worker.postMessage({bytes});
   }catch(error){finish(error);}
  });
 }
 const api={parse,read};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPXlsImport=api;
})(typeof window!=='undefined'?window:globalThis);
