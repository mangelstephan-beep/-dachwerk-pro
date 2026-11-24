const assert=require('node:assert/strict');
const core=require('./project-core.js');
const {Store,lateInterest,berlinDay,addDays}=core;
// Buchhaltung SKR03 (Modul 29/30), Mahnwesen und Zahlungsausgang. Nur erfundene Testdaten.
const ok={status:'Freigegeben',owner:'Stephan'},date='2026-10-01';
function project(settings={},customer={name:'Hausverwaltung',customerType:'Gewerbekunde'}) {
  let raw=null;const db=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});
  if(Object.keys(settings).length)db.settings(settings);
  const cu=db.save('customers',customer);db.save('projects',{name:'Flachdach',customerId:cu.id,phase:'Erfassung'});db.advancePhase('Kalkulation');
  const lv=db.save('lv',{number:'01',text:'Abdichtung',qty:100,unit:'m²',material:10},ok);
  const offer=db.issue('offers');const order=db.save('orders',{title:'Auftrag',offerId:offer.id,date},ok);
  db.advancePhase('Beauftragt');db.advancePhase('Ausführung');
  db.save('measurements',{title:'Dach',positionId:lv.id,length:10,width:10,factor:1,date},ok);db.advancePhase('Abnahme');
  const ac=db.save('acceptance',{title:'Abnahme',date,participants:'AG und AN',result:'Abgenommen'},ok);db.sign(ac.id,{signer:'AG',strokes:[[[0.1,0.1],[0.2,0.3]]]});
  return {db,order};
}
const today=berlinDay(),back=n=>addDays(today,-n);
// Verzugszinsen: tagesgenau über den Basiszins-Wechsel 1.7.2026 (1,27 % → 1,52 %).
{
  const r=lateInterest(10000,'2026-06-21','2026-07-10',9,[]);
  const expected=Math.round((10000*10.27/100*10/365+10000*10.52/100*10/365)*100)/100;
  assert.equal(r.amount,expected);assert.equal(r.rate,10.52);assert.equal(r.days,20);
  assert.throws(()=>lateInterest(100,'2026-12-20','2027-01-05',9,[]),/Basiszinssatz ab 01\.01\.2027 fehlt/);
  assert.equal(lateInterest(100,'2026-12-20','2027-01-05',9,[{from:'2027-01-01',rate:1.52}]).rate,10.52);
}
// Rechnung: Rechnungsdatum, Zahlungsziel, Fälligkeit; Journal 1400 an 8400.
{
  const {db,order}=project({paymentDays:'21'});
  const inv=db.issue('invoices',{orderId:order.id});
  assert.equal(inv.data.invoiceDate,today);assert.equal(inv.data.paymentDays,21);assert.equal(inv.data.dueDate,addDays(today,21));
  const inv2=db.stornoInvoice(inv.id,{reason:'Test'});
  assert.throws(()=>db.issue('invoices',{orderId:order.id,paymentDays:400}),/Zahlungsziel/);
  const again=db.issue('invoices',{orderId:order.id,paymentDays:0});assert.equal(again.data.dueDate,today);
  const j=db.journal();
  assert.deepEqual(j.filter(r=>r.document===inv.data.number).map(r=>[r.debit,r.credit,r.amount]),[['1400','8400',inv.data.gross]]);
  assert.deepEqual(j.filter(r=>r.document===inv2.data.number).map(r=>[r.debit,r.credit,r.amount]),[['8400','1400',inv.data.gross]],'Storno bucht gegen');
  // Zahlung, Skonto, Eingangsrechnung, Zahlungsausgang
  db.save('payments',{title:'Überweisung',invoiceId:again.id,date:today,amount:again.data.gross-10},ok);
  db.save('payments',{title:'Skonto',invoiceId:again.id,direction:'Skonto / Abzug',date:today,amount:10,notes:'Skonto'},ok);
  const er=db.save('incoming',{title:'Material',supplier:'Baustoffhandel',invoiceNumber:'RE-1',date:today,net:100,tax:19,includeInCosts:true},ok);
  assert.throws(()=>db.payIncoming(er.id,{date:today,amount:120}),/übersteigt/);
  db.payIncoming(er.id,{date:today,amount:117.62});db.payIncoming(er.id,{kind:'Skonto erhalten',date:today,amount:1.38});
  assert.equal(db.incomingOpen(db.get(er.id)),0);assert.equal(db.openPayables().length,0);
  const bal=Object.fromEntries(db.balances().map(b=>[b.account,b.balance]));
  assert.equal(bal['1400'],0,'Forderung ausgeglichen');assert.equal(bal['1600'],0,'Verbindlichkeit ausgeglichen');
  assert.equal(bal['8736'],10);assert.equal(bal['3400'],119);assert.equal(bal['3736'],-1.38);
  assert.equal(bal['1200'],core.round(again.data.gross-10-117.62));
  // eigene Konten aus den Einstellungen
  db.settings({accounts:{bank:'1210',revenue19:'8401'}});
  assert.equal(db.accounts().bank,'1210');assert(db.journal().some(r=>r.credit==='8401'));
  assert.throws(()=>db.settings({accounts:{bank:'12a'}}),/Kontonummer/);
  assert.throws(()=>db.settings({accounts:{foo:'1234'}}),/Unbekanntes Konto/);
}
// Mahnwesen: Stufen, Fristen, Gebühr, Verzugspauschale, Verzugszinsen, Nummernkreis M.
{
  const {db,order}=project({dunningFee:'5',dunningDays:'7'});
  const inv=db.issue('invoices',{orderId:order.id});
  assert.throws(()=>db.dunInvoice(inv.id),/fällig\. Mahnung erst ab|Mahnung erst ab/);
  // Rechnung 60 Tage zurückdatieren (nur im Test)
  Object.assign(db.get(inv.id).data,{invoiceDate:back(74),dueDate:back(60)});
  let items=db.openItems();assert.equal(items.length,1);assert.equal(items[0].daysOverdue,60);assert.equal(items[0].nextLevel,'Zahlungserinnerung');
  const m1=db.dunInvoice(inv.id,{date:back(50),interest:true,flatFee:true,fee:9});
  assert.equal(m1.level,'Zahlungserinnerung');assert.equal(m1.fee,0);assert.equal(m1.flatFee,0);assert.equal(m1.interest,0,'Erinnerung ohne Kosten');
  assert.match(m1.number,/^DWP-M-\d{6}-0100\/1$/);assert.equal(m1.deadline,addDays(back(50),7));
  assert.throws(()=>db.dunInvoice(inv.id,{date:back(45)}),/Frist am/);
  const m2=db.dunInvoice(inv.id,{date:back(40),interest:true,flatFee:true});
  assert.equal(m2.level,'1. Mahnung');assert.equal(m2.fee,5);assert.equal(m2.flatFee,40);
  assert.equal(m2.interest,0,'Gewerbe: Verzug erst 30 Tage nach Fälligkeit bzw. ab Zugang der 1. Mahnung');
  assert.throws(()=>db.dunInvoice(inv.id,{date:back(20),flatFee:true}),/bereits berechnet/);
  const m3=db.dunInvoice(inv.id,{date:back(20),interest:true});
  assert.equal(m3.level,'2. Mahnung');assert.equal(m3.interestFrom,addDays(back(40),1));assert.equal(m3.interestDays,20);
  assert.equal(m3.interest,lateInterest(m3.open,m3.interestFrom,m3.date,9,[]).amount);assert(m3.interest>0);
  assert.equal(m3.total,core.round(m3.open+5+m3.interest));
  const m4=db.dunInvoice(inv.id,{date:back(5)});assert.equal(m4.level,'Letzte Mahnung');assert.equal(m4.interest,0,'Zinsen nur auf Wunsch');
  assert.throws(()=>db.dunInvoice(inv.id,{date:today}),/Letzte Mahnung ist bereits/);
  assert.equal(db.openItems()[0].level,'Letzte Mahnung');assert.equal(db.openItems()[0].canDun,false);
  const letter=db.dunningLetter(inv.id,m3.id);assert.equal(letter.level,'2. Mahnung');assert(letter.lines.some(l=>/Verzugszinsen 10,52 % p\. a\./.test(l[0])));assert.match(letter.reference,/Rechnungsnummer DWP-R-/);
  assert.equal(db.nextDocumentNumber('M'),'DWP-M-'+today.slice(0,4)+today.slice(5,7)+'-0104/1');
  // Zahlung schließt den offenen Posten; Sicherung bleibt gültig
  db.save('payments',{title:'Zahlung',invoiceId:inv.id,date:today,amount:inv.data.gross},ok);
  assert.equal(db.openItems().length,0);
  const copy=new Store({getItem:()=>db.backup(),setItem:()=>{}});assert.equal(copy.get(inv.id).dunnings.length,4);
  assert.throws(()=>new Store({getItem:()=>db.backup().replace('"level": "2. Mahnung"','"level": "9. Mahnung"'),setItem:()=>{}}),/Mahnung ungültig/);
  assert.throws(()=>db.dunInvoice(inv.id,{date:addDays(today,1)}),/Zukunft/);
}
// Privatkunde: keine Verzugspauschale, 5 Prozentpunkte, Verzug erst ab der 1. Mahnung.
{
  const {db,order}=project({},{name:'Privat',customerType:'Privatkunde'});
  const inv=db.issue('invoices',{orderId:order.id});Object.assign(db.get(inv.id).data,{invoiceDate:back(60),dueDate:back(46)});
  db.dunInvoice(inv.id,{date:back(40)});
  assert.throws(()=>db.dunInvoice(inv.id,{date:back(29),flatFee:true}),/nur gegenüber Unternehmern/);
  const m=db.dunInvoice(inv.id,{date:back(29),interest:'on'});assert.equal(m.interest,0,'Verzug erst mit Zugang der 1. Mahnung');
  const m2=db.dunInvoice(inv.id,{date:back(9),interest:'on'});assert.equal(m2.interestFrom,addDays(back(29),1));
  assert.equal(m2.interest,lateInterest(m2.open,m2.interestFrom,m2.date,5,[]).amount);
  // Sicherheitseinbehalt wird nicht angemahnt, aber nach Fristablauf gemeldet
  db.save('payments',{title:'Zahlung',invoiceId:inv.id,date:today,amount:core.round(inv.data.gross-50)},ok);
  db.save('payments',{title:'Einbehalt',invoiceId:inv.id,direction:'Sicherheitseinbehalt',date:today,amount:50,retentionUntil:today},ok);
  const it=db.openItems();assert.equal(it.length,1);assert.equal(it[0].open,0);assert.equal(it[0].retentionDue,50);assert.equal(it[0].nextLevel,null);
  assert.throws(()=>db.dunInvoice(inv.id),/ohne offenen Betrag/);
}
// § 19 UStG: Erlöse 8195, Material brutto auf 3200; § 13b: 8337.
{
  const {db,order}=project({smallBusiness:'true'});
  const inv=db.issue('invoices',{orderId:order.id});
  db.save('incoming',{title:'Material',supplier:'Handel',invoiceNumber:'A1',date:today,net:100,tax:19,includeInCosts:true},ok);
  const j=db.journal();
  assert(j.some(r=>r.document===inv.data.number && r.debit==='1400' && r.credit==='8195' && r.tax===0));
  assert(j.some(r=>r.document==='A1' && r.debit==='3200' && r.credit==='1600' && r.amount===119));
  assert.equal(db.journal({from:addDays(today,1)}).length,0);assert.throws(()=>db.journal({from:'2026-13-01'}),/Zeitraum/);
}
{
  const {db,order}=project({},{name:'Bauträger',customerType:'Gewerbekunde',reverseCharge:true,vatId:'DE123456789'});
  const inv=db.issue('invoices',{orderId:order.id});
  assert(db.journal().some(r=>r.document===inv.data.number && r.credit==='8337' && r.amount===inv.data.net));
}
// Server: neue Vorgänge nur mit Freigaberecht
{
  const {permission}=require('./lib/project-service.cjs');
  for(const method of ['dunInvoice','payIncoming']) {
    assert.doesNotThrow(()=>permission({id:'u',tenantId:'t',role:'manager'},{method,args:['x',{}]}));
    assert.throws(()=>permission({id:'u',tenantId:'t',role:'editor'},{method,args:['x',{}]}),/Freigabeberechtigung/);
  }
}
console.log('Buchhaltung SKR03 (Journal, Salden, eigene Konten, § 19/§ 13b), Zahlungsausgang, Mahnwesen mit Stufen, Fristen, Gebühr, Pauschale und Verzugszinsen passed.');
