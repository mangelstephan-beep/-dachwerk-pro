(function(root){
  'use strict';
  // DachWerkPro-Briefpapier nach der freigegebenen Layout-Masterreferenz
  // „Schlussrechnung Rottmann/Tittmoning R-101126/001“ (10.11.2026):
  // Logo links, Titelblock + Barcode rechts, rote Kopflinie, Absenderzeile, Adressfeld, Infoblock rechts,
  // Unterschrift, QR-Dokumentcode, rote Fußlinie, dreispaltige Fußzeile mit DGuSV-Siegel, Seitenzahl.
  const LETTERHEAD='dwp-master-rottmann-20261110';
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  // Logo unverändert aus der Masterreferenz entnommen.
  const logo='/assets/dachwerkpro-logo-briefkopf-20261110.png';
  const lines=v=>String(v??'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const safeImage=v=>/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(String(v||''))?v:'';
  const codes=()=>root.DWPCodes || (typeof require==='function'?(()=>{try{return require('./dwp-codes.js');}catch{return null;}})():null);
  const ascii=v=>String(v??'').normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss').replace(/[^\x20-\x7e]/g,'-');
  const DEFAULTS={
    letterheadLines:'Dachdeckermeister – Sachverständiger\nGebäudeenergieberater – Objektbegleitung',
    footerQualifications:'Dachdeckermeister\nObjektbetreuung · Begutachtung\nSachverständiger nach DGuSV\nNr. #DE / 13929\nEEE - Energieeffizienz-Experte',
    signatureLine:'Stephan Mangel · Dachdeckermeister · Sachverständiger (DGuSV) · EEE'
  };
  function companyView(company={}) {
    const name=company.company || 'DachWerk Pro',person=company.proprietor || 'Stephan Mangel';
    const address=company.address || 'Upsalastraße 48 · 28719 Bremen';
    const addressLines=lines(String(address).replace(/\s*·\s*/g,'\n'));
    const small=company.smallBusiness===true;
    const headerLines=lines(company.letterheadLines ?? DEFAULTS.letterheadLines);
    if(small && !headerLines.some(l=>/§\s*19/.test(l)))headerLines.push('Kleingewerbe nach § 19');
    return {name,person,address,addressLines,small,headerLines,
      email:company.email || 'info@dachwerkpro.de',phone:company.phone || '',website:company.website || 'dachwerkpro.de',
      qualifications:lines(company.footerQualifications ?? DEFAULTS.footerQualifications),
      signatureLine:company.signatureLine ?? DEFAULTS.signatureLine,
      iban:company.iban || '',bic:company.bic || '',bank:company.bankName || '',taxNumber:company.taxNumber || '',vatId:company.vatId || '',
      senderLine:company.senderLine || `${company.senderTitle || 'Dachdeckermeister'} ${person} · ${addressLines.join(' · ')}`};
  }
  // doc (optional, für Angebote/AB/Rechnungen): {heading,project,numberLabel,number,dateLabel,date,refs:[[label,value]],recipient:[...],codeText}
  function render({title,body,company={},recordId='',createdAt='',test=true,doc=null,images={}}) {
    const c=companyView(company),date=createdAt?new Date(createdAt).toLocaleDateString('de-DE'):'';
    const k=codes(),number=doc?.number || '';
    let barcode='';try{if(k && number)barcode=`<div class="dwp-barcode-box">${k.code128Svg(ascii(number))}<div class="dwp-barcode-text">${esc(number)}</div></div>`;}catch{barcode='';}
    let qr='';try{if(k && number){const text=doc.codeText || ['DWP',number,doc.project || '',doc.date || date].map(v=>String(v).replace(/\|/g,'/').slice(0,60)).join('|');qr=`<div class="dwp-qr-box">${k.qrSvg(text)}<div class="dwp-qr-text">DWP Dokumentcode</div></div>`;}}catch{qr='';}
    const signature=safeImage(images.signature),seal=safeImage(images.seal);
    const header=`<header class="dwp-letterhead"><img class="dwp-letterhead-logo" src="${logo}" alt="DachWerkPro by Stephan Mangel"><div class="dwp-letterhead-title"><strong>${esc(c.person)}</strong>${c.headerLines.map(l=>`<div>${esc(l)}</div>`).join('')}</div>${barcode}<div class="dwp-letterhead-rule"></div></header>`;
    const bank=[c.iban?'IBAN: '+c.iban:'',c.bic?'BIC: '+c.bic:'',c.bank,c.taxNumber?'Steuernummer '+c.taxNumber:'',c.vatId?'USt-IdNr. '+c.vatId:'',c.small?'§19 Kleingewerbe Umsatzsteuerfrei':''].filter(Boolean);
    const footer=`<footer class="dwp-letterhead-footer"><div class="dwp-footer-rule"></div><div class="dwp-footer-cols"><div><strong>${esc(c.person)} · ${esc(c.name)}</strong>${c.qualifications.map(l=>`<div>${esc(l)}</div>`).join('')}</div><div><strong>Kontakt</strong>${c.addressLines.map(l=>`<div>${esc(l)}</div>`).join('')}<div>${esc(c.email)}</div>${c.phone?`<div>${esc(c.phone)}</div>`:''}</div><div><strong>Bankverbindung</strong>${bank.map(l=>`<div>${esc(l)}</div>`).join('') || '<div>—</div>'}</div>${seal?`<img class="dwp-seal" src="${seal}" alt="DGuSV-Siegel">`:'<div class="dwp-seal"></div>'}</div></footer>`;
    const address=doc?`<section class="dwp-address-row"><div class="dwp-address"><div class="dwp-sender-line">${esc(c.senderLine)}</div>${(doc.recipient || []).map(l=>`<div>${esc(l)}</div>`).join('')}</div><div class="dwp-meta">${doc.project?`<div class="dwp-meta-project">${esc(doc.project)}</div>`:''}<div class="dwp-meta-number">${esc(doc.numberLabel || 'Nr.')}: ${esc(number)}</div>${doc.dateLabel?`<div>${esc(doc.dateLabel)}: ${esc(doc.date || date)}</div>`:''}${(doc.refs || []).filter(([,v])=>v).map(([l,v])=>`<div>${esc(l)}: ${esc(v)}</div>`).join('')}</div></section><h1 class="dwp-doc-title">${esc(doc.heading || title)}</h1>`:'';
    const closing=doc?`<section class="dwp-closing"><div class="dwp-signature">${signature?`<img class="dwp-signature-scan" src="${signature}" alt="Unterschrift">`:'<div class="dwp-signature-space"></div>'}<div class="dwp-signature-line">${esc(c.signatureLine)}</div></div>${qr}</section>`:'';
    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(title)}</title><link rel="stylesheet" href="/project-print.css"></head><body data-letterhead="${LETTERHEAD}">${header}${footer}<table class="dwp-page-frame" role="presentation"><thead><tr><td><div class="dwp-head-space"></div></td></tr></thead><tfoot><tr><td><div class="dwp-foot-space"></div></td></tr></tfoot><tbody><tr><td><main class="dwp-document-content">${test?'<p class="test-note">TESTFASSUNG · Keine produktiv freigegebene Geschäftsunterlage</p>':''}${address}${body}${closing}<p class="dwp-document-reference">${date?'Erstellt '+esc(date):''}${recordId?' · Vorgangs-ID '+esc(recordId):''}</p></main></td></tr></tbody></table></body></html>`;
  }
  // Bausteine für Angebote, Auftragsbestätigungen und Rechnungen im Masterlayout.
  const eur=n=>Number(n || 0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  const qtyText=(q,u)=>`${Number(q ?? 0).toLocaleString('de-DE',{maximumFractionDigits:3})} ${u || ''}`.trim();
  function itemsTable(positions=[],{caption=''}={}) {
    return `${caption?`<h2>${esc(caption)}</h2>`:''}<table class="dwp-items"><thead><tr><th class="dwp-pos">Pos.</th><th>Leistungsbeschreibung</th><th class="num">Menge</th><th class="num">EP</th><th class="num">Gesamt</th></tr></thead><tbody>${positions.map(p=>`<tr><td class="dwp-pos">${esc(p.number)}</td><td>${esc(p.text)}${p.groupPath?`<span class="dwp-group">${esc(p.groupPath)}</span>`:''}${p.note?`<span class="dwp-group">${esc(p.note)}</span>`:''}</td><td class="num">${esc(qtyText(p.qty,p.unit))}</td><td class="num">${esc(eur(p.ep))}</td><td class="num">${esc(p.gpText || eur(p.gp))}</td></tr>`).join('')}</tbody></table>`;
  }
  function totalsBlock(rows=[],bar=null) {
    return `<div class="dwp-totals">${rows.map(([label,value,kind])=>kind==='sub'?`<div class="dwp-total-sub">${esc(label)}</div>`:`<div class="dwp-total-row${kind==='strong'?' strong':''}"><span>${esc(label)}</span><span class="num">${esc(value)}</span></div>`).join('')}</div>${bar?`<div class="dwp-total-bar"><span>${esc(bar[0])}</span><span class="num">${esc(bar[1])}</span></div>`:''}`;
  }
  function notesBlock(items=[]) {
    const parts=items.filter(i=>i && (i.text || i.heading));
    return parts.length?`<section class="dwp-notes">${parts.map(i=>`${i.heading?`<h2>${esc(i.heading)}</h2>`:''}${i.text?`<p class="${i.tax?'dwp-tax-note':''}">${esc(i.text)}</p>`:''}`).join('')}</section>`:'';
  }
  function paymentBlock({company={},number='',text=''}={}) {
    const c=companyView(company);if(!c.iban)return '';
    return `<section class="dwp-payment"><p>${esc(text || company.paymentNote || 'Bitte zahlen Sie nach Rechnungserhalt ohne Abzug.')}</p><p>Empfänger: ${esc(c.person)} · IBAN: ${esc(c.iban)}${c.bic?' · BIC: '+esc(c.bic):''}</p><p>Verwendungszweck: ${esc(number)}</p></section>`;
  }
  async function ready(document) {
    await document.fonts?.ready;
    await Promise.all(Array.from(document.images).map(image=>image.complete?(image.naturalWidth?Promise.resolve():Promise.reject(Error('Logo konnte nicht geladen werden.'))):new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Logo konnte nicht geladen werden.'));})));
  }
  const api={render,ready,companyView,itemsTable,totalsBlock,notesBlock,paymentBlock,eur,LETTERHEAD,DEFAULTS};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPDocument=api;
})(typeof window!=='undefined'?window:globalThis);
