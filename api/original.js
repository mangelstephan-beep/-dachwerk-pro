const fs=require('node:fs');
const path=require('node:path');
const {createHmac,createHash,timingSafeEqual}=require('node:crypto');
const COOKIE='dwp_original', HOURS=8;
const equal=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);};
const sign=(value,secret)=>createHmac('sha256',secret).update('original:'+value).digest('hex');
function validCookie(header,secret) {
  const token=String(header||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!token||token.length>150)return false;
  const [expiry,signature,...rest]=token.split('.');
  return !rest.length && /^\d+$/.test(expiry) && Number(expiry)>Date.now() && Number(expiry)<=Date.now()+HOURS*3600000+1000 && equal(signature,sign(expiry,secret));
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function login(error='',username='Trainer1') {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>DachWerk Pro · Originalzugang</title><link rel="stylesheet" href="/styles.css"></head><body><main style="max-width:640px;margin:40px auto;padding:22px"><img src="/assets/dachwerk-pro-logo.svg" width="220" alt="DachWerk Pro"><section class="panel panel-pad"><h1>Original DachWerk Pro</h1><p>Arbeitsversion mit projektbezogener Erfassung. Daten bleiben derzeit in diesem Browser. Noch keine vollständige Produktionsfreigabe.</p><form method="post" action="/original" class="quick-form"><div class="field-span"><label for="username">Nutzer</label><input id="username" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" value="${esc(username)}" required maxlength="100"></div><div class="field-span"><label for="password">Passwort</label><input id="password" name="password" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" required maxlength="200"></div><p role="alert" class="field-span">${esc(error)}</p><button class="button button-primary field-span">Original öffnen</button></form></section></main></body></html>`;
}
module.exports=async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Cookie');
  res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Content-Type','text/html; charset=utf-8');
  // Reuse the already configured preview access, never expose configuration to the browser.
  const secret=process.env.ORIGINAL_SESSION_SECRET || process.env.TRAINING_SESSION_SECRET;
  const credential=(process.env.ORIGINAL_CREDENTIAL_HASH || process.env.TRAINING_CREDENTIAL_HASH)?.trim();
  if(!secret||secret.length<32||!credential)return res.status(503).send(login('Der Originalzugang ist noch nicht eingerichtet.'));
  if(req.method==='POST') {
    const origin=req.headers.origin,host=req.headers.host;
    if(req.headers['sec-fetch-site']==='cross-site'||origin&&origin!==`https://${host}`&&origin!==`http://${host}`)return res.status(403).send(login('Bitte die Anmeldung direkt über den Originalzugang öffnen.'));
    let body=req.body;if(typeof body==='string')body=Object.fromEntries(new URLSearchParams(body));
    if(!body||typeof body!=='object')return res.status(400).send(login('Bitte Nutzer und Passwort eingeben.'));
    if(body.action==='logout') {res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);res.setHeader('Location','/original');return res.status(303).end();}
    if(typeof body.username!=='string'||typeof body.password!=='string'||body.username.length>100||body.password.length>200)return res.status(400).send(login('Bitte Nutzer und Passwort eingeben.'));
    const username=body.username.trim(),normalized=username.toLowerCase()==='trainer1'?'Trainer1':username;
    const candidate=createHash('sha256').update(`${normalized}:${body.password}`).digest('hex');
    if(!equal(candidate,credential))return res.status(401).send(login('Zugangsdaten nicht gültig.',username));
    const expiry=String(Date.now()+HOURS*3600000);
    res.setHeader('Set-Cookie',`${COOKIE}=${expiry}.${sign(expiry,secret)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${HOURS*3600}`);
    res.setHeader('Location','/original');return res.status(303).end();
  }
  if(req.method!=='GET'){res.setHeader('Allow','GET, POST');return res.status(405).end();}
  if(!validCookie(req.headers.cookie,secret))return res.status(200).send(login());
  const html=fs.readFileSync(path.join(process.cwd(),'index.html'),'utf8').replace('<body>','<body data-server-auth="true">');
  return res.status(200).send(html);
};
