(function(root){
  'use strict';
  // DATANORM 4 (Vorlaufsatz fest 128 Zeichen, übrige Sätze mit Semikolon).
  // Quellen: Technische Spezifikation DATANORM (Haufe Lexware) in der Auslegung der offenen
  // Python-Bibliothek „datanorm“ (FahrJo) und Satzbeispiele aus der Praxis.
  // DATANORM 5 (V;050;) ist frei nur lückenhaft beschrieben: erkannt, aber nicht geraten.
  const CP850='ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ ';
  const LIMITS={files:5,fileBytes:30_000_000,totalBytes:60_000_000,rows:5000};
  const PRICE_UNITS={0:1,1:10,2:100,3:1000};
  const COLUMNS=['Artikelnummer','Artikelbezeichnung','Einheit','Preis','Rabatt','Gebindeinhalt','Preisart','Rabattquelle','Rabattgruppe','Warengruppe','EAN','Matchcode','Hinweis'];
  const letters=i=>String.fromCharCode(65+i);
  const fail=message=>{throw Error('DATANORM: '+message);};

  function decode(bytes){
    if(bytes[0]===0xEF && bytes[1]===0xBB && bytes[2]===0xBF)bytes=bytes.subarray(3);
    let high=false;for(const b of bytes)if(b>127){high=true;break;}
    if(!high)return {text:latin(bytes),encoding:'ASCII'};
    try{return {text:new TextDecoder('utf-8',{fatal:true}).decode(bytes),encoding:'UTF-8'};}catch{}
    // Umlaute zählen: DOS-Zeichensatz (CP850, DATANORM-Standard) gegen Windows-1252.
    const dos=new Set([0x84,0x94,0x81,0x8E,0x99,0x9A,0xE1]),win=new Set([0xE4,0xF6,0xFC,0xC4,0xD6,0xDC,0xDF]);
    let d=0,w=0;for(const b of bytes){if(dos.has(b))d++;if(win.has(b))w++;}
    if(w>d)return {text:new TextDecoder('windows-1252').decode(bytes),encoding:'Windows-1252'};
    let text='';for(let i=0;i<bytes.length;i+=8192){const part=bytes.subarray(i,i+8192);let s='';for(const b of part)s+=b<128?String.fromCharCode(b):CP850[b-128];text+=s;}
    return {text,encoding:'CP850 (DOS)'};
  }
  function latin(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));return s;}
  function date(value){
    const m=String(value).match(/^(\d{2})(\d{2})(\d{2})$/);if(!m)return '';
    const year=Number(m[3])>=90?1900+Number(m[3]):2000+Number(m[3]),iso=`${year}-${m[2]}-${m[1]}`;
    const check=new Date(iso+'T00:00:00Z');return !Number.isNaN(check.getTime()) && check.toISOString().slice(0,10)===iso?iso:'';
  }
  function header(line,name){
    if(/^V;\s*0?5/.test(line))fail(`${name} ist DATANORM 5. Diese Fassung wird noch nicht gelesen – bitte beim Händler DATANORM 4 oder eine Excel-/CSV-Preisliste anfordern.`);
    if(!/^V /.test(line))fail(`${name}: Vorlaufsatz (V) in der ersten Zeile fehlt. Ist das eine DATANORM-Datei?`);
    if(line.length<128)fail(`${name}: Vorlaufsatz unvollständig (${line.length} statt 128 Zeichen), Fassung und Währung nicht lesbar.`);
    const version=line.slice(123,125),currency=line.slice(125,128).trim();
    if(version!=='04')fail(`${name}: Fassung ${version==='03'?'DATANORM 3':'„'+version+'“'} wird nicht gelesen. Bitte DATANORM 4 anfordern.`);
    if(currency!=='EUR')fail(`${name}: Währung „${currency}“. Nur Preise in EUR werden übernommen.`);
    return {date:date(line.slice(2,8)),info:[line.slice(8,48),line.slice(48,88),line.slice(88,123)].map(s=>s.trim()).filter(Boolean)};
  }
  function read(files){
    if(!Array.isArray(files) || !files.length)fail('Bitte mindestens eine Datei auswählen.');
    if(files.length>LIMITS.files)fail(`Höchstens ${LIMITS.files} Dateien zusammen (DATANORM.001, DATPREIS.001, DATANORM.RAB).`);
    let total=0;
    const articles=new Map(),groups=new Map(),counts={A:0,B:0,P:0,R:0,other:0,deleted:0,replaced:0,priceUpdates:0},sources=[],notes=[];
    let main=null;
    const entry=id=>{if(!articles.has(id))articles.set(id,{id});return articles.get(id);};
    for(const file of files){
      const bytes=file.bytes instanceof Uint8Array?file.bytes:new Uint8Array(file.bytes);
      if(bytes.length>LIMITS.fileBytes)fail(`${file.name} ist größer als 30 MB.`);
      if((total+=bytes.length)>LIMITS.totalBytes)fail('Dateien zusammen größer als 60 MB.');
      const {text,encoding}=decode(bytes);
      const lines=text.replace(/\x1a+\s*$/,'').split(/\r\n|\n|\r/);
      const first=lines.findIndex(l=>l.trim());if(first<0)fail(`${file.name} ist leer.`);
      const head=header(lines[first],file.name);
      const kinds=new Set();
      for(let i=first+1;i<lines.length;i++){
        const line=lines[i];if(!line.trim())continue;
        const f=line.split(';').map(s=>s.trim()),type=f[0];kinds.add(type);
        const where=`${file.name} Zeile ${i+1}`;
        if(type==='A'){
          if(f.length<12)fail(`${where}: Artikelsatz A unvollständig.`);
          counts.A++;
          const id=f[2];if(!id)fail(`${where}: Artikelnummer fehlt.`);
          const item=entry(id);
          if(f[1]==='L'){item.deleted=true;counts.deleted++;continue;}
          if(!['N','A'].includes(f[1]))fail(`${where}: Verarbeitungskennzeichen „${f[1]}“ unbekannt.`);
          if(item.a)counts.replaced++;
          item.deleted=false;
          item.a={name:[f[4],f[5]].filter(Boolean).join(' '),pkz:f[6],pe:f[7],unit:f[8],price:f[9],group:f[10],mainGroup:f[11],line:where};
        }else if(type==='B'){
          counts.B++;const id=f[2];if(!id)continue;
          const item=entry(id);item.b={matchcode:f[3] || '',ean:f[9] || '',group:f[11] || ''};
        }else if(type==='P'){
          counts.P++;
          if(!['A','N'].includes(f[1]))fail(`${where}: Preissatz mit Verarbeitungskennzeichen „${f[1]}“ wird nicht gelesen.`);
          // Ein P-Satz trägt bis zu drei Artikel mit je 9 Feldern.
          for(let at=2;at+2<f.length && f[at];at+=9){
            const item=entry(f[at]);if(item.p)counts.replaced++;
            item.p={pkz:f[at+1],price:f[at+2],discounts:[[f[at+3] ?? '',f[at+4] ?? ''],[f[at+5] ?? '',f[at+6] ?? ''],[f[at+7] ?? '',f[at+8] ?? '']],line:where};
            counts.priceUpdates++;
          }
        }else if(type==='R'){
          counts.R++;if(f[2])groups.set(f[2],{rkz:f[3] ?? '',value:f[4] ?? '',label:f[5] || ''});
        }else counts.other++;
      }
      const role=kinds.has('A')?'Artikel':kinds.has('P')?'Preise':kinds.has('R')?'Rabattgruppen':kinds.has('S')?'Warengruppen':'ohne Artikel';
      if(role==='Artikel' && !main)main=head;
      sources.push({name:file.name,role,encoding,date:head.date,info:head.info});
    }
    if(!main)fail('Keine Artikelsätze (A) gefunden. DATANORM.001 mit auswählen – DATPREIS und RAB enthalten keine Bezeichnung, Einheit und Preiseinheit.');
    const withoutA=[...articles.values()].filter(a=>!a.a && !a.deleted).length;
    if(withoutA)notes.push(`${withoutA} Preis- oder Zusatzsätze ohne Artikelsatz (A) nicht übernommen.`);
    if(counts.deleted)notes.push(`${counts.deleted} Löschsätze: Diese Artikel werden nicht übernommen; bestehende Materialien bleiben unverändert.`);
    if(counts.other)notes.push(`${counts.other} Text-, Warengruppen- oder Sondersätze (T, D, S …) nicht ausgewertet.`);
    return {version:'4',date:main.date,info:main.info,articles,groups,counts,sources,notes};
  }
  function discount(rkz,value,group,groups){
    if(!rkz)return null;
    if(rkz==='0'){
      const g=groups.get(group);if(!g)return {issue:`Rabattgruppe ${group || '(leer)'} nicht in DATANORM.RAB`};
      if(g.rkz==='0')return {issue:`Rabattgruppe ${group} verweist auf sich selbst`};
      const r=discount(g.rkz,g.value,group,groups);return r && !r.issue?{...r,source:`Rabattgruppe ${group}${g.label?' „'+g.label+'“':''}: ${r.source}`}:r;
    }
    if(!/^\d+$/.test(value))return {issue:`Rabattwert „${value}“ ungültig`};
    if(rkz==='1'){const percent=Number(value)/100;return percent>100?{issue:`Rabatt ${percent} % über 100 %`}:{percent,source:`Rabattsatz ${String(percent).replace('.',',')} %`};}
    if(rkz==='2'){const factor=Number(value)/1000;if(factor<=0 || factor>1)return {issue:`Multiplikator ${String(factor).replace('.',',')} (Aufschlag oder null) manuell prüfen`};return {percent:Math.round((1-factor)*1e6)/1e4,source:`Multiplikator ${String(factor).replace('.',',')}`};}
    if(rkz==='3')return {issue:'Teuerungszuschlag manuell prüfen'};
    return {issue:`Rabattkennzeichen „${rkz}“ unbekannt`};
  }
  const decimal=n=>String(Math.round(n*1e6)/1e6).replace('.',',');
  function book(parsed,{filter='',known=null,allowListPrice=false}={}){
    if(!parsed?.articles)fail('Bitte die Dateien neu einlesen.');
    const terms=String(filter).toLocaleLowerCase('de-DE').split(/\s+/).filter(Boolean);
    const selected=[];let filtered=0;
    for(const item of parsed.articles.values()){
      if(!item.a || item.deleted)continue;
      const hay=[item.id,item.a.name,item.a.group,item.a.mainGroup,item.b?.group,item.b?.ean,item.b?.matchcode].join(' ').toLocaleLowerCase('de-DE');
      if(terms.some(t=>!hay.includes(t)) || known && !known.has(item.id)){filtered++;continue;}
      selected.push(item);
    }
    if(!selected.length)fail(known?'Keiner der Artikel steht schon im Materialstamm (Artikelnummer). Filter lösen oder Artikel zuerst anlegen.':'Keine Artikel für diesen Filter.');
    if(selected.length>LIMITS.rows)fail(`${selected.length.toLocaleString('de-DE')} Artikel ausgewählt. Höchstens ${LIMITS.rows} je Übernahme – mit Suchbegriff oder Warengruppe eingrenzen oder „Nur Artikel aus dem Materialstamm“ wählen.`);
    const rows=[{index:1,hidden:false,values:COLUMNS.map((value,i)=>({address:letters(i)+'1',value,issue:''}))}];
    selected.forEach((item,n)=>{
      const index=n+2,a=item.a,p=item.p,issues=[],hints=[];
      const pkz=p?p.pkz:a.pkz,raw=p?p.price:a.price;
      let price='',rate=null,kind='';
      if(pkz==='1')kind='Listenpreis (brutto vor Rabatt)';else if(pkz==='2')kind='Nettopreis';else if(pkz==='3')issues.push('Werkspreis wird nicht als EK übernommen');else issues.push(`Preiskennzeichen „${pkz}“ unbekannt`);
      if(p)kind+=` aus Preissatz (${p.line})`;
      if(!/^\d+$/.test(raw || ''))issues.push(`Preis „${raw}“ ungültig`);
      else if(Number(raw)===0)issues.push('Preis 0 – kein Preis in der Datei (DATPREIS mit auswählen?)');
      else price=Number(raw)/100;
      const pe=PRICE_UNITS[a.pe];if(!pe)issues.push(`Preiseinheit „${a.pe}“ unbekannt`);
      if(p?.discounts.slice(1).some(([k,v])=>k && Number(v)))issues.push('Mehrere Rabatte im Preissatz manuell prüfen');
      if(p?.discounts[0][0])rate=discount(p.discounts[0][0],p.discounts[0][1],a.group,parsed.groups);
      else if(pkz==='1' && a.group && parsed.groups.has(a.group))rate=discount('0','',a.group,parsed.groups);
      if(rate?.issue){issues.push(rate.issue);rate=null;}
      if(pkz==='1' && !rate){
        if(allowListPrice)hints.push('Listenpreis ohne Rabatt bewusst als EK übernommen');
        else issues.push('Listenpreis ohne Rabatt: DATANORM.RAB oder DATPREIS mit auswählen oder Listenpreise bewusst übernehmen');
      }
      let unit=a.unit,quantity=pe || '';
      if(price!=='' && pe>1){
        const exact=price*(1-(rate?.percent || 0)/100)/pe;
        if(exact>0 && Math.abs(Math.round(exact*100)/100-exact)/exact>0.005){unit=`${pe} ${a.unit}`;quantity=1;hints.push(`Preis je ${a.unit} unter 1 Cent genau (${decimal(exact)} €): als Preis je ${unit} geführt`);}
      }
      const values=[item.id,a.name,unit,price===''?'':decimal(price),rate?decimal(rate.percent):'',quantity===''?'':String(quantity),kind,rate?.source || '',a.group,item.b?.group || a.mainGroup,item.b?.ean || '',item.b?.matchcode || '',hints.join('; ')];
      rows.push({index,hidden:false,values:values.map((value,i)=>({address:letters(i)+index,value,issue:i===3?issues.join('; '):''}))});
    });
    const summary=`DATANORM 4${parsed.date?' vom '+parsed.date.split('-').reverse().join('.'):''}${parsed.info.length?' · '+parsed.info[0]:''}: ${parsed.counts.A} Artikelsätze, ${selected.length} ausgewählt${filtered?`, ${filtered} durch Filter ausgeblendet`:''}. ${parsed.sources.map(s=>`${s.name} (${s.role}, ${s.encoding})`).join(', ')}.${parsed.notes.length?' '+parsed.notes.join(' '):''}`;
    return {book:{sheets:[{name:'DATANORM 4',rows,merged:[],hidden:false}]},summary,selected:selected.length,filtered};
  }
  const looksLike=name=>!/\.(csv|xlsx|xls)$/i.test(String(name || ''));
  const api={read,book,decode,looksLike,LIMITS,COLUMNS};
  if(typeof module!=='undefined' && module.exports)module.exports=api;else root.DWPDatanormImport=api;
})(typeof window!=='undefined'?window:globalThis);
