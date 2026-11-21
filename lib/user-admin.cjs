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
// Zeitlich begrenzte Zugänge: gültig bis einschließlich valid_until (deutsche Ortszeit).
// expiry_notice merkt sich, welche Erinnerung (7/3/1/0 Tage, abgelaufen) schon an den Administrator ging.
const COLUMNS=['ALTER TABLE dwp_user_admin ADD COLUMN IF NOT EXISTS valid_until date',"ALTER TABLE dwp_user_admin ADD COLUMN IF NOT EXISTS expiry_notice text NOT NULL DEFAULT ''"];
const ready=new WeakMap();
function ensure(db) {
  if(!ready.has(db))ready.set(db,(async()=>{await db.query(SCHEMA);for(const sql of COLUMNS)await db.query(sql);})().catch(error=>{ready.delete(db);throw error;}));
  return ready.get(db);
}
const berlinToday=(now=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(now);
// Resttage bis einschließlich Ablaufdatum: 0 = heute letzter Tag, negativ = abgelaufen.
function daysLeft(validUntil,now=new Date()) {
  if(!validUntil)return null;
  const [y,m,d]=validUntil.split('-').map(Number),[ty,tm,td]=berlinToday(now).split('-').map(Number);
  return Math.round((Date.UTC(y,m-1,d)-Date.UTC(ty,tm-1,td))/864e5);
}
const germanDate=v=>v?v.split('-').reverse().join('.'):'';
function checkValidUntil(value) {
  if(value===null || value===undefined || value==='')return null;
  const v=String(value).trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v+'T00:00:00Z')) || new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw fail(422,'„Zugang gültig bis“ ist kein gültiges Datum.');
  return v;
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
  try{await ensure(db);}catch(error){if(error.code==='42501')return {blocked:false,mustChangePassword:false,contactEmail:'',validUntil:'',expired:false};throw error;}
  const rows=await db.query("SELECT blocked,must_change_password,contact_email,to_char(valid_until,'YYYY-MM-DD') AS valid_until FROM dwp_user_admin WHERE user_id=$1",[userId]);
  const row=rows[0],validUntil=row?.valid_until || '';
  return {blocked:Boolean(row?.blocked),mustChangePassword:Boolean(row?.must_change_password),contactEmail:row?.contact_email || '',validUntil,expired:validUntil?daysLeft(validUntil)<0:false};
}
// Meldetext für gesperrte oder abgelaufene Konten (Anmeldung, Sitzung, Passwort-Mail).
function denial(account) {
  if(account.blocked)return 'Dieses Konto ist gesperrt. Bitte wende dich an den Administrator.';
  if(account.expired)return `Dein Zugang ist am ${germanDate(account.validUntil)} abgelaufen. Bitte wende dich an den Administrator.`;
  return '';
}
async function setValidUntil(db,userId,validUntil) {
  await db.query('UPDATE dwp_user_admin SET valid_until=$2::date,expiry_notice=\'\',updated_at=now() WHERE user_id=$1',[userId,validUntil]);
}
// Nutzung je Benutzer aus dem Zugriffsprotokoll (Anmeldungen und Modulaufrufe).
async function usage(db,tenantId) {
  const rows=await db.query(`SELECT actor,
      count(*) FILTER (WHERE event_type='login' AND created_at>=now()-interval '30 days')::int AS logins30,
      count(*) FILTER (WHERE event_type='login')::int AS logins_total,
      count(*) FILTER (WHERE event_type='module_open' AND created_at>=now()-interval '30 days')::int AS opens30,
      max(created_at) FILTER (WHERE event_type='login') AS last_login,
      max(created_at) AS last_active
    FROM dwp_access_events WHERE tenant_id=$1 GROUP BY actor`,[tenantId]).catch(error=>{
    // Frische Datenbank ohne Zugriffsprotokoll: Liste trotzdem liefern.
    if(/dwp_access_events/.test(error.message))return [];throw error;
  });
  return new Map(rows.map(r=>[r.actor,r]));
}
// Erinnerungsstufe für ablaufende Zugänge: 7, 3, 1, 0 Tage vorher und einmal nach Ablauf.
function reminderStage(left) {
  if(left===null)return null;
  if(left<0)return left>=-30?'abgelaufen':null;
  if(left<=1)return String(left);
  if(left<=3)return '3';
  if(left<=7)return '7';
  return null;
}
function expiryText(u) {
  const name=u.username?`${u.username} (${u.name})`:u.name;
  if(u.daysLeft<0)return `${name}: Zugang ist am ${germanDate(u.validUntil)} abgelaufen`;
  if(u.daysLeft===0)return `${name}: Zugang läuft heute ab (gültig bis ${germanDate(u.validUntil)})`;
  return `${name}: Zugang läuft in ${u.daysLeft} ${u.daysLeft===1?'Tag':'Tagen'} ab (gültig bis ${germanDate(u.validUntil)})`;
}
// Für den täglichen Lauf: fällige Erinnerungen aller Betriebe, noch nicht gemeldet.
async function dueReminders(db,now=new Date()) {
  await ensure(db);
  const rows=await db.query(`SELECT u.id,u.name,u.email,u."tenantId" AS tenant_id,to_char(a.valid_until,'YYYY-MM-DD') AS valid_until,a.expiry_notice
    FROM "user" u JOIN dwp_user_admin a ON a.user_id=u.id WHERE a.valid_until IS NOT NULL AND a.blocked=false ORDER BY a.valid_until`);
  return rows.map(r=>{const left=daysLeft(r.valid_until,now),stage=reminderStage(left);
    return {id:r.id,name:r.name,username:usernameOf(r.email),tenantId:r.tenant_id,validUntil:r.valid_until,daysLeft:left,stage,notice:stage?`${r.valid_until}:${stage}`:''};})
    .filter(r=>r.stage && r.notice!==rows.find(x=>x.id===r.id).expiry_notice);
}
async function markReminded(db,reminders) {
  for(const r of reminders)await db.query('UPDATE dwp_user_admin SET expiry_notice=$2 WHERE user_id=$1',[r.id,r.notice]);
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
      const rows=await db.query(`SELECT u.id,u.name,u.email,u.role,u."createdAt" AS created_at,a.contact_email,a.blocked,a.must_change_password,to_char(a.valid_until,'YYYY-MM-DD') AS valid_until
        FROM "user" u LEFT JOIN dwp_user_admin a ON a.user_id=u.id WHERE u."tenantId"=$1 ORDER BY lower(u.name)`,[actor.tenantId]);
      const used=await usage(db,actor.tenantId);
      const users=rows.map(r=>{const u=used.get(r.id) || {},left=daysLeft(r.valid_until || '');
        return {id:r.id,name:r.name,username:usernameOf(r.email),login:r.email,contactEmail:r.contact_email || (usernameOf(r.email)?'':r.email),role:r.role || 'viewer',
          blocked:Boolean(r.blocked),mustChangePassword:Boolean(r.must_change_password),self:r.id===actor.id,createdAt:r.created_at || null,lastLogin:u.last_login || null,
          validUntil:r.valid_until || '',daysLeft:left,expired:left!==null && left<0,
          usage:{logins30:u.logins30 || 0,loginsTotal:u.logins_total || 0,moduleOpens30:u.opens30 || 0,lastActive:u.last_active || null}};});
      // Hinweise für den Administrator: Zugänge, die in 7 Tagen oder weniger ablaufen oder seit höchstens 30 Tagen abgelaufen sind.
      const alerts=users.filter(u=>!u.blocked && u.daysLeft!==null && u.daysLeft<=7 && u.daysLeft>=-30).sort((a,b)=>a.daysLeft-b.daysLeft).map(u=>({userId:u.id,daysLeft:u.daysLeft,validUntil:u.validUntil,text:expiryText(u)}));
      return {domain:DOMAIN,roles:ROLES,users,alerts};
    },
    async create(actor,values) {
      owner(actor);await ensure(db);
      const name=String(values.name || '').trim();if(!name || name.length>80)throw fail(422,'Name fehlt.');
      const username=normalizeUsername(values.username),email=loginEmail(username),contactEmail=checkEmail(values.contactEmail),role=checkRole(values.role || 'viewer'),password=checkPassword(values.password);
      const validUntil=checkValidUntil(values.validUntil);
      if(validUntil && daysLeft(validUntil)<0)throw fail(422,'„Zugang gültig bis“ liegt in der Vergangenheit.');
      await emailFree(email);
      const user=await auth.createUser({name,email,password});
      await db.query('UPDATE "user" SET role=$1,"tenantId"=$2 WHERE id=$3',[role,actor.tenantId,user.id]);
      await upsert(db,actor,user.id,{contactEmail,blocked:false,mustChangePassword:true});
      if(validUntil)await setValidUntil(db,user.id,validUntil);
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
      // undefined = unverändert, '' = unbefristet. Der Administrator befristet sich nie selbst (keine Selbstaussperrung).
      const validUntil=values.validUntil===undefined?undefined:checkValidUntil(values.validUntil);
      if(validUntil && user.id===actor.id)throw fail(422,'Dein eigener Administratorzugang bleibt unbefristet.');
      await db.query('UPDATE "user" SET name=$1,email=$2,role=$3,"updatedAt"=now() WHERE id=$4',[name,email,role,user.id]);
      await upsert(db,actor,user.id,{contactEmail});
      if(validUntil!==undefined && validUntil!==(current.validUntil || null)){
        await setValidUntil(db,user.id,validUntil);
        if(validUntil && daysLeft(validUntil)<0)await auth.revokeSessions(user.id);
      }
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
module.exports={userAdmin,status,denial,ensure,normalizeUsername,loginEmail,usernameOf,checkPassword,daysLeft,berlinToday,germanDate,reminderStage,expiryText,dueReminders,markReminded,ROLES,DOMAIN,SCHEMA};
