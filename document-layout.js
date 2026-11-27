(function(root){
  'use strict';
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  // Original logo extracted unchanged from DachWerkPro_Briefkopf_Vorlage.pdf, 06.10.2026.
  const logo='/assets/dachwerkpro-original-logo-20261006.png';
  function render({title,body,company={},recordId='',createdAt='',test=true}) {
    const name=company.company || 'DachWerk Pro',person=company.proprietor || 'Stephan Mangel';
    const address=company.address || 'Upsalastraße 48 · 28719 Bremen';
    const website=company.website || 'dachwerkpro.de',email=company.email || 'info@dachwerkpro.de';
    const contacts=[email,company.phone].filter(Boolean).map(esc).join(' · ');
    const date=createdAt?new Date(createdAt).toLocaleDateString('de-DE'):'';
    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(title)}</title><link rel="stylesheet" href="/project-print.css"></head><body data-letterhead="dwp-original-20261006"><header class="dwp-letterhead"><img class="dwp-letterhead-logo" src="${logo}" alt="DachWerkPro by Stephan Mangel"><div class="dwp-letterhead-contact"><strong>${esc(name)}</strong><div>${esc(person)}</div><div class="dwp-letterhead-web">${esc(website)}</div><div>${contacts}</div></div><div class="dwp-sender-line">${esc(name)} · ${esc(address)}</div></header><main class="dwp-document-content">${test?'<p class="test-note">TESTFASSUNG · Keine produktiv freigegebene Geschäftsunterlage</p>':''}${body}<p class="dwp-document-reference">${date?'Erstellt '+esc(date):''}${recordId?' · Vorgangs-ID '+esc(recordId):''}</p></main><footer class="dwp-letterhead-footer">${esc(name)} · ${esc(person)} · ${esc(website)}${contacts?' · '+contacts:''}</footer></body></html>`;
  }
  async function ready(document) {
    await document.fonts?.ready;
    await Promise.all(Array.from(document.images).map(image=>image.complete?(image.naturalWidth?Promise.resolve():Promise.reject(Error('Logo konnte nicht geladen werden.'))):new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Logo konnte nicht geladen werden.'));})));
  }
  const api={render,ready};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPDocument=api;
})(typeof window!=='undefined'?window:globalThis);
