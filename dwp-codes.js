// DachWerkPro Belegcodes: Code 128 (Barcode mit Belegnummer) und QR-Code (DWP-Dokumentcode) als SVG.
// Eigenständig, ohne externe Bibliothek; QR nach ISO/IEC 18004, Byte-Modus, Fehlerkorrektur M, Version 1–10.
(function(root){
  'use strict';
  // ---------- Code 128 (Zeichensatz B) ----------
  const C128=['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112'];
  // Wie im Original: Zeichensatz B, lange Ziffernfolgen platzsparend in Zeichensatz C
  // (Anfang/Ende ab 4 Ziffern, in der Mitte ab 6 Ziffern, jeweils gerade Anzahl).
  function code128Values(text) {
    const s=String(text ?? '');
    if(!s || s.length>48)throw Error('Barcode: 1 bis 48 Zeichen.');
    for(const ch of s){const c=ch.charCodeAt(0);if(c<32 || c>126)throw Error('Barcode: nur einfache Zeichen (ohne Umlaute).');}
    const digitsAt=i=>{let n=0;while(i+n<s.length && s[i+n]>='0' && s[i+n]<='9')n++;return n;};
    const useC=i=>{const n=digitsAt(i),edge=i===0 || i+n===s.length;return n>=(edge?4:6);};
    const values=[];let set=useC(0)?'C':'B';values.push(set==='C'?105:104);
    for(let i=0;i<s.length;) {
      if(set==='B' && useC(i)) {
        if(digitsAt(i)%2===1){values.push(s.charCodeAt(i)-32);i++;continue;}
        values.push(99);set='C';
      }
      if(set==='C') {
        if(digitsAt(i)>=2){values.push(Number(s.slice(i,i+2)));i+=2;continue;}
        values.push(100);set='B';
      }
      values.push(s.charCodeAt(i)-32);i++;
    }
    values.push(values.reduce((sum,v,i)=>sum+v*(i||1),0)%103,106);
    return values;
  }
  function code128Modules(text) {
    // true = Strich, false = Lücke; mit 10 Modulen Ruhezone auf beiden Seiten.
    const bits=Array(10).fill(false);
    for(const v of code128Values(text))[...C128[v]].forEach((w,i)=>{for(let k=0;k<Number(w);k++)bits.push(i%2===0);});
    return bits.concat(Array(10).fill(false));
  }
  function code128Svg(text,{height=40}={}) {
    const bits=code128Modules(text);let x=0,rects='';
    while(x<bits.length){if(!bits[x]){x++;continue;}let w=0;while(bits[x+w])w++;rects+=`<rect x="${x}" y="0" width="${w}" height="${height}"/>`;x+=w;}
    return `<svg xmlns="http://www.w3.org/2000/svg" class="dwp-barcode" viewBox="0 0 ${bits.length} ${height}" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="Barcode ${esc(text)}"><rect width="${bits.length}" height="${height}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
  }

  // ---------- QR-Code ----------
  const ECC_M=[0,10,16,26,18,24,16,18,22,22,26],BLOCKS_M=[0,1,1,1,2,2,4,4,4,5,5];
  function rawModules(ver){let r=(16*ver+128)*ver+64;if(ver>=2){const n=Math.floor(ver/7)+2;r-=(25*n-10)*n-55;if(ver>=7)r-=36;}return r;}
  const dataCodewords=ver=>Math.floor(rawModules(ver)/8)-ECC_M[ver]*BLOCKS_M[ver];
  function gfMul(x,y){let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11d);z^=((y>>>i)&1)*x;}return z&255;}
  function rsDivisor(degree){const r=Array(degree).fill(0);r[degree-1]=1;let root=1;for(let i=0;i<degree;i++){for(let j=0;j<degree;j++){r[j]=gfMul(r[j],root);if(j+1<degree)r[j]^=r[j+1];}root=gfMul(root,2);}return r;}
  function rsRemainder(data,div){const r=div.map(()=>0);for(const b of data){const f=b^r.shift();r.push(0);div.forEach((c,i)=>{r[i]^=gfMul(c,f);});}return r;}
  function alignPositions(ver,size){if(ver===1)return [];const n=Math.floor(ver/7)+2,step=Math.ceil((ver*4+4)/(n*2-2))*2,r=[6];for(let p=size-7;r.length<n;p-=step)r.splice(1,0,p);return r;}
  function qrMatrix(text) {
    const bytes=[...new TextEncoder().encode(String(text ?? ''))];
    let ver=1;
    for(;ver<=10;ver++){const bits=4+(ver<10?8:16)+bytes.length*8;if(bits<=dataCodewords(ver)*8)break;}
    if(ver>10)throw Error('QR-Code: Inhalt zu lang.');
    const cap=dataCodewords(ver)*8,bb=[];
    const put=(v,n)=>{for(let i=n-1;i>=0;i--)bb.push((v>>>i)&1);};
    put(4,4);put(bytes.length,ver<10?8:16);bytes.forEach(b=>put(b,8));
    put(0,Math.min(4,cap-bb.length));put(0,(8-bb.length%8)%8);
    for(let pad=0xEC;bb.length<cap;pad^=0xEC^0x11)put(pad,8);
    const data=[];for(let i=0;i<bb.length;i+=8)data.push(bb.slice(i,i+8).reduce((a,b)=>a<<1|b,0));
    // Blöcke mit Reed-Solomon und Verschränkung
    const nb=BLOCKS_M[ver],ecl=ECC_M[ver],raw=Math.floor(rawModules(ver)/8),nShort=nb-raw%nb,shortLen=Math.floor(raw/nb),div=rsDivisor(ecl),blocks=[];
    for(let i=0,k=0;i<nb;i++){const dat=data.slice(k,k+shortLen-ecl+(i<nShort?0:1));k+=dat.length;const ecc=rsRemainder(dat,div);if(i<nShort)dat.push(0);blocks.push(dat.concat(ecc));}
    const all=[];for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!==shortLen-ecl || j>=nShort)all.push(b[i]);});
    // Funktionsmuster
    const size=ver*4+17,m=[...Array(size)].map(()=>Array(size).fill(false)),fn=[...Array(size)].map(()=>Array(size).fill(false));
    const set=(x,y,v)=>{m[y][x]=v;fn[y][x]=true;};
    for(let i=0;i<size;i++){set(6,i,i%2===0);set(i,6,i%2===0);}
    for(const [cx,cy] of [[3,3],[size-4,3],[3,size-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const x=cx+dx,y=cy+dy;if(x>=0&&x<size&&y>=0&&y<size){const d=Math.max(Math.abs(dx),Math.abs(dy));set(x,y,d!==2&&d!==4);}}
    const al=alignPositions(ver,size);
    al.forEach((a,i)=>al.forEach((b,j)=>{if(i===0&&j===0 || i===0&&j===al.length-1 || i===al.length-1&&j===0)return;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(a+dx,b+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);}));
    const drawFormat=mask=>{const d=(0<<3)|mask;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const bits=((d<<10)|r)^0x5412,g=i=>((bits>>>i)&1)===1;
      for(let i=0;i<=5;i++)set(8,i,g(i));set(8,7,g(6));set(8,8,g(7));set(7,8,g(8));for(let i=9;i<15;i++)set(14-i,8,g(i));
      for(let i=0;i<8;i++)set(size-1-i,8,g(i));for(let i=8;i<15;i++)set(8,size-15+i,g(i));set(8,size-8,true);};
    drawFormat(0);
    if(ver>=7){let r=ver;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1f25);const bits=ver<<12|r;for(let i=0;i<18;i++){const v=((bits>>>i)&1)===1,a=size-11+i%3,b=Math.floor(i/3);set(a,b,v);set(b,a,v);}}
    // Daten im Zickzack
    let i=0;
    for(let right=size-1;right>=1;right-=2){if(right===6)right=5;for(let vert=0;vert<size;vert++)for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)===0,y=up?size-1-vert:vert;if(!fn[y][x]&&i<all.length*8){m[y][x]=((all[i>>>3]>>>(7-(i&7)))&1)===1;i++;}}}
    // Maske mit der geringsten Strafpunktzahl wählen
    const masks=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
    const apply=k=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(!fn[y][x]&&masks[k](x,y))m[y][x]=!m[y][x];};
    let best=0,bestScore=Infinity;
    for(let k=0;k<8;k++){apply(k);drawFormat(k);const s=penalty(m,size);if(s<bestScore){bestScore=s;best=k;}apply(k);}
    apply(best);drawFormat(best);
    return {size,version:ver,mask:best,modules:m};
  }
  function penalty(m,size) {
    let score=0,dark=0;
    const line=get=>{let run=1,s=0;for(let i=1;i<size;i++){if(get(i)===get(i-1)){run++;if(run===5)s+=3;else if(run>5)s++;}else run=1;}
      const seq=[];for(let i=0;i<size;i++)seq.push(get(i)?1:0);const str=seq.join('');
      for(const pat of ['10111010000','00001011101']){let at=str.indexOf(pat);while(at>=0){s+=40;at=str.indexOf(pat,at+1);}}return s;};
    for(let y=0;y<size;y++)score+=line(x=>m[y][x]);
    for(let x=0;x<size;x++)score+=line(y=>m[y][x]);
    for(let y=0;y<size-1;y++)for(let x=0;x<size-1;x++){const c=m[y][x];if(c===m[y][x+1]&&c===m[y+1][x]&&c===m[y+1][x+1])score+=3;}
    for(const row of m)for(const v of row)if(v)dark++;
    return score+Math.max(0,Math.ceil(Math.abs(dark*20-size*size*10)/(size*size))-1)*10;
  }
  function qrSvg(text) {
    // Schmale Ruhezone (2 Module) wie im Original; die Seite rundherum ist weiß.
    const {size,modules}=qrMatrix(text),q=2,n=size+q*2;let path='';
    modules.forEach((row,y)=>row.forEach((v,x)=>{if(v)path+=`M${x+q} ${y+q}h1v1h-1z`;}));
    return `<svg xmlns="http://www.w3.org/2000/svg" class="dwp-qrcode" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="DWP Dokumentcode"><rect width="${n}" height="${n}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
  }
  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
  const api={code128Values,code128Modules,code128Svg,qrMatrix,qrSvg};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPCodes=api;
})(typeof window!=='undefined'?window:globalThis);
