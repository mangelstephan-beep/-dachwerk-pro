(() => {
  const main = document.querySelector('#main-content');
  if (!main) return;
  const KEY = 'dwp-lv-garnmagazin-004-v2';
  const qty = {'08.1':310,'08.2':310,'08.3':1,'08.4':280,'08.5':190,'08.6':85,'08.7':95,'08.8':70,'08.9':50,'08.10':310,'08.11':450,'08.12':150,'08.13':300,'08.14':12,'08.15':450,'08.16':450,'08.17':450,'08.18':95,'08.19':35,'08.20':8,'08.21':9};
  const parse = v => { const s=String(v??'').trim(); if(!s) return 0; return Number(s.replace(/\./g,'').replace(',','.'))||0; };
  const money = v => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v)||0);
  const esc = v => String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const read = () => { try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}} };
  const write = d => localStorage.setItem(KEY,JSON.stringify(d));

  function ensureExtras(){
    const sec=main.querySelector('[data-garnmagazin-lv]');
    if(!sec || sec.dataset.efbReady==='1') return;
    sec.dataset.efbReady='1';
    const saved=read();
    const firstConfig=sec.querySelector('#lv-minute-rate')?.closest('.panel');
    const panel=document.createElement('div');
    panel.className='panel panel-pad';
    panel.style.cssText='margin-bottom:16px;background:#fff8ed';
    panel.innerHTML=`<div class="panel-head"><div><span class="eyebrow">EFB-Kalkulationsbasis</span><h2>Zuschläge getrennt ausweisen</h2><p>Die Werte fließen in EP/GP und gleichzeitig in die EFB-Auswertung ein.</p></div></div>
      <div class="quick-form">
        <div><label>Lohnkostenzuschlag %</label><input data-efb-global="laborMarkup" inputmode="decimal" value="${esc(saved.efb?.laborMarkup??'')}" placeholder="0,00"></div>
        <div><label>Materialzuschlag %</label><input data-efb-global="materialMarkup" inputmode="decimal" value="${esc(saved.efb?.materialMarkup??'')}" placeholder="0,00"></div>
        <div><label>AGK %</label><input data-efb-global="agk" inputmode="decimal" value="${esc(saved.efb?.agk??'')}" placeholder="0,00"></div>
        <div><label>Wagnis & Gewinn %</label><input data-efb-global="wg" inputmode="decimal" value="${esc(saved.efb?.wg??'')}" placeholder="0,00"></div>
      </div>`;
    firstConfig?.insertAdjacentElement('afterend',panel);

    const table=sec.querySelector('[data-lv-table]');
    if(table){
      const heads=table.querySelectorAll('thead th');
      if(heads.length>=8){
        heads[6].insertAdjacentHTML('beforebegin','<th>Gerät € / Einh.</th><th>Fremdleistung € / Einh.</th>');
      }
      table.querySelectorAll('tbody tr[data-lv-row]').forEach(row=>{
        const nr=row.dataset.lvRow; const p=saved.efbPositions?.[nr]||{};
        const epCell=row.querySelector(`[data-lv-ep="${CSS.escape(nr)}"]`);
        epCell?.insertAdjacentHTML('beforebegin',`<td><input data-efb-device="${esc(nr)}" inputmode="decimal" value="${esc(p.device??'')}" placeholder="0,00" style="width:90px"></td><td><input data-efb-sub="${esc(nr)}" inputmode="decimal" value="${esc(p.sub??'')}" placeholder="0,00" style="width:100px"></td>`);
      });
    }

    sec.addEventListener('input',e=>{ if(e.target.matches('[data-efb-global],[data-efb-device],[data-efb-sub],#lv-minute-rate,[data-lv-time],[data-lv-material]')) setTimeout(recalc,0); });
    recalc();
  }

  function recalc(){
    const sec=main.querySelector('[data-garnmagazin-lv]'); if(!sec) return;
    const saved=read();
    const minuteRate=parse(sec.querySelector('#lv-minute-rate')?.value);
    const globals={}; sec.querySelectorAll('[data-efb-global]').forEach(i=>globals[i.dataset.efbGlobal]=i.value);
    const lz=parse(globals.laborMarkup)/100, mz=parse(globals.materialMarkup)/100, agkRate=parse(globals.agk)/100, wgRate=parse(globals.wg)/100;
    let total=0, sumLabor=0, sumLaborZ=0, sumMat=0, sumMatZ=0, sumDevice=0, sumSub=0, sumAgk=0, sumWg=0;
    const efbPositions={};
    sec.querySelectorAll('tbody tr[data-lv-row]').forEach(row=>{
      const nr=row.dataset.lvRow;
      const time=parse(row.querySelector(`[data-lv-time="${CSS.escape(nr)}"]`)?.value);
      const material=parse(row.querySelector(`[data-lv-material="${CSS.escape(nr)}"]`)?.value);
      const device=parse(row.querySelector(`[data-efb-device="${CSS.escape(nr)}"]`)?.value);
      const sub=parse(row.querySelector(`[data-efb-sub="${CSS.escape(nr)}"]`)?.value);
      const labor=time*minuteRate, laborZ=labor*lz, matZ=material*mz;
      const direct=labor+laborZ+material+matZ+device+sub;
      const agk=direct*agkRate, wg=(direct+agk)*wgRate, ep=direct+agk+wg, gp=ep*(qty[nr]||0);
      row.querySelector(`[data-lv-labor="${CSS.escape(nr)}"]`)?.replaceChildren(document.createTextNode(money(labor)));
      row.querySelector(`[data-lv-ep="${CSS.escape(nr)}"]`)?.replaceChildren(document.createTextNode(money(ep)));
      row.querySelector(`[data-lv-gp="${CSS.escape(nr)}"]`)?.replaceChildren(document.createTextNode(money(gp)));
      total+=gp; sumLabor+=labor*(qty[nr]||0); sumLaborZ+=laborZ*(qty[nr]||0); sumMat+=material*(qty[nr]||0); sumMatZ+=matZ*(qty[nr]||0); sumDevice+=device*(qty[nr]||0); sumSub+=sub*(qty[nr]||0); sumAgk+=agk*(qty[nr]||0); sumWg+=wg*(qty[nr]||0);
      efbPositions[nr]={time,material,device,sub,labor,laborZ,matZ,agk,wg,ep,gp};
    });
    const net=sec.querySelector('[data-lv-net]'), vat=sec.querySelector('[data-lv-vat]'), gross=sec.querySelector('[data-lv-gross]');
    if(net) net.textContent=money(total); if(vat) vat.textContent=money(total*.19); if(gross) gross.textContent=money(total*1.19);
    write({...saved,efb:globals,efbPositions,efbTotals:{labor:sumLabor,laborMarkup:sumLaborZ,material:sumMat,materialMarkup:sumMatZ,device:sumDevice,sub:sumSub,agk:sumAgk,wg:sumWg,total}});
  }

  function showEfb(){
    recalc(); const d=read(), t=d.efbTotals||{}, pos=d.efbPositions||{};
    document.querySelector('#dwp-efb-overlay')?.remove();
    const ov=document.createElement('div'); ov.id='dwp-efb-overlay'; ov.style.cssText='position:fixed;inset:0;z-index:9999;background:#fff;overflow:auto;padding:28px';
    ov.innerHTML=`<style>@media print{body>*:not(#dwp-efb-overlay){display:none!important}#dwp-efb-overlay{position:static!important;padding:0!important}.efb-no-print{display:none!important}}</style>
      <div style="max-width:1400px;margin:auto"><div class="efb-no-print" style="display:flex;gap:10px;justify-content:flex-end;margin-bottom:18px"><button class="button button-secondary" data-efb-close>← Zurück</button><button class="button button-primary" data-efb-print>🖨 EFB drucken / PDF</button></div>
      <h1>EFB-Auswertung · Garnmagazin Brücke (004)</h1><p>LV 20260448 · getrennte Preisbestandteile aus der Kalkulation</p>
      <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Pos.</th><th>Zeit min/Einh.</th><th>Lohn</th><th>Lohn-Zuschlag</th><th>Material</th><th>Mat.-Zuschlag</th><th>Gerät</th><th>Fremdleistung</th><th>AGK</th><th>W&G</th><th>EP</th><th>GP</th></tr></thead><tbody>${Object.entries(pos).map(([nr,p])=>`<tr><td><strong>${esc(nr)}</strong></td><td>${Number(p.time||0).toLocaleString('de-DE')}</td><td>${money(p.labor)}</td><td>${money(p.laborZ)}</td><td>${money(p.material)}</td><td>${money(p.matZ)}</td><td>${money(p.device)}</td><td>${money(p.sub)}</td><td>${money(p.agk)}</td><td>${money(p.wg)}</td><td><strong>${money(p.ep)}</strong></td><td><strong>${money(p.gp)}</strong></td></tr>`).join('')}</tbody></table></div>
      <div style="margin-top:24px;max-width:520px;margin-left:auto"><h2>Summen Preisbestandteile</h2><div style="display:grid;grid-template-columns:1fr auto;gap:8px 18px"><span>Lohn</span><strong>${money(t.labor)}</strong><span>Lohnkostenzuschlag</span><strong>${money(t.laborMarkup)}</strong><span>Material</span><strong>${money(t.material)}</strong><span>Materialzuschlag</span><strong>${money(t.materialMarkup)}</strong><span>Geräte</span><strong>${money(t.device)}</strong><span>Fremdleistungen</span><strong>${money(t.sub)}</strong><span>AGK</span><strong>${money(t.agk)}</strong><span>Wagnis & Gewinn</span><strong>${money(t.wg)}</strong><span>Gesamtsumme netto</span><strong>${money(t.total)}</strong></div></div></div>`;
    document.body.appendChild(ov); ov.querySelector('[data-efb-close]').onclick=()=>ov.remove(); ov.querySelector('[data-efb-print]').onclick=()=>window.print();
  }

  document.addEventListener('click',e=>{ const b=e.target.closest('[data-action="efb"]'); if(!b) return; e.preventDefault(); e.stopImmediatePropagation(); showEfb(); },true);
  const ob=new MutationObserver(ensureExtras); ob.observe(main,{childList:true,subtree:true}); ensureExtras();
})();