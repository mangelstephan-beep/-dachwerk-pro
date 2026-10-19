(function (root) {
  'use strict';
  let loading;
  async function ensure() {
    if (!loading) loading = import('/vendor/pdfjs/pdf.min.mjs').then(pdf => {
      pdf.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
      root.pdfjsLib = pdf;
      return pdf;
    }).catch(() => {
      loading = null;
      throw Error('PDF-Modul nicht verfügbar. Bitte Anwendung neu laden.');
    });
    return loading;
  }
  async function extract(file, progress, parser, {signal} = {}) {
    const checkAbort=()=>{if(signal?.aborted){const error=Error('PDF-Einlesen abgebrochen.');error.name='AbortError';throw error;}};
    checkAbort();
    if (!file || file.size < 1 || file.size > 10_000_000) throw Error('PDF-Datei bis 10 MB erforderlich.');
    const data = new Uint8Array(await file.arrayBuffer());
    checkAbort();
    if (data.length !== file.size || !new TextDecoder().decode(data.subarray(0, 1024)).includes('%PDF-')) throw Error('Datei ist kein lesbares PDF.');
    const pdf = parser || await ensure();
    checkAbort();
    const task = pdf.getDocument({ data, isEvalSupported: false,
      cMapUrl: '/vendor/pdfjs/cmaps/', cMapPacked: true,
      standardFontDataUrl: '/vendor/pdfjs/standard_fonts/', wasmUrl: '/vendor/pdfjs/wasm/' });
    let stopped, destruction;
    const destroy=()=>destruction || (destruction=Promise.resolve().then(()=>task.destroy()));
    const stop=reason=>{stopped=reason;void destroy().catch(()=>{});};
    const onAbort=()=>stop('abort');
    task.onPassword = () => stop('password');
    signal?.addEventListener('abort',onAbort,{once:true});
    const timeout = setTimeout(() => stop('timeout'), 30000);
    let document;
    try {
      document = await task.promise;
      checkAbort();
      if (document.numPages > 100) throw Error('PDF: höchstens 100 Seiten pro Import.');
      const pages = []; let length = 0;
      for (let number = 1; number <= document.numPages; number++) {
        checkAbort();
        const page = await document.getPage(number);
        try {
          const content = await page.getTextContent();
          checkAbort();
          const text = content.items.filter(item => typeof item.str === 'string')
            .map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('').replace(/[\t ]+/g, ' ').trim();
          length += text.length;
          if (length > 500_000) throw Error('PDF-Text zu umfangreich. Bitte Datei aufteilen.');
          pages.push({ page: number, text, needsOcr: text.length < 35, selected: true });
          progress?.(number, document.numPages);
        } finally { page.cleanup(); }
      }
      return pages;
    } catch (error) {
      checkAbort();
      if(stopped==='timeout')throw Error('PDF-Verarbeitung dauert zu lange. Bitte Datei aufteilen oder erneut versuchen.');
      if (stopped==='password' || error.name === 'PasswordException') throw Error('PDF ist passwortgeschützt. Bitte ein ungeschütztes PDF wählen.');
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort',onAbort);
      await destroy();
    }
  }
  function report(text) {
    if (typeof text !== 'string' || text.length > 1_000_000) throw Error('PDF-Prüfquelle zu umfangreich.');
    let pages;
    try { pages = JSON.parse(text); } catch { throw Error('PDF-Prüfquelle ungültig. Bitte PDF erneut auswählen.'); }
    if (!Array.isArray(pages) || !pages.length || pages.length > 100 || pages.some((p, i) => !p || p.page !== i + 1 || typeof p.text !== 'string')) throw Error('PDF-Seitenbestand ungültig.');
    return { rows: [], findings: pages.map(p => ({
      number: 'Seite ' + p.page, type: 'PDF-Prüfquelle', text: p.text || '(Keine Textschicht erkannt.)',
      reason: 'PDF-Text ist keine bestätigte LV-Position. Mengen, Einheiten und Positionsgrenzen müssen am Original geprüft werden.',
      suggestion: p.needsOcr ? 'Textschicht fehlt oder enthält wenig Text. Originalseite prüfen; Scan/OCR gesondert erfassen. Keine Mengen automatisch übernehmen.' : 'Originalseite prüfen und LV-Positionen mit bestätigten Mengen und Einheiten erfassen. Mehrere Positionen einer Seite einzeln anlegen; Prüfpunkt anschließend dokumentiert erledigen.',
      candidate: { number: '', text: p.text, qty: '', unit: '' }
    })) };
  }
  const api = { ensure, extract, report };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DWPPdfImport = api;
})(typeof window !== 'undefined' ? window : globalThis);
