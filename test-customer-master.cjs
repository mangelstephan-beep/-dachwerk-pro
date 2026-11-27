// Module 01: customer master data and its hand-over to projects, documents and payments.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Store,customerAddressLines,nextCustomerNumber}=require('./project-core.js');
const {execute,memoryRepository,visibleState}=require('./lib/project-service.cjs');
let raw=null;const db=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});
const ok={status:'Freigegeben',owner:'Prüfer'};
db.settings({wage:0,agk:0,profit:0,tax:19});

// Customer numbers: automatic from 10001, manual allowed once, unique, never from the row count.
const a=db.save('customers',{name:'Hausverwaltung Nord GmbH',address:'Am Deich 4',postalCode:'28195',location:'Bremen',vatId:'de 123.456.789',customerType:'Gewerbekunde'});
assert.equal(a.data.customerNumber,'10001');assert.equal(a.data.country,'DE');assert.equal(a.data.vatId,'DE123456789');
const manual=db.save('customers',{name:'Altkunde aus Vorsystem',customerNumber:'10050'});
assert.equal(manual.data.customerNumber,'10050');
const b=db.save('customers',{name:'Familie Muster',customerType:'Privatkunde',address:'Lindenweg 2',postalCode:'6020',location:'Innsbruck',country:'at'});
assert.equal(b.data.customerNumber,'10051','highest number + 1, not number of rows');assert.equal(b.data.country,'AT');
assert.throws(()=>db.save('customers',{name:'Dublette',customerNumber:'10001'}),/bereits vergeben/);
assert.throws(()=>db.save('customers',{name:'Hausverwaltung Nord GmbH',customerNumber:'20000'},{id:a.id}),/bleibt unverändert/);
const edited=db.save('customers',{name:'Hausverwaltung Nord GmbH',address:'Am Deich 6',postalCode:'28195',location:'Bremen',vatId:'DE123456789'},{id:a.id});
assert.equal(edited.data.customerNumber,'10001','empty form field keeps the assigned number');
assert.throws(()=>db.save('customers',{name:'PLZ falsch',postalCode:'2819'}),/fünfstellig/);
assert.throws(()=>db.save('customers',{name:'Land falsch',country:'Deutschland'}),/ISO-Code/);
assert.throws(()=>db.save('customers',{name:'USt falsch',vatId:'DE12345'}),/USt-IdNr/);
assert.throws(()=>db.save('customers',{name:'Nummer falsch',customerNumber:'K 1/2'}),/Kundennummer/);
assert.throws(()=>db.save('customers',{name:'Art falsch',customerType:'VIP'}),/Kundenart/);

// Older customers without number keep working and receive a number on their next save only.
const legacy=JSON.parse(raw);legacy.records.push({id:'legacy-customer',module:'customers',projectId:null,status:'Neu',data:{name:'Bestandskunde',address:'Hafenstraße 1',location:'Bremen'}});
legacy.revision++;raw=JSON.stringify(legacy);const migrated=new Store({getItem:()=>raw,setItem:(_k,v)=>raw=v});
assert.equal(migrated.get('legacy-customer').data.customerNumber,undefined,'no silent renumbering on load');
assert.equal(migrated.save('customers',{name:'Bestandskunde',address:'Hafenstraße 1',location:'Bremen'},{id:'legacy-customer'}).data.customerNumber,'10052');
const duplicate=JSON.parse(raw);duplicate.records.find(r=>r.id===b.id).data.customerNumber='10001';
assert.throws(()=>migrated.restore(JSON.stringify(duplicate)),/doppelt/);

