// Täglicher Lauf (Vercel Cron, siehe vercel.json, ca. 6–7 Uhr):
// 1. automatische Serversicherung je Betrieb (einmal pro Tag, erscheint im Modul „Sicherung“),
// 2. E-Mail an den Administrator, wenn befristete Zugänge in 7, 3, 1 oder 0 Tagen ablaufen
//    oder abgelaufen sind (jede Stufe genau einmal; schlägt der Versand fehl, nächster Tag erneut).
// Beides ist wiederholbar ohne Schaden. Ist CRON_SECRET gesetzt, wird es verlangt.
const {authDb}=require('../lib/auth.cjs');
const {repository}=require('../lib/project-repository.cjs');
const {backupStore}=require('../lib/backup-store.cjs');
const admin=require('../lib/user-admin.cjs');
const {sendMail}=require('../lib/mailer.cjs');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function authorized(req,env=process.env) {
  const h=req.headers || {};
  if(env.CRON_SECRET)return h.authorization===`Bearer ${env.CRON_SECRET}`;
  return /vercel-cron/i.test(String(h['user-agent'] || ''));
}
function appUrl(env=process.env){return String(env.BETTER_AUTH_URL || 'https://www.dachwerkpro.de').replace(/\/+$/,'');}
function reminderMail(reminders,env=process.env) {
  const link=`${appUrl(env)}/?start=app&module=users`;
  const lines=reminders.map(r=>admin.expiryText(r));
  return {
    subject:reminders.length===1?`DachWerkPro – ${lines[0].split(':')[0]}: Zugang läuft ab`:`DachWerkPro – ${reminders.length} Zugänge laufen ab`,
    text:`Hinweis aus DachWerkPro:\n\n${lines.map(l=>'• '+l).join('\n')}\n\nVerlängern oder beenden in der Anwenderverwaltung:\n${link}\n\nNach Ablauf ist keine Anmeldung mehr möglich, bis du das Datum verlängerst.`,
    html:`<p>Hinweis aus DachWerkPro:</p><ul>${lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul><p><a href="${esc(link)}">Anwenderverwaltung öffnen</a> – dort „Rechte und Daten“ → „Zugang gültig bis“ ändern.</p><p>Nach Ablauf ist keine Anmeldung mehr möglich, bis du das Datum verlängerst.</p>`
  };
}
// Empfänger: DWP_ADMIN_MAIL, sonst die E-Mail für „Passwort vergessen“ des Eigentümers, sonst das Absenderpostfach.
async function recipient(db,tenantId,env=process.env) {
  if(env.DWP_ADMIN_MAIL)return env.DWP_ADMIN_MAIL;
  const rows=await db.query(`SELECT u.id,u.email,a.contact_email FROM "user" u LEFT JOIN dwp_user_admin a ON a.user_id=u.id
    WHERE u."tenantId"=$1 AND u.role='admin' ORDER BY (u.id=$2) DESC,u."createdAt"`,[tenantId,env.DWP_OWNER_USER_ID || '']);
  for(const r of rows){const mail=r.contact_email || (admin.usernameOf(r.email)?'':r.email);if(mail)return mail;}
  return env.DWP_SMTP_USER || '';
}
function createHandler(deps={db:authDb,repository,backupStore:()=>backupStore(),sendMail,now:()=>new Date(),env:process.env}) {
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    if(!authorized(req,deps.env))return res.status(401).json({error:'Nicht berechtigt.'});
    const report={backups:[],reminders:0,mailErrors:[]};
    try {
      const db=await deps.db(),store=deps.backupStore(),repo=deps.repository(),now=deps.now();
      const tenants=(await db.query('SELECT tenant_id FROM dwp_project_state').catch(()=>[])).map(r=>r.tenant_id);
      for(const tenant of tenants) {
        if(await store.automaticToday(tenant,now))continue;
        const {state}=await repo.read(tenant);
        report.backups.push((await store.create(tenant,null,state,'automatisch')).fileName);
      }
      const due=await admin.dueReminders(db,now),byTenant=new Map();
      for(const r of due)byTenant.set(r.tenantId,[...(byTenant.get(r.tenantId) || []),r]);
      for(const [tenant,list] of byTenant) {
        try {
          const to=await recipient(db,tenant,deps.env);
          if(!to)throw Error('Keine Empfängeradresse für den Administrator hinterlegt.');
          await deps.sendMail({to,...reminderMail(list,deps.env)});
          await admin.markReminded(db,list);report.reminders+=list.length;
        }catch(e){report.mailErrors.push(e.message);}
      }
      return res.status(200).json({ok:true,...report});
    }catch(error) {
      return res.status(503).json({error:'Täglicher Lauf fehlgeschlagen.',...report});
    }
  };
}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.reminderMail=reminderMail;module.exports.authorized=authorized;
