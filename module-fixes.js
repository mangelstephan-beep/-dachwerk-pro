(() => {
  const main = document.querySelector("#main-content");
  if (!main) return;

  const storageKey = "dwp-module-workspaces";

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  }

  function writeStore(store) {
    localStorage.setItem(storageKey, JSON.stringify(store));
  }

  function slug(value) {
    return String(value || "module")
      .toLocaleLowerCase("de")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function showToast(title, text) {
    const region = document.querySelector("#toast-region");
    if (!region) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span class="toast-mark">✓</span><div><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`;
    region.append(toast);
    setTimeout(() => toast.remove(), 3600);
  }

  function getModuleContext(button) {
    const card = button.closest(".module-card");
    const page = button.closest(".page");
    if (!card || !page) return null;
    const title = card.querySelector("h3")?.textContent?.trim() || "Modul";
    const description = card.querySelector("p")?.textContent?.trim() || "";
    const meta = card.querySelector(".module-card-foot > span")?.textContent?.trim() || "";
    const code = card.querySelector(".module-icon")?.textContent?.trim() || "M";
    const view = page.dataset.page || "dashboard";
    return { title, description, meta, code, view, id: `${view}:${slug(title)}` };
  }

  function renderWorkspace(ctx) {
    const saved = readStore()[ctx.id] || {};
    const status = saved.status || "Offen";
    const notes = saved.notes || "";
    const owner = saved.owner || "Stephan Mangel";
    const due = saved.due || "";
    const checks = Array.isArray(saved.checks) ? saved.checks : [false, false, false];

    main.innerHTML = `
      <section class="page" data-page="${esc(ctx.view)}" data-module-workspace="${esc(ctx.id)}">
        <header class="page-header">
          <div>
            <span class="eyebrow">DachWerk Pro · Arbeitsbereich</span>
            <h1>${esc(ctx.title)}</h1>
            <p>${esc(ctx.description)}</p>
          </div>
          <div class="header-actions">
            <button class="button button-secondary" type="button" data-fix-back>← Modulübersicht</button>
            <button class="button button-primary" type="button" data-fix-save>Speichern</button>
          </div>
        </header>
        <nav class="page-navigation" aria-label="Seitennavigation">
          <button class="page-nav-button" type="button" data-fix-back>← Zurück</button>
          <button class="page-nav-button page-nav-home" type="button" data-fix-home>⌂ Übersicht</button>
        </nav>

        <div class="dashboard-grid">
          <div class="dashboard-main">
            <section class="panel panel-pad">
              <div class="panel-head">
                <div><h2>Vorgang bearbeiten</h2><p>${esc(ctx.meta || "Arbeitsstand lokal speichern")}</p></div>
                <span class="status-pill status-blue">${esc(ctx.code)}</span>
              </div>
              <div class="quick-form" style="margin-top:16px">
                <div>
                  <label>Status</label>
                  <select id="module-status">
                    ${["Offen", "In Bearbeitung", "Prüfung", "Erledigt"].map(v => `<option ${status === v ? "selected" : ""}>${v}</option>`).join("")}
                  </select>
                </div>
                <div>
                  <label>Verantwortlich</label>
                  <input id="module-owner" value="${esc(owner)}" />
                </div>
                <div>
                  <label>Termin</label>
                  <input id="module-due" type="date" value="${esc(due)}" />
                </div>
                <div class="field-span">
                  <label>Notizen / Arbeitsstand</label>
                  <textarea id="module-notes" rows="7" placeholder="Arbeitsstand, Prüfpunkte, Hinweise oder nächste Schritte festhalten …">${esc(notes)}</textarea>
                </div>
              </div>
            </section>

            <section class="panel panel-pad" style="margin-top:16px">
              <div class="panel-head"><div><h2>Arbeitscheck</h2><p>Einfacher Mindest-Workflow für dieses Modul</p></div></div>
              <div class="setting-line"><div><strong>Unterlagen geprüft</strong><small>Ausgangsdaten und Projektbezug kontrollieren</small></div><input class="module-check" type="checkbox" ${checks[0] ? "checked" : ""}></div>
              <div class="setting-line"><div><strong>Bearbeitung dokumentiert</strong><small>Entscheidung, Ergebnis oder Bearbeitungsstand festhalten</small></div><input class="module-check" type="checkbox" ${checks[1] ? "checked" : ""}></div>
              <div class="setting-line"><div><strong>Nächster Schritt festgelegt</strong><small>Termin, Zuständigkeit oder Abschluss bestimmen</small></div><input class="module-check" type="checkbox" ${checks[2] ? "checked" : ""}></div>
            </section>
          </div>

          <aside class="dashboard-side">
            <section class="panel panel-pad">
              <span class="eyebrow">Modulstatus</span>
              <h2 class="section-title" style="margin-top:9px">Jetzt benutzbar</h2>
              <p class="muted" style="line-height:1.6">Dieser Bereich ersetzt den bisherigen reinen Hinweis-Button. Eingaben werden lokal im Browser gespeichert und bleiben beim nächsten Öffnen erhalten.</p>
            </section>
            <section class="panel panel-pad">
              <span class="eyebrow">Hinweis</span>
              <p class="muted" style="line-height:1.6;margin-top:8px">Produktive Cloud-, Datenbank- und Schnittstellenfunktionen bleiben getrennte Ausbaustufen. Die Modulnavigation funktioniert davon unabhängig.</p>
            </section>
          </aside>
        </div>
      </section>`;
  }

  function saveCurrentWorkspace() {
    const workspace = main.querySelector("[data-module-workspace]");
    if (!workspace) return;
    const id = workspace.dataset.moduleWorkspace;
    const store = readStore();
    store[id] = {
      status: main.querySelector("#module-status")?.value || "Offen",
      owner: main.querySelector("#module-owner")?.value || "",
      due: main.querySelector("#module-due")?.value || "",
      notes: main.querySelector("#module-notes")?.value || "",
      checks: [...main.querySelectorAll(".module-check")].map(input => input.checked),
      updatedAt: new Date().toISOString(),
    };
    writeStore(store);
    showToast("Arbeitsstand gespeichert", "Die Angaben wurden lokal in DachWerk Pro gespeichert.");
  }

  function returnToView(view) {
    const nav = document.querySelector(`.nav-item[data-view="${CSS.escape(view)}"]`);
    if (nav) nav.click();
  }

  main.addEventListener("click", (event) => {
    const openButton = event.target.closest('[data-action="open-module"]');
    if (openButton) {
      const ctx = getModuleContext(openButton);
      if (!ctx) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      renderWorkspace(ctx);
      return;
    }

    if (event.target.closest("[data-fix-save]")) {
      event.preventDefault();
      saveCurrentWorkspace();
      return;
    }

    if (event.target.closest("[data-fix-back]")) {
      event.preventDefault();
      const workspace = main.querySelector("[data-module-workspace]");
      returnToView(workspace?.dataset.page || "dashboard");
      return;
    }

    if (event.target.closest("[data-fix-home]")) {
      event.preventDefault();
      returnToView("dashboard");
    }
  }, true);
})();