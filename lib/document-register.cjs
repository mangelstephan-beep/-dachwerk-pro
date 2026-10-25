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
 module.exports={rows,csv,cell};
})();
