(() => {
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
    // PDF is loaded on demand from this domain. No blocked CDN requests.
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