// One address format for print, PDF and later e-invoices, including old snapshots that used "city".
assert.deepEqual(customerAddressLines(edited.data),['Am Deich 6','28195 Bremen']);
assert.deepEqual(customerAddressLines(b.data),['Lindenweg 2','6020 Innsbruck','AT']);
assert.deepEqual(customerAddressLines({address:'Alte Straße 1',city:'Hamburg'}),['Alte Straße 1','Hamburg']);
assert.deepEqual(customerAddressLines(undefined),[]);
assert.equal(nextCustomerNumber([]),'10001');
const pdfSource=fs.readFileSync('./lib/offer-pdf.cjs','utf8');
assert(pdfSource.includes('customerAddressLines(d.customer)') && !pdfSource.includes('customer.city'),'offer PDF prints postcode and town');
const printSource=fs.readFileSync('./project-workflows.js','utf8');
assert(printSource.includes('core.customerAddressLines(d.customer)'),'print view uses the shared address format');

// Customer → project → offer → invoice → payment: snapshot and overview across projects.
const p1=migrated.save('projects',{name:'Dach Am Deich',customerId:a.id,phase:'Erfassung'});
const pos=migrated.save('lv',{number:'010',text:'Abdichtung',qty:10,unit:'m²',material:10},ok);
const offer=migrated.issue('offers');
assert.equal(offer.data.customer.customerNumber,'10001');assert.equal(offer.data.customer.postalCode,'28195');assert.equal(offer.data.customer.vatId,'DE123456789');
migrated.save('orders',{title:'Auftrag',offerId:offer.id,date:'2026-11-14'},ok);
migrated.save('measurements',{title:'Aufmaß',positionId:pos.id,length:10,width:1,factor:1,date:'2026-11-14'},ok);
const invoice=migrated.issue('invoices');assert.equal(invoice.data.customer.location,'Bremen');
migrated.save('payments',{title:'Teilzahlung',invoiceId:invoice.id,amount:50,date:'2026-11-14'},ok);
const p2=migrated.save('projects',{name:'Garage',customerId:a.id,phase:'Erfassung'});
migrated.select(p2.id);
migrated.save('customers',{name:'Hausverwaltung Nord GmbH',address:'Neue Allee 9',postalCode:'28203',location:'Bremen'},{id:a.id});
assert.equal(migrated.get(invoice.id).data.customer.address,'Am Deich 6','issued documents keep the historical customer data');
const overview=migrated.customerOverview(a.id);
assert.equal(overview.customerNumber,'10001');assert.deepEqual(overview.projects.map(p=>p.name),['Dach Am Deich','Garage']);
assert.equal(overview.offers,1);assert.equal(overview.offerNet,100);assert.equal(overview.invoices,1);
assert.equal(overview.gross,119);assert.equal(overview.paid,50);assert.equal(overview.outstanding,69);
assert.deepEqual(overview.address,['Neue Allee 9','28203 Bremen']);
assert.equal(migrated.customerOverview(b.id).projects.length,0);
assert.throws(()=>migrated.customerOverview(p1.id),/nicht gefunden/);

// Server: numbers are allocated against the whole tenant, also when an editor sees only some customers.
(async()=>{
  const repo=memoryRepository(),admin={id:'admin',name:'Inhaber',role:'admin',tenantId:'t'},editor={id:'editor',name:'Bauleitung',role:'editor',tenantId:'t'};
  const run=async(actor,method,args,projectId)=>execute(repo,actor,{method,args,projectId,revision:(await repo.read('t')).state.revision});
  const hidden=await run(admin,'save',['customers',{name:'Nur für Inhaber sichtbar'}]);
  const own=await run(editor,'save',['customers',{name:'Neuer Kunde der Bauleitung',postalCode:'28195',location:'Bremen'}]);
  const state=(await repo.read('t')).state;
  assert.equal(state.records.find(r=>r.id===hidden.recordId).data.customerNumber,'10001');
  assert.equal(state.records.find(r=>r.id===own.recordId).data.customerNumber,'10002');
  assert(!visibleState(state,editor).records.some(r=>r.id===hidden.recordId),'foreign customer stays hidden');
  await assert.rejects(run(editor,'save',['customers',{name:'Doppelt',customerNumber:'10001'}]),/bereits vergeben/);
  console.log('Customer master: automatic/manual unique numbers, immutability, legacy migration, PLZ/country/VAT checks, shared address format, document snapshots and cross-project overview passed.');
})().catch(error=>{console.error(error);process.exit(1);});
