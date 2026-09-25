const state = {
  currentView: localStorage.getItem("dwp-current-view") || "dashboard",
  currentUser: "Stephan Mangel",
  viewHistory: [],
  historyIndex: -1,
  unsavedChanges: false,
};

const loginScreen = document.querySelector("#login-screen");
const publicHome = document.querySelector("#public-home");
const appShell = document.querySelector("#app-shell");
const mainContent = document.querySelector("#main-content");
const sidebar = document.querySelector("#sidebar");
const sidebarBackdrop = document.querySelector("#sidebar-backdrop");
const modalBackdrop = document.querySelector("#modal-backdrop");
const toastRegion = document.querySelector("#toast-region");
const requestBackdrop = document.querySelector("#request-backdrop");

const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const todayLabel = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
}).format(new Date());

const pageMeta = {
  dashboard: ["Übersicht", "Alle wichtigen Vorgänge aus Technik, Baustelle und Büro."],
  customers: ["Kunden", "Kontakte, Ansprechpartner und Vorgänge zentral verwalten."],
  projects: ["Projekte", "Vom ersten Kontakt bis zur Abnahme – transparent gesteuert."],
  services: ["Leistungen", "Neutrale Leistungstexte und Kalkulationsbausteine strukturiert pflegen."],
  prices: ["Preis- & Materialdatenbank", "Material, Lohn, Rabatte, Fracht und Preisstände nachvollziehbar verwalten."],
  calculation: ["Kalkulation & LV", "Material, Lohn, Zuschläge und Fremdleistungen je Position."],
  gaeb: ["GAEB-Zentrale", "Leistungsverzeichnisse sicher einlesen, zuordnen und ausgeben."],
  measurements: ["Aufmaß & Drohne", "Mengen, Pläne, Fotos und Drohnendaten projektbezogen zusammenführen."],
  safety: ["Gefährdungscheck", "Kompakte Vorprüfung je Leistung und Projektphase."],
  "site-docs": ["Bautenstand & Dokumentation", "Bautenstand, Tages- und Fotodokumentation sowie Nachweise mobil erfassen."],
  defects: ["Mängel & Abweichungen", "Nur tatsächliche Auffälligkeiten, Fristen und Erledigungsnachweise gesondert führen."],
  documents: ["Dokumente & Mail", "Projektbezogene Ablage für Schriftverkehr, Pläne und Nachweise."],
  invoices: ["Eingangsrechnungen", "Prüfen, zuordnen, freigeben und nachvollziehbar buchen."],
  communication: ["Kommunikation & Fernzugriff", "Outlook, Teams und Support direkt am Vorgang."],
  "ai-check": ["Analyse & Fehlercheck", "Technische und kaufmännische Auffälligkeiten früh erkennen."],
  expert: ["Sachverständigenwesen", "Ortstermine, Bilddokumentation, Gutachten und Honorar."],
  energy: ["Energieberatung", "EEE-Projekte, Nachweise und Fördervorgänge strukturiert bearbeiten."],
  rules: ["Regelwerk / Vertragsgrundlagen", "BGB, VOB und technische Regeln mit projektbezogenen Hinweisen vergleichen."],
  help: ["DachWerk Hilfe", "Praxisfragen zu Ausführung, LV, Kalkulation und Dokumentation bündeln."],
  users: ["Anwenderverwaltung", "Rollen, Einladungen, Freigaben und Zugriffsrechte zentral steuern."],
  settings: ["Einstellungen", "Betriebsdaten, Nummernkreise, Kalkulationswerte und Integrationen."],
};

const pageHeader = (view, actions = "") => {
  const [title, description] = pageMeta[view];
  return `
    <header class="page-header">
      <div>
        <span class="eyebrow">DachWerk Pro · Release 0.2</span>
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
      <div class="header-actions">${actions}</div>
    </header>
    <nav class="page-navigation" aria-label="Seitennavigation">
      <button class="page-nav-button" data-nav="back">← Zurück</button>
      <button class="page-nav-button page-nav-home" data-nav="home">⌂ Übersicht</button>
      <button class="page-nav-button" data-nav="forward">Weiter →</button>
    </nav>`;
};

const button = (label, action, kind = "secondary") =>
  `<button class="button button-${kind}" data-action="${action}">${label}</button>`;

const projectRows = `
  <tr>
    <td><div class="project-cell"><span class="project-icon">DH</span><div><strong>Dachsanierung Gewerbehalle Nord</strong><small>P-2026-0038 · Bremen</small></div></div></td>
    <td><span class="status-pill status-green">Ausführung</span></td>
    <td><div class="person-cell"><strong>Stephan M.</strong><small>Technische Leitung</small></div></td>
    <td><div class="progress"><span style="width:72%"></span></div><small class="muted">72 %</small></td>
    <td>18.09.2026</td>
  </tr>
  <tr>
    <td><div class="project-cell"><span class="project-icon">WO</span><div><strong>Wohnanlage Am Park</strong><small>P-2026-0035 · Hamburg</small></div></div></td>
    <td><span class="status-pill status-amber">Prüfung</span></td>
    <td><div class="person-cell"><strong>Michael R.</strong><small>Bauleitung</small></div></td>
    <td><div class="progress"><span style="width:48%"></span></div><small class="muted">48 %</small></td>
    <td>21.09.2026</td>
  </tr>
  <tr>
    <td><div class="project-cell"><span class="project-icon">KN</span><div><strong>Kita Neubau Süd</strong><small>P-2026-0031 · Rosenheim</small></div></div></td>
    <td><span class="status-pill status-blue">Kalkulation</span></td>
    <td><div class="person-cell"><strong>Stephan M.</strong><small>Kalkulation</small></div></td>
    <td><div class="progress"><span style="width:26%"></span></div><small class="muted">26 %</small></td>
    <td>25.09.2026</td>
  </tr>
  <tr>
    <td><div class="project-cell"><span class="project-icon">FD</span><div><strong>Flachdach Logistikzentrum</strong><small>P-2026-0028 · Hannover</small></div></div></td>
    <td><span class="status-pill status-red">Klärung</span></td>
    <td><div class="person-cell"><strong>Team Nord</strong><small>Qualitätssicherung</small></div></td>
    <td><div class="progress"><span style="width:83%"></span></div><small class="muted">83 %</small></td>
    <td>Heute</td>
  </tr>`;

function dashboardView() {
  return `
    <section class="page" data-page="dashboard">
      ${pageHeader(
        "dashboard",
        `<span class="date-chip">◷ ${todayLabel}</span>${button("+ Neues Projekt", "new-project", "primary")}`,
      )}
      <div class="kpi-grid">
        <article class="kpi-card" style="--accent:#2563a8;--accent-soft:#eef5ff">
          <div class="kpi-head"><span>Aktive Projekte</span><span class="kpi-icon">P</span></div>
          <strong class="kpi-value">8</strong>
          <span class="kpi-foot"><b class="trend-up">+2</b> seit Monatsbeginn</span>
        </article>
        <article class="kpi-card" style="--accent:#b16b00;--accent-soft:#fff6df">
          <div class="kpi-head"><span>Offene Aufgaben</span><span class="kpi-icon">A</span></div>
          <strong class="kpi-value">12</strong>
          <span class="kpi-foot"><b class="trend-warn">4</b> heute fällig</span>
        </article>
        <article class="kpi-card" style="--accent:#6941c6;--accent-soft:#f3efff">
          <div class="kpi-head"><span>Prüfhinweise</span><span class="kpi-icon">KI</span></div>
          <strong class="kpi-value">5</strong>
          <span class="kpi-foot"><b class="trend-warn">2</b> mit hoher Priorität</span>
        </article>
        <article class="kpi-card" style="--accent:#1c8a5a;--accent-soft:#eaf7f0">
          <div class="kpi-head"><span>Projektvolumen</span><span class="kpi-icon">€</span></div>
          <strong class="kpi-value">4,82 Mio.</strong>
          <span class="kpi-foot"><b class="trend-up">+8,4 %</b> gegenüber Vormonat</span>
        </article>
      </div>

      <div class="dashboard-grid">
        <div class="dashboard-main">
          <section class="panel">
            <div class="panel-head"><div><h2>Aktuelle Projekte</h2><p>Sortiert nach nächstem Termin</p></div><button class="text-button" data-go="projects">Alle Projekte →</button></div>
            <div class="data-table-wrap">
              <table class="data-table searchable-table">
                <thead><tr><th>Projekt</th><th>Status</th><th>Verantwortlich</th><th>Fortschritt</th><th>Nächster Termin</th></tr></thead>
                <tbody>${projectRows}</tbody>
              </table>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head"><div><h2>Schnellaktionen</h2><p>Häufige Vorgänge direkt starten</p></div></div>
            <div class="action-grid">
              <button class="quick-action" data-action="new-customer"><span>K+</span>Neuen Kunden</button>
              <button class="quick-action" data-go="gaeb"><span>G</span>GAEB importieren</button>
              <button class="quick-action" data-go="site-docs"><span>F</span>Fotos erfassen</button>
              <button class="quick-action" data-go="invoices"><span>R</span>Rechnung prüfen</button>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head"><div><h2>Letzte Aktivitäten</h2><p>Projektübergreifende Änderungen</p></div><button class="text-button" data-action="activity">Protokoll öffnen</button></div>
            <ul class="activity-list">
              <li class="activity-item"><span class="activity-mark"></span><div class="activity-copy"><strong>Aufmaß V03 wurde zur Prüfung bereitgestellt</strong><span>Wohnanlage Am Park · vor 18 Minuten</span></div></li>
              <li class="activity-item"><span class="activity-mark" style="background:var(--green);box-shadow:0 0 0 2px var(--green-soft)"></span><div class="activity-copy"><strong>Nachtrag N-04 kaufmännisch freigegeben</strong><span>Dachsanierung Gewerbehalle Nord · vor 1 Stunde</span></div></li>
              <li class="activity-item"><span class="activity-mark" style="background:var(--amber);box-shadow:0 0 0 2px var(--amber-soft)"></span><div class="activity-copy"><strong>Drei neue Baustellenfotos ohne Zuordnung</strong><span>Flachdach Logistikzentrum · gestern, 17:42 Uhr</span></div></li>
            </ul>
          </section>
        </div>

        <aside class="dashboard-side">
          <section class="panel ai-panel">
            <div class="panel-head"><div><span class="ai-badge">KI-Prüfung aktiv</span><h2>Neue Auffälligkeiten</h2></div><button class="text-button" data-go="ai-check">Öffnen →</button></div>
            <ul class="issue-list">
              <li class="issue-item"><span class="severity high">!</span><div class="issue-copy"><strong>LV-Menge weicht vom Aufmaß ab</strong><span>Pos. 020.0040 · Abweichung +18,7 %</span></div></li>
              <li class="issue-item"><span class="severity medium">△</span><div class="issue-copy"><strong>Gefälleplanung nicht hinterlegt</strong><span>Flachdach Logistikzentrum · Prüfpunkt T-17</span></div></li>
              <li class="issue-item"><span class="severity low">i</span><div class="issue-copy"><strong>Materialpreis älter als 90 Tage</strong><span>PMMA Detailabdichtung · Preisstand 05/2026</span></div></li>
            </ul>
          </section>

          <section class="panel">
            <div class="panel-head"><div><h2>Anstehend</h2><p>Die nächsten fünf Tage</p></div><button class="text-button" data-action="calendar">Kalender</button></div>
            <ul class="task-list">
              <li class="task-item"><span class="severity high">12</span><div class="task-copy"><strong>Rechnungsprüfung Lieferant</strong><span>Projekt P-2026-0038</span></div><span class="task-date">Heute</span></li>
              <li class="task-item"><span class="severity medium">14</span><div class="task-copy"><strong>Ortstermin Dachfläche</strong><span>Wohnanlage Am Park</span></div><span class="task-date">Mo.</span></li>
              <li class="task-item"><span class="severity low">16</span><div class="task-copy"><strong>Vergabegespräch</strong><span>Kita Neubau Süd</span></div><span class="task-date">Mi.</span></li>
            </ul>
          </section>

          <section class="panel panel-pad">
            <span class="eyebrow">Release-Hinweis</span>
            <h2 class="section-title" style="margin-top:9px">Erste Bildschirmmaske</h2>
            <p class="muted" style="line-height:1.6;margin:8px 0 14px">Navigation, Schnellzugriff, F3-Logik und Kalkulationsmaske sind in diesem Release interaktiv. Schnittstellen werden schrittweise angebunden.</p>
            <span class="status-pill status-green">System bereit</span>
          </section>
        </aside>
      </div>
    </section>`;
}

