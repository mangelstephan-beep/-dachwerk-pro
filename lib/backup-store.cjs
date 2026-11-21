'use strict';
// Sicherungsverlauf auf dem Server: jede Sicherung wird mit Datum, Uhrzeit, Ersteller und
// Umfang abgelegt und kann über das Modul „Sicherung“ wieder eingespielt werden.
// Zusätzlich legt der tägliche Lauf (api/cron.js) eine automatische Sicherung an.
// Die Tabelle wird beim ersten Zugriff angelegt; kein manueller Datenbankschritt nötig.
const {createHash}=require('node:crypto');
const {backupFormat}=require('../project-core.js');
const SCHEMA=[`CREATE TABLE IF NOT EXISTS dwp_backups (
 id bigserial PRIMARY KEY, tenant_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 created_by text NOT NULL DEFAULT '', created_by_name text NOT NULL DEFAULT '', kind text NOT NULL,
 source_created_at timestamptz, revision integer NOT NULL DEFAULT 0, projects integer NOT NULL DEFAULT 0,
 records integer NOT NULL DEFAULT 0, bytes integer NOT NULL DEFAULT 0, sha256 text NOT NULL DEFAULT '', data jsonb NOT NULL
)`,'CREATE INDEX IF NOT EXISTS dwp_backups_tenant_date ON dwp_backups(tenant_id,created_at DESC)'];
const KINDS=['manuell','automatisch','vor Wiederherstellung','hochgeladen'];
const KEEP_AUTOMATIC_DAYS=35,KEEP_MAX=80;
const ready=new WeakMap();
function backupStore({query}={}) {
  if(!query && !process.env.DATABASE_URL)throw Object.assign(Error('Zentrale Datenbank ist noch nicht eingerichtet.'),{status:503});
  const sql=query?{query}:require('@neondatabase/serverless').neon(process.env.DATABASE_URL);
  const ensure=()=>{
    if(!ready.has(sql))ready.set(sql,(async()=>{for(const s of SCHEMA)await sql.query(s);})().catch(e=>{ready.delete(sql);throw e;}));
    return ready.get(sql);
  };
  const row=r=>({id:String(r.id),createdAt:new Date(r.created_at).toISOString(),createdBy:r.created_by_name || r.created_by,kind:r.kind,
    sourceCreatedAt:r.source_created_at?new Date(r.source_created_at).toISOString():null,revision:r.revision,projects:r.projects,records:r.records,bytes:r.bytes,
    fileName:backupFormat.fileName(r.source_created_at || r.created_at)});
  return {
    async create(tenantId,actor,state,kind='manuell',{sourceCreatedAt=null}={}) {
      if(!KINDS.includes(kind))throw Object.assign(Error('Sicherungsart ungültig.'),{status:422});
      await ensure();
      const text=JSON.stringify(state),summary=backupFormat.summary(state);
      const rows=await sql.query(`INSERT INTO dwp_backups(tenant_id,created_by,created_by_name,kind,source_created_at,revision,projects,records,bytes,sha256,data)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) RETURNING id,created_at,created_by,created_by_name,kind,source_created_at,revision,projects,records,bytes`,
      [tenantId,actor?.id || 'system',actor?.name || (actor?.id?'':'Automatisch'),kind,sourceCreatedAt,Number.isInteger(state.revision)?state.revision:0,summary.projects,summary.records,Buffer.byteLength(text),createHash('sha256').update(text).digest('hex'),text]);
      await this.prune(tenantId);
      return row(rows[0]);
    },
    async list(tenantId) {
      await ensure();
      return (await sql.query('SELECT id,created_at,created_by,created_by_name,kind,source_created_at,revision,projects,records,bytes FROM dwp_backups WHERE tenant_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2',[tenantId,KEEP_MAX])).map(row);
    },
    async get(tenantId,id) {
      if(!/^\d{1,18}$/.test(String(id || '')))throw Object.assign(Error('Sicherung nicht gefunden.'),{status:404});
      await ensure();
      const r=(await sql.query('SELECT id,created_at,created_by,created_by_name,kind,source_created_at,revision,projects,records,bytes,data FROM dwp_backups WHERE tenant_id=$1 AND id=$2',[tenantId,String(id)]))[0];
      if(!r)throw Object.assign(Error('Sicherung nicht gefunden.'),{status:404});
      const state=typeof r.data==='string'?JSON.parse(r.data):r.data;
      return {...row(r),state};
    },
    // Datei für Dropbox, Drive oder eigene Cloud: Name und Kopf tragen Datum und Uhrzeit der Sicherung.
    async file(tenantId,id) {
      const b=await this.get(tenantId,id),createdAt=b.sourceCreatedAt || b.createdAt;
      return {name:backupFormat.fileName(createdAt),type:'application/json',text:JSON.stringify(backupFormat.wrap(b.state,{createdAt,createdBy:b.createdBy,kind:b.kind}),null,2)};
    },
    async automaticToday(tenantId,now=new Date()) {
      await ensure();
      const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(now);
      return (await sql.query("SELECT 1 FROM dwp_backups WHERE tenant_id=$1 AND kind='automatisch' AND to_char(created_at AT TIME ZONE 'Europe/Berlin','YYYY-MM-DD')=$2 LIMIT 1",[tenantId,day])).length>0;
    },
    async prune(tenantId) {
      // Automatische Sicherungen 35 Tage, insgesamt höchstens 80 Einträge je Betrieb.
      await sql.query(`DELETE FROM dwp_backups WHERE tenant_id=$1 AND kind='automatisch' AND created_at<now()-interval '${KEEP_AUTOMATIC_DAYS} days'`,[tenantId]);
      await sql.query('DELETE FROM dwp_backups WHERE tenant_id=$1 AND id NOT IN (SELECT id FROM dwp_backups WHERE tenant_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2)',[tenantId,KEEP_MAX]);
    }
  };
}
module.exports={backupStore,KINDS,SCHEMA};
