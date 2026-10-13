(function(root){
 const modules={
  operating:{verified:true,checkedAt:'2026-10-13',evidence:'test-operating-capacity.cjs + Live-HTTP: 3096 Produktivstunden, Kostensatz 100, AGK 0, Angebotswert 275 und Wiederabruf'},
  customers:{verified:true,checkedAt:'2026-10-13',evidence:'test-customer-project-access.cjs + Live-HTTP: Kontakte, Angebotsfassung, Speicherung und Wiederabruf'},
  projects:{verified:true,checkedAt:'2026-10-13',evidence:'test-customer-project-access.cjs + Live-HTTP: Mitgliedschaften, Fremdzugriff 403, Kostenstelle und Dokumentationsverknüpfung'}
 };
 const api={modules,isVerified:id=>modules[id]?.verified===true};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPVerification=api;
})(typeof window!=='undefined'?window:globalThis);
