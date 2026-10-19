'use strict';
importScripts('/vendor/xls/xlsx.full.min.js','/xls-import.js');
self.onmessage=event=>{
 try{self.postMessage({book:self.DWPXlsImport.parse(event.data.bytes,{engine:self.XLSX})});}
 catch(error){self.postMessage({error:error.message || 'XLS-Datei kann nicht gelesen werden.'});}
};
