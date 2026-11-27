const assert=require('node:assert/strict');
const c=require('./dwp-codes.js');
// Code 128: identisch mit dem Barcode der Masterreferenz R-101126/001 (Start B, R, -, Code C 10 11 26, Code B, /, 0, 0, 1).
assert.deepEqual(c.code128Values('R-101126/001'),[104,50,13,99,10,11,26,100,15,16,16,17,c.code128Values('R-101126/001').at(-2),106]);
const mods=c.code128Modules('R-101126/001').map(v=>v?1:0).join('').replace(/^0+|0+$/g,'');
assert.equal(mods.length,156,'156 Module wie im Original');
const values=c.code128Values('R-101126/001');assert.equal(values.at(-2),values.slice(0,-2).reduce((s,v,i)=>s+v*(i||1),0)%103);
assert.deepEqual(c.code128Values('DWP-R-202611-0104/1').slice(0,6),[104,36,55,48,13,50],'Belegnummer im Zeichensatz B');
assert.throws(()=>c.code128Values('Straße'),/Umlaute/);assert.throws(()=>c.code128Values(''),/1 bis 48/);
assert.match(c.code128Svg('R-101126/001'),/^<svg[^>]+viewBox="0 0 176 40"/);
// QR: Fehlerkorrektur M, Byte-Modus; Referenzwerte mit OpenCV-Decoder geprüft (15.11.2026).
const q=c.qrMatrix('DWP|R-101126/001|BV Tittmoning|10.11.2026');
assert.equal(q.version,3);assert.equal(q.size,29);
const hash=m=>require('node:crypto').createHash('sha256').update(m.map(r=>r.map(v=>v?1:0).join('')).join('\n')).digest('hex').slice(0,16);
const ref=hash(q.modules);
assert.equal(hash(c.qrMatrix('DWP|R-101126/001|BV Tittmoning|10.11.2026').modules),ref,'deterministisch');
// Finder-Muster in drei Ecken, dunkles Modul, Timing-Muster
const m=q.modules,n=q.size;
for(const [x,y] of [[0,0],[n-7,0],[0,n-7]]){for(let i=0;i<7;i++){assert(m[y][x+i]&&m[y+6][x+i]&&m[y+i][x]&&m[y+i][x+6]);}assert(m[y+3][x+3]);}
assert.equal(m[n-8][8],true,'dunkles Modul');for(let i=8;i<n-8;i++)assert.equal(m[6][i],i%2===0);
assert.equal(c.qrMatrix('x'.repeat(150)).version,8,'Versionsinformation ab Version 7');
assert.throws(()=>c.qrMatrix('x'.repeat(300)),/zu lang/);
assert.match(c.qrSvg('DWP|Test'),/class="dwp-qrcode"/);
console.log('Belegcodes: Code 128 wie Original, QR-Code (ISO 18004, M) – ok');
