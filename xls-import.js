(function(root){
 'use strict';
 const OLE=[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1];
 // Excel 2.0/3.0/4.0 speichern Tabellenblätter als einfachen BIFF-Datenstrom ohne OLE-Container.
 const RAW_BOF={0x0009:'BIFF2',0x0209:'BIFF3',0x0409:'BIFF4'};
 function detect(bytes){
  if(bytes.length>=512&&OLE.every((n,i)=>bytes[i]===n))return 'ole';
  if(bytes.length>=8&&RAW_BOF[bytes[0]|bytes[1]<<8]&&(bytes[2]|bytes[3]<<8)>=4&&(bytes[2]|bytes[3]<<8)<=16)return 'raw';
  return null;
 }
 function scan(data,limitMessage){
  const records=new DataView(data.buffer,data.byteOffset,data.byteLength);
  for(let offset=0,count=0;offset<data.length;){
   if(data[offset]===0&&data.subarray(offset).every(n=>n===0))break;
   if(offset+4>data.length)throw Error('XLS: Unvollständiger Datensatz.');
   const id=records.getUint16(offset,true),length=records.getUint16(offset+2,true);
   if(++count>100000||offset+4+length>data.length)throw Error(limitMessage);
   if(id===0x002f)throw Error('XLS: Verschlüsselte Dateien werden nicht übernommen.');
   offset+=4+length;
  }
 }
 function parse(input,{engine=root.XLSX}={}){
  const bytes=new Uint8Array(input);
  if(bytes.length>1_000_000)throw Error('XLS: Excel-Datei bis 1 MB erforderlich.');
  const kind=detect(bytes);
  if(!kind)throw Error('XLS: Kein binäres Excel-Format erkannt (Excel 2.0 bis 2003). Bitte sonst als XLSX speichern.');
  if(!engine?.CFB?.read||!engine.read)throw Error('XLS: Parser fehlt. Bitte Anwendung neu laden.');
  let biff;
  if(kind==='raw'){
   const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
   biff=RAW_BOF[view.getUint16(0,true)];
   const type=view.getUint16(6,true);
   if(type===0x0040)throw Error('XLS: Makrodateien werden nicht übernommen. Bitte makrofreie XLSX-Datei verwenden.');
   if(type!==0x0010)throw Error(`XLS: ${biff} enthält kein normales Tabellenblatt (z. B. Excel-4.0-Arbeitsmappe oder Diagramm). Bitte als XLSX speichern.`);
   scan(bytes,'XLS: Ungültige Datensatzgrenze.');
  }else{
   const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),shift=view.getUint16(30,true);
   if(view.getUint16(28,true)!==0xfffe||![9,12].includes(shift)||view.getUint16(32,true)!==6)throw Error('XLS: Containerformat ungültig.');
   const sectors=Math.ceil(bytes.length/2**shift);
   for(const offset of [40,44,64,72])if(view.getUint32(offset,true)>sectors)throw Error('XLS: Containergrenzen überschritten.');
   let container;
   try{container=engine.CFB.read(bytes,{type:'array'});}catch{throw Error('XLS: Dateicontainer beschädigt.');}
   if(!Array.isArray(container?.FullPaths)||!Array.isArray(container?.FileIndex))throw Error('XLS: Dateicontainer beschädigt.');
   if(container.FullPaths.some(p=>/(?:^|\/)(?:VBA|_VBA_PROJECT_CUR|_VBA_PROJECT|Macros)(?:\/|$)/i.test(p)))throw Error('XLS: Makrodateien werden nicht übernommen. Bitte makrofreie XLSX-Datei verwenden.');
   const streams=container.FileIndex.filter(f=>f.type===2&&/^(Workbook|Book)$/i.test(f.name));
   if(streams.length!==1)throw Error('XLS: Eindeutiger Workbook-Datenstrom fehlt.');
   // Excel 97–2003 schreibt BIFF8 in „Workbook“, Excel 5.0/95 schreibt BIFF5 in „Book“.
   const book=/^Book$/i.test(streams[0].name),data=new Uint8Array(streams[0].content),records=new DataView(data.buffer,data.byteOffset,data.byteLength);
   const version=data.length>=8&&records.getUint16(0,true)===0x0809&&records.getUint16(6,true)===5?records.getUint16(4,true):0;
   if(book?version!==0x0500:version!==0x0600)throw Error(book?'XLS: Datenstrom „Book“ enthält kein gültiges Excel 5.0/95 (BIFF5). Bitte als XLSX speichern.':'XLS: Datenstrom „Workbook“ enthält kein gültiges BIFF8 (Excel 97–2003). Bitte als XLSX speichern.');
   biff=book?'BIFF5':'BIFF8';
   scan(data,'XLS: Ungültige Datensatzgrenze.');
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
  return {sourceFormat:'XLS '+biff,sheets};
 }
 function read(input,{signal,workerFactory=()=>new root.Worker('/xls-import-worker.js')}={}){
  return new Promise((resolve,reject)=>{
   const bytes=new Uint8Array(input);
   if(bytes.length>1_000_000||!detect(bytes)){reject(Error('XLS: Binäre Excel-Datei (Excel 2.0 bis 2003) bis 1 MB erforderlich.'));return;}
   if(signal?.aborted){const e=Error('XLS-Einlesen abgebrochen.');e.name='AbortError';reject(e);return;}
   let worker,settled=false;
   const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker?.terminate();error?reject(error):resolve(result);};
   const abort=()=>{const e=Error('XLS-Einlesen abgebrochen.');e.name='AbortError';finish(e);};
   const timer=setTimeout(()=>finish(Error('XLS-Verarbeitung dauert zu lange. Bitte Datei verkleinern oder als XLSX speichern.')),15000);
   signal?.addEventListener('abort',abort,{once:true});
   try{
    worker=workerFactory();
    worker.onmessage=event=>event.data?.error?finish(Error(event.data.error)):/^XLS BIFF[2-58]$/.test(event.data?.book?.sourceFormat || '')?finish(null,event.data.book):finish(Error('XLS: Parser-Ergebnis ungültig.'));
    worker.onerror=()=>finish(Error('XLS-Modul konnte nicht verarbeitet werden. Bitte neu versuchen.'));
    worker.postMessage({bytes});
   }catch(error){finish(error);}
  });
 }
 const api={parse,read,detect};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPXlsImport=api;
})(typeof window!=='undefined'?window:globalThis);
