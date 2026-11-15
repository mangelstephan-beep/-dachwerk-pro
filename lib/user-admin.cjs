'use strict';
// Benutzerverwaltung: Anmeldung mit Kurznamen (meier → meier@dachwerkpro.de),
// Startpasswort mit Pflichtwechsel, Sperren mit sofortiger Abmeldung und
// Passwort neu setzen durch den Administrator. Passwörter werden nie lesbar
// gespeichert, protokolliert oder zurückgegeben: Better Auth speichert nur den
// Hash. Die Zusatzangaben liegen in einer eigenen Tabelle, damit das
// Better-Auth-Schema unverändert bleibt.
const DOMAIN='dachwerkpro.de';
const ROLES={admin:'Administrator',manager:'Bauleitung',editor:'Mitarbeiter (bearbeiten)',hr:'Personal',viewer:'Mitarbeiter (nur lesen)'};
const MIN_PASSWORD=12;
const SCHEMA=`CREATE TABLE IF NOT EXISTS dwp_user_admin (
 user_id text PRIMARY KEY, tenant_id text NOT NULL, contact_email text NOT NULL DEFAULT '',
 blocked boolean NOT NULL DEFAULT false, must_change_password boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by text NOT NULL DEFAULT ''
)`;
const ready=new WeakMap();
function ensure(db) {
  if(!ready.has(db))ready.set(db,db.query(SCHEMA).catch(error=>{ready.delete(db);throw error;}));
  return ready.get(db);
}
const fail=(status,message)=>Object.assign(Error(message),{status});
function normalizeUsername(value) {
  const name=String(value || '').trim().toLowerCase().replace(/@dachwerkpro\.de$/,'');
  if(!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(name))throw fail(422,'Benutzername: 2 bis 32 Zeichen, nur Kleinbuchstaben, Ziffern, Punkt, Bindestrich oder Unterstrich.');
  return name;
}
// Anmeldename für Better Auth: „meier“ wird zu meier@dachwerkpro.de, eine volle E-Mail bleibt.
const loginEmail=value=>{const v=String(value || '').trim().toLowerCase();return v.includes('@')?v:`${v}@${DOMAIN}`;};
const usernameOf=email=>String(email || '').toLowerCase().endsWith('@'+DOMAIN)?String(email).slice(0,-DOMAIN.length-1):'';
function checkEmail(value) {
  const email=String(value || '').trim().toLowerCase();
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fail(422,'E-Mail für „Passwort vergessen“ ist ungültig.');
  return email;
}
function checkPassword(value) {
  if(typeof value!=='string' || value.length<MIN_PASSWORD || value.length>128)throw fail(422,`Passwort: mindestens ${MIN_PASSWORD} Zeichen.`);
  return value;
}
function checkRole(value){if(!Object.hasOwn(ROLES,value))throw fail(422,'Rolle ungültig.');return value;}
async function status(db,userId) {
  // Darf der Datenbankbenutzer die Tabelle nicht anlegen, kann auch niemand gesperrt sein:
  // dann gelten die Standardwerte, statt alle Anmeldungen zu blockieren.
  try{await ensure(db);}catch(error){if(error.code==='42501')return {blocked:false,mustChangePassword:false,contactEmail:''};throw error;}
  const rows=await db.query('SELECT blocked,must_change_password,contact_email FROM dwp_user_admin WHERE user_id=$1',[userId]);
  const row=rows[0];
  return {blocked:Boolean(row?.blocked),mustChangePassword:Boolean(row?.must_change_password),contactEmail:row?.contact_email || ''};
}
async function upsert(db,actor,userId,values) {
  await ensure(db);
  await db.query(`INSERT INTO dwp_user_admin(user_id,tenant_id,contact_email,blocked,must_change_password,updated_by,updated_at)
    VALUES($1,$2,COALESCE($3,''),COALESCE($4,false),COALESCE($5,false),$6,now())
    ON CONFLICT(user_id) DO UPDATE SET contact_email=COALESCE($3,dwp_user_admin.contact_email),blocked=COALESCE($4,dwp_user_admin.blocked),
    must_change_password=COALESCE($5,dwp_user_admin.must_change_password),updated_by=$6,updated_at=now()`,
  [userId,actor.tenantId,values.contactEmail ?? null,values.blocked ?? null,values.mustChangePassword ?? null,actor.id]);
}
// deps: {db:{query}, auth:{createUser({name,email,password}), setPassword(userId,password), revokeSessions(userId)}}
function userAdmin(deps) {
  const {db,auth}=deps;
  const owner=actor=>{if(actor?.role!=='admin')throw fail(403,'Nur der Administrator verwaltet Benutzer.');};
  async function tenantUser(actor,userId) {
    const rows=await db.query('SELECT id,name,email,role,"tenantId" FROM "user" WHERE id=$1',[String(userId || '')]);
    if(!rows[0] || rows[0].tenantId!==actor.tenantId)throw fail(404,'Benutzer nicht gefunden.');
    return rows[0];
  }
  async function admins(actor){return (await db.query('SELECT u.id FROM "user" u LEFT JOIN dwp_user_admin a ON a.user_id=u.id WHERE u."tenantId"=$1 AND u.role=$2 AND COALESCE(a.blocked,false)=false',[actor.tenantId,'admin'])).map(r=>r.id);}
  async function emailFree(email,exceptId) {
    const rows=await db.query('SELECT id FROM "user" WHERE lower(email)=$1',[email]);
    if(rows.some(r=>r.id!==exceptId))throw fail(409,'Dieser Benutzername ist schon vergeben.');
  }
  return {
    async list(actor) {
      owner(actor);await ensure(db);
      const rows=await db.query(`SELECT u.id,u.name,u.email,u.role,u."createdAt" AS created_at,a.contact_email,a.blocked,a.must_change_password,
        (SELECT max(e.created_at) FROM dwp_access_events e WHERE e.tenant_id=u."tenantId" AND e.actor=u.id AND e.event_type='login') AS last_login
        FROM "user" u LEFT JOIN dwp_user_admin a ON a.user_id=u.id WHERE u."tenantId"=$1 ORDER BY lower(u.name)`,[actor.tenantId]).catch(async error=>{
        // Ohne Zugriffsprotokoll (frische Datenbank) trotzdem die Liste liefern.
        if(!/dwp_access_events/.test(error.message))throw error;
        return db.query(`SELECT u.id,u.name,u.email,u.role,u."createdAt" AS created_at,a.contact_email,a.blocked,a.must_change_password,NULL AS last_login
          FROM "user" u LEFT JOIN dwp_user_admin a ON a.user_id=u.id WHERE u."tenantId"=$1 ORDER BY lower(u.name)`,[actor.tenantId]);
      });
      return {domain:DOMAIN,roles:ROLES,users:rows.map(r=>({id:r.id,name:r.name,username:usernameOf(r.email),login:r.email,contactEmail:r.contact_email || (usernameOf(r.email)?'':r.email),role:r.role || 'viewer',
        blocked:Boolean(r.blocked),mustChangePassword:Boolean(r.must_change_password),self:r.id===actor.id,createdAt:r.created_at || null,lastLogin:r.last_login || null}))};
    },
    async create(actor,values) {
      owner(actor);await ensure(db);
      const name=String(values.name || '').trim();if(!name || name.length>80)throw fail(422,'Name fehlt.');
      const username=normalizeUsername(values.username),email=loginEmail(username),contactEmail=checkEmail(values.contactEmail),role=checkRole(values.role || 'viewer'),password=checkPassword(values.password);
      await emailFree(email);
      const user=await auth.createUser({name,email,password});
      await db.query('UPDATE "user" SET role=$1,"tenantId"=$2 WHERE id=$3',[role,actor.tenantId,user.id]);
      await upsert(db,actor,user.id,{contactEmail,blocked:false,mustChangePassword:true});
      return {id:user.id,username,login:email};
    },
    async update(actor,values) {
      owner(actor);await ensure(db);
      const user=await tenantUser(actor,values.userId);
      const name=String(values.name ?? user.name).trim();if(!name || name.length>80)throw fail(422,'Name fehlt.');
      const role=checkRole(values.role || user.role || 'viewer');
      if(user.id===actor.id && role!=='admin')throw fail(422,'Du kannst dir die Administratorrolle nicht selbst entziehen.');
      const email=values.username!==undefined?loginEmail(normalizeUsername(values.username)):user.email;
      if(email!==user.email)await emailFree(email,user.id);
      // Wer bisher mit einer echten Adresse angemeldet war, behält sie für „Passwort vergessen“.
      const current=await status(db,user.id);
      let contactEmail=values.contactEmail!==undefined?checkEmail(values.contactEmail):current.contactEmail;
      if(!contactEmail && !usernameOf(user.email))contactEmail=user.email;
      await db.query('UPDATE "user" SET name=$1,email=$2,role=$3,"updatedAt"=now() WHERE id=$4',[name,email,role,user.id]);
      await upsert(db,actor,user.id,{contactEmail});
      if(role!==user.role)await auth.revokeSessions(user.id);
      return {id:user.id,login:email};
    },
    async block(actor,userId,blocked) {
      owner(actor);await ensure(db);
      const user=await tenantUser(actor,userId);
      if(user.id===actor.id && blocked)throw fail(422,'Du kannst dich nicht selbst sperren.');
      if(blocked && user.role==='admin' && (await admins(actor)).filter(id=>id!==user.id).length===0)throw fail(422,'Der letzte aktive Administrator kann nicht gesperrt werden.');
      await upsert(db,actor,user.id,{blocked:Boolean(blocked)});
      if(blocked)await auth.revokeSessions(user.id);
      return {id:user.id,blocked:Boolean(blocked)};
    },
    async setPassword(actor,userId,password) {
      owner(actor);await ensure(db);
      const user=await tenantUser(actor,userId);
      await auth.setPassword(user.id,checkPassword(password));
      await auth.revokeSessions(user.id);
      // Eigenes Passwort gilt sofort; jedes andere ist ein Startpasswort.
      await upsert(db,actor,user.id,{mustChangePassword:user.id!==actor.id});
      return {id:user.id,mustChangePassword:user.id!==actor.id};
    },
    async passwordChanged(actor){await upsert(db,actor,actor.id,{mustChangePassword:false});},
  };
}
module.exports={userAdmin,status,ensure,normalizeUsername,loginEmail,usernameOf,checkPassword,ROLES,DOMAIN,SCHEMA};
