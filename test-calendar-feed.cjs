// Feiertage und Kalender-Abo (Outlook/iPhone) gegen echtes PostgreSQL (PGlite):
// Link erstellen, Feed abrufen, Sichtbarkeit wie in DachwerkPro, neuer Link
// ersetzt alten, Sperren, gesperrter Benutzer, kein Klartext-Link in der Datenbank.
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const core=require('./project-core.js');
const feed=require('./lib/calendar-feed.cjs');
const {createHandler}=require('./api/calendar.js');

// Feiertage
const hb=core.holidays(2026,'HB').map(h=>h.date+' '+h.name);
assert.deepEqual(hb,['2026-01-01 Neujahr','2026-04-03 Karfreitag','2026-04-06 Ostermontag','2026-05-01 Tag der Arbeit','2026-05-14 Christi Himmelfahrt','2026-05-25 Pfingstmontag','2026-10-03 Tag der Deutschen Einheit','2026-10-31 Reformationstag','2026-12-25 1. Weihnachtstag','2026-12-26 2. Weihnachtstag']);
assert.deepEqual(core.holidays(2026,'NI').map(h=>h.date),core.holidays(2026,'HB').map(h=>h.date),'Niedersachsen wie Bremen');
assert(!core.holidays(2017,'HB').every(h=>h.name!=='Reformationstag'),'2017 bundesweit Reformationstag');
assert(!core.holidays(2016,'HB').some(h=>h.name==='Reformationstag'),'Bremen erst ab 2018');
assert(core.holidays(2026,'NW').some(h=>h.date==='2026-06-04' && h.name==='Fronleichnam'));
assert(core.holidays(2026,'NW').some(h=>h.date==='2026-11-01' && h.name==='Allerheiligen'));
assert(!core.holidays(2026,'NW').some(h=>h.name==='Reformationstag'));
assert.equal(core.holidays(2026,'SN').find(h=>h.name==='Buß- und Bettag').date,'2026-11-18');
assert.equal(core.holidays(2025,'SN').find(h=>h.name==='Buß- und Bettag').date,'2025-11-19');
for(const [year,monday] of [[2024,'2024-04-01'],[2025,'2025-04-21'],[2027,'2027-03-29'],[2038,'2038-04-26']])assert.equal(core.holidays(year).find(h=>h.name==='Ostermontag').date,monday);
assert.deepEqual(core.holidaysBetween('2026-12-24','2027-01-02','HB').map(h=>h.date),['2026-12-25','2026-12-26','2027-01-01']);
assert.equal(core.holidays(2026,'XX').length,10,'unbekanntes Land fällt auf Bremen zurück');
// Einstellung Bundesland
{let raw='';const s=new core.Store({getItem:()=>raw||null,setItem:(_k,v)=>raw=v});
  s.settings({holidayState:'NW'});assert.equal(s.data.settings.holidayState,'NW');
  assert.throws(()=>s.settings({holidayState:'Bremen'}),/Bundesland/);}