function customersView() {
  return `
    <section class="page" data-page="customers">
      ${pageHeader("customers", `${button("CSV exportieren", "export")}${button("+ Neuer Kunde · F3", "new-customer", "primary")}`)}
      <section class="panel">
        <div class="filterbar">
          <input class="filter-input table-filter" placeholder="Kundennummer, Firma oder Ort suchen …" />
          <select class="filter-select"><option>Alle Kundengruppen</option><option>Auftraggeber</option><option>Planer</option><option>Lieferanten</option></select>
          <select class="filter-select"><option>Status: alle</option><option>Aktiv</option><option>Interessent</option><option>Archiv</option></select>
        </div>
        <div class="data-table-wrap">
          <table class="data-table searchable-table">
            <thead><tr><th>Kundennr.</th><th>Firma / Kunde</th><th>Ansprechpartner</th><th>Ort</th><th>Aktive Projekte</th><th>Status</th><th>Letzter Kontakt</th></tr></thead>
            <tbody>
              <tr><td><strong>K-2026-0039</strong></td><td><div class="project-cell"><span class="project-icon">BG</span><div><strong>Baugesellschaft Nord GmbH</strong><small>Auftraggeber</small></div></div></td><td>Martin Weber</td><td>Bremen</td><td>2</td><td><span class="status-pill status-green">Aktiv</span></td><td>Heute</td></tr>
              <tr><td><strong>K-2026-0037</strong></td><td><div class="project-cell"><span class="project-icon">AP</span><div><strong>Architektur Partner</strong><small>Planungsbüro</small></div></div></td><td>Laura Schmidt</td><td>Hamburg</td><td>1</td><td><span class="status-pill status-green">Aktiv</span></td><td>10.09.2026</td></tr>
              <tr><td><strong>K-2026-0034</strong></td><td><div class="project-cell"><span class="project-icon">WH</span><div><strong>Wohnbau Hanse</strong><small>Hausverwaltung</small></div></div></td><td>Jens Peters</td><td>Oldenburg</td><td>3</td><td><span class="status-pill status-blue">Angebot</span></td><td>08.09.2026</td></tr>
              <tr><td><strong>K-2026-0028</strong></td><td><div class="project-cell"><span class="project-icon">DB</span><div><strong>Dachbaustoffe Bremen</strong><small>Lieferant</small></div></div></td><td>Anne Koch</td><td>Stuhr</td><td>–</td><td><span class="status-pill status-grey">Lieferant</span></td><td>03.09.2026</td></tr>
              <tr><td><strong>K-2026-0022</strong></td><td><div class="project-cell"><span class="project-icon">PG</span><div><strong>Projektentwicklung Grün</strong><small>Interessent</small></div></div></td><td>Tobias Lang</td><td>Rosenheim</td><td>0</td><td><span class="status-pill status-amber">Interessent</span></td><td>27.08.2026</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>`;
}

function projectsView() {
  const card = (no, title, place, meta, status = "") => `
    <article class="project-card">
      <span class="project-no">${no}</span><h3>${title}</h3><p>${place}</p>
      ${status ? `<span class="status-pill ${status[1]}">${status[0]}</span>` : ""}
      <div class="project-card-footer"><span>${meta}</span><button class="text-button" data-action="open-project">Öffnen →</button></div>
    </article>`;
  return `
    <section class="page" data-page="projects">
      ${pageHeader("projects", `${button("Listenansicht", "list-view")}${button("+ Neues Projekt", "new-project", "primary")}`)}
      <div class="filterbar panel" style="margin-bottom:16px">
        <input class="filter-input project-filter" placeholder="Projekt suchen …" />
        <select class="filter-select"><option>Alle Verantwortlichen</option><option>Stephan Mangel</option><option>Team Nord</option></select>
        <select class="filter-select"><option>Alle Regionen</option><option>Nord</option><option>Süd</option></select>
      </div>
      <div class="board project-board">
        <section class="board-column"><div class="board-head">Anfrage <span>2</span></div>${card("P-2026-0041", "Schulzentrum – Dachflächen", "Bremen", "Anfrage vom 11.09.")}${card("P-2026-0040", "Produktionshalle West", "Osnabrück", "Unterlagen unvollständig")}</section>
        <section class="board-column"><div class="board-head">Kalkulation <span>2</span></div>${card("P-2026-0031", "Kita Neubau Süd", "Rosenheim", "Abgabe 25.09.", ["In Bearbeitung", "status-blue"])}${card("P-2026-0029", "Verwaltungsbau Mitte", "Hannover", "LV 212 Positionen", ["GAEB geprüft", "status-green"])}</section>
        <section class="board-column"><div class="board-head">Ausführung <span>3</span></div>${card("P-2026-0038", "Dachsanierung Gewerbehalle Nord", "Bremen", "Baufortschritt 72 %", ["Planmäßig", "status-green"])}${card("P-2026-0035", "Wohnanlage Am Park", "Hamburg", "Baufortschritt 48 %", ["Prüfung", "status-amber"])}${card("P-2026-0028", "Flachdach Logistikzentrum", "Hannover", "Baufortschritt 83 %", ["Klärung", "status-red"])}</section>
        <section class="board-column"><div class="board-head">Abnahme <span>1</span></div>${card("P-2026-0023", "Bürohaus Weserufer", "Bremen", "Abnahme 17.09.", ["Dokumentation", "status-purple"])}</section>
      </div>
    </section>`;
}

