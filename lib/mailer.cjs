// Kontomails (Passwort zurücksetzen) über das eigene Postfach per SMTP (z. B. Strato) oder Resend.
// Zugangsdaten nur aus Umgebungsvariablen; Passwörter, Links und Tokens werden nie geloggt.
const net=require('node:net'),tls=require('node:tls'),crypto=require('node:crypto');

const clean=v=>String(v ?? '').replace(/[\r\n]+/g,' ').trim();
const b64=v=>Buffer.from(String(v),'utf8').toString('base64');
const wrap=s=>s.replace(/.{1,76}/g,'$&\r\n');
const encodeHeader=v=>/^[\x20-\x7e]*$/.test(v)?v:`=?UTF-8?B?${b64(v)}?=`;
const addressOf=v=>(/<([^<>]+)>/.exec(v)?.[1] || v).trim();

function mailConfig(env=process.env) {
  const user=clean(env.DWP_SMTP_USER);
  if(user) {
    if(!env.DWP_SMTP_PASSWORD)throw Error('DWP E-Mail-Versand: Postfach-Passwort (DWP_SMTP_PASSWORD) fehlt.');
    const port=Number(env.DWP_SMTP_PORT || 465);
    if(!Number.isInteger(port) || port<1 || port>65535)throw Error('DWP E-Mail-Versand: DWP_SMTP_PORT ungültig.');
    return {kind:'smtp',host:clean(env.DWP_SMTP_HOST) || 'smtp.strato.de',port,secure:port===465,user,password:String(env.DWP_SMTP_PASSWORD),from:clean(env.DWP_MAIL_FROM) || `DachWerkPro <${user}>`};
  }
  if(env.RESEND_API_KEY && env.DWP_MAIL_FROM)return {kind:'resend',apiKey:env.RESEND_API_KEY,from:clean(env.DWP_MAIL_FROM)};
  throw Error('DWP E-Mail-Versand ist nicht eingerichtet.');
}