(async()=>{
  const pg=new PGlite();
  try {
    await pg.exec(`CREATE TABLE "user"(id text PRIMARY KEY,name text NOT NULL,email text NOT NULL UNIQUE,role text,"tenantId" text)`);
    const db={query:async(sql,params)=>(await pg.query(sql,params)).rows};
    await db.query('INSERT INTO "user"(id,name,email,role,"tenantId") VALUES($1,$2,$3,$4,$5),($6,$7,$8,$9,$10)',['boss','Stephan Mangel','s@dwp.de','admin','dachwerk','u2','Meier, Jan','meier@dachwerkpro.de','viewer','dachwerk']);

    // Bestand: Meier ist Mitglied in Lesum, nicht in Vegesack.
    let raw='';const s=new core.Store({getItem:()=>raw||null,setItem:(_k,v)=>raw=v});
    const c=s.save('customers',{name:'Kunde'});
    const p1=s.save('projects',{name:'Flachdach Lesum',address:'Lesumer Heerstraße 1',customerId:c.id,phase:'Erfassung',memberIds:'u2'});
    const p2=s.save('projects',{name:'Geheimes Dach Vegesack',address:'Weserstraße 9',customerId:c.id,phase:'Erfassung'});
    const meier=s.save('personnel',{name:'Meier, Jan',number:'P2',employment:'Arbeiter',userId:'u2'});
    const schulz=s.save('personnel',{name:'Schulz',number:'P3',employment:'Arbeiter'});
    s.schedule(meier.id,{projectId:p1.id,start:'2026-10-29',end:'2026-11-02',task:'Abdichtung; Attika, Ecke'});
    s.schedule(schulz.id,{projectId:p2.id,start:'2026-11-03',end:'2026-11-03',task:'Aufmaß'});
    const gone=s.schedule(schulz.id,{projectId:p1.id,start:'2026-11-10',end:'2026-11-10',task:'Storniert'});
    s.cancelSchedule(schulz.id,gone.id);
    const state=JSON.parse(raw);

    let actor={id:'u2',name:'Meier, Jan',role:'viewer',tenantId:'dachwerk'};const events=[];
    const handler=createHandler({sessionFromRequest:async()=>{if(!actor)throw Object.assign(Error('Bitte anmelden.'),{status:401});return actor;},authDb:async()=>db,repository:()=>({read:async()=>({state})}),accessRepository:()=>({event:async(a,type)=>events.push(type)})});
    const call=(method,url,body)=>new Promise(resolve=>{
      const res={headers:{},statusCode:0,setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},status(c){this.statusCode=c;return this;},json(v){resolve({status:this.statusCode,json:v,headers:this.headers});},end(v){resolve({status:this.statusCode,body:v,headers:this.headers});}};
      handler({method,url,query:{},headers:{host:'www.dachwerkpro.de',origin:'https://www.dachwerkpro.de','content-type':'application/json','user-agent':'test'},body},res);
    });

    assert.deepEqual((await call('GET','/api/calendar')).json,{active:false});
    const made=await call('POST','/api/calendar',{action:'create'});
    assert.equal(made.status,200);assert.equal(made.json.active,true);
    const m=made.json.url.match(/^https:\/\/www\.dachwerkpro\.de\/kalender\/([A-Za-z0-9_-]{43})\.ics$/);assert(m,'Link-Format');
    const token=m[1];
    const stored=await db.query('SELECT token_hash FROM dwp_calendar_feeds');
    assert.equal(stored.length,1);assert.equal(stored[0].token_hash,feed.hash(token));assert(!JSON.stringify(stored).includes(token),'kein Klartext-Link in der Datenbank');
    assert.deepEqual(events,['calendar_feed_created']);

    // Abruf ohne Anmeldung über den Rewrite-Pfad.
    actor=null;
    const ics=await call('GET','/kalender/'+token+'.ics');
    assert.equal(ics.status,200);assert.match(ics.headers['content-type'],/^text\/calendar/);
    const text=ics.body.replace(/\r\n /g,'');
    assert(ics.body.startsWith('BEGIN:VCALENDAR\r\n') && ics.body.endsWith('END:VCALENDAR\r\n'));
    assert(ics.body.split('\r\n').every(l=>Buffer.byteLength(l)<=75),'Zeilen gefaltet');
    assert(text.includes('SUMMARY:Flachdach Lesum · Lesumer Heerstraße 1 (Abdichtung\\; Attika\\, Ecke)'),'eigener Einsatz, Sonderzeichen maskiert');
    assert(text.includes('DTSTART;VALUE=DATE:20261029') && text.includes('DTEND;VALUE=DATE:20261103'),'ganztägig bis einschließlich Endtag');
    assert(text.includes('Feiertag im Zeitraum: 31.10. Reformationstag'));
    assert(text.includes('STATUS:TENTATIVE'));
    assert(!text.includes('Geheimes Dach') && !text.includes('Aufmaß'),'fremdes Projekt bleibt verborgen');
    assert(!text.includes('Storniert'),'stornierte Einsätze fehlen');
    assert(text.includes('SUMMARY:Feiertag: Reformationstag') && text.includes('UID:feiertag-2026-10-31-HB@dachwerkpro.de'));
    assert(text.includes('X-WR-CALNAME:DachwerkPro · Meier\\, Jan'));
    assert((await db.query('SELECT last_used_at FROM dwp_calendar_feeds'))[0].last_used_at,'Abruf wird vermerkt');

    // Administrator sieht alle Einsätze mit Namen.
    actor={id:'boss',name:'Stephan Mangel',role:'admin',tenantId:'dachwerk'};
    const bossLink=(await call('POST','/api/calendar',{action:'create'})).json.url.split('/').pop();
    actor=null;
    const all=(await call('GET','/kalender/'+bossLink)).body.replace(/\r\n /g,'');
    assert(all.includes('SUMMARY:Schulz: Geheimes Dach Vegesack · Weserstraße 9 (Aufmaß)'));
    assert(all.includes('SUMMARY:Meier\\, Jan: Flachdach Lesum'));

    // Neuer Link ersetzt den alten; Sperren beendet den Abruf.
    actor={id:'u2',name:'Meier, Jan',role:'viewer',tenantId:'dachwerk'};
    const second=(await call('POST','/api/calendar',{action:'create'})).json.url.split('/').pop();
    actor=null;
    assert.equal((await call('GET','/kalender/'+token+'.ics')).status,404,'alter Link ungültig');
    assert.equal((await call('GET','/kalender/'+second)).status,200);
    // Gesperrter Benutzer erhält keinen Feed mehr.
    await require('./lib/user-admin.cjs').ensure(db);
    await db.query('INSERT INTO dwp_user_admin(user_id,tenant_id,blocked) VALUES($1,$2,true)',['u2','dachwerk']);
    assert.equal((await call('GET','/kalender/'+second)).status,404,'gesperrtes Konto');
    await db.query('DELETE FROM dwp_user_admin');
    actor={id:'u2',name:'Meier, Jan',role:'viewer',tenantId:'dachwerk'};
    assert.deepEqual((await call('POST','/api/calendar',{action:'revoke'})).json,{active:false});
    actor=null;
    assert.equal((await call('GET','/kalender/'+second)).status,404,'gesperrter Link');
    assert.equal((await call('GET','/kalender/kurz.ics')).status,404,'ungültiges Format');
    assert.equal((await call('GET','/api/calendar')).status,401,'ohne Anmeldung kein Status');

    // Fremde Herkunft wird abgewiesen.
    actor={id:'u2',name:'Meier, Jan',role:'viewer',tenantId:'dachwerk'};
    const foreign=await new Promise(resolve=>{const res={headers:{},setHeader(){return this;},status(c){this.statusCode=c;return this;},json(v){resolve({status:this.statusCode,json:v});},end(){resolve({status:this.statusCode});}};
      handler({method:'POST',url:'/api/calendar',query:{},headers:{host:'www.dachwerkpro.de',origin:'https://evil.example','content-type':'application/json'},body:{action:'create'}},res);});
    assert.equal(foreign.status,403);
    console.log('Feiertage und Kalender-Abo: Tests bestanden');
  } finally {await pg.close();}
})().catch(error=>{console.error(error);process.exit(1);});
