(function registerServerLibrary(){
 'use strict';
 const validModules=new Set(['documents','purchase','orders','offers','correspondence','invoices','incoming','expert','diary','defects','acceptance']);
 const category={purchase:'Bestellung',orders:'Brief',offers:'Angebot',correspondence:'Brief',invoices:'Rechnung',incoming:'Rechnung',expert:'Gutachten',diary:'Nachweis',defects:'Foto',acceptance:'Nachweis'};
 const cell=value=>{
   const s=String(value??'').replace(/[\u0000-\u001f]+/g,' ').trim();
   // Spreadsheet clients must not execute uploaded document metadata as formulas.
   return '"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';
 };
 function rows(state,{projectId}={}){
   const projects=new Map(state.records.filter(r=>r.module==='projects').map(r=>[r.id,r]));
   const output=[];
   for(const r of state.records){
     if(!r.projectId||!projects.has(r.projectId)||projectId&&r.projectId!==projectId||!validModules.has(r.module))continue;
     const d=r.data||{},p=projects.get(r.projectId);
     for(const file of (r.attachments?.length?r.attachments:[null])){
       output.push({
         date:d.date||r.createdAt?.slice(0,10)||'',documentNumber:d.number||d.reportNumber||d.invoiceNumber||d.orderNumber||r.id.slice(0,8),
         category:r.module==='documents'?(d.category||'Sonstige'):(category[r.module]||'Nachweis'),
         description:d.description||d.title||d.text||d.body||'',
         commission:d.commission||p.data.costCenter||p.data.name||'',project:p.data.name||r.projectId,
         recipient:d.recipient||d.supplier||'',editor:d.editor||r.owner||r.createdBy||'',status:file?.storageId?r.status||'Neu':'Datei fehlt',
         filename:file?.name||'',recordId:r.id,versionOf:d.versionOf||''
       });
     }
   }
   return output.sort((a,b)=>b.date.localeCompare(a.date)||b.recordId.localeCompare(a.recordId));
 }
 function csv(state,options={}){
   const headers=['Datum','Dokumentnummer','Kategorie','Beschreibung','Kommission','Projekt','Empfänger','Bearbeiter','Status','Datei','Vorgang-ID','Vorgängerversion'];
   const fields=['date','documentNumber','category','description','commission','project','recipient','editor','status','filename','recordId','versionOf'];
   return [headers.map(cell).join(';'),...rows(state,options).map(r=>fields.map(k=>cell(r[k])).join(';'))].join('\r\n');
 }
 async function xlsx(state,options={}){
   const ExcelJS=require('exceljs'),book=new ExcelJS.Workbook();
   book.creator='DachWerkPro';
   const sheet=book.addWorksheet('Schriftverkehr',{views:[{state:'frozen',ySplit:1}]});
   const columns=[
     ['Datum','date',13],['Dokumentnummer','documentNumber',27],['Kategorie','category',17],
     ['Beschreibung','description',45],['Kommission','commission',24],['Projekt','project',28],
     ['Empfänger','recipient',24],['Bearbeiter','editor',24],['Status','status',24],
     ['Datei','filename',34],['Vorgang-ID','recordId',38],['Vorgängerversion','versionOf',38]
   ];
   sheet.columns=columns.map(([header,key,width])=>({header,key,width}));
   for(const r of rows(state,options)){
     // Literal strings are stored as strings, never evaluated as Excel formulas.
     sheet.addRow(Object.fromEntries(columns.map(([,key])=>[key,String(r[key]??'')])));
   }
   sheet.getRow(1).font={bold:true};
   sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE5E7EB'}};
   sheet.autoFilter={from:'A1',to:'L1'};
   const buffer=await book.xlsx.writeBuffer();
   return {name:'DWP_Modul37_Register.xlsx',type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base64:Buffer.from(buffer).toString('base64')};
 }
 module.exports={rows,csv,cell,xlsx};
})();
