const {PDFDocument,StandardFonts,rgb}=require('pdf-lib');
const fs=require('node:fs/promises'),path=require('node:path');
const money=n=>Number(n || 0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' EUR';
async function createOfferPdf(record){
  const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const logo=await doc.embedPng(await fs.readFile(path.join(__dirname,'../assets/dachwerkpro-original-logo-20261006.png')));
  const d=record.data,company=d.company || {};let page,y,pageNo=0;
  const safe=text=>Array.from(String(text ?? '').replace(/[\r\n\t]+/g,' ').replace(/[–—−]/g,'-')).map(c=>{try{font.encodeText(c);return c;}catch{return c.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?');}}).join('');
  function fresh(){
    page=doc.addPage([595.28,841.89]);pageNo++;
    page.drawImage(logo,{x:65,y:710,width:195,height:95});
    page.drawText('DachWerk Pro - '+safe(company.proprietor || 'Stephan Mangel'),{x:350,y:780,size:10,font:bold});
    page.drawText(safe(company.email || 'info@dachwerkpro.de'),{x:350,y:764,size:9,font});
    page.drawLine({start:{x:55,y:693},end:{x:540,y:693},thickness:1,color:rgb(.8,0,0)});
    page.drawText(safe(d.number)+' | ENTWURF | Seite '+pageNo,{x:55,y:48,size:8,font});
    page.drawLine({start:{x:55,y:65},end:{x:540,y:65},thickness:.5,color:rgb(.8,0,0)});
    y=672;
  }
  function lines(text,size=10){
    const out=[];for(const para of String(text ?? '').split('\n')){let row='';for(const word of safe(para).split(' ')){
      if(font.widthOfTextAtSize(row+' '+word,size)>475 && row){out.push(row);row='';}
      // Long product codes must wrap too.
      for(const c of (row?' ':'')+word){if(font.widthOfTextAtSize(row+c,size)>475){out.push(row);row='';}row+=c;}
    }out.push(row);}return out;
  }
  function text(value,{size=10,strong=false,blue=false}={}){for(const row of lines(value,size)){if(y<90)fresh();page.drawText(row,{x:55,y,size,font:strong?bold:font,color:blue?rgb(0,.3,.72):rgb(.1,.1,.1)});y-=size+4;}y-=4;}
  fresh();text('Angebotsentwurf '+d.number,{size:16,strong:true});
  text(d.customer.name+'\n'+(d.customer.address || '')+' '+(d.customer.city || ''));
  text(d.project.name+'\n'+(d.project.address || ''),{strong:true});
  text('Nicht zur Abgabe freigegeben. Die vorherige Fassung bleibt erhalten.');
  for(const [key,title] of [['positions','Hauptpositionen'],['optionalPositions','Bedarfspositionen - separat'],['alternativePositions','Nicht gewählte Alternativen - separat']]){
    if(!d[key]?.length)continue;text(title,{size:12,strong:true});
    for(const p of d[key]){
      const cost=`Je ${p.unit}: Material ${money(p.material)} | Lohn ${money(p.labor)} | Zeit ${p.totalMinutes ?? p.minutes ?? 0} Min.`;
      const product='Kalkuliert mit: '+(p.calculatedWith || p.materialBreakdown?.map(m=>m.name).filter(Boolean).join(', ') || 'Produkt noch festzulegen');
      const required=lines(p.number+' '+p.text).length*14+lines(cost,9).length*13+lines(product,9).length*13+50;
      if(y-required<90)fresh();
      text(p.number+' '+p.text,{strong:true});text(`${p.qty} ${p.unit} | EP ${money(p.ep)} | GP ${money(p.gp)}`);
      text(cost,{size:9,blue:true});text(product,{size:9,blue:true});
      text(`Gesamt: Material ${money(p.material*p.qty)} | Lohn ${money(p.labor*p.qty)} | Zeit ${Math.round((p.totalMinutes ?? p.minutes ?? 0)*p.qty*100)/100} Min.`,{size:9,blue:true});y-=5;
    }
  }
  text('Netto: '+money(d.net),{strong:true});text('USt '+d.tax+' %: '+money(d.taxAmount));text('Brutto: '+money(d.gross),{strong:true});
  for(const [key,label] of [['validUntil','Gültig bis'],['paymentTerms','Zahlungsbedingungen'],['executionTerms','Ausführung'],['offerNotes','Hinweise']])if(d[key])text(label+': '+d[key]);
  doc.setTitle(d.number);doc.setSubject('Angebotsentwurf - Prüfung offen');return doc.save();
}
module.exports={createOfferPdf};
