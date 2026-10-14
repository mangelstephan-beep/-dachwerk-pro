"use strict";

// Fachmodell für Modul 37 und 38. Keine produktive Freigabe ohne Backend- und UI-Tests.
const DOCUMENT_TYPES = Object.freeze(["Bestellung", "Angebot", "Brief", "Rechnung", "Gutachten", "Sonstiges"]);
function clean(value, max = 240) { return String(value ?? "").trim().slice(0, max); }
function validateDocument(input) {
  if (!input || typeof input !== "object") throw new TypeError("Dokument fehlt");
  const document = {
    id: clean(input.id, 100), organizationId: clean(input.organizationId, 100),
    projectId: clean(input.projectId, 100), date: clean(input.date, 10),
    type: clean(input.type, 40), reference: clean(input.reference),
    description: clean(input.description, 600), fileId: clean(input.fileId, 200),
    createdBy: clean(input.createdBy, 100)
  };
  if (!document.id || !document.organizationId || !document.fileId || !document.createdBy)
    throw new Error("Dokument benötigt ID, Mandant, Datei und Ersteller");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(document.date) || !Number.isFinite(Date.parse(document.date)))
    throw new Error("Datum muss ISO-Format YYYY-MM-DD haben");
  if (!DOCUMENT_TYPES.includes(document.type)) throw new Error("Unbekannter Dokumententyp");
  return document;
}
function listDocuments(items, { organizationId, projectId, search = "", type = "" } = {}) {
  if (!organizationId) throw new Error("Mandant erforderlich");
  const needle = clean(search).toLocaleLowerCase("de");
  return items.filter(item => item.organizationId === organizationId)
    .filter(item => !projectId || item.projectId === projectId)
    .filter(item => !type || item.type === type)
    .filter(item => !needle || [item.reference, item.description, item.type, item.date].some(v =>
      String(v ?? "").toLocaleLowerCase("de").includes(needle)))
    .sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}
function validateStationery(input) {
  if (!input || typeof input !== "object") throw new TypeError("Briefpapier fehlt");
  const stationery = {
    organizationId: clean(input.organizationId, 100), userId: clean(input.userId, 100),
    firstPageFileId: clean(input.firstPageFileId, 200),
    followingPageFileId: clean(input.followingPageFileId, 200),
    revision: Number(input.revision || 1)
  };
  if (!stationery.organizationId || !stationery.userId || !stationery.firstPageFileId)
    throw new Error("Briefpapier benötigt Mandant, Nutzer und erste Seite");
  if (!Number.isInteger(stationery.revision) || stationery.revision < 1)
    throw new Error("Ungültige Vorlagenversion");
  return stationery;
}
function stationeryForPage(stationery, pageNumber) {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) throw new Error("Ungültige Seitennummer");
  return pageNumber === 1 ? stationery.firstPageFileId :
    stationery.followingPageFileId || stationery.firstPageFileId;
}
module.exports = { DOCUMENT_TYPES, validateDocument, listDocuments, validateStationery, stationeryForPage };
