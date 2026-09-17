(() => {
  const scripts = [
    {
      id: 'dwp-pdfjs',
      src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.min.mjs',
      type: 'module'
    },
    {
      id: 'dwp-xlsx',
      src: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
    },
    {
      id: 'dwp-tesseract',
      src: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    }
  ];

  function loadScript(def) {
    return new Promise((resolve, reject) => {
      if (document.getElementById(def.id)) return resolve();
      const s = document.createElement('script');
      s.id = def.id;
      s.src = def.src;
      if (def.type) s.type = def.type;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Modul ${def.id} konnte nicht geladen werden.`));
      document.head.appendChild(s);
    });
  }

  function loadGreenTheme() {
    if (document.getElementById('dwp-green-theme-loader')) return;
    const g = document.createElement('script');
    g.id = 'dwp-green-theme-loader';
    g.src = '/green-theme.js?v=1';
    document.body.appendChild(g);
  }

  function loadWorkflowAssistant() {
    if (document.getElementById('dwp-workflow-assistant')) { loadGreenTheme(); return; }
    const w = document.createElement('script');
    w.id = 'dwp-workflow-assistant';
    w.src = '/workflow-assistant.js?v=1';
    w.onload = loadGreenTheme;
    document.body.appendChild(w);
  }

  function loadMaterialMatch() {
    if (document.getElementById('dwp-lv-material-match')) { loadWorkflowAssistant(); return; }
    const m = document.createElement('script');
    m.id = 'dwp-lv-material-match';
    m.src = '/lv-material-match.js?v=1';
    m.onload = loadWorkflowAssistant;
    document.body.appendChild(m);
  }

  function loadPriceLogic() {
    if (document.getElementById('dwp-lv-price-logic')) { loadMaterialMatch(); return; }
    const p = document.createElement('script');
    p.id = 'dwp-lv-price-logic';
    p.src = '/lv-price-logic.js?v=1';
    p.onload = loadMaterialMatch;
    document.body.appendChild(p);
  }

  async function boot() {
    await Promise.all([loadScript(scripts[1]), loadScript(scripts[2])]);
    try {
      const pdf = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.min.mjs');
      window.pdfjsLib = pdf;
    } catch (err) {
      console.warn('PDF.js konnte nicht vorgeladen werden', err);
    }

    if (!document.getElementById('dwp-lv-import-manager')) {
      const m = document.createElement('script');
      m.id = 'dwp-lv-import-manager';
      m.src = '/lv-import-manager.js?v=1';
      m.onload = loadPriceLogic;
      document.body.appendChild(m);
    } else {
      loadPriceLogic();
    }
  }

  boot().catch(err => console.error('DachWerk LV-Import konnte nicht starten:', err));
})();