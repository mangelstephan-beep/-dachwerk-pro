'use strict';
// Verbindung DachWerkPro → Make → Dropbox.
// DWP meldet Ereignisse an einen Make-Webhook; Make legt Ordner an bzw. lädt die Datei
// über einen kurzlebigen, signierten Download-Link (api/make-file.js) und speichert sie in Dropbox.
// Abgeschaltet, solange DWP_MAKE_WEBHOOK_URL oder DWP_MAKE_SECRET fehlen. Fehler beim Melden
// blockieren nie den eigentlichen Vorgang in DWP; sie werden nur im Rückgabewert gemeldet.
// Es verlassen nur Dateien/Sicherungen/Exporte den Server, die der Eigentümer über diese
// Einstellung ausdrücklich für seine Dropbox freigegeben hat. Keine Secrets in Payload oder Logs.
const {createHmac,timingSafeEqual}=require('node:crypto');

const TOKEN_TTL_SECONDS=24*60*60;
const KINDS=new Set(['file','backup','datev','journal','extf']);
const SUBFOLDERS=['Schriftverkehr','Angebote','Vertraege-NU','Rechnungen','Fotos-Doku','Plaene-Statik','Behoerde'];

function config(env=process.env) {
  // Signierschlüssel: eigenes DWP_MAKE_SECRET oder – ohne zusätzliches Secret – abgeleitet aus
  // BETTER_AUTH_SECRET (HMAC mit eigenem Zweck; das Auth-Secret selbst wird nie verwendet oder weitergegeben).
  const own=String(env.DWP_MAKE_SECRET || ''),auth=String(env.BETTER_AUTH_SECRET || '');
  const url=String(env.DWP_MAKE_WEBHOOK_URL || '').trim(),secret=own || (auth.length>=16?createHmac('sha256',auth).update('dwp-make-sync-v1').digest('hex'):'');
  const enabled=/^https:\/\/hook\.[a-z0-9.-]+\.make\.com\/[A-Za-z0-9]+$/.test(url) && secret.length>=32;
  return {
    enabled,url,secret,
    base:String(env.BETTER_AUTH_URL || 'https://www.dachwerkpro.de').replace(/\/+$/,''),
    root:'/'+String(env.DWP_DROPBOX_ROOT || 'DWP').replace(/^\/+|\/+$/g,'')
  };
}
// Feste Kennung für den Make-Filter: abgeleitet vom Secret, das Secret selbst geht nie an Make.
function webhookKey(secret){return createHmac('sha256',String(secret)).update('dwp-make-webhook').digest('hex').slice(0,40);}
function b64url(buffer){return Buffer.from(buffer).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function sign(payload,secret,now=Date.now()) {
  if(!KINDS.has(payload.k))throw Error('Unbekannte Dateiart.');
  const body=b64url(JSON.stringify({...payload,exp:Math.floor(now/1000)+TOKEN_TTL_SECONDS}));
  return body+'.'+b64url(createHmac('sha256',String(secret)).update(body).digest());
}
function verify(token,secret,now=Date.now()) {
  const [body,mac,extra]=String(token || '').split('.');
  if(!body || !mac || extra!==undefined || body.length>2000)throw Object.assign(Error('Link ungültig.'),{status:403});
  const expected=Buffer.from(b64url(createHmac('sha256',String(secret)).update(body).digest())),given=Buffer.from(mac);
  if(expected.length!==given.length || !timingSafeEqual(expected,given))throw Object.assign(Error('Link ungültig.'),{status:403});
  let data;try{data=JSON.parse(Buffer.from(body.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'));}catch{throw Object.assign(Error('Link ungültig.'),{status:403});}
  if(!KINDS.has(data.k) || typeof data.t!=='string' || !Number.isInteger(data.exp))throw Object.assign(Error('Link ungültig.'),{status:403});
  if(data.exp<Math.floor(now/1000))throw Object.assign(Error('Link abgelaufen.'),{status:410});
  return data;
}
// Ordner- und Dateinamen für Dropbox: keine Pfadzeichen, keine Steuerzeichen, begrenzte Länge.
function safeName(value,fallback='Ohne Namen') {
  const s=String(value ?? '').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]+/g,'-').replace(/\s+/g,' ').replace(/^[\s.-]+|[\s.]+$/g,'').slice(0,80).trim();
  return s || fallback;
}
function projectFolder(project,cfg) {
  const d=project?.data || {};
  return cfg.root+'/Projekte/'+safeName(d.name,'Projekt '+String(project?.id || '').slice(0,8));
}
// Zuordnung Vorgang → Unterordner der Projektvorlage.
function subfolder(record) {
  const d=record?.data || {},cat=String(d.category || '').toLowerCase();
  // Behördenpost erkennt man an Empfänger/Titel (eine eigene Kategorie gibt es im Modul 37 nicht).
  const about=[d.recipient,d.title,d.description].join(' ').toLowerCase();
  if(record?.module==='documents') {
    if(/(brief|nachweis|sonstige)/.test(cat) && /landratsamt|beh[öo]rde|bauamt|bauaufsicht|denkmal|genehmigung|bescheid|gemeinde|stadtverwaltung/.test(about))return 'Behoerde';
    if(/vertrag|nachunternehm/.test(cat))return 'Vertraege-NU';
    if(/angebot|auftrag/.test(cat))return 'Angebote';
    if(/rechnung|gutschrift/.test(cat))return 'Rechnungen';
    if(/foto|bild/.test(cat))return 'Fotos-Doku';
    if(/plan|statik|zeichnung|gutachten/.test(cat))return 'Plaene-Statik';
    return 'Schriftverkehr';
  }
  return {expert:'Plaene-Statik',defects:'Fotos-Doku',diary:'Fotos-Doku',acceptance:'Schriftverkehr'}[record?.module] || 'Schriftverkehr';
}
function datePrefix(value){const s=String(value || '').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s+'_':'';}

async function post(event,cfg,fetchImpl=globalThis.fetch) {
  if(!cfg.enabled)return {ok:false,skipped:true};
  try {
    const res=await fetchImpl(cfg.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:webhookKey(cfg.secret),...event}),signal:AbortSignal.timeout(5000)});
    return res.ok?{ok:true}:{ok:false,error:'Make antwortet mit Status '+res.status};
  }catch(error){return {ok:false,error:error.name==='TimeoutError'?'Make nicht erreichbar (Zeitüberschreitung).':'Make nicht erreichbar.'};}
}
function fileEvent(cfg,{tenantId,kind,id,from,to,folder,fileName,mime,overwrite=false}) {
  const url=cfg.base+'/api/make-file?token='+encodeURIComponent(sign({t:tenantId,k:kind,...(id!==undefined?{id:String(id)}:{}),...(from?{from,to}:{})},cfg.secret));
  return {action:'file',path:folder,fileName:safeName(fileName,'Datei'),mime,url,overwrite};
}
function createSync({env=process.env,fetchImpl=globalThis.fetch}={}) {
  const cfg=config(env);
  return {
    enabled:cfg.enabled,
    // Neues Projekt: Make kopiert die Projektvorlage mit allen Unterordnern.
    projectCreated(project){
      return post({action:'folder',path:projectFolder(project,cfg),template:cfg.root+'/00_Verwaltung/Projektvorlage',project:safeName(project?.data?.name)},cfg,fetchImpl);
    },
    // Geprüft hochgeladene Originaldatei eines Vorgangs → passender Projektunterordner.
    fileStored({tenantId,project,record,file}){
      const name=datePrefix(record?.data?.date)+safeName(file.name,'Datei');
      return post(fileEvent(cfg,{tenantId,kind:'file',id:file.id,folder:projectFolder(project,cfg)+'/'+subfolder(record),fileName:name,mime:file.mime}),cfg,fetchImpl);
    },
    // Serversicherung (manuell oder täglich) → 04_Sicherungen, Dateiname mit Datum und Uhrzeit.
    backupCreated({tenantId,backup}){
      return post(fileEvent(cfg,{tenantId,kind:'backup',id:backup.id,folder:cfg.root+'/04_Sicherungen',fileName:backup.fileName,mime:'application/json',overwrite:true}),cfg,fetchImpl);
    },
    // Monatsexport Buchhaltung: DATEV-Buchungsstapel und Buchungsjournal des Vormonats.
    // Mit extf:true (Berater-/Mandantennummer eingetragen) zusätzlich der DATEV-Buchungsstapel im EXTF-Format.
    async accountingExported({tenantId,from,to,extf=false}){
      const folder=cfg.root+'/03_Buchhaltung/DATEV-Export',span=from+'_'+to;
      const a=await post(fileEvent(cfg,{tenantId,kind:'datev',from,to,folder,fileName:'DachWerkPro_DATEV_Buchungen_'+span+'.csv',mime:'text/csv',overwrite:true}),cfg,fetchImpl);
      const b=await post(fileEvent(cfg,{tenantId,kind:'journal',from,to,folder,fileName:'DachWerkPro_Buchungsjournal_'+span+'.csv',mime:'text/csv',overwrite:true}),cfg,fetchImpl);
      const c=extf?await post(fileEvent(cfg,{tenantId,kind:'extf',from,to,folder,fileName:'EXTF_DachWerkPro_Buchungsstapel_'+span+'.csv',mime:'text/csv',overwrite:true}),cfg,fetchImpl):{ok:true};
      return {ok:a.ok && b.ok && c.ok,skipped:a.skipped,error:a.error || b.error || c.error};
    }
  };
}
// Gleiche Spalten wie der Export im Modul 30 (project-workflows.js journalFile), Semikolon, UTF-8 mit BOM.
function csv(rows){const cell=v=>`"${String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')}"`;return '﻿'+rows.map(r=>r.map(cell).join(';')).join('\r\n');}
function accountingCsv(store,kind,range) {
  const rows=store.journal(range),de=n=>Number(n).toFixed(2).replace('.',','),deDate=d=>d?d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(0,4):'';
  if(kind==='journal')return csv([['Datum','Beleg','Buchungstext','Soll','Haben','Betrag','USt %','Quelle','Projekt'],...rows.map(r=>[deDate(r.date),r.document,r.text,r.debit,r.credit,de(r.amount),r.tax,r.source,r.project])]);
  return csv([['Umsatz (ohne Soll/Haben-Kz)','Soll/Haben-Kennzeichen','WKZ Umsatz','Konto','Gegenkonto (ohne BU-Schlüssel)','BU-Schlüssel','Belegdatum','Belegfeld 1','Buchungstext'],...rows.map(r=>[de(r.amount),'S','EUR',r.debit,r.credit,'',r.date.slice(8,10)+r.date.slice(5,7),String(r.document).slice(0,36),String(r.text).slice(0,60)])]);
}
// Vormonat als JJJJ-MM-TT-Spanne (Kalender Europe/Berlin).
function previousMonth(day) {
  const [y,m]=day.split('-').map(Number),py=m===1?y-1:y,pm=m===1?12:m-1,last=new Date(Date.UTC(py,pm,0)).getUTCDate();
  const mm=String(pm).padStart(2,'0');
  return {from:`${py}-${mm}-01`,to:`${py}-${mm}-${String(last).padStart(2,'0')}`};
}
module.exports={config,webhookKey,sign,verify,safeName,projectFolder,subfolder,createSync,accountingCsv,previousMonth,SUBFOLDERS,TOKEN_TTL_SECONDS};
