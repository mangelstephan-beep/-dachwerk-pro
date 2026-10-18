const fs = require('node:fs');
const path = require('node:path');
const source = path.dirname(require.resolve('pdfjs-dist/package.json'));
const destination = path.resolve(__dirname, '../vendor/pdfjs');
fs.mkdirSync(destination, { recursive: true });
for (const file of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
  fs.copyFileSync(path.join(source, 'legacy/build', file), path.join(destination, file));
}
for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
  fs.cpSync(path.join(source, directory), path.join(destination, directory), { recursive: true });
}
fs.copyFileSync(path.join(source, 'LICENSE'), path.join(destination, 'LICENSE'));
console.log('PDF.js assets prepared on the application domain.');
