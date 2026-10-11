(() => {
  'use strict';
  const KEY = 'dwp-guided-demo-v1';
  const titles = ['Kunde', 'Projekt', 'Kalkulation', 'Angebot', 'Aufmaß', 'Dokumentation', 'Rechnung', 'Nachkalkulation'];
  const seed = () => ({version:1, step:0, customer:'Musterbau Nord (fiktiv)', contact:'Alex Beispiel', place:'Bremen', project:'Dachsanierung Musterhalle', id:'DEMO-001', quantity:200, material:18, minutes:12, hourly:58, agk:12, profit:8, accepted:false, measured:210, note:'Muster: Abdichtung kontrolliert; Anschlussdetails fotografisch dokumentieren.', checked:false, hours:45, actualMaterial:3900});
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currency = value => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(value);
  let data = seed();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.version===1) {
      for (const key of Object.keys(data)) {
        if (typeof saved[key]===typeof data[key] && (typeof saved[key]!=='number' || Number.isFinite(saved[key]) && saved[key]>=0)) data[key]=saved[key];
      }
      data.step = Number.isInteger(data.step) && data.step < titles.length ? data.step : 0;
    }
  } catch { /* A fresh demo is still usable when storage is unavailable. */ }
  const summary = () => {
    const direct = data.material + data.minutes/60*data.hourly;
    const ep = direct*(1+data.agk/100)*(1+data.profit/100);
    const offer = ep*data.quantity;
    const net = ep*data.measured;
    const actual = data.actualMaterial+data.hours*data.hourly;
    return {direct,ep,offer,net,tax:net*.19,total:net*1.19,actual,result:net-actual};
  };
  function persist() {
    try { localStorage.setItem(KEY,JSON.stringify(data)); document.querySelector('#storage-status').textContent='Projektstand in diesem Browser gespeichert.'; }
    catch { document.querySelector('#storage-status').textContent='Der Browser erlaubt kein Speichern. Die Tour funktioniert bis zum Schließen; lade deinen Projektstand bei Bedarf herunter.'; }
  }
  const field = (key,label,number=false) => `<div><label for="demo-${key}">${label}</label><input id="demo-${key}" name="${key}" ${number?'type="number" min="0" max="1000000" step="any" inputmode="decimal"':'maxlength="150"'} value="${esc(data[key])}" required></div>`;
  function body() {
    const t=summary();
    switch(data.step) {
      case 0: return `<p>Erfasse den Musterkunden. Die Angaben erscheinen später im Angebot und in der Rechnung.</p><div class="fields">${field('customer','Firma / Kunde')}${field('contact','Ansprechpartner')}${field('place','Ort')}</div>`;
      case 1: return `<p>Verknüpfe ein Projekt mit <strong>${esc(data.customer)}</strong>. Alle weiteren Schritte verwenden dieselbe Projektakte.</p><div class="fields">${field('project','Projektbezeichnung')}${field('id','Projekt-Nr.')}</div>`;
      case 2: return `<p>Beispielposition: Flachdachabdichtung, Einheit m². Ändere eine Menge oder einen Preis und beobachte die Angebotswerte.</p><div class="fields">${field('quantity','LV-Menge (m²)',true)}${field('material','Material je m² (€)',true)}${field('minutes','Zeit je m² (Minuten)',true)}${field('hourly','Verrechneter Lohn je Stunde (€)',true)}${field('agk','AGK-Zuschlag (%)',true)}${field('profit','Wagnis & Gewinn (%)',true)}</div><div class="result" id="calc-result"></div><p class="note">Beispielrechnung: Material plus Lohn, danach AGK und Wagnis/Gewinn nacheinander als Zuschläge. Betriebliche Kalkulationswerte sind individuell.</p>`;
      case 3: return `<p>Das Angebot übernimmt Kunde, Projekt und Kalkulation ohne erneute Eingabe.</p><p><strong>${esc(data.customer)}</strong><br>${esc(data.project)} · ${esc(data.id)}</p><p>${data.quantity} m² Abdichtung · Einheitspreis ${currency(t.ep)}</p><div class="result">Angebot netto<br><strong>${currency(t.offer)}</strong></div><label class="check"><input type="checkbox" name="accepted" ${data.accepted?'checked':''}>Angebot im Musterprojekt als angenommen markieren</label><p class="note">Diese Markierung versendet kein Angebot und löst keinen Auftrag aus.</p>`;
      case 4: return `<p>Erfasse die ausgeführte Menge. Der kalkulierte Einheitspreis bleibt erhalten, die Rechnungsmenge stammt jetzt aus dem Aufmaß.</p><div class="fields">${field('measured','Ausgeführte Menge (m²)',true)}</div><div class="result" id="measurement-result"></div><p class="note">Im Produkt sollen komplexe Aufmaße, Planbezüge und Teilabrechnungen ergänzt werden.</p>`;
      case 5: return `<p>Dokumentiere die Ausführung in derselben Projektakte.</p><label for="demo-note">Bautagebuch / Prüfnotiz</label><textarea id="demo-note" name="note" maxlength="2000">${esc(data.note)}</textarea><label class="check"><input type="checkbox" name="checked" ${data.checked?'checked':''}>Ausführung im Musterprojekt kontrolliert</label><p class="note">Foto-Uploads und digitale Unterschriften sind in dieser Tour noch nicht enthalten.</p>`;
      case 6: return `<p>Rechnungsvorschau aus Aufmaß und kalkuliertem Einheitspreis.</p><p><strong>${esc(data.customer)}</strong><br>${esc(data.project)} · ${esc(data.id)}</p><p>${data.measured} m² × ${currency(t.ep)}</p><div class="result">Netto: ${currency(t.net)}<br>Beispiel-USt. 19 %: ${currency(t.tax)}<br><strong>Brutto: ${currency(t.total)}</strong></div><p>${data.accepted?'Angebot im Muster angenommen.':'Angebot im Muster noch nicht als angenommen markiert.'} ${data.checked?'Ausführung im Muster kontrolliert.':'Ausführung im Muster noch nicht als kontrolliert markiert.'}</p><p class="note">Musterbeleg: kein Rechnungsversand. Steuersätze, § 13b, Abschläge und Pflichtangaben müssen für die produktive Abrechnung gesondert umgesetzt werden.</p>`;
      default: return `<p>Vergleiche den abgerechneten Nettoerlös mit dem tatsächlichen Material- und Lohnaufwand.</p><div class="fields">${field('hours','Tatsächliche Arbeitsstunden',true)}${field('actualMaterial','Tatsächliche Materialkosten (€)',true)}</div><div class="result" id="final-result"></div><p class="note">Der verbleibende Betrag muss unter anderem Gemeinkosten und Gewinn decken. Weitere Kosten, Nachträge und Zahlungen sind in dieser Beispielrechnung nicht enthalten.</p>`;
    }
  }
  function renderSummary() {
    const t=summary();
    document.querySelector('#summary').innerHTML=`<h2>Gemeinsame Projektakte</h2><dl><div><dt>Projekt</dt><dd>${esc(data.id)} · ${esc(data.project)}</dd></div><div><dt>Kunde</dt><dd>${esc(data.customer)}</dd></div><div><dt>Angebot netto</dt><dd>${currency(t.offer)}</dd></div><div><dt>Einheitspreis</dt><dd>${currency(t.ep)} / m²</dd></div><div><dt>Aufmaß</dt><dd>${data.measured} m²</dd></div><div><dt>Rechnung netto</dt><dd>${currency(t.net)}</dd></div></dl>`;
    const calc=document.querySelector('#calc-result');if(calc)calc.innerHTML=`Einheitspreis: ${currency(t.ep)} / m²<br><strong>Angebot netto: ${currency(t.offer)}</strong>`;
    const measured=document.querySelector('#measurement-result');if(measured)measured.innerHTML=`Abweichung vom LV: ${Number((data.measured-data.quantity).toFixed(4))} m²<br><strong>Abrechnung netto: ${currency(t.net)}</strong>`;
    const result=document.querySelector('#final-result');if(result)result.innerHTML=`Nettoerlös: ${currency(t.net)}<br>Material und Lohn: ${currency(t.actual)}<br><strong>Verbleibender Betrag: ${currency(t.result)}</strong><br>${t.result<0?'Der erfasste Aufwand übersteigt den Nettoerlös.':'Prüfe jetzt, ob der verbleibende Betrag die weiteren Kosten deckt.'}`;
  }
  function render() {
    document.querySelector('#steps').innerHTML=titles.map((title,i)=>`<button data-step="${i}" ${i===data.step?'aria-current="step"':''}>${i+1}. ${title}</button>`).join('');
    document.querySelector('#step-content').innerHTML=`<span class="eyebrow">${data.step+1} von ${titles.length} · ${esc(data.id)}</span><h2>${titles[data.step]}</h2><form id="step-form">${body()}</form>`;
    document.querySelector('#back').disabled=data.step===0;
    document.querySelector('#next').disabled=data.step===titles.length-1;
    document.querySelector('#progress').textContent=`Schritt ${data.step+1} / ${titles.length}`;
    document.querySelector('#step-form').addEventListener('submit',e=>e.preventDefault());
    renderSummary();
  }
  function capture(report=false) {
    const form=document.querySelector('#step-form');
    if(!form.checkValidity()) {if(report)form.reportValidity(); return false;}
    let pricingChanged=false;
    form.querySelectorAll('[name]').forEach(input=>{
      const key=input.name;
      const next=input.type==='checkbox'?input.checked:typeof data[key]==='number'?Number(input.value):input.value.trim();
      if(['quantity','material','minutes','hourly','agk','profit'].includes(key)&&next!==data[key])pricingChanged=true;
      data[key]=next;
    });
    if(pricingChanged) data.accepted=false;
    persist();renderSummary();return true;
  }
  function go(step) {if(!capture(true))return;data.step=step;persist();render();document.querySelector('#step-content h2').setAttribute('tabindex','-1');document.querySelector('#step-content h2').focus();}
  document.querySelector('#steps').addEventListener('click',e=>{const target=e.target.closest('[data-step]');if(target)go(Number(target.dataset.step));});
  document.querySelector('#step-content').addEventListener('input',()=>capture());
  document.querySelector('#step-content').addEventListener('change',()=>capture());
  document.querySelector('#back').addEventListener('click',()=>go(Math.max(0,data.step-1)));
  document.querySelector('#next').addEventListener('click',()=>go(Math.min(titles.length-1,data.step+1)));
  document.querySelector('#start').addEventListener('click',()=>{document.querySelector('#workspace').scrollIntoView({behavior:'smooth'});document.querySelector('#step-content input')?.focus();});
  document.querySelector('#reset').addEventListener('click',()=>{if(!confirm('Nur dieses Musterprojekt zurücksetzen?'))return;data=seed();persist();render();});
  document.querySelector('#download').addEventListener('click',()=>{if(!capture(true))return;const blob=new Blob([JSON.stringify({kind:'DachWerk Pro – Musterprojekt, kein Echtbeleg',...data,totals:summary()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='DachWerkPro_Musterprojekt.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  const knowledge=[
    {question:'Wie funktioniert der Workflow?',match:/workflow|ablauf|anfang|start|weiter|schritt/i,answer:'Beginne mit dem Musterkunden und seinem Projekt. Die Kalkulation bildet den Einheitspreis für das Angebot. Im Aufmaß änderst du die ausgeführte Menge; daraus entsteht die Rechnungsvorschau. Abschließend vergleichst du Erlös und tatsächlichen Aufwand. Alle Schritte verwenden dieselbe Projektakte.'},
    {question:'Wie entsteht die Rechnung?',match:/rechnung|abrechnung|aufmaß|aufmass|menge/i,answer:'Die Rechnungsvorschau verwendet die ausgeführte Menge aus dem Aufmaß und den Einheitspreis aus der Kalkulation. Beispiel: Eine höhere Aufmaßmenge erhöht den Rechnungsbetrag. Die Tour verwendet beispielhaft 19 % Umsatzsteuer; besondere Steuerfälle und Teilabrechnungen sind noch nicht umgesetzt.'},
    {question:'Wie wird kalkuliert?',match:/kalkul|preis|lohn|agk|zuschlag|gewinn/i,answer:'Je m² addieren wir Material und Lohn: Minuten / 60 × verrechneter Stundenlohn. Danach kommen AGK und Wagnis/Gewinn als aufeinanderfolgende Zuschläge. Passe diese Beispielwerte an und beobachte Angebot und Rechnung. Bei Preisänderungen wird die Annahmemarkierung zurückgesetzt.'},
    {question:'Was zeigt die Nachkalkulation?',match:/nachkalk|ergebnis|kosten|erlös|ertrag/i,answer:'Die Nachkalkulation zieht die erfassten Materialkosten und tatsächlichen Arbeitsstunden × verrechneten Stundenlohn vom Nettoerlös ab. Der verbleibende Betrag ist kein vollständiger Unternehmensgewinn: Weitere Kosten und Gemeinkosten müssen noch berücksichtigt werden.'},
    {question:'Sind alle 36 Module fertig?',match:/36|module|fertig|funktion|online|produktiv/i,answer:'Noch nicht als vollständige Zusammenarbeit bestätigt. Der geprüfte GitHub-Stand enthält 21 Hauptbereiche und zusätzliche Unterbereiche. Mehrere Funktionen zeigen Beispiele oder speichern lokale Notizen. Diese Tour verbindet acht ausgewählte Schritte; produktive Anmeldung, gemeinsame Datenbank und weitere Fachfunktionen benötigen zusätzliche Umsetzung und Tests.'},
    {question:'Kann ich hier frei mit einer KI sprechen?',match:/ki|chatgpt|assistent|stephan|gedanken|virtuell/i,answer:'Hier antwortet eine hinterlegte Produkthilfe anhand von Themen. Sie erklärt unsere Idee: einmal erfassen, projektbezogen weiterarbeiten und Entscheidungen nachvollziehbar machen. Freie KI-Antworten benötigen eine serverseitige KI-Anbindung und eine freigegebene Wissensbasis. Diese Hilfe hat keinen Zugriff auf Stephans private Gespräche.'},
    {question:'Wo werden meine Daten gespeichert?',match:/daten|speich|cloud|zugang|passwort|sicher|kunde/i,answer:'Dieses Musterprojekt wird nur unter einem eigenen Demo-Schlüssel im Browserspeicher abgelegt. Es wird nicht an andere Besucher oder an eine Cloud-Datenbank übertragen. Ein anderer Browser hat seinen eigenen Stand. Nutze Musterangaben; für dauerhafte Zusammenarbeit über Geräte hinweg benötigen wir Anmeldung, Rechte und eine gemeinsame Datenbank.'},
    {question:'Was ist die Idee von DachWerk Pro?',match:/idee|ziel|warum|dachwerk|produkt/i,answer:'DachWerk Pro soll die Arbeit vom Kundentermin über LV, Kalkulation, Ausführung und Dokumentation bis zur Abrechnung und Nachkalkulation verbinden. Technik, Baustelle und Büro arbeiten am selben Projekt. Die Hilfe erklärt nächste Schritte; fachliche Entscheidungen und Freigaben liegen beim Anwender.'}
  ];
  function answer(question) {
    const entry=knowledge.find(item=>item.question.toLocaleLowerCase('de')===question.trim().toLocaleLowerCase('de')) || ( /nachkalk/i.test(question) ? knowledge[3] : knowledge.find(item=>item.match.test(question)) );
    document.querySelector('#answer').textContent=entry?entry.answer:'Zu dieser Frage ist noch keine passende Antwort hinterlegt. Nutze eine der Themenfragen oder notiere die Frage für den nächsten Austausch mit Stephan. Eine freie KI-Antwort ist hier noch nicht verfügbar.';
  }
  document.querySelector('#suggestions').innerHTML=knowledge.map((item,i)=>`<button type="button" data-topic="${i}">${item.question}</button>`).join('');
  document.querySelector('#suggestions').addEventListener('click',e=>{const target=e.target.closest('[data-topic]');if(target){const item=knowledge[Number(target.dataset.topic)];document.querySelector('#question').value=item.question;document.querySelector('#answer').textContent=item.answer;}});
  document.querySelector('#question-form').addEventListener('submit',e=>{e.preventDefault();answer(document.querySelector('#question').value);});
  document.querySelector('#help-open').addEventListener('click',()=>{document.querySelector('#help-dialog').showModal();document.querySelector('#question').focus();});
  document.querySelector('#help-close').addEventListener('click',()=>document.querySelector('#help-dialog').close());
  render();
})();