function buildMessage({from,to,subject,text,html},now=new Date()) {
  const boundary=`dwp-${crypto.randomBytes(12).toString('hex')}`,domain=addressOf(from).split('@')[1] || 'dachwerkpro.de';
  const lines=[
    `From: ${clean(from)}`,`To: ${clean(to)}`,`Subject: ${encodeHeader(clean(subject))}`,
    `Date: ${now.toUTCString().replace('GMT','+0000')}`,`Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',`Content-Type: multipart/alternative; boundary="${boundary}"`,'',
    `--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',wrap(b64(text)).trimEnd(),
  ];
  if(html)lines.push(`--${boundary}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',wrap(b64(html)).trimEnd());
  lines.push(`--${boundary}--`,'');
  return lines.join('\r\n');
}

// Minimaler SMTP-Client: implizites TLS (465) oder STARTTLS (587), AUTH PLAIN.
function smtpSend(cfg,{to,subject,text,html},{connect,timeoutMs=20000}={}) {
  return new Promise((resolve,reject)=>{
    let socket,buffer='',waiting=null,done=false;
    const fail=error=>{if(done)return;done=true;try{socket?.destroy();}catch{}reject(error);};
    const timer=setTimeout(()=>fail(Error('DWP E-Mail-Versand: Mailserver antwortet nicht.')),timeoutMs);
    const onData=chunk=>{
      buffer+=chunk.toString('utf8');
      let lines=buffer.split('\r\n');buffer=lines.pop();
      for(const line of lines) {
        if(!waiting)continue;
        waiting.lines.push(line);
        if(/^\d{3} /.test(line) || /^\d{3}$/.test(line)){const w=waiting;waiting=null;w.resolve({code:Number(line.slice(0,3)),text:w.lines.join('\n')});}
      }
    };
    const read=()=>new Promise(res=>{waiting={lines:[],resolve:res};});
    const attach=s=>{socket=s;s.on('data',onData);s.on('error',()=>fail(Error('DWP E-Mail-Versand: Verbindung zum Mailserver fehlgeschlagen.')));};
    const cmd=async(line,expect,message)=>{const answer=read();socket.write(`${line}\r\n`);const r=await answer;if(!expect.includes(r.code))throw Error(message || `DWP E-Mail-Versand: Mailserver lehnt ab (${r.code}).`);return r;};
    (async()=>{
      const greeting=read();
      const open=connect || ((c,secure)=>secure?tls.connect({host:c.host,port:c.port,servername:c.host}):net.connect({host:c.host,port:c.port}));
      attach(open(cfg,cfg.secure));
      if((await greeting).code!==220)throw Error('DWP E-Mail-Versand: Mailserver nicht bereit.');
      const helo='dachwerkpro.de';
      let ehlo=await cmd(`EHLO ${helo}`,[250]);
      if(!cfg.secure && !connect?.plainForTests) {
        if(!/STARTTLS/i.test(ehlo.text))throw Error('DWP E-Mail-Versand: Mailserver bietet keine Verschlüsselung an.');
        await cmd('STARTTLS',[220]);
        socket.removeListener('data',onData);
        const secured=tls.connect({socket,servername:cfg.host});
        await new Promise((res,rej)=>{secured.once('secureConnect',res);secured.once('error',rej);});
        attach(secured);
        ehlo=await cmd(`EHLO ${helo}`,[250]);
      }
      await cmd(`AUTH PLAIN ${b64(`\0${cfg.user}\0${cfg.password}`)}`,[235],'DWP E-Mail-Versand: Anmeldung am Postfach fehlgeschlagen (Adresse/Passwort prüfen).');
      await cmd(`MAIL FROM:<${addressOf(cfg.from)}>`,[250]);
      await cmd(`RCPT TO:<${addressOf(clean(to))}>`,[250,251],'DWP E-Mail-Versand: Empfängeradresse abgelehnt.');
      await cmd('DATA',[354]);
      const body=buildMessage({from:cfg.from,to,subject,text,html}).split('\r\n').map(l=>l.startsWith('.')?`.${l}`:l).join('\r\n');
      const answer=read();socket.write(`${body}\r\n.\r\n`);
      if((await answer).code!==250)throw Error('DWP E-Mail-Versand: Nachricht nicht angenommen.');
      try{await cmd('QUIT',[221]);}catch{}
      done=true;clearTimeout(timer);socket.end();resolve(true);
    })().catch(error=>{clearTimeout(timer);fail(error);});
  });
}

async function sendMail(message,{env=process.env,fetchImpl=globalThis.fetch,connect}={}) {
  const cfg=mailConfig(env);
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(clean(message.to)))throw Error('DWP E-Mail-Versand: Empfängeradresse ungültig.');
  if(cfg.kind==='smtp')return smtpSend(cfg,message,{connect});
  const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${cfg.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:cfg.from,to:[clean(message.to)],subject:clean(message.subject),text:message.text,...(message.html?{html:message.html}:{})})});
  if(!response.ok)throw Error('DWP E-Mail konnte nicht gesendet werden.');
  return true;
}

function resetMail(url) {
  const safe=String(url).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  return {
    subject:'DachWerkPro – Passwort zurücksetzen',
    text:`Du hast ein neues Passwort für DachWerkPro angefordert.\n\nÜber diesen Link legst du es fest (nur 1 Stunde gültig):\n${url}\n\nFalls du das nicht warst, ignoriere diese Nachricht. Dein bisheriges Passwort bleibt dann gültig.`,
    html:`<p>Du hast ein neues Passwort für DachWerkPro angefordert.</p><p><a href="${safe}">Neues Passwort festlegen</a> (nur 1 Stunde gültig)</p><p>Falls du das nicht warst, ignoriere diese Nachricht. Dein bisheriges Passwort bleibt dann gültig.</p>`
  };
}

module.exports={sendMail,mailConfig,buildMessage,resetMail};