function calculationView() {
  return `
    <section class="page" data-page="calculation">
      ${pageHeader("calculation", `${button("EFB-Auswertung", "efb")}${button("Kalkulation speichern", "save-calc", "primary")}`)}
      <div class="calc-layout">
        <aside class="panel controls-panel">
          <h2>Globale Kalkulationswerte</h2><p>Änderungen wirken sofort auf alle Positionen dieser Beispielkalkulation.</p>
          <label class="control-row"><span>Mittellohn / Stunde</span><input class="control-input calc-setting" id="wage" type="number" step="0.5" value="29.50" /></label>
          <label class="control-row"><span>Lohnkostenzuschlag</span><input class="control-input calc-setting" id="labor-surcharge" type="number" step="1" value="105" /></label>
          <label class="control-row"><span>AGK</span><input class="control-input calc-setting" id="agk" type="number" step="0.5" value="12" /></label>
          <label class="control-row"><span>Wagnis & Gewinn</span><input class="control-input calc-setting" id="profit" type="number" step="0.5" value="8" /></label>
          <label class="control-row"><span>Auslösung / Lohnstd.</span><input class="control-input calc-setting" id="travel" type="number" step="0.5" value="6.50" /></label>
          <div class="calc-summary">
            <div><span>Material</span><strong id="material-total">–</strong></div>
            <div><span>Lohn</span><strong id="labor-total">–</strong></div>
            <div><span>Kalk. Stundenlohn</span><strong id="hourly-rate">–</strong></div>
            <div><span>Zuschläge</span><strong id="surcharge-total">–</strong></div>
            <div class="calc-total"><span>Angebotssumme netto</span><strong id="grand-total">–</strong></div>
          </div>
        </aside>

        <section class="panel">
          <div class="panel-head"><div><h2>LV 020 · Dachabdichtungsarbeiten</h2><p>Projekt P-2026-0031 · Beispielwerte</p></div><button class="text-button" data-action="add-position">+ Position</button></div>
          <div class="data-table-wrap">
            <table class="data-table calc-table">
              <thead><tr><th>Position</th><th>Leistung</th><th>Menge</th><th>Einheit</th><th>EK Material</th><th>Min./Einh.</th><th>EP netto</th><th>GP netto</th></tr></thead>
              <tbody>
                <tr class="calc-row"><td>020.0010</td><td class="description"><strong>Untergrund prüfen und reinigen</strong><small class="muted">Gefährdung: A · S · R · P</small></td><td><input class="qty" type="number" value="820" step="1" /></td><td>m²</td><td><input class="material" type="number" value="0.35" step="0.01" /></td><td><input class="minutes" type="number" value="2.8" step="0.1" /></td><td class="ep">–</td><td class="gp">–</td></tr>
                <tr class="calc-row"><td>020.0020</td><td class="description"><strong>Bitumen-Voranstrich aufbringen</strong><small class="muted">Gefährdung: A · G · R · P</small></td><td><input class="qty" type="number" value="820" step="1" /></td><td>m²</td><td><input class="material" type="number" value="1.18" step="0.01" /></td><td><input class="minutes" type="number" value="3.6" step="0.1" /></td><td class="ep">–</td><td class="gp">–</td></tr>
                <tr class="calc-row"><td>020.0030</td><td class="description"><strong>Dampfsperrbahn selbstklebend</strong><small class="muted">Gefährdung: A · R · E · W</small></td><td><input class="qty" type="number" value="820" step="1" /></td><td>m²</td><td><input class="material" type="number" value="8.95" step="0.01" /></td><td><input class="minutes" type="number" value="8.5" step="0.1" /></td><td class="ep">–</td><td class="gp">–</td></tr>
                <tr class="calc-row"><td>020.0040</td><td class="description"><strong>Gefälledämmung EPS verlegen</strong><small class="muted">Gefährdung: A · E · Z · W</small></td><td><input class="qty" type="number" value="820" step="1" /></td><td>m²</td><td><input class="material" type="number" value="29.80" step="0.01" /></td><td><input class="minutes" type="number" value="10.2" step="0.1" /></td><td class="ep">–</td><td class="gp">–</td></tr>
                <tr class="calc-row"><td>020.0050</td><td class="description"><strong>Abdichtung zweilagig, Bitumen</strong><small class="muted">Gefährdung: A · H · G · R · W</small></td><td><input class="qty" type="number" value="820" step="1" /></td><td>m²</td><td><input class="material" type="number" value="24.60" step="0.01" /></td><td><input class="minutes" type="number" value="15.5" step="0.1" /></td><td class="ep">–</td><td class="gp">–</td></tr>
              </tbody>
              <tfoot><tr><td colspan="7"><strong>LV-Summe netto</strong></td><td id="table-total"><strong>–</strong></td></tr></tfoot>
            </table>
          </div>
        </section>
      </div>
    </section>`;
}

function gaebView() {
  return `
    <section class="page" data-page="gaeb">
      ${pageHeader("gaeb", `${button("Zuordnungsregeln", "mapping-rules")}${button("GAEB exportieren", "gaeb-export", "primary")}`)}
      <div class="dashboard-grid">
        <div class="dashboard-main">
          <label class="drop-zone" id="gaeb-drop">
            <div><span class="drop-icon">G</span><h2>GAEB-Datei hier ablegen</h2><p>Das LV wird geprüft, strukturiert und mit der Dach-Kalkulationsbasis abgeglichen.</p><span class="button button-primary">Datei auswählen</span><input id="gaeb-file" type="file" accept=".d81,.d82,.d83,.d84,.x81,.x82,.x83,.x84,.p81,.p82,.p83,.p84,.xml" /><div class="file-formats"><span>GAEB XML</span><span>D81–D84</span><span>X81–X84</span><span>XML</span></div></div>
          </label>
          <section class="panel">
            <div class="panel-head"><div><h2>Letzte Importe</h2><p>Demo-Verlauf</p></div></div>
            <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Datei</th><th>Projekt</th><th>Positionen</th><th>Prüfung</th><th>Stand</th></tr></thead><tbody><tr><td><strong>LV_Dachabdichtung.x83</strong></td><td>P-2026-0031</td><td>184</td><td><span class="status-pill status-green">Ohne Formatfehler</span></td><td>11.09.2026</td></tr><tr><td><strong>Nachtrag_04.d84</strong></td><td>P-2026-0038</td><td>22</td><td><span class="status-pill status-amber">3 Hinweise</span></td><td>09.09.2026</td></tr></tbody></table></div>
          </section>
        </div>
        <aside class="dashboard-side">
          <section class="panel panel-pad"><span class="eyebrow">Import-Ablauf</span><ul class="task-list" style="margin-top:10px"><li class="task-item"><span class="severity low">1</span><div class="task-copy"><strong>Format und Struktur prüfen</strong><span>Ordnungszahlen, Mengen und Einheiten</span></div></li><li class="task-item"><span class="severity low">2</span><div class="task-copy"><strong>Positionen zuordnen</strong><span>Kalkulationsbasis und Materialpreise</span></div></li><li class="task-item"><span class="severity low">3</span><div class="task-copy"><strong>Regelwerkscheck starten</strong><span>ZVDH, VOB/C, DIN und abc</span></div></li><li class="task-item"><span class="severity low">4</span><div class="task-copy"><strong>Kalkulieren und ausgeben</strong><span>EP, GP, EFB und GAEB-Export</span></div></li></ul></section>
          <section class="panel panel-pad"><span class="ai-badge">KI-Zuordnung</span><h2 class="section-title" style="margin-top:10px">Trefferquote im Test</h2><strong style="display:block;font-size:34px;margin:12px 0 5px">91,4 %</strong><p class="muted">Unsichere Zuordnungen bleiben immer in der manuellen Prüfliste.</p></section>
        </aside>
      </div>
    </section>`;
}

function safetyView() {
  const risks = [
    ["A", "Absturz", "Seitenschutz vor PSAgA bevorzugen; Zugang und Rettung festlegen", "ASR A2.1 · DGUV-I 201-056", "Hoch"],
    ["D", "Durchsturz", "Öffnungen, Lichtkuppeln und nicht durchtrittsichere Flächen sichern", "DGUV-I 201-056", "Hoch"],
    ["H", "Heißarbeit / Brand", "Freigabeschein, Löschmittel und Brandwache", "DGUV Regelwerk", "Hoch"],
    ["G", "Gefahrstoffe / Dämpfe", "Sicherheitsdatenblatt, Lüftung und Schutzmaßnahmen prüfen", "GefStoffV", "Mittel"],
    ["W", "Witterung", "Temperatur, Nässe, Schnee, Eis und Wind bewerten", "Fachregel Abdichtungen 01/2026", "Mittel"],
    ["Z", "Windsog", "Befestiger, Untergrund und erforderliche Auszugswerte prüfen", "Fachregel Abdichtungen 01/2026", "Hoch"],
  ];
  return `
    <section class="page" data-page="safety">
      ${pageHeader("safety", `${button("Checkliste drucken", "print")}${button("Prüfung starten", "run-safety", "primary")}`)}
      <div class="check-grid">
        <section class="panel">
          <div class="panel-head"><div><h2>Vorprüfung · Bitumen-Oberlagsbahn</h2><p>Projekt P-2026-0038 · Pos. 020.0050</p></div><span class="status-pill status-amber">6 Themen</span></div>
          <div>${risks.map(([code, title, measure, rule, level]) => `<div class="check-row"><span class="check-code">${code}</span><strong>${title}</strong><span class="status-pill ${level === "Hoch" ? "status-red" : "status-amber"}">${level}</span><span>${measure}</span><span class="muted">${rule}</span></div>`).join("")}</div>
        </section>
        <aside class="dashboard-side">
          <section class="panel score-card"><div class="score-ring"><span>79 %</span></div><h2>Vorprüfung vollständig</h2><p>Drei Schutzmaßnahmen müssen vor Arbeitsbeginn noch bestätigt werden.</p><div class="risk-code-grid"><div><b>A</b>Absturz</div><div><b>D</b>Durchsturz</div><div><b>Z</b>Windsog</div><div><b>W</b>Witterung</div><div><b>H</b>Heißarbeit</div><div><b>G</b>Gefahrstoff</div></div></section>
          <section class="panel panel-pad"><span class="eyebrow">Wichtiger Hinweis</span><p class="muted" style="line-height:1.6">Der Gefährdungscheck ist eine Vorprüfung und ersetzt keine projektspezifische Gefährdungsbeurteilung.</p></section>
        </aside>
      </div>
      <section class="panel rule-register">
        <div class="panel-head"><div><h2>Dokumentenbasis und technische Ausführungsrisiken</h2><p>Letzter zusammengeführter Stand · 14.09.2026</p></div><span class="status-pill status-green">Aktualisiert</span></div>
        <details open><summary>DGUV Information 201-056 · Schutzmaßnahmen gegen Absturz auf Dächern</summary><ul><li>Nutzungs- und Wartungsintensität, Personengruppe sowie Ausstattungsklasse A, B oder C berücksichtigen.</li><li>Dauerhafte und temporäre Systeme, sichere Zugänge, Montage, Benutzung, Instandhaltung und Dokumentation gemeinsam planen.</li><li>Absturzhöhe, Abstand zur Kante, Dachneigung, Rutschhemmung, Dachöffnungen und Durchtrittsicherheit projektspezifisch prüfen.</li></ul></details>
        <details><summary>DGUV Regel 112-199 · Retten mit persönlichen Absturzschutzausrüstungen</summary><ul><li>Bei individuellen Absturzschutzmaßnahmen vorab ein umsetzbares Rettungskonzept festlegen.</li><li>Rettungsausrüstung, Anschlageinrichtungen, Unterweisung, Prüfung und Dokumentation berücksichtigen.</li></ul></details>
        <details><summary>DDH Fachregel für Abdichtungen · Stand 01/2026</summary><ul><li>Mechanische, thermische, biologische, chemische und feuchtebedingte Beanspruchungen prüfen.</li><li>Planmäßiges Gefälle unter 2 % wird wie eine gefällelose Fläche behandelt.</li><li>Windsogsicherung, Behelfsabdichtungen sowie zusätzliche Beanspruchungen durch Solar- und Nutzflächen frühzeitig bewerten.</li></ul></details>
        <details><summary>Referenzen</summary><p>DGUV-I 201-056, Änderungsübersicht 2025, Arbeitsstand 10/2025, ASR A2.1, DGUV Regel 112-199 und DDH Fachregel für Abdichtungen 01/2026.</p></details>
      </section>
    </section>`;
}

