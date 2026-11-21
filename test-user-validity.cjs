// Befristete Zugänge, Nutzungszahlen je Benutzer, Ablauf-Erinnerung per Mail und
// täglicher Lauf (automatische Sicherung) gegen echtes PostgreSQL (PGlite).
const assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const ua=require('./lib/user-admin.cjs');
const {repository}=require('./lib/project-repository.cjs');
const {backupStore}=require('./lib/backup-store.cjs');
const {execute}=require('./lib/project-service.cjs');
const cron=require('./api/cron.js');
function response(){return {statusCode:200,status(n){this.statusCode=n;return this;},setHeader(){return this;},json(v){this.body=v;return this;},end(){return this;}};}
const plus=(n,now=new Date())=>{const [y,m,d]=ua.berlinToday(now).split('-').map(Number);return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10);};
(async()=>{
  const pg=new PGlite();
  try {
    await pg.exec(`CREATE TABLE "user"(id text PRIMARY KEY,name text NOT NULL,email text NOT NULL UNIQUE,"emailVerified" boolean DEFAULT false,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now(),role text,"tenantId" text)`);
    await pg.exec(fs.readFileSync('migrations/001-project-store.sql','utf8'));
    await pg.exec(fs.readFileSync('migrations/002-access-security.sql','utf8'));
    const db={query:async(sql,params)=>(await pg.query(sql,params)).rows};
    let n=0;const revoked=[];
    const auth={async createUser({name,email}){const id='u'+(++n);await db.query('INSERT INTO "user"(id,name,email) VALUES($1,$2,$3)',[id,name,email]);return {id};},async setPassword(){},async revokeSessions(id){revoked.push(id);}};
    await db.query('INSERT INTO "user"(id,name,email,role,"tenantId") VALUES($1,$2,$3,$4,$5)',['boss','Stephan Mangel','admin@dachwerkpro.de','admin','dachwerk']);
    const admin={id:'boss',name:'Stephan Mangel',role:'admin',tenantId:'dachwerk'},users=ua.userAdmin({db,auth});
    await ua.ensure(db);await db.query("INSERT INTO dwp_user_admin(user_id,tenant_id,contact_email) VALUES('boss','dachwerk','stephan@example.de')");

    // Resttage und Erinnerungsstufen.
    assert.equal(ua.daysLeft(plus(3)),3);assert.equal(ua.daysLeft(plus(0)),0);assert.equal(ua.daysLeft(plus(-1)),-1);assert.equal(ua.daysLeft(''),null);
    assert.deepEqual([9,7,5,3,2,1,0,-1,-40].map(ua.reminderStage),[null,'7','7','3','3','1','0','abgelaufen',null]);

    // Anlegen mit Ablaufdatum; Vergangenheit und ungültige Daten werden abgelehnt.
    await assert.rejects(users.create(admin,{name:'Alt',username:'alt',password:'Startpasswort-2026',validUntil:plus(-1)}),/Vergangenheit/);
    await assert.rejects(users.create(admin,{name:'Falsch',username:'falsch',password:'Startpasswort-2026',validUntil:'2026-02-30'}),/kein gültiges Datum/);
    const a=await users.create(admin,{name:'Anton Aaaaaa',username:'aaaaaa',password:'Startpasswort-2026',role:'viewer',validUntil:plus(3)});
    const b=await users.create(admin,{name:'Berta Dauer',username:'berta',password:'Startpasswort-2026',role:'editor'});
    assert.equal((await ua.status(db,a.id)).validUntil,plus(3));assert.equal((await ua.status(db,a.id)).expired,false);

    // Nutzung je Benutzer aus dem Zugriffsprotokoll.
    for(let i=0;i<4;i++)await db.query("INSERT INTO dwp_access_events(tenant_id,actor,actor_name,event_type) VALUES('dachwerk',$1,'Anton','login')",[a.id]);
    await db.query("INSERT INTO dwp_access_events(tenant_id,actor,actor_name,event_type,created_at) VALUES('dachwerk',$1,'Anton','login',now()-interval '60 days')",[a.id]);
    for(let i=0;i<7;i++)await db.query("INSERT INTO dwp_access_events(tenant_id,actor,actor_name,event_type,module_id) VALUES('dachwerk',$1,'Anton','module_open','lv')",[a.id]);
    await db.query("INSERT INTO dwp_access_events(tenant_id,actor,actor_name,event_type) VALUES('fremd',$1,'Anton','login')",[a.id]);
    let list=await users.list(admin);
    const la=list.users.find(u=>u.id===a.id),lb=list.users.find(u=>u.id===b.id);
    assert.deepEqual({logins30:la.usage.logins30,loginsTotal:la.usage.loginsTotal,moduleOpens30:la.usage.moduleOpens30},{logins30:4,loginsTotal:5,moduleOpens30:7},'Anmeldungen und Modulaufrufe gezählt, andere Betriebe nicht');
    assert(la.usage.lastActive && la.lastLogin);
    assert.deepEqual(lb.usage,{logins30:0,loginsTotal:0,moduleOpens30:0,lastActive:null});
    assert.equal(la.daysLeft,3);assert.equal(lb.validUntil,'');assert.equal(lb.daysLeft,null);
    assert.equal(list.alerts.length,1);assert.equal(list.alerts[0].text,`aaaaaa (Anton Aaaaaa): Zugang läuft in 3 Tagen ab (gültig bis ${plus(3).split('-').reverse().join('.')})`);

    // Eigener Administratorzugang bleibt unbefristet.
    await assert.rejects(users.update(admin,{userId:'boss',validUntil:plus(10)}),/unbefristet/);
    // Verlängern, entfristen, abgelaufen setzen (meldet sofort ab).
    await users.update(admin,{userId:b.id,validUntil:plus(30)});assert.equal((await ua.status(db,b.id)).validUntil,plus(30));
    await users.update(admin,{userId:b.id,validUntil:''});assert.equal((await ua.status(db,b.id)).validUntil,'');
    await users.update(admin,{userId:b.id,name:'Berta Dauer'});assert.equal((await ua.status(db,b.id)).validUntil,'','ohne Angabe bleibt die Frist unverändert');
    revoked.length=0;await db.query('UPDATE dwp_user_admin SET valid_until=$2::date WHERE user_id=$1',[b.id,plus(-2)]);
    const expired=await ua.status(db,b.id);assert.equal(expired.expired,true);
    assert.match(ua.denial(expired),/Zugang ist am .* abgelaufen/);assert.equal(ua.denial(await ua.status(db,a.id)),'');
    assert.match(ua.denial({blocked:true}),/gesperrt/);
    list=await users.list(admin);assert.equal(list.users.find(u=>u.id===b.id).expired,true);assert.equal(list.alerts[0].userId,b.id,'Abgelaufene zuerst');

    // Erinnerungen: jede Stufe genau einmal.
    let due=await ua.dueReminders(db);
    assert.deepEqual(due.map(r=>[r.username,r.stage]).sort(),[['aaaaaa','3'],['berta','abgelaufen']]);
    await ua.markReminded(db,due);assert.equal((await ua.dueReminders(db)).length,0);
    const twoDaysLater=new Date(Date.now()+2*864e5);
    assert.deepEqual((await ua.dueReminders(db,twoDaysLater)).map(r=>[r.username,r.stage]),[['aaaaaa','1']],'nächste Stufe erneut gemeldet');
    // Neues Datum setzt die Erinnerung zurück.
    await users.update(admin,{userId:a.id,validUntil:plus(7)});assert.deepEqual((await ua.dueReminders(db)).map(r=>r.stage),['7']);
    await users.update(admin,{userId:a.id,validUntil:plus(3)});
    await db.query("UPDATE dwp_user_admin SET expiry_notice='' WHERE user_id=$1",[b.id]);

    // Täglicher Lauf: automatische Sicherung einmal pro Tag und Mail an den Administrator.
    const repo=repository({query:db.query}),store=backupStore({query:db.query});
    const r0=await execute(repo,admin,{method:'save',args:['customers',{name:'Kunde Cron'}],revision:0});assert(r0.recordId);
    const mails=[];let failMail=true;
    const env={BETTER_AUTH_URL:'https://www.dachwerkpro.de'};
    const handler=cron.createHandler({db:async()=>db,repository:()=>repo,backupStore:()=>store,sendMail:async m=>{if(failMail)throw Error('SMTP nicht erreichbar');mails.push(m);},now:()=>new Date(),env});
    let res=response();await handler({headers:{'user-agent':'curl'}},res);assert.equal(res.statusCode,401,'nur Vercel Cron');
    res=response();await handler({headers:{'user-agent':'vercel-cron/1.0'}},res);
    assert.equal(res.statusCode,200);assert.equal(res.body.backups.length,1);assert.match(res.body.backups[0],/^DWP_Sicherung_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/);
    assert.equal(res.body.reminders,0);assert.match(res.body.mailErrors[0],/SMTP/);
    failMail=false;res=response();await handler({headers:{'user-agent':'vercel-cron/1.0'}},res);
    assert.equal(res.body.backups.length,0,'nur eine automatische Sicherung pro Tag');assert.equal(res.body.reminders,2,'nach Fehlschlag am nächsten Lauf erneut');
    assert.equal(mails.length,1);assert.equal(mails[0].to,'stephan@example.de');
    assert.match(mails[0].text,/aaaaaa \(Anton Aaaaaa\): Zugang läuft in 3 Tagen ab/);assert.match(mails[0].text,/berta \(Berta Dauer\): Zugang ist am .* abgelaufen/);
    assert(mails[0].text.includes('https://www.dachwerkpro.de/?start=app&module=users'),'Direktlink zur Anwenderverwaltung');
    res=response();await handler({headers:{'user-agent':'vercel-cron/1.0'}},res);assert.equal(res.body.reminders,0);assert.equal(mails.length,1,'keine doppelte Mail');
    const listed=await store.list('dachwerk');assert.equal(listed.length,1);assert.equal(listed[0].kind,'automatisch');assert.equal(listed[0].createdBy,'Automatisch');assert.equal(listed[0].records,1);
    // Mit CRON_SECRET nur mit passendem Schlüssel.
    const secret=cron.createHandler({db:async()=>db,repository:()=>repo,backupStore:()=>store,sendMail:async()=>{},now:()=>new Date(),env:{CRON_SECRET:'geheim'}});
    res=response();await secret({headers:{'user-agent':'vercel-cron/1.0'}},res);assert.equal(res.statusCode,401);
    res=response();await secret({headers:{authorization:'Bearer geheim'}},res);assert.equal(res.statusCode,200);
    assert.equal(cron.reminderMail([{username:'x',name:'X',validUntil:plus(1),daysLeft:1}],env).subject,'DachWerkPro – x (X): Zugang läuft ab');
    console.log('Befristete Zugänge: Ablaufdatum, Sperre nach Ablauf, Nutzungszählung, Hinweise, Erinnerungsmail je Stufe einmal und tägliche Sicherung bestanden');
  }finally{await pg.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
