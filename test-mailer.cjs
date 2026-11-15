const assert=require('node:assert/strict');
const net=require('node:net');
const {sendMail,mailConfig,buildMessage,resetMail}=require('./lib/mailer.cjs');
// Passwort-Reset-Mails über das eigene Postfach (Strato-SMTP) oder Resend.
(async()=>{
  // Konfiguration: Strato als Standard, nur Adresse + Passwort nötig.
  assert.throws(()=>mailConfig({}),/nicht eingerichtet/);
  assert.throws(()=>mailConfig({DWP_SMTP_USER:'info@dachwerkpro.de'}),/Passwort/);
  const cfg=mailConfig({DWP_SMTP_USER:' info@dachwerkpro.de ',DWP_SMTP_PASSWORD:'geheim'});
  assert.deepEqual({host:cfg.host,port:cfg.port,secure:cfg.secure,from:cfg.from},{host:'smtp.strato.de',port:465,secure:true,from:'DachWerkPro <info@dachwerkpro.de>'});
  assert.equal(mailConfig({DWP_SMTP_USER:'a@b.de',DWP_SMTP_PASSWORD:'x',DWP_SMTP_PORT:'587'}).secure,false);
  assert.equal(mailConfig({DWP_SMTP_USER:'a@b.de',DWP_SMTP_PASSWORT:'deutsch'}).password,'deutsch','deutsche Schreibweise PASSWORT wird akzeptiert');
  assert.throws(()=>mailConfig({DWP_SMTP_USER:'a@b.de',DWP_SMTP_PASSWORD:'x',DWP_SMTP_PORT:'99999'}),/PORT/);
  assert.equal(mailConfig({RESEND_API_KEY:'k',DWP_MAIL_FROM:'x@y.de'}).kind,'resend');

  // Nachricht: Umlaute im Betreff kodiert, keine Kopfzeilen-Injektion, Link im Text.
  const mail=resetMail('https://www.dachwerkpro.de/reset-password?token=abc&x="1"');
  const raw=buildMessage({from:'DachWerkPro <info@dachwerkpro.de>',to:'kunde@example.org\r\nBcc: boese@example.org',subject:mail.subject,...mail});
  assert.match(raw,/^Subject: =\?UTF-8\?B\?/m);
  assert.doesNotMatch(raw,/^Bcc:/m,'Zeilenumbruch in Empfänger darf keine Kopfzeile erzeugen');
  const parts=raw.split(/\r\n\r\n/).slice(1).join('\n');
  const decoded=parts.split('\n').filter(l=>/^[A-Za-z0-9+/=]+$/.test(l.trim())).join('');
  assert(Buffer.from(decoded,'base64').toString('utf8').includes('token=abc'));
  assert(mail.html.includes('&amp;x=&quot;1&quot;'),'Link im HTML maskiert');

  // Fake-SMTP-Server: prüft Dialog, Anmeldung und Inhalt.
  let received={},authOk=true;
  const server=net.createServer(sock=>{
    let data=false,body='';
    sock.write('220 smtp.test ESMTP\r\n');
    sock.on('data',chunk=>{
      for(const line of chunk.toString().split('\r\n')) {
        if(data){if(line==='.'){data=false;received.body=body;sock.write('250 queued\r\n');}else body+=line+'\n';continue;}
        if(!line)continue;
        if(line.startsWith('EHLO'))sock.write('250-smtp.test\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n');
        else if(line.startsWith('AUTH PLAIN')){received.auth=Buffer.from(line.slice(11),'base64').toString();sock.write(authOk?'235 ok\r\n':'535 Authentication failed\r\n');}
        else if(line.startsWith('MAIL FROM')){received.from=line;sock.write('250 ok\r\n');}
        else if(line.startsWith('RCPT TO')){received.to=line;sock.write('250 ok\r\n');}
        else if(line==='DATA'){data=true;sock.write('354 go\r\n');}
        else if(line==='QUIT'){sock.write('221 bye\r\n');sock.end();}
      }
    });
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const port=server.address().port;
  const connect=Object.assign(()=>net.connect({host:'127.0.0.1',port}),{plainForTests:true});
  const env={DWP_SMTP_USER:'info@dachwerkpro.de',DWP_SMTP_PASSWORD:'Pass mit Ümlaut',DWP_SMTP_PORT:'2525'};
  assert.equal(await sendMail({to:'stephan@example.org',...resetMail('https://www.dachwerkpro.de/reset-password?token=t1')},{env,connect}),true);
  assert.equal(received.auth,'\0info@dachwerkpro.de\0Pass mit Ümlaut');
  assert.equal(received.from,'MAIL FROM:<info@dachwerkpro.de>');assert.equal(received.to,'RCPT TO:<stephan@example.org>');
  assert.match(received.body,/^From: DachWerkPro <info@dachwerkpro.de>$/m);assert.match(received.body,/^To: stephan@example.org$/m);
  authOk=false;
  await assert.rejects(sendMail({to:'stephan@example.org',...resetMail('https://x.de')},{env,connect}),/Anmeldung am Postfach fehlgeschlagen/);
  await assert.rejects(sendMail({to:'kein-mail',...resetMail('https://x.de')},{env,connect}),/Empfängeradresse ungültig/);
  server.close();

  // Resend bleibt als Alternative nutzbar.
  let call;await sendMail({to:'a@b.de',...resetMail('https://x.de')},{env:{RESEND_API_KEY:'k',DWP_MAIL_FROM:'DachWerkPro <info@dachwerkpro.de>'},fetchImpl:async(url,opts)=>{call={url,body:JSON.parse(opts.body)};return {ok:true};}});
  assert.equal(call.url,'https://api.resend.com/emails');assert.deepEqual(call.body.to,['a@b.de']);
  console.log('Mailversand Passwort-Reset (SMTP/Strato, Resend): ok');
})().catch(error=>{console.error(error);process.exit(1);});
