const {empty}=require('../project-core.js');
function repository({query}={}) {
  if(!query && !process.env.DATABASE_URL)throw Object.assign(Error('Zentrale Datenbank ist noch nicht eingerichtet.'),{status:503});
  const sql=query?{query}:require('@neondatabase/serverless').neon(process.env.DATABASE_URL);
  return {
    async read(tenant) {
      const rows=await sql.query('SELECT data, audit_hash FROM dwp_project_state WHERE tenant_id=$1',[tenant]);
      return rows[0]?{state:rows[0].data,hash:rows[0].audit_hash}:{state:empty(),hash:''};
    },
    async compareAndSwap(tenant,revision,state,ledger) {
      // A new tenant starts at revision zero. Upsert neither overwrites nor shares another tenant's state.
      await sql.query('INSERT INTO dwp_project_state(tenant_id,revision,data,audit_hash) VALUES($1,0,$2::jsonb,\'\') ON CONFLICT DO NOTHING',[tenant,JSON.stringify(empty())]);
      // Physical project files and their upload chunks are removed in the same SQL statement
      // as the revision update and immutable audit entry. A stale revision deletes nothing.
      const deleted=ledger.deletedProjectId || null;
      const cleanup=deleted?`, removed_views AS (
        DELETE FROM dwp_file_views WHERE tenant_id=$1
        AND file_id IN (SELECT id FROM dwp_files WHERE tenant_id=$1 AND project_id=$10)
        AND EXISTS (SELECT 1 FROM changed) RETURNING file_id
      ), removed_files AS (
        DELETE FROM dwp_files WHERE tenant_id=$1 AND project_id=$10
        AND EXISTS (SELECT 1 FROM changed) RETURNING id
      )`:'';
      const result=await sql.query(`WITH changed AS (
        UPDATE dwp_project_state SET revision=$3, data=$4::jsonb, audit_hash=$5, updated_at=now()
        WHERE tenant_id=$1 AND revision=$2 RETURNING tenant_id,revision
      )${cleanup} INSERT INTO dwp_project_audit(tenant_id,revision,actor,method,previous_hash,event_hash,events)
        SELECT tenant_id,revision,$6,$7,$8,$5,$9::jsonb FROM changed RETURNING revision`,
      [tenant,revision,state.revision,JSON.stringify(state),ledger.hash,ledger.actor,ledger.method,ledger.previousHash,JSON.stringify(ledger.events),...(deleted?[deleted]:[])]);
      return result.length===1;
    }
  };
}
module.exports={repository};
