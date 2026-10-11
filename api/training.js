const {createHmac,createHash,timingSafeEqual}=require('node:crypto');
const trainingPage=require('./training-page.cjs');
const COOKIE='dwp_training';
const HOURS=8;
const equal=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);};
const sign=(value,secret)=>createHmac('sha256',secret).update(value).digest('hex');
function validCookie(cookie,secret) {
  const token=String(cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!token||token.length>150)return false;
  const [expiry,signature,...rest]=token.split('.');
  return !rest.length && /^\d+$/.test(expiry) && Number(expiry)>Date.now() && Number(expiry)<=Date.now()+HOURS*3600000+1000 && equal(signature,sign(expiry,secret));
}
function login(error='') {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>DachWerk Pro · Trainingszugang</title><link rel="stylesheet" href="/demo.css"></head><body><main style="max-width:650px"><img src="/assets/dachwerk-pro-logo.svg" width="220" alt="DachWerk Pro"><section class="about"><span class="eyebrow">Virtuell kennenlernen</span><h1>Dein Trainingszugang</h1><p>Bearbeite eine fiktive Dachsanierung vom Kunden bis zur Nachkalkulation. Die Hilfe erklärt dir die Zusammenhänge.</p><form method="post" action="/training"><div class="fields"><div class="full"><label for="username">Nutzer</label><input id="username" name="username" autocomplete="username" required maxlength="100"></div><div class="full"><label for="password">Passwort</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="200"></div><p class="error full" role="alert">${error}</p><button class="primary full">Training starten</button></div></form><p class="note">Nur Musterangaben verwenden. Jeder Browser hat seinen eigenen Projektstand. Die Anmeldung gilt acht Stunden.</p></section></main></body></html>`;
}
module.exports=async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Vary','Cookie');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  const secret=process.env.TRAINING_SESSION_SECRET;
  const credential=process.env.TRAINING_CREDENTIAL_HASH;
  if(!secret||secret.length<32||!credential)return res.status(503).send(login('Der Trainingszugang wird gerade eingerichtet. Bitte später erneut versuchen.'));
  if(req.method==='POST') {
    const origin=req.headers.origin;
    const host=req.headers.host;
    if(req.headers['sec-fetch-site']==='cross-site'||origin&&origin!==`https://${host}`&&origin!==`http://${host}`)return res.status(403).send(login('Bitte die Anmeldung direkt über den Trainingslink öffnen.'));
    let body=req.body;
    if(typeof body==='string')body=Object.fromEntries(new URLSearchParams(body));
    if(!body || typeof body!=='object')return res.status(400).send(login('Bitte Nutzer und Passwort eingeben.'));
    if(body.action==='logout') {
      res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
      return res.status(303).setHeader('Location','/training').end();
    }
    if(typeof body.username!=='string'||typeof body.password!=='string'||body.username.length>100||body.password.length>200)return res.status(400).send(login('Bitte Nutzer und Passwort eingeben.'));
    const candidate=createHash('sha256').update(`${body.username.trim()}:${body.password}`).digest('hex');
    if(!equal(candidate,credential))return res.status(401).send(login('Nutzer oder Passwort ist nicht richtig. Bitte erneut versuchen.'));
    const expiry=String(Date.now()+HOURS*3600000);
    res.setHeader('Set-Cookie',`${COOKIE}=${expiry}.${sign(expiry,secret)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${HOURS*3600}`);
    return res.status(303).setHeader('Location','/training').end();
  }
  if(req.method!=='GET')return res.status(405).setHeader('Allow','GET, POST').end();
  return res.status(200).send(validCookie(req.headers.cookie,secret)?trainingPage:login());
};
