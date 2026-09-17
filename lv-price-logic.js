(() => {
  const DB_KEY = 'dwp-lv-import-v1';
  const money = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(v) || 0);
  const num = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
  const esc = (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

  function readDb() {
    try { return JSON.parse(localStorage.getItem(DB_KEY) || '{"documents":[],"workingCopies":[]}'); }
    catch { return { documents: [], workingCopies: [] }; }
  }

  function writeDb(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function normalizedText(p) {
    return String(p?.text || p?.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/gi, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 8)
      .join(' ');
  }

  function historicalAwardFor(position, currentWorkId, db) {
    if (num(position?.awardEp)) return num(position.awardEp);
    const key = normalizedText(position);
    if (!key) return 0;
    const candidates = [];
    for (const work of db.workingCopies || []) {
      if (work.id === currentWorkId) continue;
      for (const p of work.positions || []) {
        if (normalizedText(p) === key && num(p.awardEp)) {
          candidates.push({ value: num(p.awardEp), date: work.createdAt || '' });
        }
      }
    }
    candidates.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return candidates[0]?.value || 0;
  }

  function persistAward(workId, posId, value) {
    const db = readDb();
    const work = (db.workingCopies || []).find(w => w.id === workId);
    const pos = work?.positions?.find(p => p.id === posId);
    if (!pos) return;
    pos.awardEp = num(value);
    writeDb(db);
  }

  function addLegend(card) {
    if (card.querySelector('[data-price-legend]')) return;
    const head = card.querySelector('.panel-head');
    if (!head) return;
    const legend = document.createElement('div');
    legend.dataset.priceLegend = 'true';
    legend.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px';
    legend.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;background:#fff1f1;color:#b42318;font-weight:700"><span style="width:9px;height:9px;border-radius:50%;background:#d92d20"></span>Vergabewert Vergangenheit</span>
      <span style="display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;background:#ecfdf3;color:#067647;font-weight:700"><span style="width:9px;height:9px;border-radius:50%;background:#12b76a"></span>Zielpreis / Druckpreis</span>`;
    head.insertAdjacentElement('afterend', legend);
  }

  function enhanceCard(card) {
    const workId = card.dataset.workCard;
    if (!workId) return;
    const db = readDb();
    const work = (db.workingCopies || []).find(w => w.id === workId);
    if (!work) return;

    addLegend(card);

    const table = card.querySelector('table');
    const headerRow = table?.querySelector('thead tr');
    if (!table || !headerRow) return;

    const headers = [...headerRow.children];
    let targetHeader = headers.find(th => th.dataset.targetPriceHeader === 'true');
    if (!targetHeader) {
      const epHeader = headers.find(th => th.textContent.trim() === 'EP');
      if (epHeader) {
        epHeader.textContent = 'Zielpreis';
        epHeader.dataset.targetPriceHeader = 'true';
        epHeader.style.cssText = 'color:#067647;background:#ecfdf3';
        const oldHeader = document.createElement('th');
        oldHeader.textContent = 'Vergabe alt';
        oldHeader.dataset.oldAwardHeader = 'true';
        oldHeader.style.cssText = 'color:#b42318;background:#fff1f1';
        epHeader.before(oldHeader);
        targetHeader = epHeader;
      }
    }

    const byId = new Map((work.positions || []).map(p => [p.id, p]));
    table.querySelectorAll('tbody tr[data-pos-id]').forEach(tr => {
      const pos = byId.get(tr.dataset.posId);
      const targetInput = tr.querySelector('[data-f="ep"]');
      if (!pos || !targetInput) return;

      targetInput.style.cssText += ';border:2px solid #12b76a;background:#ecfdf3;color:#067647;font-weight:700';
      targetInput.title = 'Zielpreis – dieser Preis wird im Ausdruck/PDF verwendet.';

      if (!tr.querySelector('[data-dwp-old-award]')) {
        const td = document.createElement('td');
        td.style.background = '#fff8f7';
        const historical = historicalAwardFor(pos, workId, db);
        if (historical && !num(pos.awardEp)) {
          pos.awardEp = historical;
          writeDb(db);
        }
        td.innerHTML = `<input data-dwp-old-award="true" inputmode="decimal" value="${esc(pos.awardEp || '')}" placeholder="0,00" title="Historischer Vergabewert – nur Vergleich, wird nicht gedruckt." style="width:90px;border:2px solid #f97066;background:#fff1f1;color:#b42318;font-weight:700">`;
        targetInput.closest('td').before(td);
        td.querySelector('input').addEventListener('change', e => persistAward(workId, pos.id, e.target.value));
      }
    });

    if (!card.querySelector('[data-work-print-target]')) {
      const actions = card.querySelector('[data-work-action]')?.parentElement;
      if (actions) {
        const printBtn = document.createElement('button');
        printBtn.type = 'button';
        printBtn.className = 'button button-secondary';
        printBtn.dataset.workPrintTarget = 'true';
        printBtn.textContent = 'Drucken / PDF · Zielpreis';
        printBtn.title = 'Im Ausdruck wird ausschließlich der grüne Zielpreis verwendet.';
        printBtn.addEventListener('click', () => printWork(card, work));
        actions.appendChild(printBtn);
      }
    }
  }

  function printWork(card, work) {
    const rows = [];
    let total = 0;
    card.querySelectorAll('tbody tr[data-pos-id]').forEach(tr => {
      const nr = tr.querySelector('[data-f="nr"]')?.value || '';
      const qty = num(tr.querySelector('[data-f="qty"]')?.value);
      const text = tr.querySelector('[data-f="text"]')?.value || '';
      const target = num(tr.querySelector('[data-f="ep"]')?.value);
      const unitText = tr.children[1]?.textContent || '';
      const unit = unitText.replace(String(tr.querySelector('[data-f="qty"]')?.value || ''), '').trim();
      const gp = qty * target;
      total += gp;
      rows.push({ nr, qty, unit, text, target, gp });
    });

    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) return;
    win.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(work.name)} · DachWerk Pro</title><style>
      body{font-family:Arial,sans-serif;margin:28px;color:#111827}h1{margin:0 0 4px}p{color:#667085;margin:0 0 20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid #d0d5dd;padding:8px;text-align:left;vertical-align:top}th{background:#f2f4f7}.num{text-align:right;white-space:nowrap}.total{font-size:15px;font-weight:700}.note{margin-top:18px;font-size:11px;color:#667085}@media print{button{display:none}body{margin:12mm}}</style></head><body>
      <h1>${esc(work.name)}</h1><p>DachWerk Pro · Kalkulations-/LV-Ausgabe</p>
      <table><thead><tr><th>Pos.</th><th>Leistung</th><th class="num">Menge</th><th>Einheit</th><th class="num">EP netto</th><th class="num">GP netto</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(r.nr)}</td><td>${esc(r.text)}</td><td class="num">${esc(r.qty)}</td><td>${esc(r.unit)}</td><td class="num">${money(r.target)}</td><td class="num">${money(r.gp)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="5" class="total">Summe netto</td><td class="num total">${money(total)}</td></tr></tfoot></table>
      <p class="note">Ausgabe verwendet ausschließlich die in DachWerk Pro grün markierten Zielpreise. Historische Vergabewerte dienen nur dem internen Vergleich und werden nicht ausgegeben.</p>
      <script>window.addEventListener('load',()=>window.print())<\/script></body></html>`);
    win.document.close();
  }

  function enhance() {
    document.querySelectorAll('[data-work-card]').forEach(enhanceCard);
  }

  const observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  enhance();
})();