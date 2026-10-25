const fs=require('node:fs'),path=require('node:path');
const source=path.dirname(require.resolve('xlsx')),destination=path.resolve(__dirname,'../vendor/xls');
if(require('xlsx').version!=='0.20.3')throw Error('Unexpected SheetJS version; review parser before updating.');
fs.mkdirSync(destination,{recursive:true});
fs.copyFileSync(path.join(source,'dist/xlsx.full.min.js'),path.join(destination,'xlsx.full.min.js'));
fs.copyFileSync(path.join(source,'LICENSE'),path.join(destination,'LICENSE'));
console.log('Pinned XLS parser prepared on the application domain.');