function siteDocsView() {
  return `
    <section class="page" data-page="site-docs">
      ${pageHeader("site-docs", `${button("Bautagebuch", "site-diary")}${button("+ Fotos erfassen", "add-photos", "primary")}`)}
      <div class="kpi-grid">
        <article class="kpi-card"><div class="kpi-head"><span>Fotos diese Woche</span><span class="kpi-icon">F</span></div><strong class="kpi-value">128</strong><span class="kpi-foot">7 Projekte</span></article>
        <article class="kpi-card"><div class="kpi-head"><span>Offene Mängel</span><span class="kpi-icon">!</span></div><strong class="kpi-value">9</strong><span class="kpi-foot"><b class="trend-warn">3</b> überfällig</span></article>
        <article class="kpi-card"><div class="kpi-head"><span>Tagesberichte</span><span class="kpi-icon">T</span></div><strong class="kpi-value">22</strong><span class="kpi-foot">September 2026</span></article>
        <article class="kpi-card"><div class="kpi-head"><span>Abnahmen</span><span class="kpi-icon">✓</span></div><strong class="kpi-value">4</strong><span class="kpi-foot">1 diese Woche</span></article>
      </div>
      <div class="module-grid">
        <article class="module-card" style="--icon-bg:#eef5ff;--icon-color:#2563a8"><div class="module-card-head"><span class="module-icon">F</span><span class="status-pill status-green">Mobil</span></div><h3>Fotodokumentation</h3><p>Aufnahmen projekt-, bauteil- und positionsbezogen mit Zeitstempel ablegen.</p><div class="module-card-foot"><span>128 neue Fotos</span><button class="text-button" data-action="add-photos">Öffnen →</button></div></article>
        <article class="module-card" style="--icon-bg:#fff0f1;--icon-color:#cf202a"><div class="module-card-head"><span class="module-icon">M</span><span class="status-pill status-red">9 offen</span></div><h3>Mängelmanagement</h3><p>Mangel, Frist, Zuständigkeit und Erledigungsnachweis nachvollziehbar führen.</p><div class="module-card-foot"><span>3 Fristen kritisch</span><button class="text-button" data-go="defects">Öffnen →</button></div></article>
        <article class="module-card" style="--icon-bg:#eaf7f0;--icon-color:#1c8a5a"><div class="module-card-head"><span class="module-icon">B</span><span class="status-pill status-green">Aktuell</span></div><h3>Bautagebuch</h3><p>Wetter, Personal, Leistungen, Behinderungen und besondere Vorkommnisse.</p><div class="module-card-foot"><span>Heute noch offen</span><button class="text-button" data-action="site-diary">Öffnen →</button></div></article>
        <article class="module-card" style="--icon-bg:#f3efff;--icon-color:#6941c6"><div class="module-card-head"><span class="module-icon">A</span><span class="status-pill status-purple">4 Vorgänge</span></div><h3>Abnahmen & Übergaben</h3><p>Protokolle, Restleistungen und Nachweise gesammelt zur Unterschrift führen.</p><div class="module-card-foot"><span>Nächste: 17.09.</span><button class="text-button" data-action="acceptance">Öffnen →</button></div></article>
        <article class="module-card"><div class="module-card-head"><span class="module-icon">L</span><span class="status-pill status-grey">Beta</span></div><h3>Leckage & Ortung</h3><p>Prüfverfahren, Schadstellen und Maßnahmen direkt in der Dachfläche verorten.</p><div class="module-card-foot"><span>2 Prüfungen</span><button class="text-button" data-action="leak-test">Öffnen →</button></div></article>
        <article class="module-card"><div class="module-card-head"><span class="module-icon">N</span><span class="status-pill status-blue">Cloud</span></div><h3>Nachweise</h3><p>Lieferscheine, Chargen, Eigenüberwachung und Herstellerunterlagen bündeln.</p><div class="module-card-foot"><span>46 Dokumente</span><button class="text-button" data-action="evidence">Öffnen →</button></div></article>
      </div>
    </section>`;
}

function documentsView() {
  const folders = [
    ["AN", "Anfragen", "24 Dateien · heute geändert"],
    ["LV", "Leistungsverzeichnisse", "17 Dateien · gestern geändert"],
    ["PL", "Pläne & Details", "38 Dateien · 09.09.2026"],
    ["EM", "E-Mail-Ablage", "112 Nachrichten · heute"],
    ["BR", "Briefverkehr", "31 Dokumente · 08.09.2026"],
    ["BD", "Baudokumentation", "486 Dateien · heute"],
    ["RE", "Rechnungen", "29 Dokumente · gestern"],
    ["NA", "Nachweise & Abnahmen", "54 Dateien · 06.09.2026"],
  ];
  return `
    <section class="page" data-page="documents">
      ${pageHeader("documents", `${button("Ordner anlegen", "new-folder")}${button("+ Dokument hochladen", "upload", "primary")}`)}
      <section class="panel" style="padding:14px;margin-bottom:16px"><div class="global-search" style="width:100%;max-width:none"><span>⌕</span><input class="folder-filter" placeholder="In der Projektablage suchen …" /><kbd>PDF · DOCX · XLSX</kbd></div></section>
      <div class="folder-grid">${folders.map(([code, title, info]) => `<article class="folder-card searchable-folder" data-action="open-folder"><div class="folder-top"><span class="folder-icon">${code}</span><span class="muted">•••</span></div><h3>${title}</h3><p>${info}</p></article>`).join("")}</div>
      <section class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>Zuletzt bearbeitet</h2><p>Projektübergreifend</p></div><button class="text-button" data-action="all-documents">Alle anzeigen →</button></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Dokument</th><th>Projekt</th><th>Bereich</th><th>Bearbeitet</th><th>Status</th></tr></thead><tbody><tr><td><strong>Aufmaß_V03.xlsx</strong></td><td>P-2026-0035</td><td>Abrechnung</td><td>vor 18 Min.</td><td><span class="status-pill status-amber">Prüfung</span></td></tr><tr><td><strong>Nachtrag_N04.pdf</strong></td><td>P-2026-0038</td><td>Schriftverkehr</td><td>vor 1 Std.</td><td><span class="status-pill status-green">Freigegeben</span></td></tr><tr><td><strong>Detail_Attika_07.pdf</strong></td><td>P-2026-0028</td><td>Pläne</td><td>gestern</td><td><span class="status-pill status-blue">Neu</span></td></tr></tbody></table></div></section>
    </section>`;
}

function invoicesView() {
  const invoice = (supplier, no, value, project, approved = false) => `<article class="project-card invoice-card ${approved ? "is-approved" : ""}"><span class="project-no">${no}</span><h3>${supplier}</h3><div class="invoice-value">${value}</div><p>${project}</p><div class="project-card-footer"><span>${approved ? "Freigegeben" : "Prüfung erforderlich"}</span><button class="text-button" data-action="open-invoice">Öffnen →</button></div></article>`;
  return `
    <section class="page" data-page="invoices">
      ${pageHeader("invoices", `${button("Prüfregeln", "invoice-rules")}${button("+ Rechnung erfassen", "new-invoice", "primary")}`)}
      <div class="board invoice-board">
        <section class="board-column"><div class="board-head">Eingang <span>3</span></div>${invoice("Dachbaustoffe Bremen", "RE-2026-0184", "8.420,70 €", "P-2026-0038")}${invoice("Kran & Logistik Nord", "RE-2026-0183", "1.894,00 €", "P-2026-0035")}${invoice("Entsorgung Hanse", "RE-2026-0182", "742,80 €", "P-2026-0028")}</section>
        <section class="board-column"><div class="board-head">Sachliche Prüfung <span>2</span></div>${invoice("Abdichtungssysteme GmbH", "RE-2026-0179", "12.608,44 €", "P-2026-0031")}${invoice("Gerüstbau Weser", "RE-2026-0178", "6.350,00 €", "P-2026-0038")}</section>
        <section class="board-column"><div class="board-head">Freigabe <span>1</span></div>${invoice("Dämmstoffhandel Süd", "RE-2026-0174", "18.992,15 €", "P-2026-0031")}</section>
        <section class="board-column"><div class="board-head">Gebucht <span>2</span></div>${invoice("Werkzeugservice Nord", "RE-2026-0169", "486,22 €", "Betrieb", true)}${invoice("Baustellenbedarf GmbH", "RE-2026-0165", "1.122,98 €", "P-2026-0035", true)}</section>
      </div>
    </section>`;
}

