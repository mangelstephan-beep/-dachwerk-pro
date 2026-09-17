(() => {
  const LV_DB_KEY = 'dwp-lv-import-v1';
  const SEARCH_DB_KEY = 'dwp-lv-search-v1';
  const MATERIAL_DB_KEY = 'dwp-material-db-v1';

  const num = (v) => Number(String(v ?? '').replace(/\./g,'').replace(',','.')) || 0;
  const esc = (v) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  function tokens(text='') {
    return [...new Set(String(text).toLowerCase().replace(/[^a-z0-9äöüß]+/gi,' ').split(/\s+/).filter(w => w.length > 2))];
  }

  function shortCode(pos) {
    if (pos.shortCode) return pos.shortCode;
    const t = tokens(pos.text || pos.title).slice(0,3).map(w => w.slice(0,4).toUpperCase());
    return t.join('-') || String(pos.nr || 'POS').replace(/[^a-z0-9]/gi,'').toUpperCase();
  }

  function indexPositions() {
    const db = read(LV_DB_KEY,{documents:[],workingCopies:[]});
    const search = read(SEARCH_DB_KEY,{items:[]});
    const map = new Map((search.items || []).map(x => [x.positionId,x]));
    for (const work of db.workingCopies || []) {
      for (const pos of work.positions || []) {
        const key = tokens(`${pos.text || ''} ${pos.title || ''}`);
        const current = map.get(pos.id) || {};
        map.set(pos.id, {
          ...current,
          positionId: pos.id,
          workId: work.id,
          nr: pos.nr || '',
          shortCode: shortCode(pos),
          keywords: key,
          text: pos.text || pos.title || '',
          unit: pos.unit || '',
          calcMaterialId: pos.calcMaterialId || current.calcMaterialId || '',
          calcMaterialName: pos.calcMaterialName || current.calcMaterialName || '',
          calcMaterialSupplier: pos.calcMaterialSupplier || current.calcMaterialSupplier || '',
          calcMaterialPrice: num(pos.material) || num(current.calcMaterialPrice),
          updatedAt: new Date().toISOString()
        });
      }
    }
    const next={items:[...map.values()]};
    write(SEARCH_DB_KEY,next);
    return next;
  }

  function normalizedMaterialDb() {
    const raw = read(MATERIAL_DB_KEY,{items:[]});
    const items = Array.isArray(raw) ? raw : (raw.items || []);
    return items.map((m,i) => ({
      id: m.id || `mat-${i+1}`,
      name: m.name || m.product || m.bezeichnung || '',
      manufacturer: m.manufacturer || m.hersteller || '',
      supplier: m.supplier || m.lieferant || '',
      articleNo: m.articleNo || m.artikelnummer || '',
      unit: m.unit || m.einheit || '',
      price: num(m.netPrice ?? m.price ?? m.ek ?? m.einkaufspreis),
      validFrom: m.validFrom || m.preisstand || '',
      keywords: tokens(`${m.name || m.product || m.bezeichnung || ''} ${m.manufacturer || m.hersteller || ''} ${m.articleNo || m.artikelnummer || ''} ${(m.keywords || []).join?.(' ') || m.keywords || ''}`)
    })).filter(m => m.name && m.price > 0);
  }

  function scoreMaterial(pos, material) {
    const p = new Set(tokens(`${pos.text || ''} ${pos.title || ''} ${(pos.keywords || []).join?.(' ') || ''}`));
    let score=0;
    for (const k of material.keywords) if (p.has(k)) score += k.length >= 6 ? 3 : 1;
    const txt=String(pos.text || pos.title || '').toLowerCase();
    if (material.manufacturer && txt.includes(material.manufacturer.toLowerCase())) score += 6;
    if (material.name && txt.includes(material.name.toLowerCase())) score += 10;
    return score;
  }

  function bestMaterial(pos) {
    const candidates = normalizedMaterialDb()
      .map(m => ({...m,score:scoreMaterial(pos,m)}))
      .filter(m => m.score > 0)
      .sort((a,b) => b.score-a.score || a.price-b.price);
    if (!candidates.length) return null;
    const bestScore = candidates[0].score;
    return candidates.filter(x => x.score === bestScore).sort((a,b)=>a.price-b.price)[0];
  }

  function applyBestMaterial(workId,posId) {
    const db = read(LV_DB_KEY,{documents:[],workingCopies:[]});
    const work = (db.workingCopies || []).find(w=>w.id===workId);
    const pos = work?.positions?.find(p=>p.id===posId);
    if (!pos) return null;
    const best = bestMaterial(pos);
    if (!best) return null;
    pos.material = best.price;
    pos.calcMaterialId = best.id;
    pos.calcMaterialName = [best.manufacturer,best.name].filter(Boolean).join(' ').trim();
    pos.calcMaterialSupplier = best.supplier || '';
    pos.calcMaterialArticleNo = best.articleNo || '';
    write(LV_DB_KEY,db);
    indexPositions();
    return best;
  }

  function enhanceRow(card,tr,work,pos) {
    const textCell = tr.querySelector('[data-f="text"]')?.closest('td');
    if (!textCell) return;
    let info=textCell.querySelector('[data-calculated-material]');
    if (!info) {
      info=document.createElement('div');
      info.dataset.calculatedMaterial='true';
      info.style.cssText='margin-top:6px;padding:6px 8px;border-radius:8px;background:#eef7ff;color:#175cd3;font-size:12px;font-weight:700';
      textCell.appendChild(info);
    }
    info.innerHTML = pos.calcMaterialName
      ? `Kalkuliert: ${esc(pos.calcMaterialName)}${pos.calcMaterialSupplier?` · ${esc(pos.calcMaterialSupplier)}`:''}`
      : 'Kalkuliert: noch kein Material gewählt';

    if (!textCell.querySelector('[data-material-match-button]')) {
      const btn=document.createElement('button');
      btn.type='button'; btn.className='text-button'; btn.dataset.materialMatchButton='true';
      btn.textContent='Bestes Material übernehmen';
      btn.style.marginTop='5px';
      btn.onclick=()=>{
        const best=applyBestMaterial(work.id,pos.id);
        if (!best) { info.textContent='Kein passendes Material mit Preis in der Materialdatenbank gefunden.'; return; }
        const materialInput=tr.querySelector('[data-f="material"]');
        if (materialInput) { materialInput.value=String(best.price).replace('.',','); materialInput.dispatchEvent(new Event('input',{bubbles:true})); }
        info.innerHTML=`Kalkuliert: ${esc([best.manufacturer,best.name].filter(Boolean).join(' '))}${best.supplier?` · ${esc(best.supplier)}`:''}`;
      };
      textCell.appendChild(btn);
    }
  }

  function enhanceCard(card) {
    const db=read(LV_DB_KEY,{documents:[],workingCopies:[]});
    const work=(db.workingCopies||[]).find(w=>w.id===card.dataset.workCard);
    if (!work) return;
    const byId=new Map((work.positions||[]).map(p=>[p.id,p]));
    card.querySelectorAll('tbody tr[data-pos-id]').forEach(tr=>{
      const p=byId.get(tr.dataset.posId); if(p) enhanceRow(card,tr,work,p);
    });
    if (!card.querySelector('[data-material-all-button]')) {
      const actions=card.querySelector('[data-work-action]')?.parentElement;
      if (actions) {
        const btn=document.createElement('button'); btn.type='button'; btn.className='button button-secondary'; btn.dataset.materialAllButton='true'; btn.textContent='Materialpreise automatisch abgleichen';
        btn.onclick=()=>{
          let count=0; for(const p of work.positions||[]) if(applyBestMaterial(work.id,p.id)) count++;
          card.querySelectorAll('tbody tr[data-pos-id]').forEach(tr=>{const p=(read(LV_DB_KEY,{workingCopies:[]}).workingCopies||[]).find(w=>w.id===work.id)?.positions?.find(x=>x.id===tr.dataset.posId); if(p) enhanceRow(card,tr,work,p);});
          location.hash=location.hash;
        };
        actions.appendChild(btn);
      }
    }
  }

  function enhance(){ indexPositions(); document.querySelectorAll('[data-work-card]').forEach(enhanceCard); }
  const observer=new MutationObserver(enhance); observer.observe(document.body,{childList:true,subtree:true}); enhance();
})();