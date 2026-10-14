(function(root){
 const modules={
  operating:{verified:true,checkedAt:'2026-10-13',evidence:'test-operating-capacity.cjs + Live-HTTP: 3096 Produktivstunden, Kostensatz 100, AGK 0, Angebotswert 275 und Wiederabruf'},
  customers:{verified:false,checkedAt:'2026-10-14',evidence:'Freigabe zurückgezogen: Nutzer meldet nicht funktionierende Projektauswahl und Anlage. Erneute Prüfung im iPhone-Browser und Produktion erforderlich.'},
  projects:{verified:false,checkedAt:'2026-10-14',evidence:'Freigabe zurückgezogen: Nutzer meldet nicht funktionierende Projektauswahl und Anlage. Erneute Prüfung im iPhone-Browser und Produktion erforderlich.'}
 };
 const api={modules,isVerified:id=>modules[id]?.verified===true};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPVerification=api;
})(typeof window!=='undefined'?window:globalThis);

