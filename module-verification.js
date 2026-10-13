(function(root){
 const modules={
  customers:{verified:true,checkedAt:'2026-10-13',evidence:'test-customer-project-access.cjs + Live-HTTP: Kontakte, Angebotsfassung, Speicherung und Wiederabruf'},
  projects:{verified:true,checkedAt:'2026-10-13',evidence:'test-customer-project-access.cjs + Live-HTTP: Mitgliedschaften, Fremdzugriff 403, Kostenstelle und Dokumentationsverknüpfung'}
 };
 const api={modules,isVerified:id=>modules[id]?.verified===true};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPVerification=api;
})(typeof window!=='undefined'?window:globalThis);
