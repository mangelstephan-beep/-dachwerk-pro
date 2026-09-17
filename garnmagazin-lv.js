(() => {
  const main = document.querySelector('#main-content');
  if (!main) return;

  const STORAGE_KEY = 'dwp-lv-garnmagazin-004-v2';
  const lv = {
    id: '20260448',
    customer: 'Garnmagazin GmbH & Co. KG',
    project: 'Garnmagazin Brücke (004)',
    location: '83059 Kolbermoor',
    date: '19.05.2026',
    title: 'Los 08 · Alternativer Aufbau: Dämmung und Abdichtung Brücken- und Stegdecke',
    source: 'Spenglerei Stadler GmbH',
    sourceAddress: 'Pullach 19 · 83059 Kolbermoor',
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

  function parseNumber(v) {
    const s = String(v ?? '').trim();
    if (!s) return 0;
    return Number(s.replace(/\./g,'').replace(',','.')) || 0;
  }

  function money(v) {
    return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v)||0);
  }

  function number(v, digits = 2) {
    return new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(v)||0);
  }

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }

  function writeStore(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function inject() {
    const page = main.querySelector('.page[data-page="calculation"]');
    if (!page || page.querySelector('[data-garnmagazin-lv]')) return;
    const saved = readStore();
    const anchor = page.querySelector('.page-navigation') || page.querySelector('.page-header');
    if (!anchor) return;

    const section = document.createElement('section');
    section.className = 'panel panel-pad';
    section.dataset.garnmagazinLv = 'true';
    section.style.marginBottom = '16px';
    section.innerHTML = `
      <div class="panel-head">
        <div>
          <span class="eyebrow">Importiertes Leistungsverzeichnis · Kalkulationsblatt</span>
          <h2>${esc(lv.project)}</h2>
          <p>${esc(lv.title)} · LV ${esc(lv.id)} · ${esc(lv.date)}</p>
        </div>
        <span class="status-pill status-blue">${lv.positions.length} Positionen</span>
      </div>

      <div class="panel panel-pad" style="margin:12px 0 16px;background:#fff">
        <div style="display:grid;grid-template-columns:minmax(250px,1fr) minmax(220px,1fr);gap:16px;align-items:start">
          <div>
            <strong style="display:block;font-size:1.05rem">${esc(lv.source)}</strong>
            <span class="muted">${esc(lv.sourceAddress)}</span><br>
            <span class="muted">Original-LV: ${esc(lv.id)} · ${esc(lv.project)}</span>
          </div>
          <div style="text-align:right">
            <strong>Auftraggeber</strong><br>
            <span>${esc(lv.customer)}</span><br>
            <span>${esc(lv.location)}</span>
          </div>
        </div>
      </div>

      <div class="panel panel-pad" style="margin-bottom:16px;background:#f8fafc">
        <div class="quick-form">
          <div>
            <label for="lv-minute-rate">Minutenwert Lohn in €</label>
            <input id="lv-minute-rate" inputmode="decimal" value="${esc(saved.minuteRate ?? '')}" placeholder="z. B. 1,25" />
            <small class="muted">Ein zentraler Minutenwert für alle Positionen.</small>
          </div>
          <div>
            <label>entspricht Stundenverrechnungssatz</label>
            <input id="lv-hour-rate" readonly value="0,00 € / h" />
            <small class="muted">Minutenwert × 60.</small>
          </div>
        </div>
      </div>

      <div class="data-table-wrap">
        <table class="data-table searchable-table" data-lv-table>
          <thead>
            <tr>
              <th>Pos.</th><th>Menge</th><th>Original-Leistungstext</th><th>Zeit min/${'Einh.'}</th><th>Lohn €/${'Einh.'}</th><th>Material €/${'Einh.'}</th><th>EP netto</th><th>GP netto</th>
            </tr>
          </thead>
          <tbody>
            ${lv.positions.map(p => {
              const s = saved.positions?.[p.nr] || {};
              return `
              <tr data-lv-row="${esc(p.nr)}">
                <td><strong>${esc(p.nr)}</strong></td>
                <td>${p.qty.toLocaleString('de-DE')} ${esc(p.unit)}</td>
                <td style="min-width:320px"><strong>${esc(p.title)}</strong><small style="display:block;margin-top:4px;line-height:1.45">${esc(p.text)}</small></td>
                <td style="min-width:100px"><input data-lv-time="${esc(p.nr)}" inputmode="decimal" value="${esc(s.time ?? '')}" placeholder="0,00" style="width:88px" /></td>
                <td data-lv-labor="${esc(p.nr)}" style="white-space:nowrap">0,00 €</td>
                <td style="min-width:115px"><input data-lv-material="${esc(p.nr)}" inputmode="decimal" value="${esc(s.material ?? '')}" placeholder="0,00" style="width:100px" /></td>
                <td data-lv-ep="${esc(p.nr)}" style="white-space:nowrap;font-weight:700">0,00 €</td>
                <td data-lv-gp="${esc(p.nr)}" style="white-space:nowrap;font-weight:700">0,00 €</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:14px">
        <div style="min-width:320px;display:grid;grid-template-columns:1fr auto;gap:8px 16px">
          <span>Summe netto</span><strong data-lv-net>0,00 €</strong>
          <span>19 % MwSt.</span><strong data-lv-vat>0,00 €</strong>
          <span>Gesamtsumme</span><strong data-lv-gross>0,00 €</strong>
        </div>
      </div>
      <p class="muted" style="margin-top:12px">Berechnung: Zeitwert je Einheit × Minutenwert = Lohn je Einheit. Lohn + Material = EP. EP × Menge = GP. Eingaben werden lokal gespeichert und beim Drucken mit ausgegeben.</p>`;

    anchor.insertAdjacentElement('afterend', section);

    const minuteInput = section.querySelector('#lv-minute-rate');
    const hourInput = section.querySelector('#lv-hour-rate');

    function recalc() {
      const minuteRate = parseNumber(minuteInput.value);
      hourInput.value = `${number(minuteRate * 60)} € / h`;
      let net = 0;
      const store = { minuteRate: minuteInput.value, positions: {} };

      lv.positions.forEach(p => {
        const timeInput = section.querySelector(`[data-lv-time="${CSS.escape(p.nr)}"]`);
        const materialInput = section.querySelector(`[data-lv-material="${CSS.escape(p.nr)}"]`);
        const time = parseNumber(timeInput?.value);
        const material = parseNumber(materialInput?.value);
        const labor = time * minuteRate;
        const ep = labor + material;
        const gp = ep * p.qty;
        net += gp;

        const laborCell = section.querySelector(`[data-lv-labor="${CSS.escape(p.nr)}"]`);
        const epCell = section.querySelector(`[data-lv-ep="${CSS.escape(p.nr)}"]`);
        const gpCell = section.querySelector(`[data-lv-gp="${CSS.escape(p.nr)}"]`);
        if (laborCell) laborCell.textContent = money(labor);
        if (epCell) epCell.textContent = money(ep);
        if (gpCell) gpCell.textContent = money(gp);

        store.positions[p.nr] = {
          time: timeInput?.value || '',
          material: materialInput?.value || ''
        };
      });

      writeStore(store);
      section.querySelector('[data-lv-net]').textContent = money(net);
      section.querySelector('[data-lv-vat]').textContent = money(net * 0.19);
      section.querySelector('[data-lv-gross]').textContent = money(net * 1.19);
    }

    section.addEventListener('input', e => {
      if (e.target.matches('#lv-minute-rate,[data-lv-time],[data-lv-material]')) recalc();
    });
    recalc();
  }

  const observer = new MutationObserver(inject);
  observer.observe(main, {childList:true, subtree:true});
  inject();
})();