function communicationView() {
  const integrations = [
    ["O", "Microsoft Outlook", "E-Mails, Kontakte und Kalender über Microsoft Graph projektbezogen nutzen.", "#eaf3ff", "#1264a3", "Noch nicht verbunden"],
    ["T", "Microsoft Teams", "Besprechungen, Einladungen und Projektkommunikation aus einem Vorgang starten.", "#f0efff", "#5558af", "Noch nicht verbunden"],
    ["TV", "TeamViewer", "Sichere Support-Verbindungen über API oder geprüfte Sitzungslinks vorbereiten.", "#eaf6ff", "#0575e6", "Noch nicht verbunden"],
  ];
  return `
    <section class="page" data-page="communication">
      ${pageHeader("communication", button("Verbindungsprotokoll", "connection-log"))}
      <div class="integration-grid">${integrations.map(([code, name, desc, bg, color, status]) => `<article class="integration-card" style="--integration-bg:${bg};--integration-color:${color}"><span class="integration-logo">${code}</span><h3>${name}</h3><p>${desc}</p><div class="connection-state"><span class="status-pill status-grey">${status}</span><button class="button button-secondary" data-action="connect-${code.toLowerCase()}">Verbinden</button></div></article>`).join("")}</div>
      <section class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>Projektkommunikation</h2><p>Letzte Vorgänge in der Demo-Ansicht</p></div><button class="text-button" data-action="new-message">+ Neue Nachricht</button></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Kanal</th><th>Betreff</th><th>Projekt</th><th>Kontakt</th><th>Zeit</th></tr></thead><tbody><tr><td><span class="tag status-blue">Outlook</span></td><td><strong>Freigabe Detail Attika</strong></td><td>P-2026-0038</td><td>Martin Weber</td><td>Heute, 08:42</td></tr><tr><td><span class="tag status-purple">Teams</span></td><td><strong>Jour fixe Ausführung</strong></td><td>P-2026-0035</td><td>Projektteam</td><td>Mo., 10:00</td></tr><tr><td><span class="tag status-grey">Support</span></td><td><strong>Kalkulationszugriff</strong></td><td>Intern</td><td>Team Nord</td><td>09.09.2026</td></tr></tbody></table></div></section>
    </section>`;
}

function aiCheckView() {
  return `
    <section class="page" data-page="ai-check">
      ${pageHeader("ai-check", `${button("Prüfprofil wählen", "check-profile")}${button("Analyse starten", "run-analysis", "primary")}`)}
      <div class="kpi-grid">
        <article class="kpi-card" style="--accent:#cf202a;--accent-soft:#fff0f1"><div class="kpi-head"><span>Hohe Priorität</span><span class="kpi-icon">!</span></div><strong class="kpi-value">2</strong><span class="kpi-foot">Sofort prüfen</span></article>
        <article class="kpi-card" style="--accent:#b16b00;--accent-soft:#fff6df"><div class="kpi-head"><span>Mittlere Priorität</span><span class="kpi-icon">△</span></div><strong class="kpi-value">3</strong><span class="kpi-foot">Vor Freigabe klären</span></article>
        <article class="kpi-card" style="--accent:#1c8a5a;--accent-soft:#eaf7f0"><div class="kpi-head"><span>Geprüfte Positionen</span><span class="kpi-icon">✓</span></div><strong class="kpi-value">184</strong><span class="kpi-foot">91,4 % automatisch zugeordnet</span></article>
        <article class="kpi-card" style="--accent:#6941c6;--accent-soft:#f3efff"><div class="kpi-head"><span>Letzter Lauf</span><span class="kpi-icon">KI</span></div><strong class="kpi-value" style="font-size:22px">09:18</strong><span class="kpi-foot">Heute · 42 Sekunden</span></article>
      </div>
      <section class="panel ai-panel"><div class="panel-head"><div><span class="ai-badge">Technik + Kaufmännisch</span><h2>Prüfergebnisse</h2></div><select class="filter-select"><option>Alle Projekte</option><option>P-2026-0038</option><option>P-2026-0031</option></select></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Priorität</th><th>Prüfbereich</th><th>Auffälligkeit</th><th>Projekt / Position</th><th>Vorschlag</th><th>Status</th></tr></thead><tbody><tr><td><span class="status-pill status-red">Hoch</span></td><td>Mengenvergleich</td><td><strong>Aufmaß +18,7 % über LV-Menge</strong></td><td>P-2026-0035 · 020.0040</td><td>Nachweis und Freigabe anfordern</td><td><button class="text-button" data-action="review-issue">Prüfen →</button></td></tr><tr><td><span class="status-pill status-red">Hoch</span></td><td>Ausführung</td><td><strong>Mechanische Befestigung nicht dokumentiert</strong></td><td>P-2026-0028 · Dachfläche B</td><td>Systemnachweis ergänzen</td><td><button class="text-button" data-action="review-issue">Prüfen →</button></td></tr><tr><td><span class="status-pill status-amber">Mittel</span></td><td>Regelwerk</td><td><strong>Gefälleplanung fehlt in der Ablage</strong></td><td>P-2026-0028 · T-17</td><td>Planung / Abweichung dokumentieren</td><td><button class="text-button" data-action="review-issue">Prüfen →</button></td></tr><tr><td><span class="status-pill status-amber">Mittel</span></td><td>Materialpreis</td><td><strong>Preisstand älter als 90 Tage</strong></td><td>PMMA Detailabdichtung</td><td>Lieferantenpreis aktualisieren</td><td><button class="text-button" data-action="review-issue">Prüfen →</button></td></tr><tr><td><span class="status-pill status-blue">Hinweis</span></td><td>LV-Text</td><td><strong>Leistungsgrenze nicht eindeutig</strong></td><td>P-2026-0031 · 030.0120</td><td>Vorbemerkung ergänzen</td><td><button class="text-button" data-action="review-issue">Prüfen →</button></td></tr></tbody></table></div></section>
      <section class="panel panel-pad" style="margin-top:16px"><span class="eyebrow">Verantwortung bleibt beim Fachanwender</span><p class="muted" style="margin:8px 0 0;line-height:1.6">DachWerk Pro kennzeichnet Auffälligkeiten und liefert Prüfhinweise. Technische Bewertung, Freigabe und Entscheidung erfolgen weiterhin durch eine qualifizierte Person.</p></section>
    </section>`;
}

function expertView() {
  return genericModuleView("expert", [
    ["OT", "Ortstermine", "Termine, Teilnehmer, Prüfauftrag und Wetterdaten vorbereiten.", "3 geplant"],
    ["BD", "Bilddokumentation", "Fotos nummerieren, beschreiben und Feststellungen zuordnen.", "64 Bilder offen"],
    ["GA", "Gutachten", "Gliederung, Feststellungen, Bewertung und Anlagen verwalten.", "2 in Bearbeitung"],
    ["KO", "Kostenschätzung", "Sanierungsbereiche und voraussichtliche Kosten strukturiert erfassen.", "4 Entwürfe"],
    ["RE", "Honorar & Rechnung", "Leistungen, Auslagen, § 19 UStG und Rechnungsnummern führen.", "1 offen"],
    ["AR", "Archiv", "Abgeschlossene Vorgänge revisionsnah und durchsuchbar ablegen.", "18 Vorgänge"],
  ]);
}

function energyView() {
  return genericModuleView("energy", [
    ["EE", "EEE-Projekte", "Projekt- und Förderstatus vom Erstkontakt bis zum Nachweis.", "4 aktiv"],
    ["BE", "Bestandsaufnahme", "Bauteile, U-Werte, Anlagentechnik und Fotobelege erfassen.", "2 offen"],
    ["MB", "Maßnahmenbewertung", "Varianten und energetische Auswirkungen gegenüberstellen.", "3 Varianten"],
    ["NA", "Nachweise", "Berechnungen, Bestätigungen und Herstellerunterlagen bündeln.", "12 Dokumente"],
    ["FR", "Fristen", "Anträge, Abrufe und Nachweise terminlich überwachen.", "2 diese Woche"],
    ["AB", "Abrechnung", "Honorar, Förderpositionen und Leistungsstand abgleichen.", "1 Prüfung"],
  ]);
}

function servicesView() {
  return genericModuleView("services", [
    ["LT", "Leistungstexte", "Neutrale Texte für Dachdeckung, Abdichtung, Spengler- und Nebenleistungen.", "Blöcke 0010–0180"],
    ["KA", "Kalkulationsansätze", "Material, Minutenansatz, Geräte und Nebenleistungen je Position.", "EP- und GP-Basis"],
    ["FL", "Fremdleistungen", "Material- und Lohnanteile getrennt für Vergabe und EFB-Blätter führen.", "EFB-fähig"],
    ["RK", "Risikokennzeichen", "A/D/Z/W/H/G/S/M positionsbezogen zuordnen.", "Technik & Arbeitsschutz"],
  ]);
}

function pricesView() {
  return genericModuleView("prices", [
    ["M", "Materialpreise 2026", "EK, Rabatt, Fracht, Verschnitt, kalkulatorischer Preis, Stand und Quelle.", "Hochbau-Basis"],
    ["L", "Lohnpreisliste", "Minutenansätze, Mittellohn und globaler Stundenverrechnungssatz.", "Bremen / variabel"],
    ["LP", "Lieferantenpreise", "Preisstände und Originalquellen nachvollziehbar verknüpfen.", "Quellenregister"],
    ["BK", "Betriebskosten", "SKR03, Feiertage, Krankheitstage und produktive Stunden.", "Kalkulationsgrundlage"],
  ]);
}

function measurementsView() {
  return genericModuleView("measurements", [
    ["A", "Digitales Aufmaß", "Flächen, Längen, Stückzahlen und Abzüge projektbezogen erfassen.", "LV-Zuordnung"],
    ["D", "Drohnenaufmaß", "Drohnenbilder und Messdaten in Projekt und digitale Bauakte übernehmen.", "Medienworkflow"],
    ["P", "Plan- & PDF-Aufmaß", "Pläne kalibrieren und Messwerte positionsbezogen strukturieren.", "Prüfschritt"],
    ["X", "Export & Abgleich", "Aufmaß, LV und Abrechnung mit Differenzanzeige gegenüberstellen.", "Excel / GAEB"],
  ]);
}

