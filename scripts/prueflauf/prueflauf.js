// Prüflauf DachWerk Pro: ein internes Projekt durch alle 36 Module.
// Läuft identisch lokal (gegen lib/project-service.cjs) und live im Browser (über DWPRemote.run).
async function prueflauf({run, store, log}) {
  const P='';
  const ok={status:'Freigegeben',owner:'Stephan Mangel'},done={status:'Erledigt',owner:'Stephan Mangel'};
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date());
  const day=n=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
  const sig={signer:'Merle Sonntag',strokes:[[[0.1,0.2],[0.3,0.5],[0.6,0.3]]]};
  const cent=n=>Math.round(n*100)/100;
  const step=async(name,fn)=>{try{const r=await fn();log('✓ '+name);return r;}catch(e){log('✗ '+name+': '+e.message);throw Object.assign(e,{step:name});}};

  // 01 Kunde, 02 Projekt (intern), 34 Ausschreibung
  const customer=await step('01 Kunde',()=>run('save',['customers',{name:'Hausverwaltung Lindenhof GmbH',customerType:'Gewerbekunde',contact:'Frau Merle Sonntag',address:'Am Lindenhof 7',postalCode:'28999',location:'Lindenhausen',notes:'Fantasiekunde – interner Prüflauf, kein echter Kunde.'}]));
  const project=await step('02 Projekt',()=>run('save',['projects',{name:'Flachdachsanierung Lindenhof Haus B',customerId:customer.id,address:'Am Lindenhof 7, 28999 Lindenhausen',phase:'Erfassung',notes:'Interner Prüflauf mit Fantasiedaten.'}]));
  await step('34 Ausschreibungsmonitor',()=>run('save',['tenders',{title:'Ausschreibung Flachdach Lindenhof',deadline:day(14)}]));

  // 18 Termin / Besuchstermin mit Zusage
  const employee=await step('18 Personal anlegen',()=>run('save',['personnel',{name:'Jonas Wiesenthal',number:'PL-1',employment:'Angestellte',wage:45}]));
  await step('18 Besuchstermin planen',()=>run('schedule',[employee.id,{projectId:project.id,start:day(1),end:day(1),task:'Besuchstermin und Bestandsaufnahme Lindenhof Haus B'}]));
  const visit=store().get(employee.id).assignments.find(a=>a.projectId===project.id && !a.cancelled);
  await step('18 Termin zusagen',()=>run('respondSchedule',[employee.id,visit.id,{answer:'Zugesagt',note:'Bin um 9 Uhr vor Ort'}]));

  // Bestandsaufnahme: 35 Sachverständigenwesen, 36 Energieberatung, 21 technische Feststellung (sperrend), 32 Fotodokument
  await step('35 Sachverständigenwesen (Ortstermin)',()=>run('save',['expert',{title:'Ortstermin Bestandsaufnahme Haus B',reportNumber:'PL-SV-1',date:day(1),assignment:'Zustand Flachdach aufnehmen',finding:'Abdichtung versprödet',assessment:'Sanierung empfohlen'}]));
  await step('36 Energieberatung',()=>run('save',['energy',{title:'Dämmung Flachdach Haus B',measure:'Gefälledämmung WLS 035 bei Sanierung'}]));
  const finding=await step('21 Bestandsaufnahme (Feststellung)',()=>run('save',['technical',{title:'Bestandsaufnahme Flachdach Haus B',finding:'Bitumenbahn versprödet, Attika undicht',blocking:true}]));
  await step('32 Fotodokument Bestandsaufnahme',()=>run('save',['documents',{title:'Fotos Bestandsaufnahme Haus B',category:'Foto',description:'Dachfläche und Attika',date:day(1)}]));

  // Kalkulation: 03 Betriebskosten, 10 Leistungskatalog, 11/12/13 Material, Lieferant, Preisliste, 33 Wissen, 06 Import, 07 Vertragsprüfung, 04 LV
  await step('Phase Kalkulation',()=>run('advancePhase',['Kalkulation']));
  await step('03 Betriebskosten',()=>run('save',['operating',{title:'Betriebskosten Lindenhof',annualCost:120000,productiveHours:1600},ok]));
  await step('10 Leistungskatalog',()=>run('save',['services',{title:'Abdichtung zweilagig (Lindenhof)',text:'Bitumenabdichtung zweilagig',unit:'m²',minutes:20,material:18},ok]));
  await step('12 Lieferant',()=>run('save',['suppliers',{name:'Nordwind Baustoffe KG'},ok]));
  const material=await step('11 Material',()=>run('save',['materials',{name:'Polymerbitumen-Schweißbahn Nordwind',unit:'m²',price:9.5,priceDate:today,source:'Nordwind Baustoffe KG'},ok]));
  await step('13 Preisliste',()=>run('save',['pricelists',{title:'Preisliste Nordwind 2026',source:'Nordwind Baustoffe KG',priceDate:today},ok]));
  await step('33 Technik und Wissen',()=>run('save',['knowledge',{title:'Merkblatt Flachdach Lindenhof',source:'Hausverwaltung Lindenhof',edition:'2026'},ok]));
  await step('06 Import',()=>run('save',['imports',{title:'LV-Import Lindenhof Haus B'},ok]));
  await step('07 Vertragsprüfung',()=>run('save',['contract',{title:'Vertragsprüfung Lindenhof',finding:'VOB/B vereinbart, keine Auffälligkeiten',decision:'Freigegeben'},ok]));
  const p1=await step('04 LV Position 01',()=>run('save',['lv',{number:'01',text:'Abdichtung zweilagig, Polymerbitumen',qty:100,unit:'m²',materialId:material.id,consumption:1.1,labor:12},ok]));
  const p2=await step('04 LV Position 02',()=>run('save',['lv',{number:'02',text:'Attikaanschluss mit Abdeckblech',qty:20,unit:'m',material:15},ok]));
  await step('21 Feststellung entschieden',()=>run('save',['technical',{...store().get(finding.id).data,decision:'Sanierung zweilagig'},{id:finding.id,...done}]));

  // 15 Angebot, 16 Auftrag + AB, 17 Schriftverkehr
  const offer=await step('15 Angebot',()=>run('issue',['offers']));
  const order=await step('16 Auftrag mit Auftragsbestätigung',()=>run('save',['orders',{title:'Auftrag Flachdach Lindenhof Haus B',offerId:offer.id,date:today},ok]));
  await step('17 Schriftverkehr',()=>run('save',['correspondence',{title:'Auftragsbestätigung an Frau Sonntag',body:'Auftragsbestätigung per Mail versendet.'},ok]));
  await step('Phase Beauftragt',()=>run('advancePhase',['Beauftragt']));

  // 22 Arbeitssicherheit, Ausführung: 19 Einkauf, 20 Logistik, 24 Nachunternehmer, 23 Zeiten, 25 Bautagebuch
  await step('22 Arbeitssicherheit',()=>run('save',['safety',{title:'Absturzsicherung Haus B',hazard:'Dachkante',measure:'Seitenschutz',date:day(2)},done]));
  await step('Phase Ausführung',()=>run('advancePhase',['Ausführung']));
  const purchase=await step('19 Einkauf (Bestellung aus Bedarf)',()=>run('createPurchase',[material.id]));
  const pur=purchase?.module==='purchase'?purchase:store().list('purchase').at(-1);
  await step('19 Bestellung freigeben',()=>run('save',['purchase',store().get(pur.id).data,{...ok,id:pur.id}]));
  await step('20 Logistik / Lieferung',()=>run('save',['logistics',{title:'Lieferung Schweißbahnen',purchaseId:pur.id,deliveryDate:day(3),quantity:store().get(pur.id).data.quantity},ok]));
  const nu=await step('24 Nachunternehmer',()=>run('save',['subcontracts',{title:'Blitzschutz Haus B',contractor:'Elektro Falkenried GmbH',cost:300,scope:'Blitzschutz umsetzen',date:day(4)},ok]));
  await step('28 Eingangsrechnung NU',()=>run('save',['incoming',{title:'Rechnung Blitzschutz',supplier:'Elektro Falkenried GmbH',invoiceNumber:'PL-NU-1',date:day(5),net:300,tax:19,subcontractId:nu.id,includeInCosts:true},ok]));
  await step('23 Zeiten (eigene Leistung)',()=>run('save',['times',{title:'Abdichtung verlegt',date:day(4),employeeId:employee.id,hours:8,rate:45,work:'Abdichtung verlegt'},ok]));
  await step('25 Bautagebuch',()=>run('save',['diary',{title:'Tagesbericht Haus B',date:day(4),weather:'trocken',work:'Abdichtung verlegt',progress:60},ok]));
  await step('26 Aufmaß Pos. 01',()=>run('save',['measurements',{title:'Aufmaß Dachfläche',positionId:p1.id,length:10,width:10,factor:1,date:day(5)},ok]));
  await step('26 Aufmaß Pos. 02',()=>run('save',['measurements',{title:'Aufmaß Attika',positionId:p2.id,length:20,width:1,factor:1,date:day(5)},ok]));

  // AZ / ST / TR
  const az=await step('27 AZ Abschlagsrechnung 30 %',()=>run('issue',['invoices',{orderId:order.id,invoiceType:'Abschlagsrechnung',percentage:30}]));
  const st=await step('23 ST Stundenzettel Regie',()=>run('save',['times',{title:'Regie: Gully freilegen',date:day(5),employeeId:employee.id,hours:2,rate:45,billingRate:62,work:'Gully freigelegt',billable:true,customerConfirmation:'Stundenzettel 1, Frau Sonntag'},ok]));
  await step('23 ST unterschreiben',()=>run('sign',[st.id,sig]));
  const tr=await step('27 TR Teilrechnung 70 % + Regie',()=>run('issue',['invoices',{orderId:order.id,invoiceType:'Teilrechnung',percentage:70}]));

  // Abnahme: 30 Mängel, 31 Abnahme mit Unterschrift, Nachweis
  await step('Phase Abnahme',()=>run('advancePhase',['Abnahme']));
  const defect=await step('30 Mangel erfasst',()=>run('save',['defects',{title:'Naht Attika Nordseite',finding:'Naht nacharbeiten'}]));
  await step('30 Mangel beseitigt',()=>run('save',['defects',{...store().get(defect.id).data,remedy:'Nachgeschweißt und geprüft'},{id:defect.id,...done}]));
  const acc=await step('31 Abnahme',()=>run('save',['acceptance',{title:'Abnahme Flachdach Haus B',date:day(6),participants:'Frau Sonntag (AG) und Stephan Mangel (AN)',result:'Abgenommen',signer:'Merle Sonntag'},ok]));
  await step('31 Abnahme unterschreiben',()=>run('sign',[acc.id,sig]));
  await step('32 Abnahmenachweis',()=>run('save',['documents',{title:'Abnahmeprotokoll Haus B',category:'Nachweis',description:'Abnahme unterschrieben',relatedRecordId:acc.id}]));
  const sr=await step('27 Schlussrechnung',()=>run('issue',['invoices',{orderId:order.id}]));

  // 29 Zahlungen inkl. Skonto und Einbehalt
  await step('29 Zahlung AZ',()=>run('save',['payments',{title:'Zahlung Abschlag',invoiceId:az.id,direction:'Zahlungseingang',date:day(7),amount:az.data.gross},ok]));
  await step('29 Zahlung TR',()=>run('save',['payments',{title:'Zahlung Teilrechnung',invoiceId:tr.id,direction:'Zahlungseingang',date:day(7),amount:tr.data.gross},ok]));
  const sk=cent(sr.data.gross*0.02),eb=cent(sr.data.gross*0.05);
  await step('29 Zahlung Schlussrechnung',()=>run('save',['payments',{title:'Zahlung Schlussrechnung',invoiceId:sr.id,direction:'Zahlungseingang',date:day(8),amount:cent(sr.data.gross-sk-eb)},ok]));
  await step('29 Skonto',()=>run('save',['payments',{title:'Skonto Schlussrechnung',invoiceId:sr.id,direction:'Skonto / Abzug',date:day(8),amount:sk,notes:'2 % Skonto'},ok]));
  await step('29 Sicherheitseinbehalt',()=>run('save',['payments',{title:'Sicherheitseinbehalt 5 %',invoiceId:sr.id,direction:'Sicherheitseinbehalt',date:day(8),amount:eb,retentionUntil:day(8+5*365)},ok]));

  // 35 Abschluss + Nachkalkulation
  const wf=store().workflow();
  if(wf.issues.length)throw Error('Offene Punkte vor Abschluss: '+wf.issues.map(i=>i.message).join(' | '));
  await step('Phase Abgeschlossen (Abschluss/Nachkalkulation)',()=>run('advancePhase',['Abgeschlossen']));
  const s=store(),c=s.controlling(),final=s.workflow();
  const empty=final.modules.filter(m=>!m.derived && m.count===0).map(m=>m.id);
  return {projekt:s.project().data.name,phase:s.project().data.phase,module:final.modules.length,ohneEintrag:empty,
    belege:{angebot:offer.data.number,ab:s.get(order.id).confirmation.number,az:az.data.number,tr:tr.data.number,sr:sr.data.number},
    summen:{angebotNetto:offer.data.net,rechnungenNetto:cent(az.data.net+tr.data.net+sr.data.net),offen:c.outstanding,einbehalt:c.retained,ergebnis:c.result}};
}
if(typeof module!=='undefined')module.exports={prueflauf};
