const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require('jsdom');
const importer = require('./pdf-import.js');
const { Store } = require('./project-core.js');
const { execute, memoryRepository } = require('./lib/project-service.cjs');

function fixture() {
  const content = 'BT /F1 12 Tf 20 750 Td (010 Roof waterproofing 12.5 m2 - original text for review) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let text = '%PDF-1.7\n', offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(text)); text += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(text);
  text += 'xref\n0 6\n0000000000 65535 f \n' + offsets.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(text);
}
(async () => {
  const pdf = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdf.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
  const parser = { getDocument: options => pdf.getDocument({ ...options, standardFontDataUrl: path.dirname(require.resolve('pdfjs-dist/package.json')) + '/standard_fonts/' }) };
  const bytes = fixture();
  const file = { name: 'test.pdf', size: bytes.length, arrayBuffer: async () => Uint8Array.from(bytes).buffer };
  const pages = await importer.extract(file, undefined, parser);
  assert.equal(pages.length, 1); assert.match(pages[0].text, /010 Roof waterproofing 12\.5 m2/);
  const text = JSON.stringify(pages), report = importer.report(text);
  assert.equal(report.rows.length, 0); assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].candidate.qty, '');
  await assert.rejects(() => importer.extract({ ...file, size: 10_000_001 }, undefined, parser), /10 MB/);
  await assert.rejects(() => importer.extract({ size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }, undefined, parser), /kein lesbares PDF/);
  assert.throws(() => importer.report('[]'), /ungültig/);
  assert.equal(importer.report(JSON.stringify([{ page: 1, text: '', needsOcr: true }])).findings.length, 1);

  const actor = { id: 'test-pdf-owner', name: 'Test', role: 'admin', tenantId: 'pdf-test' };
  const repo = memoryRepository(); let result = await repo.read(actor.tenantId), project;
  const run = async (method, args, projectId) => { result = await execute(repo, actor, { method, args, projectId, revision: result.state.revision }); return result; };
  await run('save', ['customers', { name: 'Synthetic PDF customer' }]);
  const customer = result.recordId;
  await run('save', ['projects', { name: 'Synthetic PDF project', customerId: customer, phase: 'Erfassung' }]); project = result.recordId;
  const source = { title: 'PDF source', format: 'PDF Prüfquelle', source: file.name, originalText: text, findings: report.findings };
  await run('importPositions', [[], source], project);
  const saved = (await repo.read(actor.tenantId)).state;
  assert.equal(saved.records.find(r => r.module === 'imports').originalText, text);
  assert.equal(saved.records.filter(r => r.module === 'lv').length, 0);
  const review = saved.records.find(r => r.module === 'contract');
  assert.equal(review.data.blocking, true); assert.match(review.data.title, /^PDF-Prüfung/);
  let data = JSON.stringify(saved); const store = new Store({ getItem: () => data, setItem: (_k, v) => { data = v; } }); store.select(project);
  assert.throws(() => store.issue('offers'), /Sperren/);

  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), { url: 'https://dachwerk.test', runScripts: 'outside-only' });
  const w = dom.window; w.scrollTo = () => {}; w.confirm = () => true; w.HTMLElement.prototype.scrollIntoView = () => {};
  for (const name of ['app.js', 'module-fixes.js', 'project-core.js', 'module-verification.js', 'project-workflows.js']) vm.runInContext(fs.readFileSync(name, 'utf8'), dom.getInternalVMContext());
  w.DWPPdfImport = { extract: async () => pages, report: importer.report };
  const db = w.DWPWorkspace.store, c = db.save('customers', { name: 'PDF customer' });
  db.save('projects', { name: 'PDF project', customerId: c.id, phase: 'Erfassung' });
  w.DWPWorkspace.open('imports');
  const q = selector => w.document.querySelector(selector);
  Object.defineProperty(q('#dwp-import-file'), 'files', { value: [file] });
  q('#dwp-import-file').dispatchEvent(new w.Event('change', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(q('#dwp-import-format').value, 'PDF Prüfquelle'); assert(q('#dwp-csv').readOnly);
  q('[data-dwp="preview-import"]').click(); assert.match(q('#dwp-import-preview').textContent, /1 gesperrte Prüfvorgänge/);
  q('#dwp-import').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(db.list('imports').length, 1); assert.equal(db.list('lv').length, 0); assert.equal(db.list('contract')[0].data.blocking, true);
  w.DWPWorkspace.open('imports');
  const input=q('#dwp-import-file');
  const choose=async file=>{
    Object.defineProperty(input,'files',{value:[file],configurable:true});
    input.dispatchEvent(new w.Event('change',{bubbles:true}));
    await new Promise(resolve=>setTimeout(resolve,0));
  };
  await choose({...file,name:'large-review.pdf',size:1_000_001});
  assert.equal(q('#dwp-import-source').value,'large-review.pdf','PDFs above 1 MB must reach the 10 MB PDF reader');
  assert.equal(q('#dwp-import-format').value,'PDF Prüfquelle');
  q('[data-dwp="preview-import"]').click();
  await choose({...file,name:'not-supported.exe'});
  assert.equal(q('#dwp-csv').value,'','Rejected replacement must clear old import contents');
  assert.equal(q('#dwp-import-source').value,'');
  assert.equal(q('#dwp-import-preview').textContent,'','Rejected replacement must clear old preview');
  await choose({...file,size:10_000_001});
  assert.match(q('#dwp-error').textContent,/10 MB/);
  await choose({...file,name:'oversized.csv',size:1_000_001});
  assert.match(q('#dwp-error').textContent,/1 MB/,'Other formats retain their own bounds');
  dom.window.close();
  assert(!fs.readFileSync('garnmagazin-lv.js', 'utf8').includes('https://'));
  assert(!fs.readFileSync('lv-import-manager.js', 'utf8').includes('cdnjs.cloudflare.com'));
  console.log('PDF: real document text extraction, same-origin worker, bounds, scan review, central atomic source/review persistence, no invented quantities, UI preview and import passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
