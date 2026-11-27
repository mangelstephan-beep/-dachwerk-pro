// Benutzerverwaltung gegen echtes PostgreSQL (PGlite): Kurznamen, Startpasswort
// mit Pflichtwechsel, Sperren mit Sitzungsende, Schutz vor Selbstaussperrung.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {userAdmin,status,loginEmail,normalizeUsername}=require('./lib/user-admin.cjs');
(async()=>{
  const pg=new PGlite();
  try {
    await pg.exec(`CREATE TABLE "user"(id text PRIMARY KEY,name text NOT NULL,email text NOT NULL UNIQUE,"emailVerified" boolean DEFAULT false,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now(),role text,"tenantId" text)`);
    await pg.exec(fs.readFileSync('migrations/002-access-security.sql','utf8'));
    const db={query:async(sql,params)=>(await pg.query(sql,params)).rows};
    const passwords=new Map(),revoked=[];let n=0;
    const auth={
      async createUser({name,email,password}){const id='u'+(++n);await db.query('INSERT INTO "user"(id,name,email) VALUES($1,$2,$3)',[id,name,email]);passwords.set(id,password);return {id};},
      async setPassword(id,password){passwords.set(id,password);},
      async revokeSessions(id){revoked.push(id);}
    };
    await db.query('INSERT INTO "user"(id,name,email,role,"tenantId") VALUES($1,$2,$3,$4,$5)',['boss','Stephan Mangel','mangel.stephan@icloud.com','admin','dachwerk']);
    await db.query('INSERT INTO "user"(id,name,email,role,"tenantId") VALUES($1,$2,$3,$4,$5)',['fremd','Fremd','x@y.de','admin','andererBetrieb']);
    const admin={id:'boss',name:'Stephan',role:'admin',tenantId:'dachwerk'},users=userAdmin({db,auth});

    assert.equal(loginEmail('Meier'),'meier@dachwerkpro.de');assert.equal(loginEmail('a@b.de'),'a@b.de');
    assert.throws(()=>normalizeUsername('Ä b'),/Benutzername/);
    await assert.rejects(users.list({...admin,role:'editor'}),/Administrator/);
    await assert.rejects(users.create(admin,{name:'Meier',username:'meier',role:'viewer',password:'kurz'}),/12 Zeichen/);

    // Anlegen mit Startpasswort: Pflichtwechsel ist gesetzt, Passwort taucht nirgends in der Liste auf.
    const m=await users.create(admin,{name:'Meier',username:'Meier',contactEmail:'meier@gmx.de',role:'viewer',password:'Startpasswort-2026'});
    assert.equal(m.login,'meier@dachwerkpro.de');
    assert.deepEqual(await status(db,m.id),{blocked:false,mustChangePassword:true,contactEmail:'meier@gmx.de',validUntil:'',expired:false});
    const listed=await users.list(admin);
    assert(!JSON.stringify(listed).includes('Startpasswort'),'kein Passwort in der Liste');
    assert.equal(listed.users.find(u=>u.id===m.id).username,'meier');
    assert(!listed.users.some(u=>u.id==='fremd'),'andere Betriebe bleiben unsichtbar');
    await assert.rejects(users.create(admin,{name:'Doppelt',username:'meier',password:'Startpasswort-2026'}),/vergeben/);
    await assert.rejects(users.block(admin,'fremd',true),/nicht gefunden/);

    // Eigener Wechsel hebt die Pflicht auf.
    await users.passwordChanged({...admin,id:m.id});
    assert.equal((await status(db,m.id)).mustChangePassword,false);

    // Sperren beendet alle Sitzungen, Entsperren gibt frei.
    await users.block(admin,m.id,true);
    assert.equal((await status(db,m.id)).blocked,true);assert(revoked.includes(m.id));
    await users.block(admin,m.id,false);assert.equal((await status(db,m.id)).blocked,false);
    await assert.rejects(users.block(admin,'boss',true),/selbst/);

    // Neues Passwort durch den Admin: wieder Startpasswort mit Pflichtwechsel.
    await users.setPassword(admin,m.id,'Neues-Startpasswort-1');
    assert.equal(passwords.get(m.id),'Neues-Startpasswort-1');assert.equal((await status(db,m.id)).mustChangePassword,true);

    // Bestehendes Admin-Konto wird zu „admin“, ID und alte Adresse für „Passwort vergessen“ bleiben.
    await users.update(admin,{userId:'boss',username:'admin'});
    const boss=(await users.list(admin)).users.find(u=>u.id==='boss');
    assert.equal(boss.login,'admin@dachwerkpro.de');assert.equal(boss.contactEmail,'mangel.stephan@icloud.com');
    await assert.rejects(users.update(admin,{userId:'boss',role:'viewer'}),/selbst/);
    await assert.rejects(users.update(admin,{userId:m.id,username:'admin'}),/vergeben/);
    // Rollenwechsel meldet den Benutzer ab, damit die neue Rolle sofort gilt.
    revoked.length=0;await users.update(admin,{userId:m.id,role:'editor'});assert.deepEqual(revoked,[m.id]);
    console.log('Benutzerverwaltung: Kurznamen, Startpasswort, Sperren und Mandantentrennung bestanden');
  }finally{await pg.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