function defectsView() {
  return genericModuleView("defects", [
    ["M", "Festgestellte Mängel", "Nur tatsächliche technische Auffälligkeiten mit Bauteil und Position erfassen.", "Separater Vorgang"],
    ["A", "Abweichungen", "Soll-Ist-Abweichungen bewerten und fachlich einordnen.", "Prüfung erforderlich"],
    ["F", "Fristen & Zuständigkeit", "Verantwortliche, Rückmeldung und Wiedervorlage nachvollziehbar führen.", "Terminsteuerung"],
    ["N", "Erledigungsnachweis", "Fotos, Schreiben, Abnahme und Abschluss revisionssicher zusammenführen.", "Dokumentation"],
  ]);
}

function rulesView() {
  return `
    <section class="page" data-page="rules">
      ${pageHeader("rules", `${button("Regelregister", "open-module")}${button("Projekt prüfen", "run-analysis", "primary")}`)}
      <div class="settings-grid">
        <section class="panel settings-block"><h2>BGB-Bauvertragsrecht</h2><p>Gesetzliche Grundlage für Bau- und Werkverträge.</p><div class="setting-line"><div><strong>Geltung</strong><small>Gilt kraft Gesetzes; Vertragsart und Beteiligte prüfen.</small></div><span class="status-pill status-blue">Basis</span></div><div class="setting-line"><div><strong>Praxisfokus</strong><small>Leistungsumfang, Nachträge, Abschläge, Abnahme und Mängel klar dokumentieren.</small></div></div></section>
        <section class="panel settings-block"><h2>VOB/A</h2><p>Vergaberegeln insbesondere bei öffentlichen Aufträgen.</p><div class="setting-line"><div><strong>Geltung</strong><small>Vergabeverfahren und Ausschreibung; nicht die Ausführung des Bauvertrags.</small></div><span class="status-pill status-purple">Vergabe</span></div><div class="setting-line"><div><strong>Praxisfokus</strong><small>Fristen, Eignung, Wertung und Vollständigkeit der Vergabeunterlagen prüfen.</small></div></div></section>
        <section class="panel settings-block"><h2>VOB/B und VOB/C</h2><p>Vertragsbedingungen und technische ATV nur bei wirksamer Einbeziehung beziehungsweise vertraglichem Bezug anwenden.</p><div class="setting-line"><div><strong>VOB/B</strong><small>Ausführung, Vergütung, Behinderung, Kündigung, Abnahme und Mängel.</small></div><span class="status-pill status-amber">Vertrag prüfen</span></div><div class="setting-line"><div><strong>VOB/C</strong><small>ATV, Leistungsumfang sowie Neben- und Besondere Leistungen positionsbezogen prüfen.</small></div></div></section>
        <section class="panel settings-block"><h2>Empfehlung „beste Wahl“</h2><p>Keine pauschale Auswahl: Zuerst Auftraggeber, Vergabeart und wirksam vereinbarte Vertragsgrundlagen feststellen.</p><div class="setting-line"><div><strong>Prüfreihenfolge</strong><small>Vertrag → Rangfolge → BGB/VOB → ATV/DIN/ZVDH → LV und Ausführungsdetails.</small></div><span class="status-pill status-green">Empfohlen</span></div><div class="setting-line"><div><strong>Hinweis</strong><small>Rechtliche Einzelfragen und Abweichungen fachanwaltlich prüfen lassen.</small></div></div></section>
      </div>
    </section>`;
}

function helpView() {
  return genericModuleView("help", [
    ["T", "Technische Praxisfrage", "Ausführung, Anschlusshöhen, Gefälle, Befestigung und Details strukturiert prüfen.", "Mit Quellenhinweis"],
    ["LV", "LV- und Kalkulationshilfe", "Position verstehen, Risiken kennzeichnen und Kalkulationsansatz vorbereiten.", "Projektbezogen"],
    ["D", "Dokumentationshilfe", "Bautagebuch, Schreiben, Abnahme und Fotodokumentation vorbereiten.", "Vorlagen"],
    ["KI", "DachWerk Assistent", "Fragen aus dem aktuellen Projektkontext für eine fachliche Vorprüfung bündeln.", "Anbindung folgt"],
  ]);
}

function usersView() {
  return genericModuleView("users", [
    ["E", "Einladungen", "Neue Anwender kontrolliert einladen und vor Aktivierung freigeben.", "Admin-Freigabe"],
    ["R", "Rollen & Rechte", "Master, Administrator, Anwender und Tester eindeutig zuordnen.", "Zugriffskonzept"],
    ["S", "Sitzungen", "Aktive Anmeldungen, Abmeldung und Gerätezugriffe verwalten.", "Produktive Auth folgt"],
    ["P", "Prüfprotokoll", "Anmeldungen, Freigaben und Rechteänderungen nachvollziehbar protokollieren.", "Audit"],
  ]);
}

