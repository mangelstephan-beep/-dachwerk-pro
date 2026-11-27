// Benutzerverwaltung (nur Administrator) und eigener Passwortwechsel.
const {sessionFromRequest,userAdminDeps}=require('../lib/auth.cjs');
const {userAdmin,checkPassword}=require('../lib/user-admin.cjs');
const security=require('../lib/access-security.cjs');
function createHandler(deps={sessionFromRequest,userAdminDeps,accessRepository:security.accessRepository}) {
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Cookie');
    try {
      const actor=await deps.sessionFromRequest(req,{allowPasswordChange:true});
      const tools=await deps.userAdminDeps(),admin=userAdmin(tools);
      if(req.method==='GET'){
        if(actor.mustChangePassword)throw Object.assign(Error('Bitte zuerst ein eigenes Passwort festlegen.'),{status:428});
        return res.status(200).json(await admin.list(actor));
      }
      if(req.method!=='POST')return res.status(405).setHeader('Allow','GET, POST').end();
      security.sameOrigin(req);
      if(!String(req.headers['content-type'] || '').startsWith('application/json'))throw Object.assign(Error('JSON erforderlich.'),{status:415});
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
      if(!body || JSON.stringify(body).length>8000)throw Object.assign(Error('Anfrage ungültig.'),{status:413});
      const audit=deps.accessRepository();
      const log=(type,userId)=>audit.event(actor,type,{module:'users',outcome:userId?'Benutzer '+userId:'ok',userAgent:req.headers['user-agent']}).catch(()=>{});
      if(body.action==='change-own-password') {
        if(body.currentPassword===body.newPassword)throw Object.assign(Error('Das neue Passwort muss sich vom bisherigen unterscheiden.'),{status:422});
        checkPassword(body.newPassword);
        try{await tools.auth.changeOwnPassword(req,String(body.currentPassword || ''),body.newPassword);}
        catch(error){throw Object.assign(Error(/password/i.test(error.message || '')?'Das bisherige Passwort stimmt nicht.':'Passwort konnte nicht geändert werden.'),{status:422});}
        await admin.passwordChanged(actor);await log('password_changed');
        return res.status(200).json({ok:true});
      }
      if(actor.mustChangePassword)throw Object.assign(Error('Bitte zuerst ein eigenes Passwort festlegen.'),{status:428});
      let result;
      if(body.action==='create')result=await admin.create(actor,body);
      else if(body.action==='update')result=await admin.update(actor,body);
      else if(body.action==='block' || body.action==='unblock')result=await admin.block(actor,body.userId,body.action==='block');
      else if(body.action==='set-password')result=await admin.setPassword(actor,body.userId,body.password);
      else throw Object.assign(Error('Vorgang ungültig.'),{status:422});
      await log('user_'+body.action.replace('-','_'),body.userId || result?.id);
      return res.status(200).json({...result,...await admin.list(actor)});
    }catch(error){
      const status=error.status || (error instanceof SyntaxError?400:503);
      return res.status(status).json({error:status<500?error.message:'Benutzerverwaltung ist gerade nicht verfügbar.',code:error.code});
    }
  };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
