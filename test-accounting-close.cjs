const assert=require('node:assert/strict');
const core=require('./project-core.js');
const {Store,berlinDay,addDays,datevExtf,cp1252}=core;
// Buchhaltung Abschluss (26.11.2026): Storno mit eigenem Datum, gezahlte Mahnkosten, Festschreibung,
// DATEV-Buchungsstapel (EXTF) und Make-Monatsexport. Nur erfundene Testdaten.
const ok={status:'Freigegeben',owner:'Stephan'},date='2026-10-01',today=berlinDay(),back=n=>addDays(today,-n);
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
// Storno trägt sein eigenes Datum, nicht das der Ursprungsrechnung.
{
  const {db,order}=project();
  const inv=db.issue('invoices',{orderId:order.id});Object.assign(db.get(inv.id).data,{invoiceDate:back(40),dueDate:back(26)});
  const st=db.stornoInvoice(inv.id,{reason:'Falscher Empfänger'});
  assert.equal(st.data.invoiceDate,today);assert.equal(st.data.dueDate,today);assert.equal(st.data.paymentDays,0);
  const j=db.journal();
  assert.equal(j.find(r=>r.document===inv.data.number).date,back(40));assert.equal(j.find(r=>r.document===st.data.number).date,today);
}
// Mahnkosten: getrennt vereinnahmt, höchstens angemahnt, Journal Bank an 2700 bzw. 2650.
{
  const {db,order}=project({dunningFee:'5',dunningDays:'7'});
  const inv=db.issue('invoices',{orderId:order.id});Object.assign(db.get(inv.id).data,{invoiceDate:back(74),dueDate:back(60)});
  const pay=(direction,amount,extra={})=>db.save('payments',{title:direction,invoiceId:inv.id,direction,date:today,amount,...extra},ok);
  assert.throws(()=>pay('Mahngebühr erhalten',5),/keine offenen Mahngebühren/);
  db.dunInvoice(inv.id,{date:back(50)});
  const m2=db.dunInvoice(inv.id,{date:back(40),flatFee:true});
  const m3=db.dunInvoice(inv.id,{date:back(20),interest:true});
  assert.equal(m3.previousFees,45);assert(m3.interest>0);
  const letter=db.dunningLetter(inv.id,m3.id);assert(letter.lines.some(l=>l[0]==='Offene Mahnkosten aus früheren Schreiben' && /45,00/.test(l[1])));
  const m4=db.dunInvoice(inv.id,{date:back(5)});
  assert.equal(m4.previousFees,50,'5 + 40 + 5');assert.equal(m4.previousInterest,m3.interest,'Zinsen der 2. Mahnung bleiben offen');
  assert.equal(m4.total,core.round(m4.open+5+50+m3.interest));
  assert.deepEqual(db.dunningCosts(inv.id),{fees:55,interest:m3.interest,feesReceived:0,interestReceived:0,feesOpen:55,interestOpen:m3.interest});
  // Rechnung voll bezahlt → Mahnkosten bleiben als offener Posten sichtbar
  pay('Zahlungseingang',inv.data.gross);
  let item=db.openItems().find(i=>i.invoiceId===inv.id);assert(item);assert.equal(item.open,0);assert.equal(item.costsOpen,core.round(55+m3.interest));assert.equal(item.nextLevel,null);
  assert.throws(()=>pay('Mahngebühr erhalten',56),/höchstens 55,00/);
  const fee=pay('Mahngebühr erhalten',55);assert.match(fee.data.account,/SKR03 2700/);
  assert.throws(()=>pay('Verzugszinsen erhalten',core.round(m3.interest+0.01)),/höchstens/);
  pay('Verzugszinsen erhalten',m3.interest,{account:'2651'});
  assert.equal(db.openItems().some(i=>i.invoiceId===inv.id),false,'alles bezahlt');
  const j=db.journal().filter(r=>r.source==='Zahlung');
  assert(j.some(r=>r.debit==='1200' && r.credit==='2700' && r.amount===55 && r.tax===0));
  assert(j.some(r=>r.debit==='1200' && r.credit==='2651' && r.amount===m3.interest),'eigenes Konto hat Vorrang');
  const c=db.controlling();assert.equal(c.outstanding,0,'Mahnkosten verändern den Rechnungsausgleich nicht');assert.equal(c.paid,inv.data.gross);
  db.settings({accounts:{dunningIncome:'2710'}});assert.equal(db.accounts().dunningIncome,'2710');
}
// Festschreibung: nur vorwärts, nur abgelaufene Tage; gesperrte Buchungen werden abgelehnt.
{
  const {db,order}=project();
  const inv=db.issue('invoices',{orderId:order.id});
  assert.throws(()=>db.settings({lockedUntil:today}),/bis gestern/);
  assert.throws(()=>db.settings({lockedUntil:''}),/Datum angeben/);
  db.settings({lockedUntil:back(10)});assert.equal(db.lockedUntil(),back(10));
  assert.throws(()=>db.settings({lockedUntil:back(20)}),/nicht zurückgenommen/);
  assert.throws(()=>db.save('payments',{title:'Alt',invoiceId:inv.id,date:back(10),amount:10},ok),/festgeschrieben/);
  db.save('payments',{title:'Entwurf alt',invoiceId:inv.id,date:back(10),amount:10},{status:'Neu',owner:'Stephan'});
  db.save('payments',{title:'Neu',invoiceId:inv.id,date:back(9),amount:10},ok);
  assert.throws(()=>db.save('incoming',{title:'Material',supplier:'Handel',invoiceNumber:'X1',date:back(11),net:10,tax:19},ok),/Eingangsrechnung: Der Zeitraum/);
  const er=db.save('incoming',{title:'Material',supplier:'Handel',invoiceNumber:'X2',date:today,net:10,tax:19},ok);
  assert.throws(()=>db.payIncoming(er.id,{date:back(10),amount:5}),/Zahlungsausgang: Der Zeitraum/);
  db.payIncoming(er.id,{date:today,amount:5});
  db.settings({lockedUntil:back(1)});assert.equal(db.lockedUntil(),back(1));
  // Sicherung und Wiederherstellung behalten die Festschreibung
  assert.equal(new Store({getItem:()=>db.backup(),setItem:()=>{}}).lockedUntil(),back(1));
}
// DATEV-Buchungsstapel (EXTF 700, Formatversion 13)
{
  const rows=[{date:'2026-11-05',document:'DWP-R-202611-0104/1',text:'Rechnung Müller "Dach" & Söhne – Nord',debit:'1400',credit:'8400',amount:1190},{date:'2026-11-20',document:'RE 77',text:'Zahlung',debit:'1200',credit:'1400',amount:500.5}];
  const base={consultant:'1001',client:'1',from:'2026-11-01',to:'2026-11-30',now:new Date('2026-12-01T08:30:15Z')};
  const text=datevExtf(rows,base),lines=text.split('\r\n');
  assert.equal(lines.at(-1),'','endet mit CRLF');
  const h=lines[0].split(';');assert.equal(h.length,31,'31 Kopffelder');
  assert.deepEqual(h.slice(0,6),['"EXTF"','700','21','"Buchungsstapel"','13','20261201093015000']);
  assert.deepEqual([h[7],h[10],h[11],h[12],h[13],h[14],h[15],h[21],h[26]],['"RE"','1001','1','20260101','4','20261101','20261130','"EUR"','"03"']);
  assert.equal(lines[1].split(';').length,14);assert.match(lines[1],/^Umsatz \(ohne Soll\/Haben-Kz\);Soll\/Haben-Kennzeichen;WKZ Umsatz;Kurs;/);
  assert.equal(lines[2],'1190,00;"S";"EUR";;;;1400;8400;"";0511;"DWP-R-202611-0104/1";"";;"Rechnung Müller ""Dach"" & Söhne – Nord"');
  assert.equal(lines[3],'500,50;"S";"EUR";;;;1200;1400;"";2011;"RE77";"";;"Zahlung"','Belegfeld 1 ohne Leerzeichen');
  assert.throws(()=>datevExtf(rows,{...base,consultant:''}),/Beraternummer/);
  assert.throws(()=>datevExtf(rows,{...base,client:'0'}),/Mandantennummer/);
  assert.throws(()=>datevExtf(rows,{...base,to:''}),/Zeitraum/);
  assert.throws(()=>datevExtf(rows,{...base,from:'2026-12-01',to:'2027-01-31'}),/ein Wirtschaftsjahr/);
  assert.equal(datevExtf(rows,{...base,fiscalYearStart:7,from:'2026-12-01',to:'2027-01-31'}).split(';')[12],'20260701','abweichendes Wirtschaftsjahr');
  assert.throws(()=>datevExtf([...rows,{...rows[0],credit:'84000'}],base),/gleich lang/);
  // Windows-1252
  const bytes=cp1252('Müller € – ß ✓');assert.deepEqual([...bytes],[0x4d,0xfc,0x6c,0x6c,0x65,0x72,0x20,0x80,0x20,0x96,0x20,0xdf,0x20,0x3f]);
  // Über den Store mit Einstellungen
  const {db,order}=project();db.issue('invoices',{orderId:order.id});
  assert.throws(()=>db.datevExport({from:today,to:today}),/Beraternummer/);
  assert.throws(()=>db.settings({datevConsultant:'999'}),/Beraternummer/);assert.throws(()=>db.settings({datevClient:'123456'}),/Mandantennummer/);
  assert.throws(()=>db.settings({fiscalYearStart:'13'}),/Wirtschaftsjahr/);
  db.settings({datevConsultant:'12345',datevClient:'678'});
  const file=db.datevExport({from:today,to:today});assert.equal(file.fileName,'EXTF_DachWerkPro_Buchungsstapel_'+today+'_'+today+'.csv');
  assert.match(file.text.split('\r\n')[2],/;1400;8400;"";/);
  db.settings({datevConsultant:''});assert.equal(db.data.settings.datevConsultant,undefined);
}
// Make: Monatsexport enthält den EXTF-Stapel nur mit Berater-/Mandantennummer; Download liefert Windows-1252.
(async()=>{
  const sync=require('./lib/make-sync.cjs'),SECRET='s'.repeat(40);
  const env={DWP_MAKE_WEBHOOK_URL:'https://hook.eu1.make.com/abc123',DWP_MAKE_SECRET:SECRET,BETTER_AUTH_URL:'https://www.dachwerkpro.de'};
  const calls=[],fetchImpl=async(_u,o)=>{calls.push(JSON.parse(o.body));return {ok:true};};
  const s=sync.createSync({env,fetchImpl});
  await s.accountingExported({tenantId:'t',from:'2026-11-01',to:'2026-11-30'});assert.equal(calls.length,2);
  await s.accountingExported({tenantId:'t',from:'2026-11-01',to:'2026-11-30',extf:true});assert.equal(calls.length,5);
  const extf=calls.at(-1);assert.equal(extf.fileName,'EXTF_DachWerkPro_Buchungsstapel_2026-11-01_2026-11-30.csv');assert.equal(extf.path,'/DWP/03_Buchhaltung/DATEV-Export');
  const {db,order}=project();db.issue('invoices',{orderId:order.id});db.settings({datevConsultant:'1001',datevClient:'1'});
  const state=JSON.parse(db.backup());assert.equal(sync.verify(new URL(extf.url).searchParams.get('token'),SECRET).k,'extf');
  const handler=require('./api/make-file.js').createHandler({env,repository:()=>({read:async()=>({state})}),accessRepository:()=>({event:async()=>{}}),now:()=>Date.now(),fileRepository:()=>null,backupStore:()=>null});
  const link=sync.createSync({env,fetchImpl:async(_u,o)=>{calls.push(JSON.parse(o.body));return {ok:true};}});
  await link.accountingExported({tenantId:'t',from:today,to:today,extf:true});
  const url=new URL(calls.at(-1).url),res={headers:{},code:0,body:null,headersSent:false,setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},status(c){this.code=c;return this;},send(b){this.body=b;return this;},json(b){this.body=b;return this;},end(){return this;}};
  await handler({method:'GET',query:{token:url.searchParams.get('token')},url:url.pathname+url.search,headers:{}},res);
  assert.equal(res.code,200,JSON.stringify(res.body));assert.equal(res.headers['content-type'],'text/csv; charset=windows-1252');
  assert(Buffer.isBuffer(res.body));assert.match(res.body.toString('latin1'),/^"EXTF";700;21;"Buchungsstapel"/);
  assert.match(res.headers['content-disposition'],/EXTF_DachWerkPro_Buchungsstapel_/);
  console.log('Buchhaltung Abschluss: Storno-Datum, Mahnkosten (2700/2650), Festschreibung, DATEV-EXTF (Windows-1252) und Make-Monatsexport passed.');
})().catch(e=>{console.error(e);process.exit(1);});
