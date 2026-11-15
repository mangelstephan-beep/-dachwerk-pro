let cached;
const pgQuery=pool=>({query:async(sql,params)=>(await pool.query(sql,params)).rows});
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
let sharedPool;
async function authPool() {
  if(!process.env.DATABASE_URL)throw Object.assign(Error('Zentrale Anmeldung und Datenbank sind noch nicht eingerichtet.'),{status:503});
  if(!sharedPool){const {Pool}=require('pg');sharedPool=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000});}
  return sharedPool;
}
async function getAuth({provisioning=false}={}) {
  if(cached && !provisioning)return cached;
  if(!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length<32)throw Object.assign(Error('Zentrale Anmeldung und Datenbank sind noch nicht eingerichtet.'),{status:503});
  const {betterAuth}=await import('better-auth');
  const pool=await authPool();
  const auth=betterAuth({
    database:pool,
    secret:process.env.BETTER_AUTH_SECRET,
    ...(process.env.BETTER_AUTH_URL?{baseURL:process.env.BETTER_AUTH_URL}:{}),
    emailAndPassword:{
      enabled:true,disableSignUp:!provisioning,minPasswordLength:12,
      // Vom Administrator angelegte Konten melden niemanden automatisch an.
      autoSignIn:!provisioning,
      // Link 1 Stunde gültig; beim Zurücksetzen werden alle offenen Sitzungen beendet.
      resetPasswordTokenExpiresIn:3600,
      revokeSessionsOnPasswordReset:true,
      sendResetPassword:async({user,url})=>{
        // Kurznamen-Konten (meier@dachwerkpro.de) erhalten den Link an ihre hinterlegte E-Mail; gesperrte Konten gar nicht.
        const account=await require('./user-admin.cjs').status(pgQuery(pool),user.id);
        if(account.blocked)return;
        const {sendMail,resetMail}=require('./mailer.cjs');
        await sendMail({to:account.contactEmail || user.email,...resetMail(url)});
      },
      onPasswordReset:async({user})=>{
        try{await auditAccountEvent(pool,user.id,'password_reset');}catch{}
      }
    },
    user:{additionalFields:{role:{type:'string',defaultValue:'viewer',input:false},tenantId:{type:'string',defaultValue:process.env.DWP_TENANT_ID || 'dachwerk',input:false}}},
    session:{expiresIn:8*60*60,updateAge:60*60},
    databaseHooks:{session:{create:{
      // Gesperrte Konten erhalten keine neue Sitzung.
      before:async(session)=>{
        if((await require('./user-admin.cjs').status(pgQuery(pool),session.userId)).blocked){
          const {APIError}=await import('better-auth/api');
          throw new APIError('FORBIDDEN',{message:'Dieses Konto ist gesperrt. Bitte wende dich an den Administrator.'});
        }
      },
      after:async(session)=>auditSessionLogin(pool,session)
    }}},
    rateLimit:{enabled:true,storage:'database',window:60,max:20},
    advanced:{useSecureCookies:process.env.NODE_ENV!=='development'}
  });
  if(!provisioning)cached=auth;
  return auth;
}
async function sessionFromRequest(req,{allowPasswordChange=false}={}) {
  const auth=await getAuth();
  const {fromNodeHeaders}=await import('better-auth/node');
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user?.id)throw Object.assign(Error('Bitte anmelden.'),{status:401});
  const account=await require('./user-admin.cjs').status(pgQuery((await authPool())),session.user.id);
  if(account.blocked)throw Object.assign(Error('Dieses Konto ist gesperrt. Bitte wende dich an den Administrator.'),{status:403});
  if(account.mustChangePassword && !allowPasswordChange)throw Object.assign(Error('Bitte zuerst ein eigenes Passwort festlegen.'),{status:428,code:'PASSWORD_CHANGE_REQUIRED'});
  return {id:session.user.id,name:session.user.name,role:session.user.role || 'viewer',tenantId:session.user.tenantId,mustChangePassword:account.mustChangePassword};
}
// Werkzeuge der Benutzerverwaltung. Passwörter werden ausschließlich gehasht gespeichert.
async function userAdminDeps() {
  const pool=await authPool(),db=pgQuery(pool);
  const auth=await getAuth(),ctx=await auth.$context;
  return {db,auth:{
    async createUser({name,email,password}) {
      const provisioning=await getAuth({provisioning:true});
      await provisioning.api.signUpEmail({body:{name,email,password}});
      const rows=await db.query('SELECT id FROM "user" WHERE lower(email)=$1',[email]);
      if(!rows[0])throw Object.assign(Error('Benutzer konnte nicht angelegt werden.'),{status:500});
      return {id:rows[0].id};
    },
    async setPassword(userId,password) {
      const hash=await ctx.password.hash(password);
      if(await ctx.internalAdapter.findCredentialAccount(userId))await ctx.internalAdapter.updatePassword(userId,hash);
      else await ctx.internalAdapter.createAccount({userId,providerId:'credential',accountId:userId,password:hash});
    },
    async revokeSessions(userId){await ctx.internalAdapter.deleteUserSessions(userId);},
    async changeOwnPassword(req,currentPassword,newPassword) {
      const {fromNodeHeaders}=await import('better-auth/node');
      await auth.api.changePassword({headers:fromNodeHeaders(req.headers),body:{currentPassword,newPassword,revokeOtherSessions:true}});
    }
  }};
}
module.exports={getAuth,sessionFromRequest,auditSessionLogin,userAdminDeps};
