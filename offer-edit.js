(function(root){
  'use strict';
  const round=v=>Math.round((v+Number.EPSILON)*100)/100;
  function numeric(value,label){
    const n=typeof value==='string'?Number(value.trim().replace(',','.')):value;
    if(value==='' || value===null || typeof n!=='number' || !Number.isFinite(n) || n<0 || n>1e9)throw Error(label+': gültigen Wert ab 0 eingeben.');
    return n;
  }
  function defaults(p,company){return {id:p.id,material:p.material,minutes:p.totalMinutes ?? p.minutes ?? 0,wage:p.calculationWage ?? (p.useEfbRates?p.efbWage:company.wage),product:p.calculatedWith || p.materialBreakdown?.map(m=>m.name).filter(Boolean).join(', ') || ''};}
  function calculate(p,input,company){
    const material=numeric(input.material,'Material'),minutes=numeric(input.minutes,'Minuten'),wage=numeric(input.wage,'Stundenlohn');
    const product=String(input.product ?? '').trim();if(product.length>500)throw Error('Produktbezeichnung: höchstens 500 Zeichen.');
    const prior=defaults(p,company);
    if(material===prior.material && minutes===prior.minutes && wage===prior.wage)return {...p,calculatedWith:product};
    const labor=minutes/60*wage,other=p.other || 0,equipment=p.equipment || 0,subcontract=p.subcontract || 0;
    const direct=material+labor+equipment+subcontract+other;
    let calculatedEp;
    if(p.useEfbRates){
      calculatedEp=round([['material',material],['labor',labor],['equipment',equipment],['subcontract',subcontract],['other',other]].reduce((sum,[key,v])=>sum+round(v*(1+(p[key+'Markup'] || 0)/100)),0));
    }else {
      const factor=(1+(company.agk || 0)/100)*(1+(company.profit || 0)/100);
      calculatedEp=round(p.useNuMarkup?(direct-subcontract)*factor+subcontract*(1+(p.subcontractMarkup ?? 15)/100):direct*factor);
    }
    // A new cost edit deliberately recalculates its sale price; no hidden fixed target survives.
    const ep=round(calculatedEp*(1-(p.discountPercent || 0)/100)),gp=round(p.qty*ep);
    if(!Number.isFinite(gp) || gp>Number.MAX_SAFE_INTEGER/100)throw Error('Positionsbetrag außerhalb des sicheren Zahlenbereichs.');
    return {...p,material,minutes,totalMinutes:minutes,calculationWage:wage,labor,other,direct,calculatedWith:product,calculatedEp,undiscountedEp:calculatedEp,useTargetPrice:false,ep,gp,contribution:round(p.qty*(ep-direct))};
  }
  const api={defaults,calculate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DWPOfferEdit=api;
})(typeof window!=='undefined'?window:globalThis);
