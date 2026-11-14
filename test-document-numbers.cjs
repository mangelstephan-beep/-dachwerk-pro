// Belegnummern DWP-<Art>-JJJJMM-NNNN/Version (Entscheidung 14.11.2026).
const assert=require('node:assert/strict');
const {Store}=require('./project-core.js');
const {execute,memoryRepository}=require('./lib/project-service.cjs');
const FORMAT=/^DWP-(A|AB|R)-(\d{6})-(\d{4})\/(\d+)$/;
const month=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date()).slice(0,7).replace('-','');
const ok={status:'Freigegeben',owner:'Prüfer'};

// Lokal: getrennte Zähler je Belegart, Start 0100, AB aus Auftragsdatum.
let raw=null;const db=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});
db.settings({wage:0,agk:0,profit:0,tax:19});
const c=db.save('customers',{name:'AG'});db.save('projects',{name:'Dach',customerId:c.id,phase:'Erfassung'});
const p=db.save('lv',{number:'010',text:'Bahn',qty:100,unit:'m²',material:10},ok);
const offer=db.issue('offers');
assert.equal(offer.data.number,`DWP-A-${month}-0100/1`);assert.equal(offer.data.documentRevision,1);
const order=db.save('orders',{title:'Hauptauftrag',offerId:offer.id,date:'2026-10-12'},ok);
assert.equal(order.confirmation.number,'DWP-AB-202610-0100/1','AB: eigener Zähler und Monat des Auftragsdatums');
assert.equal(order.confirmation.offerNumber,offer.data.number,'AB verweist auf das Angebot');
db.save('measurements',{title:'Dach',positionId:p.id,length:10,width:10,factor:1,date:'2026-10-12'},ok);
const advance=db.issue('invoices',{invoiceType:'Abschlagsrechnung',percentage:30});
assert.equal(advance.data.number,`DWP-R-${month}-0100/1`,'Rechnung: eigener Zähler');
const second=db.issue('invoices',{invoiceType:'Teilrechnung',percentage:60});
assert.equal(second.data.number,`DWP-R-${month}-0101/1`);
const storno=db.stornoInvoice(second.id,{reason:'Korrektur'});
assert.equal(storno.data.number,`DWP-R-${month}-0102/1`);assert.equal(storno.data.originalNumber,second.data.number);
assert.equal(db.get(second.id).data.number,`DWP-R-${month}-0101/1`,'Original bleibt unverändert');
for(const r of db.data.records)for(const n of [r.data?.number,r.confirmation?.number].filter(v=>/^DWP-/.test(v || '')))assert.match(n,FORMAT);

// Startwert aus Betriebsdaten; eine bereits höhere Nummer gewinnt, keine Doppelvergabe.
raw=null;const s=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});
s.settings({wage:0,agk:0,profit:0,tax:19,documentNumberStart:'104'});
assert.equal(s.data.settings.documentNumberStart,104);
const c2=s.save('customers',{name:'Wanke'});s.save('projects',{name:'Vierbergen',customerId:c2.id,phase:'Erfassung'});
s.save('lv',{number:'01',text:'Dach',qty:1,unit:'psch',material:100},ok);
assert.equal(s.issue('offers').data.number,`DWP-A-${month}-0104/1`);
assert.equal(s.issue('offers').data.number,`DWP-A-${month}-0105/1`,'zweite Fassung erhält die nächste Nummer');
s.settings({documentNumberStart:'100'});
assert.equal(s.issue('offers').data.number,`DWP-A-${month}-0106/1`,'kleinerer Startwert vergibt keine Nummer doppelt');
for(const bad of ['0','10000','abc','1.5'])assert.throws(()=>s.settings({documentNumberStart:bad}),/Belegnummern-Start/);
s.settings({wage:1});assert.equal(s.data.settings.documentNumberStart,100,'andere Einstellungen behalten den Startwert');
s.settings({documentNumberStart:''});assert.equal(s.data.settings.documentNumberStart,undefined);
assert.throws(()=>s.nextDocumentNumber('X'),/Belegart/);

// Server: Zählung über den gesamten Mandanten, auch über Projekte ohne Mitgliedschaft.
(async()=>{
  const repo=memoryRepository(),admin={id:'admin',name:'Chef',tenantId:'num',role:'admin'},manager={id:'m1',name:'Bauleiter',tenantId:'num',role:'manager'};
  const run=async(actor,method,args,projectId)=>execute(repo,actor,{method,args,projectId,revision:(await repo.read('num')).state.revision});
  await run(admin,'settings',[{wage:0,agk:0,profit:0,tax:19}]);
  const cust=(await run(admin,'save',['customers',{name:'K'}])).recordId;
  const hidden=(await run(admin,'save',['projects',{name:'Nur Chef',customerId:cust,phase:'Erfassung',memberIds:'admin'}])).recordId;
  const shared=(await run(admin,'save',['projects',{name:'Team',customerId:cust,phase:'Erfassung',memberIds:'admin,m1'}])).recordId;
  await run(admin,'save',['lv',{number:'1',text:'A',qty:1,unit:'Stk',material:10},ok],hidden);
  await run(admin,'save',['lv',{number:'1',text:'B',qty:1,unit:'Stk',material:10},ok],shared);
  await run(admin,'issue',['offers'],hidden);
  const result=await run(manager,'issue',['offers'],shared);
  const issued=result.state.records.find(r=>r.id===result.recordId);
  assert.equal(issued.data.number,`DWP-A-${month}-0101/1`,'verborgenes Projekt wird mitgezählt');
  assert(!result.state.records.some(r=>r.projectId===hidden),'fremdes Projekt bleibt unsichtbar');
  console.log('Belegnummern: Format DWP-A/AB/R-JJJJMM-NNNN/Version, getrennte fortlaufende Zähler, Startwert, Storno, unveränderte Originale und mandantenweite Vergabe bestanden.');
})().catch(error=>{console.error(error);process.exit(1);});
