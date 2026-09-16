(() => {
  const main = document.querySelector("#main-content");
  if (!main) return;

  const storageKey = "dwp-module-workspaces";
  const auditKey = "dwp-audit-log";
  const recordKey = "dwp-quick-records";
  const costKey = "dwp-operating-costs";

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readStore() {
    return readJson(storageKey, {});
  }

  function writeStore(store) {
    writeJson(storageKey, store);
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

  function currentUser() {
    return document.querySelector("#profile-button strong")?.textContent?.trim() || "Testbenutzer";
  }

  function audit(action, details = {}, source = "App") {
    const entries = readJson(auditKey, []);
    entries.unshift({
      id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      user: currentUser(),
      action,
      source,
      ...details,
    });
    writeJson(auditKey, entries.slice(0, 2000));
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
    const owner = saved.owner || currentUser();
    const due = saved.due || "";
    const priority = saved.priority || "Normal";
    const expectedResponse = saved.expectedResponse || "";
    const nextAction = saved.nextAction || "";
    const checks = Array.isArray(saved.checks) ? saved.checks : [false, false, false];

    main.innerHTML = `
      <section class="page" data-page="${esc(ctx.view)}" data-module-workspace="${esc(ctx.id)}">
        <header class="page-header">
          <div>
            <span class="eyebrow">DachWerk Pro · Release 0.3 Arbeitsbereich</span>
            <h1>${esc(ctx.title)}</h1>
            <p>${esc(ctx.description)}</p>
          </div>
          <div class="header-actions">
            <button class="button button-secondary" type="button" data-fix-back>← Modulübersicht</button>
            <button class="button button-secondary" type="button" data-fix-audit>Logbuch</button>
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
                    ${["Neu", "Zugewiesen", "In Bearbeitung", "Rückmeldung ausstehend", "Prüfung", "Freigegeben", "Erledigt"].map(v => `<option ${status === v ? "selected" : ""}>${v}</option>`).join("")}
                  </select>
                </div>
                <div>
                  <label>Verantwortlich</label>
                  <input id="module-owner" value="${esc(owner)}" />
                </div>
                <div>
                  <label>Priorität</label>
                  <select id="module-priority">
                    ${["Niedrig", "Normal", "Hoch", "Kritisch"].map(v => `<option ${priority === v ? "selected" : ""}>${v}</option>`).join("")}
                  </select>
                </div>
                <div>
                  <label>Fälligkeit</label>
                  <input id="module-due" type="date" value="${esc(due)}" />
                </div>
                <div>
                  <label>Rückmeldung erwartet</label>
                  <input id="module-response" type="datetime-local" value="${esc(expectedResponse)}" />
                </div>
                <div>
                  <label>Nächste Aktion</label>
                  <input id="module-next-action" value="${esc(nextAction)}" placeholder="z. B. Unterlage prüfen" />
                </div>
                <div class="field-span">
                  <label>Notizen / Arbeitsstand</label>
                  <textarea id="module-notes" rows="7" placeholder="Arbeitsstand, Prüfpunkte, Hinweise oder nächste Schritte festhalten …">${esc(notes)}</textarea>
                </div>
              </div>
            </section>

            <section class="panel panel-pad" style="margin-top:16px">
              <div class="panel-head"><div><h2>Arbeitscheck</h2><p>Mindest-Workflow für nachvollziehbare Bearbeitung</p></div></div>
              <div class="setting-line"><div><strong>Unterlagen geprüft</strong><small>Ausgangsdaten und Projektbezug kontrollieren</small></div><input class="module-check" type="checkbox" ${checks[0] ? "checked" : ""}></div>
              <div class="setting-line"><div><strong>Bearbeitung dokumentiert</strong><small>Entscheidung, Ergebnis oder Bearbeitungsstand festhalten</small></div><input class="module-check" type="checkbox" ${checks[1] ? "checked" : ""}></div>
              <div class="setting-line"><div><strong>Nächster Schritt festgelegt</strong><small>Termin, Zuständigkeit oder Abschluss bestimmen</small></div><input class="module-check" type="checkbox" ${checks[2] ? "checked" : ""}></div>
            </section>
          </div>

          <aside class="dashboard-side">
            <section class="panel panel-pad">
              <span class="eyebrow">Modulstatus</span>
              <h2 class="section-title" style="margin-top:9px">Lokal funktionsfähig</h2>
              <p class="muted" style="line-height:1.6">Status, Zuständigkeit, Fristen, nächste Aktion und Prüfschritte werden lokal gespeichert und im Logbuch protokolliert.</p>
            </section>
            <section class="panel panel-pad">
              <span class="eyebrow">Produktionsgrenze</span>
              <p class="muted" style="line-height:1.6;margin-top:8px">E-Mail, Cloud, DATEV, zentrale Benutzerverwaltung und unveränderbarer Audit-Trail benötigen ein serverseitiges Backend. In dieser Testfassung werden keine echten Übertragungen vorgetäuscht.</p>
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
    const previous = store[id] || {};
    const next = {
      status: main.querySelector("#module-status")?.value || "Neu",
      owner: main.querySelector("#module-owner")?.value || "",
      priority: main.querySelector("#module-priority")?.value || "Normal",
      due: main.querySelector("#module-due")?.value || "",
      expectedResponse: main.querySelector("#module-response")?.value || "",
      nextAction: main.querySelector("#module-next-action")?.value || "",
      notes: main.querySelector("#module-notes")?.value || "",
      checks: [...main.querySelectorAll(".module-check")].map(input => input.checked),
      updatedAt: new Date().toISOString(),
    };
    store[id] = next;
    writeStore(store);
    audit("Arbeitsbereich gespeichert", {
      objectId: id,
      previousStatus: previous.status || "",
      newStatus: next.status,
      owner: next.owner,
      due: next.due,
      expectedResponse: next.expectedResponse,
      nextAction: next.nextAction,
    });
    showToast("Arbeitsstand gespeichert", "Angaben und Logbucheintrag wurden lokal gesichert.");
  }

  function returnToView(view) {
    const nav = document.querySelector(`.nav-item[data-view="${CSS.escape(view)}"]`);
    if (nav) nav.click();
  }

  function renderAuditLog() {
    const entries = readJson(auditKey, []);
    const rows = entries.length
      ? entries.map(entry => `
        <tr>
          <td>${esc(new Date(entry.timestamp).toLocaleString("de-DE"))}</td>
          <td><strong>${esc(entry.action)}</strong><small style="display:block">${esc(entry.objectId || entry.recordId || "")}</small></td>
          <td>${esc(entry.user || "")}</td>
          <td>${esc(entry.source || "App")}</td>
          <td>${esc(entry.newStatus || entry.type || "")}</td>
        </tr>`).join("")
      : `<tr><td colspan="5" class="muted">Noch keine protokollierten lokalen Vorgänge.</td></tr>`;

    main.innerHTML = `
      <section class="page" data-page="audit-local">
        <header class="page-header">
          <div><span class="eyebrow">DachWerk Pro · Release 0.3</span><h1>Logbuch</h1><p>Lokaler Audit-Trail der Testfassung.</p></div>
          <div class="header-actions"><button class="button button-secondary" data-fix-home>⌂ Übersicht</button></div>
        </header>
        <section class="panel">
          <div class="panel-head"><div><h2>Aktivitäten</h2><p>Neue Korrekturen werden als neue Einträge ergänzt.</p></div><span class="status-pill status-blue">${entries.length} Einträge</span></div>
          <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Zeit</th><th>Aktion</th><th>Benutzer</th><th>Quelle</th><th>Status/Typ</th></tr></thead><tbody>${rows}</tbody></table></div>
        </section>
      </section>`;
  }

  function renderOperatingCosts() {
    const saved = readJson(costKey, {});
    const fields = [
      ["personalkosten", "Personalkosten / Jahr €"],
      ["fahrzeuge", "Fahrzeuge / Jahr €"],
      ["miete", "Miete / Büro / Jahr €"],
      ["versicherung", "Versicherungen / Jahr €"],
      ["geraete", "Geräte / IT / Jahr €"],
      ["sonstige", "Sonstige Gemeinkosten / Jahr €"],
      ["produktiveStunden", "Produktive Stunden / Jahr"],
    ];
    main.innerHTML = `
      <section class="page" data-page="operating-costs-local">
        <header class="page-header">
          <div><span class="eyebrow">Kalkulationsbasis</span><h1>Betriebskosten · SKR03-Basis</h1><p>Lokale Vorstufe zur Ermittlung eines belastbaren Verrechnungslohns.</p></div>
          <div class="header-actions"><button class="button button-secondary" data-fix-back-settings>← Einstellungen</button><button class="button button-primary" data-fix-save-costs>Speichern</button></div>
        </header>
        <section class="panel panel-pad">
          <div class="quick-form">
            ${fields.map(([key, label]) => `<div><label>${esc(label)}</label><input class="cost-field" data-cost-key="${key}" type="number" step="0.01" value="${esc(saved[key] || "")}"></div>`).join("")}
          </div>
          <div class="panel panel-pad" style="margin-top:16px"><strong>Hinweis:</strong> Diese Maske ist eine lokale Rechenbasis. Feiertage, Krankheit, produktive Stunden, Lohnnebenkosten und Zuschläge werden im produktiven Kostenmodell getrennt nachvollziehbar gerechnet.</div>
        </section>
      </section>`;
  }

  function saveOperatingCosts() {
    const data = {};
    main.querySelectorAll("[data-cost-key]").forEach(input => { data[input.dataset.costKey] = Number(input.value || 0); });
    data.updatedAt = new Date().toISOString();
    writeJson(costKey, data);
    audit("Betriebskosten gespeichert", { objectId: "SKR03-Basis" });
    showToast("Betriebskosten gespeichert", "Die lokale Kalkulationsbasis wurde aktualisiert.");
  }

  function exportVisibleTable() {
    const table = main.querySelector("table");
    if (!table) {
      showToast("Kein Export", "Auf dieser Seite ist keine Tabelle zum Exportieren vorhanden.");
      return;
    }
    const lines = [...table.querySelectorAll("tr")].map(row => [...row.children].map(cell => `"${cell.innerText.replaceAll('"', '""').replaceAll("\n", " ").trim()}"`).join(";"));
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DachWerk-Pro-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    audit("Tabellenexport erstellt", { objectId: document.querySelector(".page h1")?.textContent || "Tabelle" }, "Export");
    showToast("CSV exportiert", "Die sichtbare Tabelle wurde als CSV ausgegeben.");
  }

  function handleEnhancedAction(action, event) {
    if (action === "activity") {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderAuditLog();
      return true;
    }
    if (action === "operating-costs") {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderOperatingCosts();
      return true;
    }
    if (action === "export") {
      event.preventDefault();
      event.stopImmediatePropagation();
      exportVisibleTable();
      return true;
    }
    if (action === "report") {
      event.preventDefault();
      event.stopImmediatePropagation();
      audit("Druck-/PDF-Ausgabe gestartet", { objectId: document.querySelector(".page h1")?.textContent || "Seite" }, "Export");
      window.print();
      return true;
    }
    return false;
  }

  main.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton && handleEnhancedAction(actionButton.dataset.action, event)) return;

    const openButton = event.target.closest('[data-action="open-module"]');
    if (openButton) {
      const ctx = getModuleContext(openButton);
      if (!ctx) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      renderWorkspace(ctx);
      audit("Modul geöffnet", { objectId: ctx.id });
      return;
    }

    if (event.target.closest("[data-fix-save]")) {
      event.preventDefault();
      saveCurrentWorkspace();
      return;
    }

    if (event.target.closest("[data-fix-audit]")) {
      event.preventDefault();
      renderAuditLog();
      return;
    }

    if (event.target.closest("[data-fix-save-costs]")) {
      event.preventDefault();
      saveOperatingCosts();
      return;
    }

    if (event.target.closest("[data-fix-back-settings]")) {
      event.preventDefault();
      returnToView("settings");
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

  const quickForm = document.querySelector("#quick-form");
  if (quickForm) {
    quickForm.addEventListener("submit", () => {
      const records = readJson(recordKey, []);
      const record = {
        id: document.querySelector("#record-number")?.value || `R-${Date.now()}`,
        type: document.querySelector("#record-type")?.value || "Datensatz",
        name: document.querySelector("#record-name")?.value || "",
        contact: document.querySelector("#record-contact")?.value || "",
        location: document.querySelector("#record-location")?.value || "",
        createdAt: new Date().toISOString(),
        createdBy: currentUser(),
      };
      records.unshift(record);
      writeJson(recordKey, records.slice(0, 1000));
      audit("Datensatz angelegt", { recordId: record.id, type: record.type });
    }, true);
  }

  audit("Anwendung geöffnet", { objectId: "DachWerk Pro Release 0.3 Test" });
})();