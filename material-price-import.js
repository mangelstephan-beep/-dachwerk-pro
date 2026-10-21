(function(root){
  'use strict';
  const fields={name:'Artikelbezeichnung',article:'Artikelnummer',manufacturer:'Hersteller',supplier:'Lieferant',unit:'Artikeleinheit',price:'Nettopreis vor Rabatt',discount:'Rabatt %',freight:'Fracht je Preisgebinde',baseQuantity:'Artikeleinheiten je Preisgebinde',validUntil:'Preisbindung bis (JJJJ-MM-TT)',system:'System',documentUrl:'Herstellerunterlage',documentEdition:'Unterlagenstand',compatibility:'Systemverträglichkeit',compatibilityEvidence:'Eignungsnachweis'};
  const aliases={name:['name','bezeichnung','artikelbezeichnung','kurztext'],article:['article','artikelnummer','artikelnr','artnr'],manufacturer:['manufacturer','hersteller'],supplier:['supplier','lieferant','handler','haendler'],unit:['unit','einheit','me','artikeleinheit'],price:['price','preis','ek','nettopreis','einkaufspreis','listenpreis'],discount:['discount','rabatt'],freight:['freight','fracht'],baseQuantity:['basequantity','gebindeinhalt','preisbezugsmenge','artikeleinheitenjepreisgebinde'],validUntil:['validuntil','preisbindungbis'],system:['system'],documentUrl:['documenturl'],documentEdition:['documentedition'],compatibility:['compatibility'],compatibilityEvidence:['compatibilityevidence']};
  const normalize=value=>String(value).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  function suggest(header){
    return Object.fromEntries(Object.keys(fields).map(key=>{const matches=header.map((c,i)=>aliases[key].includes(normalize(c?.value ?? ''))?i:-1).filter(i=>i>=0);return [key,matches.length===1?matches[0]:-1];}));
  }
  function csv(text){
    if(typeof text!=='string' || text.length>1_000_000)throw Error('Preisliste: CSV bis 1 MB erforderlich.');
    text=text.replace(/^\uFEFF/,'');
    const first=text.split(/\r?\n/)[0],delimiter=first.includes(';')?';':first.includes('\t')?'\t':',';
    const rows=[];let row=[],value='',quoted=false,closed=false;
    const cell=()=>{row.push(value);value='';closed=false;};
    const line=()=>{cell();if(row.length>80)throw Error('Preisliste: Höchstens 80 Spalten.');rows.push({index:rows.length+1,hidden:false,values:row.map((value,i)=>({address:`${i+1}:${rows.length+1}`,value,issue:''}))});row=[];if(rows.length>10000)throw Error('Preisliste: Höchstens 10000 Zeilen.');};
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(ch==='"'){
        if(quoted && text[i+1]==='"'){value+='"';i++;}
        else if(quoted){quoted=false;closed=true;}
        else if(!value && !closed)quoted=true;
        else throw Error('Preisliste: Ungültige CSV-Anführungszeichen.');
      }else if(ch===delimiter && !quoted)cell();
      else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;line();}
      else {if(closed && ch.trim())throw Error('Preisliste: Zeichen nach geschlossenem CSV-Feld.');if(!closed)value+=ch;}
    }
    if(quoted)throw Error('Preisliste: CSV-Anführungszeichen nicht geschlossen.');
    if(value || row.length || closed)line();
    const nonempty=rows.filter(r=>r.values.some(c=>c.value.trim()));
    if(!nonempty.length)throw Error('Preisliste: CSV ist leer.');
    if(nonempty.some(r=>r.values.length!==nonempty[0].values.length))throw Error('Preisliste: CSV-Zeilen haben unterschiedliche Spaltenzahlen.');
    return {sheets:[{name:'CSV',rows,merged:[],hidden:false}]};
  }
  function report(book,sheetIndex,headerRow,mapping,{num,round} = root.DWPProject || {}){
    const sheet=book?.sheets[sheetIndex];
    if(!sheet || !Number.isInteger(headerRow) || !sheet.rows.some(r=>r.index===headerRow))throw Error('Preisliste: Blatt und Überschriftenzeile auswählen.');
    const selected=Object.entries(mapping).filter(([,col])=>col!==-1);
    if(selected.some(([key,col])=>!Object.hasOwn(fields,key)||!Number.isInteger(col)||col<0||col>=80))throw Error('Preisliste: Ungültige Spaltenzuordnung.');
    if(['name','unit','price'].some(key=>!Number.isInteger(mapping[key])||mapping[key]<0))throw Error('Preisliste: Bezeichnung, Einheit und Nettopreis zuordnen.');
    if(new Set(selected.map(([,col])=>col)).size!==selected.length)throw Error('Preisliste: Jede Spalte nur einem Feld zuordnen.');
    const rows=[],findings=[],calculations=[];
    for(const row of sheet.rows.filter(r=>r.index>headerRow)){
      if(!row.values.some(c=>c && String(c.value).trim()!==''))continue;
      const candidate={},issues=[];
      if(sheet.hidden || row.hidden)issues.push('Ausgeblendetes Blatt / Zeile');
      if(sheet.merged.some(range=>{const m=range.match(/^[A-Z]+(\d+):[A-Z]+(\d+)$/);return m && row.index>=+m[1] && row.index<=+m[2];}))issues.push('Verbundene Zellen');
      for(const [key,col] of selected){const cell=row.values[col];candidate[key]=String(cell?.value ?? '').trim();if(cell?.issue || cell?.formula)issues.push(`${cell.address}: ${cell.issue || 'Formel benötigt Prüfung'}`);}
      for(const key of ['name','unit','price'])if(!candidate[key])issues.push(fields[key]+' fehlt');
      try{
        const price=num(candidate.price),discount=num(candidate.discount),freight=num(candidate.freight),baseQuantity=candidate.baseQuantity?num(candidate.baseQuantity):1;
        if(price<0 || freight<0 || discount<0 || discount>100 || baseQuantity<=0)throw Error('Preis, Rabatt, Fracht oder Gebindeinhalt ungültig');
        const effective=round((price*(1-discount/100)+freight)/baseQuantity);
        calculations.push({row:row.index,price,discount,freight,baseQuantity,effective});
        candidate.priceBasis=`Zeile ${row.index}: (${price} EUR × (1 − ${discount} / 100) + ${freight} EUR Fracht) / ${baseQuantity} ${candidate.unit} = ${effective} EUR/${candidate.unit}`;
        candidate.price=effective;delete candidate.discount;delete candidate.freight;delete candidate.baseQuantity;
      }catch(error){issues.push(error.message);}
      if(issues.length)findings.push({row:row.index,reason:[...new Set(issues)].join('; ')});else rows.push(candidate);
      if(rows.length+findings.length>5000)throw Error('Preisliste: Höchstens 5000 Datenzeilen.');
    }
    if(!rows.length && !findings.length)throw Error('Preisliste: Keine Daten nach der Überschriftenzeile.');
    return {rows,findings,calculations};
  }
  const api={fields,suggest,csv,report};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPMaterialPriceImport=api;
})(typeof window!=='undefined'?window:globalThis);
