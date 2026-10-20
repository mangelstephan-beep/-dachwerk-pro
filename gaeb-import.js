(function(root){
  'use strict';
  const NS='http://www.gaeb.de/GAEB_DA_XML/DA83/3.3';
  const children=(node,name)=>Array.from(node.children || []).filter(n=>n.namespaceURI===NS && (!name || n.localName===name));
  const one=(node,name)=>{const list=children(node,name);if(list.length>1)throw Error(`GAEB: ${name} ist mehrfach vorhanden.`);return list[0];};
  function plain(node) {
    if(!node)return '';
    function walk(n){
      if(n.nodeType===3 || n.nodeType===4)return n.nodeValue;
      if(n.nodeType!==1)return '';
      if(n.localName==='br')return '\n';
      return Array.from(n.childNodes).map(walk).join('')+(['p','div'].includes(n.localName)?'\n':'');
    }
    return walk(node).replace(/[\t ]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  }
  function parse(text,Parser=root.DOMParser,review=false) {
    if(typeof text!=='string' || !text.trim() || text.length>1_000_000)throw Error('GAEB: Bitte eine XML-Datei bis 1 MB wählen.');
    if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('GAEB: DTD und externe Entitäten werden nicht unterstützt.');
    const encoding=text.match(/<\?xml[^?]*encoding\s*=\s*["']([^"']+)["']/i)?.[1];
    if(encoding && !/^utf-?8$/i.test(encoding))throw Error('GAEB: Datei bitte als UTF-8 exportieren.');
    if(text.includes('\uFFFD'))throw Error('GAEB: Zeichencodierung fehlerhaft; bitte als UTF-8 exportieren.');
    if(!Parser)throw Error('GAEB: XML-Parser nicht verfügbar.');
    const doc=new Parser().parseFromString(text,'application/xml'),rootNode=doc.documentElement;
    if(doc.getElementsByTagNameNS('*','parsererror').length)throw Error('GAEB: XML ist nicht wohlgeformt.');
    if(rootNode.localName!=='GAEB' || rootNode.namespaceURI!==NS)throw Error('GAEB: Unterstützt wird X83 / GAEB DA XML 3.3. Andere Austauschphasen bitte getrennt prüfen.');
    const all=Array.from(doc.getElementsByTagName('*'));
    const forbidden=new Set(['Remark','PerfDescr','MarkupItem','TextComplement','SubDescr','SumDescr','QtyTBD','LumpSumItem','RefRNo','RefPerfNo','QtySplit','LotGrp']);
    const special=all.find(n=>n.namespaceURI===NS && forbidden.has(n.localName));
    if(special && !review)throw Error(`GAEB: ${special.localName} benötigt eine gesonderte Prüfung. Es werden keine Positionen übernommen.`);
    const award=one(rootNode,'Award');
    if(!award)throw Error('GAEB: Award fehlt.');
    const phase=plain(one(award,'DP'));
    if(phase && phase!=='83')throw Error('GAEB: Austauschphase stimmt nicht mit X83 überein.');
    const boq=one(award,'BoQ'),body=boq && one(boq,'BoQBody');
    if(!body || children(award,'BoQ').length!==1)throw Error('GAEB: Genau ein Leistungsverzeichnis mit BoQBody erforderlich.');
    if(!review && Array.from(award.children).some(n=>n.namespaceURI!==NS || !['DP','BoQ'].includes(n.localName)))throw Error('GAEB: Weitere Award-Elemente benötigen eine gesonderte Prüfung.');
    const rows=[],findings=[],numbers=new Set();let visitedItems=0;
    function preserve(node,number,groups,reasons) {
      const has=name=>Array.from(node.getElementsByTagNameNS(NS,name)).length>0;
      const qty=plain(one(node,'Qty')),unit=plain(one(node,'QU'));
      let suggestion='Leistungsart, Mengenbasis und Abrechnungsbezug anhand der Originalposition klären; anschließend eine eigene LV-Position mit dokumentierter Wandlung erfassen.';
      if(has('LumpSumItem'))suggestion='Pauschalposition als 1 psch vorschlagen; Leistungsumfang und Pauschalpreis prüfen. Erst nach bestätigter Mengenbasis wandeln.';
      else if(has('QtyTBD'))suggestion='Freie Menge durch Aufmaß oder Mengenermittlung bestimmen; Originaleinheit und Rechenweg dokumentieren. Keine Menge automatisch einsetzen.';
      else if(has('RefRNo') || has('RefPerfNo'))suggestion='Bezugsposition/Ausführungsbeschreibung auflösen und vollständigen Leistungstext zusammensetzen; eigene Menge und Bezug dokumentieren.';
      else if(node.localName==='MarkupItem')suggestion='Zuschlagsbasis aus referenzierten Positionen und Teilmengen ermitteln; Prozentsatz auf die freigegebene Basis anwenden und als gesonderte 1-psch-Position dokumentieren. Noch kein Zuschlagsbetrag berechnet.';
      else if(has('Provis'))suggestion='Bedarfsposition prüfen: ohne Gesamtbetrag als Bedarfsposition; mit Gesamtbetrag nur nach ausdrücklich dokumentierter Einbeziehung in die Hauptsumme wandeln.';
      else if(has('ALNGroupNo') || has('ALNSerNo'))suggestion='Grund-/Alternativposition zuordnen und Auftraggeberauswahl dokumentieren. Nur die gewählte Variante als Hauptleistung wandeln; andere Varianten separat erhalten.';
      else if(node.localName==='Remark' || node.localName==='PerfDescr')suggestion='Als Vertrags-/Ausführungshinweis übernehmen und betroffene Positionen zuordnen. Keine zusätzliche abrechenbare Menge ansetzen.';
      findings.push({number: number || node.getAttribute('ID') || node.localName,type:node.localName,groupPath:groups.join(' / '),text:plain(node),reason:reasons.join(', '),suggestion,
        candidate:{number:number || '',text:plain(one(node,'Description')) || plain(node),qty:/^\d+(?:\.\d+)?$/.test(qty)?Number(qty):'',unit:unit || '',groupPath:groups.join(' / '),kind:has('Provis')?'Bedarfsposition':'Hauptleistung'}});
      if(rows.length+findings.length>5000)throw Error('GAEB: Höchstens 5000 Positionen und Prüfvorgänge unterstützt.');
    }
    function part(node){const value=node.getAttribute('RNoPart');if(!value || !/^[A-Za-z0-9_]{1,14}$/.test(value))throw Error('GAEB: Teil-Positionsnummer RNoPart fehlt oder ist ungültig.');return value;}
    function allowed(node,names){for(const child of Array.from(node.children))if(child.namespaceURI!==NS || !names.includes(child.localName))throw Error(`GAEB: ${child.localName} in ${node.localName} ist noch nicht unterstützt. Es werden keine Positionen übernommen.`);}
    function visit(body,parts,groups) {
      if(!review)allowed(body,['BoQCtgy','Itemlist']);
      for(const node of Array.from(body.children)) {
        if(node.namespaceURI!==NS){if(review){preserve(node,parts.join('.'),groups,[node.localName]);continue;}throw Error('GAEB: Fremdes Element im LV.');}
        if(node.localName==='BoQCtgy') {
          if(groups.length===5)throw Error('GAEB: Höchstens fünf Gliederungsebenen unterstützt.');
          if(!review)allowed(node,['LblTx','BoQBody']);
          const p=part(node);let label=plain(one(node,'LblTx')) || p;
          if(label.includes('/') || (p+' '+label).length>120){
            if(!review)throw Error('GAEB: LV-Titel bitte vor Übernahme prüfen.');
            preserve(one(node,'LblTx') || node,[...parts,p].join('.'),groups,['Titel für die LV-Gliederung normalisiert; vollständiger Originaltitel im Importjournal']);
            label=label.replaceAll('/','∕').slice(0,119-p.length);
          }
          const next=one(node,'BoQBody');if(!next)throw Error('GAEB: LV-Titel ohne BoQBody.');
          if(review)for(const extra of children(node).filter(n=>!['LblTx','BoQBody'].includes(n.localName)))preserve(extra,[...parts,p].join('.'),[...groups,`${p} ${label}`],[extra.localName]);
          visit(next,[...parts,p],[...groups,`${p} ${label}`]);
        } else if(node.localName==='Itemlist') {
          if(!review)allowed(node,['Item']);
          for(const item of Array.from(node.children)) {
            if(item.namespaceURI!==NS || item.localName!=='Item'){
              if(!review)throw Error('GAEB: Fremdes Element in der Positionsliste.');
              preserve(item,[...parts,item.getAttribute('RNoPart') || item.getAttribute('ID') || ''].filter(Boolean).join('.'),groups,[item.localName]);continue;
            }
            visitedItems++;
            const number=[...parts,part(item)].join('.');
            if(numbers.has(number))throw Error(`GAEB: Positionsnummer ${number} doppelt.`);
            numbers.add(number);
            const desc=one(item,'Description'),ct=desc && one(desc,'CompleteText');
            const reasons=[...Array.from(item.children).filter(n=>n.namespaceURI!==NS || !['Qty','QU','Description'].includes(n.localName)).map(n=>n.localName),...Array.from(item.getElementsByTagNameNS(NS,'*')).filter(n=>forbidden.has(n.localName)).map(n=>n.localName),...Array.from(item.attributes).filter(a=>!['ID','RNoPart'].includes(a.name)).map(a=>a.name),...Array.from(desc?.children || []).filter(n=>n.namespaceURI!==NS || n.localName!=='CompleteText').map(n=>n.localName),...Array.from(ct?.children || []).filter(n=>n.namespaceURI!==NS || !['ComplTSA','ComplTSB','DetailTxt','OutlineText'].includes(n.localName)).map(n=>n.localName)];
            if(reasons.length && review){preserve(item,number,groups,[...new Set(reasons)]);continue;}
            allowed(item,['Qty','QU','Description']);
            if(Array.from(item.attributes).some(a=>!['ID','RNoPart'].includes(a.name)))throw Error('GAEB: Zusätzliche Positionsattribute benötigen eine gesonderte Prüfung.');
            const qtyText=plain(one(item,'Qty')),unit=plain(one(item,'QU'));
            if(!/^\d+(?:\.\d+)?$/.test(qtyText) || !Number.isFinite(Number(qtyText)) || Number(qtyText)>Number.MAX_SAFE_INTEGER/100)throw Error(`GAEB: Menge in Position ${number} fehlt oder ist ungültig.`);
            if(!unit)throw Error(`GAEB: Einheit in Position ${number} fehlt.`);
            const description=one(item,'Description');
            const complete=description && one(description,'CompleteText');
            const detail=complete && one(complete,'DetailTxt'),outline=complete && one(complete,'OutlineText');
            if(!complete)throw Error(`GAEB: CompleteText in Position ${number} fehlt.`);
            allowed(description,['CompleteText']);allowed(complete,['ComplTSA','ComplTSB','DetailTxt','OutlineText']);
            const long=plain(detail),short=plain(outline);
            const performance=long && short && long!==short?short+'\n'+long:long || short;
            if(!performance)throw Error(`GAEB: Leistungstext in Position ${number} fehlt.`);
            rows.push({number,text:performance,qty:Number(qtyText),unit:unit.replace(/^m2$/,'m²').replace(/^m3$/,'m³'),groupPath:groups.join(' / '),kind:'Hauptleistung'});
            if(rows.length>5000)throw Error('GAEB: Höchstens 5000 Positionen unterstützt.');
          }
        } else if(review)preserve(node,parts.join('.'),groups,[node.localName]);
      }
    }
    visit(body,[],[]);
    if(visitedItems!==all.filter(n=>n.namespaceURI===NS && n.localName==='Item').length)throw Error('GAEB: Positionen außerhalb der unterstützten LV-Struktur.');
    if(!rows.length && !findings.length)throw Error('GAEB: Keine Leistungspositionen gefunden.');
    if(review) {
      // Keep other BoQ/Award metadata in the original and require review instead of dropping it.
      for(const node of Array.from(award.children).filter(n=>n.namespaceURI!==NS || !['DP','BoQ'].includes(n.localName)))preserve(node,'Award',[],[node.localName]);
      for(const node of children(boq).filter(n=>!['BoQBody','BoQInfo'].includes(n.localName)))preserve(node,'LV',[],[node.localName]);
      return {rows,findings};
    }
    return rows;
  }
  const api={parse,report:(text,Parser)=>parse(text,Parser || root.DOMParser,true)};
  if(typeof module!=='undefined' && module.exports)module.exports=api;else root.DWPGaebImport=api;
})(typeof window!=='undefined'?window:globalThis);
