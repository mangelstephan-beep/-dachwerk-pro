(function(root){
 'use strict';
 const fields=[['article','Artikelnummer'],['name','Artikelbezeichnung'],['unit','Mengeneinheit'],['price','Einkaufspreis netto'],['manufacturer','Hersteller'],['supplier','Lieferant'],['validUntil','Preisbindung (JJJJ-MM-TT)'],['priceQuantity','Preismenge (z. B. 100)']];
 function report(book,sheetIndex,header,mapping){
  const sheet=book?.sheets?.[sheetIndex];
  if(!sheet || !Number.isInteger(header) || !sheet.rows.some(r=>r.index===header))throw Error('Preisliste: Arbeitsblatt und Überschriftenzeile auswählen.');
  const required=['article','name','unit','price'];
  if(required.some(k=>!Number.isInteger(mapping[k]) || mapping[k]<0))throw Error('Preisliste: Artikelnummer, Bezeichnung, Einheit und Einkaufspreis zuordnen.');
  const selected=Object.values(mapping).filter(n=>n>=0);
  if(selected.some(n=>!Number.isInteger(n)||n>=80) || new Set(selected).size!==selected.length)throw Error('Preisliste: Jede Spalte nur einem Feld zuordnen.');
  const rows=[],findings=[];
  const num=root.DWPProject?.num || (typeof require==='function'?require('./project-core.js').num:null);
  for(const row of sheet.rows){
   if(row.index===header || !row.values.some(c=>c && c.value!==''))continue;
   const candidate={},issues=[];
   if(row.index<header)issues.push('Vortext vor Überschrift: Blatt bereinigen');
   if(sheet.hidden || row.hidden)issues.push('Ausgeblendetes Blatt oder Zeile');
   if(sheet.merged.some(range=>{const m=range.match(/^[A-Z]+(\d+):[A-Z]+(\d+)$/);return m && row.index>=Number(m[1]) && row.index<=Number(m[2]);}))issues.push('Verbundene Zellen');
   for(const [key] of fields)if(mapping[key]>=0){const cell=row.values[mapping[key]];candidate[key]=cell?.value ?? '';if(cell?.issue)issues.push((cell.address || key)+': '+cell.issue);}
   for(const key of required)if(candidate[key]===undefined || String(candidate[key]).trim()==='')issues.push(key+' fehlt');
   if(/^(?:zwischen|end)?summe\b|^gesamt(?:betrag|preis)?\b|^übertrag\b/i.test(String(candidate.name)))issues.push('Summen-/Übertragszeile');
   try{
    const price=num(candidate.price),quantity=mapping.priceQuantity>=0?num(candidate.priceQuantity):1;
    if(price<0 || price>Number.MAX_SAFE_INTEGER/100 || quantity<=0 || quantity>1e9)throw Error('Zahlenbereich');
    const normalized=price/quantity;if(!Number.isFinite(normalized)||normalized>Number.MAX_SAFE_INTEGER/100)throw Error('Zahlenbereich');
    candidate.price=Math.round((normalized+Number.EPSILON)*100)/100;
   }catch{issues.push('Preis oder Preismenge ungültig');}
   delete candidate.priceQuantity;
   for(const key of ['article','name','unit','manufacturer','supplier','validUntil'])if(candidate[key]!==undefined)candidate[key]=String(candidate[key]).trim();
   if(issues.length)findings.push({line:row.index,reason:issues.join('; ')});else rows.push(candidate);
   if(rows.length+findings.length>5000)throw Error('Preisliste: Höchstens 5000 Datenzeilen.');
  }
  if(!rows.length && !findings.length)throw Error('Preisliste: Keine Artikeldaten.');
  return {rows,findings};
 }
 const api={fields,report};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPPriceImport=api;
})(typeof window!=='undefined'?window:globalThis);
