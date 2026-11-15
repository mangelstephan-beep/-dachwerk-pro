let cached;
async function auditSessionLogin(pool,session) {
  const result=await pool.query('SELECT id,name,"tenantId" FROM "user" WHERE id=$1',[session.userId]);
  const user=result.rows[0];if(!user)throw Error('Anmeldebenutzer fehlt.');
  await require('./access-security.cjs').accessRepository({query:async(sql,params)=>(await pool.query(sql,params)).rows}).event({id:user.id,name:user.name,tenantId:user.tenantId},'login',{userAgent:session.userAgent});
}
async function auditAccountEvent(pool,userId,type) {
  const result=await pool.query('SELECT id,name,"tenantId" FROM "user" WHERE id=$1',[userId]);
  const user=result.rows[0];if(!user)return;
  await require('./access-security.cjs').accessRepository({query:async(sql,params)=>(await pool.query(sql,params)).rows}).event({id:user.id,name:user.name,tenantId:user.tenantId},type,{});
}
async function getAuth({provisioning=false}={}) {
  if(cached && !provisioning)return cached;
  if(!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length<32)throw Object.assign(Error('Zentrale Anmeldung und Datenbank sind noch nicht eingerichtet.'),{status:503});
  const {betterAuth}=await import('better-auth');
  const {Pool}=require('pg');
  const pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000});
  const auth=betterAuth({
    database:pool,
    secret:process.env.BETTER_AUTH_SECRET,
    ...(process.env.BETTER_AUTH_URL?{baseURL:process.env.BETTER_AUTH_URL}:{}),
    emailAndPassword:{
      enabled:true,disableSignUp:!provisioning,minPasswordLength:12,
      // Link 1 Stunde gültig; beim Zurücksetzen werden alle offenen Sitzungen beendet.
      resetPasswordTokenExpiresIn:3600,
      revokeSessionsOnPasswordReset:true,
      sendResetPassword:async({user,url})=>{
        const {sendMail,resetMail}=require('./mailer.cjs');
        await sendMail({to:user.email,...resetMail(url)});
      },
      onPasswordReset:async({user})=>{
        try{await auditAccountEvent(pool,user.id,'password_reset');}catch{}
      }
    },
    user:{additionalFields:{role:{type:'string',defaultValue:'viewer',input:false},tenantId:{type:'string',defaultValue:process.env.DWP_TENANT_ID || 'dachwerk',input:false}}},
    session:{expiresIn:8*60*60,updateAge:60*60},
    databaseHooks:{session:{create:{after:async(session)=>auditSessionLogin(pool,session)}}},
    rateLimit:{enabled:true,storage:'database',window:60,max:20},
    advanced:{useSecureCookies:process.env.NODE_ENV!=='development'}
  });
  if(!provisioning)cached=auth;
  return auth;
}
async function sessionFromRequest(req) {
  const auth=await getAuth();
  const {fromNodeHeaders}=await import('better-auth/node');
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user?.id)throw Object.assign(Error('Bitte anmelden.'),{status:401});
  return {id:session.user.id,name:session.user.name,role:session.user.role || 'viewer',tenantId:session.user.tenantId};
}
module.exports={getAuth,sessionFromRequest,auditSessionLogin};