function genericModuleView(view, modules) {
  return `
    <section class="page" data-page="${view}">
      ${pageHeader(view, `${button("Auswertung", "report")}${button("+ Vorgang anlegen", "new-record", "primary")}`)}
      <div class="module-grid">${modules.map(([code, title, desc, meta], index) => `<article class="module-card" style="--icon-bg:${["#eef5ff", "#fff0f1", "#eaf7f0", "#f3efff", "#fff6df", "#f1f2f4"][index]};--icon-color:${["#2563a8", "#cf202a", "#1c8a5a", "#6941c6", "#b16b00", "#59606a"][index]}"><div class="module-card-head"><span class="module-icon">${code}</span><span class="status-pill status-grey">Modul</span></div><h3>${title}</h3><p>${desc}</p><div class="module-card-foot"><span>${meta}</span><button class="text-button" data-action="open-module">Öffnen →</button></div></article>`).join("")}</div>
    </section>`;
}

function settingsView() {
  return `
    <section class="page" data-page="settings">
      ${pageHeader("settings", button("Änderungen speichern", "save-settings", "primary"))}
      <div class="settings-grid">
        <section class="panel settings-block"><h2>Betrieb & Kalkulation</h2><p>Grundwerte für die betriebliche Kalkulationsbasis.</p><div class="setting-line"><div><strong>SKR03-Betriebskosten</strong><small>Kostenarten und Jahreswerte pflegen</small></div><button class="text-button" data-action="operating-costs">Bearbeiten →</button></div><div class="setting-line"><div><strong>Bundesland Feiertage</strong><small>Bremen · 10 gesetzliche Feiertage</small></div><select class="control-select"><option>Bremen</option><option>Bayern</option><option>Hamburg</option><option>Niedersachsen</option></select></div><div class="setting-line"><div><strong>Geschätzte Krankheitstage</strong><small>Je gewerblichem Mitarbeiter und Jahr</small></div><input class="control-input" style="width:80px" value="12" type="number" /></div><div class="setting-line"><div><strong>Preiswarnung</strong><small>Materialpreise nach 90 Tagen markieren</small></div><button class="toggle is-on" aria-label="Preiswarnung aktiviert"></button></div></section>
        <section class="panel settings-block"><h2>Nummernkreise</h2><p>Automatische Vergabe über F3 und Schnellerfassung.</p><div class="setting-line"><div><strong>Kunden</strong><small>K-2026-####</small></div><span class="status-pill status-green">Nächste 0042</span></div><div class="setting-line"><div><strong>Projekte</strong><small>P-2026-####</small></div><span class="status-pill status-green">Nächste 0042</span></div><div class="setting-line"><div><strong>Gutachten</strong><small>JJ/###</small></div><span class="status-pill status-grey">Individuell</span></div><div class="setting-line"><div><strong>Rechnungen</strong><small>RE-2026-####</small></div><span class="status-pill status-green">Nächste 0185</span></div></section>
        <section class="panel settings-block"><h2>KI-Unterstützung</h2><p>Prüfmodule und Freigabegrenzen konfigurieren.</p><div class="setting-line"><div><strong>Technische Regelwerksprüfung</strong><small>ZVDH, VOB/C, DIN und abc</small></div><button class="toggle is-on" aria-label="Technische Prüfung aktiviert"></button></div><div class="setting-line"><div><strong>Mengen- und Preisvergleich</strong><small>LV, Aufmaß, Rechnung und Preisstand</small></div><button class="toggle is-on" aria-label="Mengenprüfung aktiviert"></button></div><div class="setting-line"><div><strong>Automatische Freigabe</strong><small>Entscheidungen bleiben beim Fachanwender</small></div><button class="toggle" aria-label="Automatische Freigabe deaktiviert"></button></div></section>
        <section class="panel settings-block"><h2>Oberfläche & Marke</h2><p>Produktbezeichnung und Arbeitsbereich.</p><div class="setting-line"><div><strong>Produktname</strong><small>DachWerk Pro by Stephan Mangel</small></div><span class="status-pill status-green">Aktiv</span></div><div class="setting-line"><div><strong>Claim</strong><small>Das Tool vom Dachhandwerker für Dachhandwerker.</small></div><button class="text-button" data-action="edit-brand">Bearbeiten</button></div><div class="setting-line"><div><strong>Kompakte Navigation</strong><small>Mehr Raum für Kalkulation und Tabellen</small></div><button class="toggle" aria-label="Kompakte Navigation deaktiviert"></button></div></section>
      </div>
    </section>`;
}

const views = {
  dashboard: dashboardView,
  customers: customersView,
  projects: projectsView,
  services: servicesView,
  prices: pricesView,
  calculation: calculationView,
  gaeb: gaebView,
  measurements: measurementsView,
  safety: safetyView,
  "site-docs": siteDocsView,
  defects: defectsView,
  documents: documentsView,
  invoices: invoicesView,
  communication: communicationView,
  "ai-check": aiCheckView,
  expert: expertView,
  energy: energyView,
  rules: rulesView,
  help: helpView,
  users: usersView,
  settings: settingsView,
};

function startApp() {
  publicHome.classList.add("is-hidden");
  loginScreen.classList.add("is-hidden");
  appShell.classList.remove("is-hidden");
  const initialView = views[state.currentView] ? state.currentView : "dashboard";
  state.viewHistory = [initialView];
  state.historyIndex = 0;
  renderView(initialView);
  requestAnimationFrame(() => document.querySelector(".page-header h1")?.focus?.());
}

function showPublicHome() {
  appShell.classList.add("is-hidden");
  loginScreen.classList.add("is-hidden");
  publicHome.classList.remove("is-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showLogin() {
  publicHome.classList.add("is-hidden");
  loginScreen.classList.remove("is-hidden");
  setTimeout(() => document.querySelector("#username")?.focus(), 40);
}

function openRequestDialog() {
  requestBackdrop.classList.remove("is-hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.querySelector("#request-name")?.focus(), 40);
}

function closeRequestDialog() {
  requestBackdrop.classList.add("is-hidden");
  document.body.style.overflow = "";
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function saveCurrentDraft() {
  const fields = {};
  mainContent.querySelectorAll("input, select, textarea").forEach((field, index) => {
    const key = field.id || field.name || `field-${index}`;
    fields[key] = field.type === "checkbox" ? field.checked : field.value;
  });
  localStorage.setItem(`dwp-draft-${state.currentView}`, JSON.stringify(fields));
  state.unsavedChanges = false;
}

function restoreCurrentDraft() {
  const raw = localStorage.getItem(`dwp-draft-${state.currentView}`);
  if (!raw) return;
  try {
    const fields = JSON.parse(raw);
    mainContent.querySelectorAll("input, select, textarea").forEach((field, index) => {
      const key = field.id || field.name || `field-${index}`;
      if (!(key in fields)) return;
      if (field.type === "checkbox") field.checked = Boolean(fields[key]);
      else field.value = fields[key];
    });
  } catch {
    localStorage.removeItem(`dwp-draft-${state.currentView}`);
  }
}

function confirmPageChange() {
  if (!state.unsavedChanges) return true;
  const shouldSave = window.confirm("Vorherige Eingaben vor dem Seitenwechsel lokal speichern?\n\nOK = Ja · Abbrechen = Nein");
  if (shouldSave) {
    saveCurrentDraft();
    showToast("Zwischenstand gespeichert", "Die Eingaben wurden für diesen Browser lokal gesichert.");
  } else {
    localStorage.removeItem(`dwp-draft-${state.currentView}`);
    state.unsavedChanges = false;
  }
  return true;
}

function navigateTo(view) {
  const safeView = views[view] ? view : "dashboard";
  if (safeView === state.currentView) return;
  if (!confirmPageChange()) return;
  state.viewHistory = state.viewHistory.slice(0, state.historyIndex + 1);
  state.viewHistory.push(safeView);
  state.historyIndex += 1;
  renderView(safeView);
}

function navigateHistory(delta) {
  const nextIndex = state.historyIndex + delta;
  if (nextIndex < 0 || nextIndex >= state.viewHistory.length) return;
  if (!confirmPageChange()) return;
  state.historyIndex = nextIndex;
  renderView(state.viewHistory[state.historyIndex]);
}

function renderView(view) {
  const safeView = views[view] ? view : "dashboard";
  state.currentView = safeView;
  localStorage.setItem("dwp-current-view", safeView);
  mainContent.innerHTML = views[safeView]();
  document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.view === safeView);
  });
  closeSidebar();
  restoreCurrentDraft();
  bindDynamicInteractions();
  state.unsavedChanges = false;
  const back = mainContent.querySelector('[data-nav="back"]');
  const forward = mainContent.querySelector('[data-nav="forward"]');
  if (back) back.disabled = state.historyIndex <= 0;
  if (forward) forward.disabled = state.historyIndex >= state.viewHistory.length - 1;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindDynamicInteractions() {
  mainContent.querySelectorAll("[data-go]").forEach((element) => {
    element.addEventListener("click", () => navigateTo(element.dataset.go));
  });
  mainContent.querySelectorAll("[data-action]").forEach((element) => {
    element.addEventListener("click", () => handleAction(element.dataset.action));
  });
  mainContent.querySelectorAll("[data-nav]").forEach((element) => {
    element.addEventListener("click", () => {
      if (element.dataset.nav === "back") navigateHistory(-1);
      if (element.dataset.nav === "forward") navigateHistory(1);
      if (element.dataset.nav === "home") navigateTo("dashboard");
    });
  });
  mainContent.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", () => { state.unsavedChanges = true; });
    field.addEventListener("change", () => { state.unsavedChanges = true; });
  });
  const tableFilter = mainContent.querySelector(".table-filter");
  if (tableFilter) tableFilter.addEventListener("input", () => filterRows(tableFilter));
  const projectFilter = mainContent.querySelector(".project-filter");
  if (projectFilter) projectFilter.addEventListener("input", () => filterCards(projectFilter, ".project-card"));
  const folderFilter = mainContent.querySelector(".folder-filter");
  if (folderFilter) folderFilter.addEventListener("input", () => filterCards(folderFilter, ".searchable-folder"));
  if (state.currentView === "calculation") bindCalculation();
  if (state.currentView === "gaeb") bindGaebDropzone();
}

function handleAction(action) {
  if (["save-calc", "save-settings"].includes(action)) saveCurrentDraft();
  if (["new-customer", "new-project", "new-record"].includes(action)) {
    openQuickModal(action === "new-project" ? "Projekt" : action === "new-customer" ? "Kunde" : undefined);
    return;
  }
  const messages = {
    export: ["Export vorbereitet", "Der Kundenexport wird im nächsten Datenbank-Release aktiviert."],
    "save-calc": ["Kalkulation gespeichert", "Die Werte wurden in diesem Browser als Zwischenstand gespeichert."],
    efb: ["EFB-Auswertung", "Material- und Lohnanteile wurden zur Ausgabe vorbereitet."],
    "add-position": ["Neue Position", "Die Positionsmaske folgt im nächsten Kalkulationsschritt."],
    "gaeb-export": ["GAEB-Ausgabe vorbereitet", "Der produktive Export wird nach dem Parser-Test aktiviert."],
    "mapping-rules": ["Zuordnungsregeln", "Die Regelverwaltung ist für Release 0.2 vorgesehen."],
    print: ["Druckansicht vorbereitet", "Die Checkliste kann im PDF-Modul ausgegeben werden."],
    "run-safety": ["Gefährdungscheck gestartet", "Die Beispielposition wurde neu ausgewertet."],
    "add-photos": ["Mobile Erfassung", "Kamera- und Uploadfunktion werden für Release 0.2 angebunden."],
    "site-diary": ["Bautagebuch geöffnet", "Der heutige Tagesbericht ist zur Erfassung vorbereitet."],
    defects: ["Mängelliste geöffnet", "Neun offene Punkte wurden geladen."],
    acceptance: ["Abnahmen geöffnet", "Vier laufende Vorgänge wurden geladen."],
    "leak-test": ["Leckageprüfung", "Prüfverfahren und Schadstellenkarte sind vorbereitet."],
    evidence: ["Nachweise geöffnet", "Die projektbezogene Nachweisablage ist vorbereitet."],
    upload: ["Upload vorbereitet", "Die Dateiauswahl wird mit der Projektablage verbunden."],
    "new-folder": ["Neuer Ordner", "Die Standardstruktur bleibt dabei projektbezogen erhalten."],
    "open-folder": ["Ordner geöffnet", "Die Dateiliste wird im nächsten Datenbank-Release geladen."],
    "new-invoice": ["Rechnungserfassung", "PDF-, E-Rechnungs- und OCR-Import sind vorgesehen."],
    "open-invoice": ["Rechnungsprüfung", "Sachliche und rechnerische Prüfschritte wurden geöffnet."],
    "run-analysis": ["Analyse gestartet", "184 Positionen werden technisch und kaufmännisch geprüft."],
    "review-issue": ["Prüfvorgang geöffnet", "Der Hinweis ist zur fachlichen Bewertung vorgemerkt."],
    "save-settings": ["Einstellungen gespeichert", "Die Testwerte wurden in diesem Browser lokal übernommen."],
    calendar: ["Kalender", "Die Outlook-Kalenderanbindung folgt mit Microsoft Graph."],
    activity: ["Aktivitätsprotokoll", "Das vollständige Änderungsjournal ist für Release 0.2 vorgesehen."],
    "open-project": ["Projektakte geöffnet", "Detailansicht, Dokumente und Kalkulation werden zusammengeführt."],
    "list-view": ["Listenansicht", "Die Tabellenansicht wird für die Projektübersicht ergänzt."],
    "new-message": ["Neue Nachricht", "Outlook und Teams werden nach Freigabe der Verbindung aktiviert."],
    "open-module": ["Modul geöffnet", "Die Detailmaske ist für den nächsten Ausbauschritt vorbereitet."],
    report: ["Auswertung", "Die PDF- und Excel-Ausgabe wird vorbereitet."],
    "operating-costs": ["Betriebskosten", "Der SKR03-Kostenbogen wird als eigener Einstellungsreiter aufgebaut."],
    "edit-brand": ["Marke", "Produktname und Claim sind für diesen Release fest hinterlegt."],
  };
  if (action.startsWith("connect-")) {
    showToast("Verbindung vorbereitet", "Die Anmeldung wird erst nach Einrichtung der jeweiligen API freigeschaltet.");
    return;
  }
  const [title, copy] = messages[action] || ["Funktion vorbereitet", "Dieser Baustein wird in einem der nächsten Releases aktiviert."];
  showToast(title, copy);
}

function bindCalculation() {
  const inputs = mainContent.querySelectorAll(".calc-setting, .calc-row input");
  inputs.forEach((input) => input.addEventListener("input", updateCalculation));
  updateCalculation();
}

function numberValue(selector) {
  const value = Number.parseFloat(mainContent.querySelector(selector)?.value || "0");
  return Number.isFinite(value) ? value : 0;
}

function updateCalculation() {
  const wage = numberValue("#wage");
  const laborSurcharge = numberValue("#labor-surcharge") / 100;
  const agk = numberValue("#agk") / 100;
  const profit = numberValue("#profit") / 100;
  const travel = numberValue("#travel");
  const chargedLaborRate = wage * (1 + laborSurcharge) + travel;
  let materialTotal = 0;
  let laborTotal = 0;
  let directTotal = 0;

  mainContent.querySelectorAll(".calc-row").forEach((row) => {
    const qty = Number.parseFloat(row.querySelector(".qty").value) || 0;
    const material = Number.parseFloat(row.querySelector(".material").value) || 0;
    const minutes = Number.parseFloat(row.querySelector(".minutes").value) || 0;
    const laborPerUnit = (minutes / 60) * chargedLaborRate;
    const directPerUnit = material + laborPerUnit;
    const sellingPerUnit = directPerUnit * (1 + agk) * (1 + profit);
    const rowTotal = sellingPerUnit * qty;
    materialTotal += material * qty;
    laborTotal += laborPerUnit * qty;
    directTotal += directPerUnit * qty;
    row.querySelector(".ep").textContent = euro.format(sellingPerUnit);
    row.querySelector(".gp").textContent = euro.format(rowTotal);
  });

  const grandTotal = directTotal * (1 + agk) * (1 + profit);
  document.querySelector("#material-total").textContent = euro.format(materialTotal);
  document.querySelector("#labor-total").textContent = euro.format(laborTotal);
  document.querySelector("#hourly-rate").textContent = euro.format(chargedLaborRate);
  document.querySelector("#surcharge-total").textContent = euro.format(grandTotal - directTotal);
  document.querySelector("#grand-total").textContent = euro.format(grandTotal);
  document.querySelector("#table-total strong").textContent = euro.format(grandTotal);
}

function bindGaebDropzone() {
  const zone = mainContent.querySelector("#gaeb-drop");
  const input = mainContent.querySelector("#gaeb-file");
  ["dragenter", "dragover"].forEach((eventName) => zone.addEventListener(eventName, (event) => {
    event.preventDefault();
    zone.classList.add("is-dragging");
  }));
  ["dragleave", "drop"].forEach((eventName) => zone.addEventListener(eventName, (event) => {
    event.preventDefault();
    zone.classList.remove("is-dragging");
  }));
  zone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) simulateGaebImport(file.name);
  });
  input.addEventListener("change", () => {
    if (input.files?.[0]) simulateGaebImport(input.files[0].name);
  });
}

function simulateGaebImport(fileName) {
  showToast("GAEB-Datei übernommen", `${fileName} wurde in die Prüfwarteschlange gelegt.`);
}

function filterRows(input) {
  const query = input.value.trim().toLocaleLowerCase("de");
  const rows = mainContent.querySelectorAll(".searchable-table tbody tr");
  rows.forEach((row) => {
    row.style.display = row.textContent.toLocaleLowerCase("de").includes(query) ? "" : "none";
  });
}

function filterCards(input, selector) {
  const query = input.value.trim().toLocaleLowerCase("de");
  mainContent.querySelectorAll(selector).forEach((card) => {
    card.style.display = card.textContent.toLocaleLowerCase("de").includes(query) ? "" : "none";
  });
}

function openQuickModal(type) {
  modalBackdrop.classList.remove("is-hidden");
  if (type) document.querySelector("#record-type").value = type;
  updateRecordNumber();
  setTimeout(() => document.querySelector("#record-name").focus(), 40);
}

function closeQuickModal() {
  modalBackdrop.classList.add("is-hidden");
  document.querySelector("#quick-form").reset();
}

function updateRecordNumber() {
  const type = document.querySelector("#record-type").value;
  const prefixes = { Kunde: "K", Projekt: "P", Aufgabe: "A", Dokument: "D" };
  document.querySelector("#record-number").value = `${prefixes[type] || "D"}-2026-0042`;
}

function showToast(title, copy) {
  const toast = document.createElement("div");
  toast.className = "toast";
  const mark = document.createElement("span");
  mark.className = "toast-mark";
  mark.textContent = "✓";
  const content = document.createElement("div");
  const strong = document.createElement("strong");
  strong.textContent = title;
  const span = document.createElement("span");
  span.textContent = copy;
  content.append(strong, span);
  toast.append(mark, content);
  toastRegion.append(toast);
  setTimeout(() => toast.remove(), 4200);
}

function openSidebar() {
  sidebar.classList.add("is-open");
  sidebarBackdrop.classList.add("is-open");
}

function closeSidebar() {
  sidebar.classList.remove("is-open");
  sidebarBackdrop.classList.remove("is-open");
}

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = document.querySelector("#username").value.trim().toLocaleLowerCase("de");
  const password = document.querySelector("#password").value;
  const error = document.querySelector("#login-error");
  if (!username || !password) {
    error.textContent = "Bitte Benutzername und Passwort eingeben.";
    return;
  }
  const credentialHash = await sha256(`${username}:${password}`);
  const masterCredentialHash = "69758e6c949a2ffde4a268f3c7dba007c1840246336a2b2fc666dcc9fa67ba38";
  if (credentialHash !== masterCredentialHash) {
    error.textContent = "Zugangsdaten nicht gültig oder noch nicht freigeschaltet.";
    return;
  }
  error.textContent = "";
  sessionStorage.setItem("dwp-test-session", "master");
  startApp();
});

document.querySelector("#toggle-password").addEventListener("click", (event) => {
  const password = document.querySelector("#password");
  const show = password.type === "password";
  password.type = show ? "text" : "password";
  event.currentTarget.textContent = show ? "Verbergen" : "Anzeigen";
});

document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
  item.addEventListener("click", () => navigateTo(item.dataset.view));
});

document.querySelector("#f3-button").addEventListener("click", () => openQuickModal());
document.querySelector("#logout-button").addEventListener("click", () => {
  if (!confirmPageChange()) return;
  sessionStorage.removeItem("dwp-test-session");
  appShell.classList.add("is-hidden");
  document.querySelector("#password").value = "";
  showPublicHome();
});

document.querySelectorAll("[data-open-login]").forEach((button) => button.addEventListener("click", showLogin));
document.querySelectorAll("[data-back-home]").forEach((button) => button.addEventListener("click", showPublicHome));
document.querySelectorAll("[data-open-request]").forEach((button) => button.addEventListener("click", openRequestDialog));
document.querySelector("#request-close").addEventListener("click", closeRequestDialog);
document.querySelector("#request-cancel").addEventListener("click", closeRequestDialog);
requestBackdrop.addEventListener("click", (event) => {
  if (event.target === requestBackdrop) closeRequestDialog();
});

document.querySelector("#test-request-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const requestId = `DWP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const name = document.querySelector("#request-name").value.trim();
  const company = document.querySelector("#request-company").value.trim();
  const email = document.querySelector("#request-email").value.trim();
  const phone = document.querySelector("#request-phone").value.trim();
  const address = document.querySelector("#request-address").value.trim();
  const role = document.querySelector("#request-role").value.trim() || "nicht angegeben";
  const start = document.querySelector("#request-start").value || "nach Genehmigung";
  const subject = `Testzugang DachWerk Pro – ${company} – ${requestId}`;
  const body = [
    "Anfrage für einen fünftägigen DachWerk-Pro-Testzugang",
    "",
    `Anfrage-ID: ${requestId}`,
    `Name: ${name}`,
    `Firma: ${company}`,
    `E-Mail: ${email}`,
    `Telefon: ${phone}`,
    `Anschrift / Ort: ${address}`,
    `Funktion: ${role}`,
    `Gewünschter Testbeginn: ${start}`,
    "",
    "Der Zugang soll erst nach persönlicher Genehmigung durch Stephan Mangel freigeschaltet werden. Das Passwort wird anschließend vom Antragsteller selbst festgelegt.",
  ].join("\n");
  document.querySelector("#request-status").textContent = "Die E-Mail-Anfrage wird jetzt vorbereitet. Bitte im Mailprogramm noch absenden.";
  window.location.href = `mailto:testzugang@dachwerkpro.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
document.querySelector("#modal-close").addEventListener("click", closeQuickModal);
document.querySelector("#modal-cancel").addEventListener("click", closeQuickModal);
document.querySelector("#record-type").addEventListener("change", updateRecordNumber);
modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeQuickModal();
});

document.querySelector("#quick-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const type = document.querySelector("#record-type").value;
  const number = document.querySelector("#record-number").value;
  closeQuickModal();
  showToast(`${type} angelegt`, `${number} wurde in der Testumgebung gespeichert.`);
});

document.querySelector("#menu-button").addEventListener("click", openSidebar);
document.querySelector("#sidebar-close").addEventListener("click", closeSidebar);
sidebarBackdrop.addEventListener("click", closeSidebar);

document.querySelector("#global-search").addEventListener("input", (event) => {
  const value = event.currentTarget.value.trim();
  if (value.length === 2) showToast("Globale Suche aktiv", "Kunden, Projekte und Dokumente werden gemeinsam durchsucht.");
});

document.querySelector("#notification-button").addEventListener("click", () => {
  showToast("3 neue Hinweise", "Zwei Prüfhinweise und eine fällige Rechnungsfreigabe.");
});

document.querySelector("#profile-button").addEventListener("click", () => {
  showToast("Stephan Mangel", "Administrator · DachWerk Pro Testbetrieb");
});

document.addEventListener("click", (event) => {
  const toggle = event.target.closest(".toggle");
  if (!toggle) return;
  toggle.classList.toggle("is-on");
  toggle.setAttribute("aria-checked", String(toggle.classList.contains("is-on")));
  state.unsavedChanges = true;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "F3" && !appShell.classList.contains("is-hidden")) {
    event.preventDefault();
    openQuickModal();
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    document.querySelector("#global-search")?.focus();
  }
  if (event.key === "Escape") {
    closeQuickModal();
    closeSidebar();
    closeRequestDialog();
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!state.unsavedChanges) return;
  event.preventDefault();
  event.returnValue = "";
});

if (sessionStorage.getItem("dwp-test-session") === "master") startApp();
