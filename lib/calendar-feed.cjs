'use strict';
// Kalender-Abo für Outlook, iPhone und Google (iCalendar, RFC 5545).
// Jeder Benutzer erzeugt in Modul 18 einen persönlichen Link. In der Datenbank
// liegt nur der SHA-256-Hash des Links, nie der Link selbst. Ein neuer Link
// ersetzt den alten; „Link sperren“ löscht ihn. Der Feed enthält genau die
// Einsätze, die der Benutzer auch in DachwerkPro sieht (gleiche Prüfung wie
// /api/projects), dazu die Feiertage des eingestellten Bundeslands.
const {randomBytes,createHash}=require('node:crypto');
const core=require('../project-core.js');
const {visibleState}=require('./project-service.cjs');
const SCHEMA=`CREATE TABLE IF NOT EXISTS dwp_calendar_feeds (
 user_id text PRIMARY KEY, tenant_id text NOT NULL, token_hash text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz
)`;
const ready=new WeakMap();
function ensure(db) {
  if(!ready.has(db))ready.set(db,db.query(SCHEMA).catch(error=>{ready.delete(db);throw error;}));
  return ready.get(db);
}
const hash=token=>createHash('sha256').update(token).digest('hex');
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
async function info(db,actor) {
  await ensure(db);
  const row=(await db.query('SELECT created_at,last_used_at FROM dwp_calendar_feeds WHERE user_id=$1 AND tenant_id=$2',[actor.id,actor.tenantId]))[0];
  return row?{active:true,createdAt:new Date(row.created_at).toISOString(),lastUsedAt:row.last_used_at?new Date(row.last_used_at).toISOString():null}:{active:false};
}
async function create(db,actor) {
  await ensure(db);
  const token=randomBytes(32).toString('base64url');
  await db.query(`INSERT INTO dwp_calendar_feeds(user_id,tenant_id,token_hash) VALUES($1,$2,$3)
    ON CONFLICT(user_id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id,token_hash=EXCLUDED.token_hash,created_at=now(),last_used_at=NULL`,[actor.id,actor.tenantId,hash(token)]);
  return token;
}
async function revoke(db,actor) {
  await ensure(db);
  await db.query('DELETE FROM dwp_calendar_feeds WHERE user_id=$1 AND tenant_id=$2',[actor.id,actor.tenantId]);
}
// Liefert den aktuellen Benutzer zum Link oder null (unbekannt, gesperrt, Mandant passt nicht).
async function owner(db,token) {
  if(!TOKEN.test(token || ''))return null;
  await ensure(db);
  const row=(await db.query(`UPDATE dwp_calendar_feeds SET last_used_at=now() WHERE token_hash=$1
    RETURNING user_id,tenant_id`,[hash(token)]))[0];
  if(!row)return null;
  const user=(await db.query('SELECT id,name,role,"tenantId" FROM "user" WHERE id=$1',[row.user_id]))[0];
  if(!user || user.tenantId!==row.tenant_id)return null;
  if((await require('./user-admin.cjs').status(db,user.id)).blocked)return null;
  return {id:user.id,name:user.name,role:user.role || 'viewer',tenantId:user.tenantId};
}
// Einsätze, die dieser Benutzer sehen darf (Administrator: alle).
function entriesFor(state,actor) {
  if(actor.role!=='admin')return visibleState(state,actor).calendarEntries || [];
  const labels=new Map(state.records.filter(r=>r.module==='projects').map(r=>[r.id,[r.data.name,r.data.address].filter(Boolean).join(' · ')]));
  return state.records.filter(r=>r.module==='personnel').flatMap(r=>(r.assignments || []).map(a=>({...a,employeeId:r.id,employeeName:r.data.name,own:Boolean(r.data.userId) && String(r.data.userId).trim()===actor.id,projectLabel:labels.get(a.projectId) || 'Projekt'})));
}
const text=v=>String(v ?? '').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
const day=iso=>iso.replaceAll('-','');
const nextDay=iso=>{const d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);};
// Zeilen nach RFC 5545 auf 75 Byte falten, ohne UTF-8-Zeichen zu zerschneiden.
function fold(line) {
  const out=[];let current='',bytes=0;
  for(const ch of line) {
    const size=Buffer.byteLength(ch);
    if(bytes+size>(out.length?74:75)){out.push(current);current='';bytes=0;}
    current+=ch;bytes+=size;
  }
  out.push(current);
  return out.join('\r\n ');
}
function buildIcs(state,actor,{origin='https://www.dachwerkpro.de',now=new Date()}={}) {
  const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const holidayState=state.settings?.holidayState || 'HB';
  const link=`${origin}/?start=app&module=personnel`;
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//DachwerkPro//Kalender//DE','CALSCALE:GREGORIAN','METHOD:PUBLISH',
    `X-WR-CALNAME:${text(actor.role==='admin'?'DachwerkPro Einsätze':'DachwerkPro · '+actor.name)}`,'X-WR-TIMEZONE:Europe/Berlin','REFRESH-INTERVAL;VALUE=DURATION:PT1H','X-PUBLISHED-TTL:PT1H'];
  const event=(uid,start,end,summary,extra=[])=>lines.push('BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${day(start)}`,`DTEND;VALUE=DATE:${day(nextDay(end))}`,`SUMMARY:${text(summary)}`,...extra,'END:VEVENT');
  for(const a of entriesFor(state,actor)) {
    if(a.cancelled || !/^\d{4}-\d{2}-\d{2}$/.test(a.start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(a.end || ''))continue;
    const who=a.own?'':`${a.employeeName}: `,declined=a.response==='Abgesagt';
    const free=core.holidaysBetween(a.start,a.end,holidayState).filter(h=>new Date(h.date+'T00:00:00Z').getUTCDay()!==0).map(h=>`${h.date.slice(8,10)}.${h.date.slice(5,7)}. ${h.name}`);
    const description=[a.task?`Aufgabe: ${a.task}`:'',`Rückmeldung: ${a.response || 'Offen'}`,free.length?`Feiertag im Zeitraum: ${free.join(', ')}`:'',`Zusagen/Absagen in DachwerkPro: ${link}`].filter(Boolean).join('\n');
    event(`einsatz-${a.id}@dachwerkpro.de`,a.start,a.end,`${declined?'Abgesagt – ':''}${who}${a.projectLabel}${a.task?` (${a.task})`:''}`,
      [`DESCRIPTION:${text(description)}`,`STATUS:${a.response==='Zugesagt'?'CONFIRMED':declined?'CANCELLED':'TENTATIVE'}`,`TRANSP:${declined?'TRANSPARENT':'OPAQUE'}`,'CATEGORIES:Einsatz',`URL:${link}`]);
  }
  const year=Number(core.berlinDay().slice(0,4));
  for(let y=year-1;y<=year+1;y++)for(const h of core.holidays(y,holidayState))
    event(`feiertag-${h.date}-${holidayState}@dachwerkpro.de`,h.date,h.date,`Feiertag: ${h.name}`,['TRANSP:TRANSPARENT','CATEGORIES:Feiertag',`DESCRIPTION:${text('Gesetzlicher Feiertag · '+core.holidayStates[holidayState])}`]);
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n')+'\r\n';
}
module.exports={SCHEMA,ensure,info,create,revoke,owner,entriesFor,buildIcs,hash};
