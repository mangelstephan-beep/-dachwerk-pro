(() => {
  const PRINT_STYLE_ID = "dwp-print-styles";

  function ensurePrintStyles() {
    if (document.getElementById(PRINT_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = PRINT_STYLE_ID;
    style.textContent = `
      @media print {
        @page { size: A4; margin: 12mm; }
        body { background: #fff !important; }
        #sidebar, #sidebar-backdrop, .topbar, .page-navigation,
        .header-actions, .toast-region, .modal-backdrop,
        .controls-panel, .dwp-print-button { display: none !important; }
        .workspace, .main-content, .page, .calc-layout {
          display: block !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .page-header {
          display: block !important;
          margin: 0 0 10mm !important;
          padding: 0 0 5mm !important;
          border-bottom: 1px solid #999;
        }
        .page-header .eyebrow { color: #000 !important; }
        .panel, .calc-main, .data-table-wrap {
          box-shadow: none !important;
          border-color: #bbb !important;
          break-inside: auto;
        }
        table { width: 100% !important; border-collapse: collapse !important; }
        tr, td, th { break-inside: avoid; }
        button, input, select, textarea { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      }
    `;
    document.head.appendChild(style);
  }

  function addPrintButton() {
    const page = document.querySelector('.page[data-page="calculation"]');
    if (!page) return;
    const actions = page.querySelector(".page-header .header-actions");
    if (!actions || actions.querySelector(".dwp-print-button")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button-secondary dwp-print-button";
    button.textContent = "🖨 Drucken / PDF";
    button.title = "Kalkulation und Leistungsverzeichnis drucken oder als PDF speichern";
    button.addEventListener("click", () => {
      ensurePrintStyles();
      window.print();
    });
    actions.prepend(button);
  }

  ensurePrintStyles();
  addPrintButton();

  const main = document.querySelector("#main-content");
  if (main) {
    new MutationObserver(addPrintButton).observe(main, { childList: true, subtree: true });
  }
})();
