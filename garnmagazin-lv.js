(() => {
  const main = document.querySelector('#main-content');
  if (!main) return;

  const STORAGE_KEY = 'dwp-lv-garnmagazin-004';
  const lv = {
    id: '20260448',
    customer: 'Garnmagazin GmbH & Co. KG',
    project: 'Garnmagazin Brücke (004)',
    location: '83059 Kolbermoor',
    date: '19.05.2026',
    title: 'Los 08 · Alternativer Aufbau: Dämmung und Abdichtung Brücken- und Stegdecke',
    source: 'Spenglerei Stadler GmbH',
    positions: [
      ['08.1',310,'m²','Untergrundvorbereitung','Bereich Brücke – Umkehrdach; Reinigung der vorhandenen Dachfläche mit Dampfsperrbahn.'],
      ['08.2',310,'m²','Zweilagige Bitumenabdichtung','Zweilagige Bitumenabdichtung auf bauseits vorhandene Dampfsperre aufbringen.'],
      ['08.3',1,'m','Zweilagige Bitumenabdichtung Fernwärmekoffer','Fernwärmekoffer ca. 82 cm breit und ca. 35 cm hoch fachgerecht abdichten.'],
      ['08.4',280,'m²','1. Lage XPS-Dämmung – 120 mm','XPS 120 mm auf Abdichtung gemäß Architektenskizze; Höhensprünge einkalkulieren.'],
      ['08.5',190,'m²','2. Lage XPS-Dämmung – 120 mm','XPS 120 mm, zweite Lage; Höhensprünge einkalkulieren.'],
      ['08.6',85,'m²','2. Lage XPS-Dämmung – 60 mm','XPS 60 mm, zweite Lage; Höhensprünge einkalkulieren.'],
      ['08.7',95,'m²','3. Lage XPS-Dämmung – 100 mm','XPS 100 mm, dritte Lage; Höhensprünge einkalkulieren.'],
      ['08.8',70,'m²','3. Lage XPS-Dämmung – 80 mm','XPS 80 mm, dritte Lage; Höhensprünge einkalkulieren.'],
      ['08.9',50,'m²','3. Lage XPS-Dämmung – 60 mm','XPS 60 mm, dritte Lage; Höhensprünge einkalkulieren.'],
      ['08.10',310,'m²','Systemvlies','Ravatherm XPS MK oder gleichwertig auf Dämmung verlegen, einschließlich Höhensprünge.'],
      ['08.11',450,'m²','Untergrundvorbereitung','Bereich Brückenanbau – Warmdach; Dampfsperrbahn abkehren, Material aufnehmen und entsorgen.'],
      ['08.12',150,'m²','Gefälledämmung – Teildachfläche A','PUR-Gefälledämmung DIN EN 13165; ca. 1,5 % zum Dachrand / 0,3 % quer; ca. 65–210 mm; vollflächig in Heißbitumen.'],
      ['08.13',300,'m²','Gefälledämmung – Teildachfläche B','Wie vor, Gefälle variierend, teilweise ca. 2,1 %; Dämmstärke ca. 130–480 mm gemäß Dämmplan.'],
      ['08.14',12,'m²','Grunddämmung – Teildachfläche C','Plane Dämmplatten ca. 150 mm, teilweise auf ca. 34° geneigter Deckenplatte; Übergang mit Schrägschnitt.'],
      ['08.15',450,'m²','1. Abdichtungslage – Elastomerbitumen-Dachabdichtungsbahn','Vollflächig in Heißbitumen; BauderKOMPAKT ULK oder gleichwertig.'],
      ['08.16',450,'m²','Oberlage – Polymerbitumen-Schweißbahn, wurzelresistent','Vollflächig verschweißen; BauderSMARAGD oder gleichwertig; wurzelresistent nach FLL.'],
      ['08.17',450,'m²','Trenn- und Gleitschichten','2x PE-Trenn- und Gleitschicht, 0,2 mm, 190 g/m²; BauderGREEN PE 02 oder gleichwertig.'],
      ['08.18',95,'m²','Elastodrainmatte','Schutz- und Drainagematte, Höhe 19 mm; Zinco Elastodrain EL 202 oder gleichwertig.'],
      ['08.19',35,'m','Höhensprung – ca. 130 mm','Komplettleistung aus Abdichtungslagen, Trenn-/Gleitschicht, Elastodrainmatte und hitzebeständigem Trennvlies; ca. 120–130 mm / 45–46°.'],
      ['08.20',8,'m','Höhensprung – ca. 180 mm','Komplettleistung aus Abdichtungslagen, Trenn-/Gleitschicht, Elastodrainmatte und hitzebeständigem Trennvlies; Ausführung gemäß Detail A106-0.011.'],
      ['08.21',9,'m','Übergang Warm- zu Umkehrdach','Übergang fachgerecht herstellen, einschließlich Stahl-/Blechwinkel als Abschluss der Elastodrainmatte.']
    ].map(([nr, qty, unit, title, text]) => ({nr, qty, unit, title, text}))
  };

  function esc(v) {
    return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  }

  function readPrices() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }

  function money(v) {
    return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v)||0);
  }

  function inject() {
    const page = main.querySelector('.page[data-page="calculation"]');
    if (!page || page.querySelector('[data-garnmagazin-lv]')) return;
    const prices = readPrices();
    const anchor = page.querySelector('.page-navigation') || page.querySelector('.page-header');
    if (!anchor) return;

    const section = document.createElement('section');
    section.className = 'panel panel-pad';
    section.dataset.garnmagazinLv = 'true';
    section.style.marginBottom = '16px';
    section.innerHTML = `
      <div class="panel-head">
        <div>
          <span class="eyebrow">Importiertes Leistungsverzeichnis</span>
          <h2>${esc(lv.project)}</h2>
          <p>${esc(lv.title)} · LV ${esc(lv.id)} · ${esc(lv.date)}</p>
        </div>
        <span class="status-pill status-blue">21 Positionen</span>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 16px">
        <span class="status-pill">AG: ${esc(lv.customer)}</span>
        <span class="status-pill">Ort: Kolbermoor</span>
        <span class="status-pill">Quelle: ${esc(lv.source)}</span>
      </div>
      <div class="data-table-wrap">
        <table class="data-table searchable-table" data-lv-table>
          <thead><tr><th>Pos.</th><th>Menge</th><th>Leistung</th><th>EP netto</th><th>GP netto</th></tr></thead>
          <tbody>
            ${lv.positions.map(p => `
              <tr>
                <td><strong>${esc(p.nr)}</strong></td>
                <td>${p.qty.toLocaleString('de-DE')} ${esc(p.unit)}</td>
                <td><strong>${esc(p.title)}</strong><small style="display:block;margin-top:4px">${esc(p.text)}</small></td>
                <td style="min-width:135px"><input data-lv-ep="${esc(p.nr)}" inputmode="decimal" value="${esc(prices[p.nr] ?? '')}" placeholder="0,00" style="width:110px" /></td>
                <td data-lv-gp="${esc(p.nr)}">${money((Number(String(prices[p.nr]??'').replace(',','.'))||0)*p.qty)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:14px">
        <div style="min-width:280px;display:grid;grid-template-columns:1fr auto;gap:8px 16px">
          <span>Summe netto</span><strong data-lv-net>0,00 €</strong>
          <span>19 % MwSt.</span><strong data-lv-vat>0,00 €</strong>
          <span>Gesamtsumme</span><strong data-lv-gross>0,00 €</strong>
        </div>
      </div>
      <p class="muted" style="margin-top:12px">EP-Eingaben werden lokal im Browser gespeichert. GP, Netto, MwSt. und Gesamtsumme werden automatisch berechnet.</p>`;

    anchor.insertAdjacentElement('afterend', section);

    function recalc() {
      let net = 0;
      const store = {};
      section.querySelectorAll('[data-lv-ep]').forEach(input => {
        const p = lv.positions.find(x => x.nr === input.dataset.lvEp);
        const raw = input.value.trim();
        const ep = Number(raw.replace(/\./g,'').replace(',','.')) || 0;
        if (raw) store[p.nr] = raw;
        const gp = ep * p.qty;
        net += gp;
        const out = section.querySelector(`[data-lv-gp="${CSS.escape(p.nr)}"]`);
        if (out) out.textContent = money(gp);
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      section.querySelector('[data-lv-net]').textContent = money(net);
      section.querySelector('[data-lv-vat]').textContent = money(net * 0.19);
      section.querySelector('[data-lv-gross]').textContent = money(net * 1.19);
    }

    section.addEventListener('input', e => {
      if (e.target.matches('[data-lv-ep]')) recalc();
    });
    recalc();
  }

  const observer = new MutationObserver(inject);
  observer.observe(main, {childList:true, subtree:true});
  inject();
})();