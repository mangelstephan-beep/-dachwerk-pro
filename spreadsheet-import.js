(function(root){
 'use strict';
 const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 const tags=(node,name)=>Array.from(node.getElementsByTagNameNS(NS,name));
 const text=(node,name)=>tags(node,name)[0]?.textContent || '';
 function zipBounds(bytes){
  if(bytes.length<22 || bytes.length>1_000_000)throw Error('Excel: XLSX-Datei bis 1 MB erforderlich.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50 && i+22+view.getUint16(i+20,true)===bytes.length){end=i;break;}
  if(end<0 || view.getUint16(end+4,true)!==0 || view.getUint16(end+6,true)!==0)throw Error('Excel: Ungültiges oder mehrteiliges ZIP-Archiv.');
  const count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),start=view.getUint32(end+16,true);
  if(count<1 || count>300 || start+size!==end)throw Error('Excel: Archivstruktur oder Dateianzahl nicht unterstützt.');
  let at=start,total=0;const names=new Set();
  for(let i=0;i<count;i++){
   if(at+46>end || view.getUint32(at,true)!==0x02014b50)throw Error('Excel: ZIP-Verzeichnis fehlerhaft.');
   const flags=view.getUint16(at+8,true),method=view.getUint16(at+10,true),length=view.getUint32(at+24,true),n=view.getUint16(at+28,true),extra=view.getUint16(at+30,true),comment=view.getUint16(at+32,true);
   if(at+46+n+extra+comment>end || flags&1 || ![0,8].includes(method) || length>5_000_000 || (total+=length)>12_000_000)throw Error('Excel: Archiv zu groß, verschlüsselt oder nicht unterstützt.');
   const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(at+46,at+46+n));
   if(names.has(name) || name.includes('..') || name.startsWith('/') || name.includes('\\'))throw Error('Excel: Ungültiger oder doppelter Archivpfad.');names.add(name);
   at+=46+n+extra+comment;
  }
  if(at!==end)throw Error('Excel: ZIP-Verzeichnis unvollständig.');
 }
 function parse(input,{unzip=root.fflate?.unzipSync,Parser=root.DOMParser}={}){
  const bytes=new Uint8Array(input);zipBounds(bytes);
  if(!unzip || !Parser)throw Error('Excel: Lokaler Parser fehlt. Anwendung neu laden.');
  let files;try{files=unzip(bytes);}catch{throw Error('Excel: XLSX-Archiv kann nicht gelesen werden.');}
  function xml(path,optional=false){
   const data=files[path];if(!data){if(optional)return null;throw Error('Excel: '+path+' fehlt.');}
   const value=new TextDecoder('utf-8',{fatal:true}).decode(data);
   if(/<!DOCTYPE|<!ENTITY/i.test(value))throw Error('Excel: DTD/Entitäten nicht unterstützt.');
   const doc=new Parser().parseFromString(value,'application/xml');
   if(doc.getElementsByTagNameNS('*','parsererror').length)throw Error('Excel: XML-Teil fehlerhaft.');return doc;
  }
  const wb=xml('xl/workbook.xml'),rels=xml('xl/_rels/workbook.xml.rels');
  if(wb.documentElement.namespaceURI!==NS)throw Error('Excel: Dieses XLSX-Schema ist nicht unterstützt.');
  const strings=xml('xl/sharedStrings.xml',true),shared=strings?tags(strings,'si').map(si=>tags(si,'t').map(t=>t.textContent).join('')):[];
  const styles=xml('xl/styles.xml',true),formats=new Map(styles?tags(styles,'numFmt').map(n=>[Number(n.getAttribute('numFmtId')),n.getAttribute('formatCode')]):[]);
  const styleIds=styles?Array.from(tags(styles,'cellXfs')[0]?.children || []).map(x=>Number(x.getAttribute('numFmtId'))):[];
  let cells=0;
  const sheets=tags(wb,'sheet').map(sheet=>{
   const relationship=Array.from(rels.getElementsByTagNameNS('*','Relationship')).find(r=>r.getAttribute('Id')===sheet.getAttributeNS(REL,'id'));
   if(!relationship || relationship.getAttribute('TargetMode')==='External')throw Error('Excel: Blattbezug fehlt oder ist extern.');
   const target=relationship.getAttribute('Target'),path=target?.startsWith('/')?target.slice(1):'xl/'+target;
   if(!path || path.includes('..') || !/^xl\/worksheets\/[^/]+\.xml$/.test(path))throw Error('Excel: Blattpfad nicht unterstützt.');
   const doc=xml(path),merged=tags(doc,'mergeCell').map(n=>n.getAttribute('ref'));
   const hiddenColumns=tags(doc,'col').filter(c=>c.getAttribute('hidden')==='1').map(c=>[Number(c.getAttribute('min')),Number(c.getAttribute('max'))]);
   const rows=tags(doc,'row').map(row=>{
    const index=Number(row.getAttribute('r'));if(!Number.isInteger(index) || index<1 || index>10000)throw Error('Excel: Höchstens 10000 Blattzeilen unterstützt.');
    const values=[];
    for(const cell of tags(row,'c')){
     if(++cells>100000)throw Error('Excel: Höchstens 100000 Zellen unterstützt.');
     const address=cell.getAttribute('r'),match=address?.match(/^([A-Z]+)(\d+)$/);if(!match || Number(match[2])!==index)throw Error('Excel: Zelladresse ungültig.');
     const column=Array.from(match[1]).reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);if(column>80)throw Error('Excel: Höchstens 80 Spalten unterstützt.');
     let value=text(cell,'v'),issue='',formula=tags(cell,'f')[0];
     const type=cell.getAttribute('t'),style=styleIds[Number(cell.getAttribute('s') || 0)],fmt=formats.get(style);
     if(type==='s'){const id=Number(value);if(!Number.isInteger(id) || !shared[id] && shared[id]!=='')throw Error('Excel: Textbezug ungültig.');value=shared[id];}
     else if(type==='inlineStr')value=tags(cell,'t').map(n=>n.textContent).join('');
     else if(type==='e')issue='Excel-Fehler '+value;
     else if(type==='b' || type==='d')issue='Nicht passende Zellart '+type;
     else if(!type || type==='n'){
      if(value!=='' && !Number.isFinite(Number(value)))issue='Ungültige Zahl';
      else if(value!=='')value=Number(value);
      if(style>=14 && style<=22 || fmt && /[ymdh]/i.test(fmt.replace(/"[^"]*"/g,'')))issue='Datum/Zeit statt Leistungswert';
      if(typeof value==='number' && Number.isInteger(value) && /^0+$/.test(fmt || '') && fmt.length<=20)value=String(value).padStart(fmt.length,'0');
     }else if(type!=='str')issue='Unbekannte Zellart '+type;
     if(formula){issue='Formel benötigt Prüfung';value='='+formula.textContent;}
     if(hiddenColumns.some(([min,max])=>column>=min && column<=max))issue+=(issue?'; ':'')+'Ausgeblendete Spalte';
     values[column-1]={address,value,issue,formula:formula?.textContent || ''};
    }
    return {index,hidden:row.getAttribute('hidden')==='1',values};
   });
   if(new Set(rows.map(r=>r.index)).size!==rows.length)throw Error('Excel: Doppelte Zeilennummer.');
   return {name:sheet.getAttribute('name'),hidden:sheet.getAttribute('state')==='hidden' || sheet.getAttribute('state')==='veryHidden',rows,merged};
  });
  if(!sheets.length || sheets.length>30)throw Error('Excel: 1 bis 30 Blätter erforderlich.');return {sheets};
 }
 function report(book,sheetIndex,headerRow,mapping){
  const sheet=book.sheets[sheetIndex];if(!sheet)throw Error('Excel: Blatt auswählen.');
  if(!Number.isInteger(headerRow) || !sheet.rows.some(r=>r.index===headerRow))throw Error('Excel: Überschriftenzeile auswählen.');
  const required=['number','text','qty','unit'];if(required.some(k=>!Number.isInteger(mapping[k]) || mapping[k]<0))throw Error('Excel: Position, Leistung, Menge und Einheit zuordnen.');
  const selected=Object.values(mapping).filter(n=>n>=0);if(new Set(selected).size!==selected.length)throw Error('Excel: Jede Spalte nur einem Feld zuordnen.');
  const rows=[],findings=[];
  for(const row of sheet.rows.filter(r=>r.index!==headerRow)){
   if(!row.values.some(c=>c && c.value!==''))continue;
   const candidate={kind:'Hauptleistung'},issues=[];
   for(const [key,column] of Object.entries(mapping))if(column>=0){const cell=row.values[column];candidate[key]=cell?.issue?'':cell?.value ?? '';if(cell?.issue)issues.push(cell.address+': '+cell.issue);
    if(['qty','material','minutes','equipment','subcontract','targetEp','discountPercent'].includes(key) && candidate[key]!==''){
     try {
      const parseNumber=root.DWPProject?.num || (typeof require==='function'?require('./project-core.js').num:null);
      const number=parseNumber(candidate[key]);
      if(number<0 || number>Number.MAX_SAFE_INTEGER/100 || key==='discountPercent' && number>100)throw Error('Zahlenbereich');
     }catch{issues.push(key+': Mengen-/Kostenwert prüfen');candidate[key]='';}
    }
   }
   if(candidate.kind && !['Hauptleistung','Nachtrag','Bedarfsposition','Grundposition','Alternativposition'].includes(candidate.kind)){issues.push('Leistungsart '+candidate.kind+' benötigt Wandlung');candidate.kind='';}
   if(['Grundposition','Alternativposition'].includes(candidate.kind) && !candidate.choiceGroup)issues.push('Wahlgruppe fehlt');
   if(candidate.choiceGroup && !['Grundposition','Alternativposition'].includes(candidate.kind))issues.push('Wahlgruppe passt nicht zur Leistungsart');
   if(mapping.targetEp>=0 && candidate.targetEp!=='')candidate.useTargetPrice=true;
   if(row.index<headerRow)issues.push('Vortext vor Spaltenüberschrift');
   if(/^(?:zwischen|end)?summe\b|^gesamtbetrag\b|^übertrag\b/i.test(String(candidate.text)) || /^(?:zwischen|end)?summe\b/i.test(String(candidate.number)))issues.push('Summen-/Übertragszeile nicht als Leistung addieren');
   for(const key of required)if(candidate[key]==='')issues.push(key+' fehlt');
   if(sheet.hidden || row.hidden)issues.push('Ausgeblendetes Blatt / Zeile');
   if(sheet.merged.some(range=>{const bounds=range.match(/^[A-Z]+(\d+):[A-Z]+(\d+)$/);return bounds && row.index>=Number(bounds[1]) && row.index<=Number(bounds[2]);}))issues.push('Verbundene Zellen');
   const original=row.values.filter(Boolean).map(c=>c.address+': '+String(c.value)).join('\n');
   if(issues.length)findings.push({number:String(candidate.number || sheet.name+' Zeile '+row.index),type:'Excel-Zeile',groupPath:String(candidate.groupPath || ''),text:original,reason:issues.join('; '),suggestion:'Originalzeile prüfen; Formeln durch belegte Mengen-/Kostenwerte wandeln. Hinweis- und Summenzeilen mit dokumentierter Entscheidung ausschließen, damit sie nicht doppelt berechnet werden.',candidate});
   else rows.push(candidate);
   if(rows.length+findings.length>5000)throw Error('Excel: Höchstens 5000 Datenzeilen pro Übernahme.');
  }
  if(!rows.length && !findings.length)throw Error('Excel: Keine Datenzeilen nach Überschrift gefunden.');return {rows,findings};
 }
 const api={parse,report,zipBounds};if(typeof module!=='undefined' && module.exports)module.exports=api;else root.DWPSpreadsheetImport=api;
})(typeof window!=='undefined'?window:globalThis);
