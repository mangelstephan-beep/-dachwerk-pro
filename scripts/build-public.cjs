const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),output=path.join(root,'public');
fs.mkdirSync(output,{recursive:true});
for(const entry of fs.readdirSync(root,{withFileTypes:true})) {
  if(entry.isFile() && entry.name!=='test.html' && (/\.(js|css|png|svg|webmanifest)$/.test(entry.name) || entry.name==='index.html' || entry.name==='release.json')) {
    fs.copyFileSync(path.join(root,entry.name),path.join(output,entry.name));
  }
}
for(const directory of ['assets','vendor'])fs.cpSync(path.join(root,directory),path.join(output,directory),{recursive:true});
const html=fs.readFileSync(path.join(output,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="(\/[^"#?]+)(?:[?#][^"]*)?"/g)) {
  if(!fs.existsSync(path.join(output,match[1])))throw Error('Missing deployed asset: '+match[1]);
}
for(const file of ['vendor/pdfjs/pdf.min.mjs','vendor/pdfjs/pdf.worker.min.mjs','vendor/ocr/tesseract.min.js','vendor/ocr/worker.min.js','vendor/ocr/lang/deu.traineddata.gz','vendor/ocr/core/tesseract-core-lstm.wasm.js','vendor/ocr/core/tesseract-core-lstm.wasm','assets/dachwerkpro-original-logo-20261006.png']) {
  if(!fs.existsSync(path.join(output,file)))throw Error('Missing document dependency: '+file);
}
console.log('Public application assets prepared and references verified.');
