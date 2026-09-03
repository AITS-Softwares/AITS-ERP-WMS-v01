import { resolveWmsErpnextContext } from "@/services/integrations/erpnext/wms/masterDataService";
import { resolveERPNextTransactionCompany } from "@/services/integrations/erpnext/distributorAppService";
import { erpnextRequestWithConfig } from "@/services/integrations/erpnext/erpnextClient";
import { getERPNextDoc, insertERPNextDoc, submitERPNextDoc } from "@/services/integrations/erpnext/wms/wmsDocumentHelpers";

const OPEN_PO_FIELDS = ["name", "supplier", "supplier_name", "transaction_date", "schedule_date", "set_warehouse", "status", "per_received", "currency"];

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function text(value) {
  return String(value ?? "").trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeLines(lines) {
  if (!Array.isArray(lines)) return [];
  return lines
    .map((line) => ({
      item_code: text(line.itemCode || line.item_code),
      qty: number(line.qty),
      uom: text(line.uom),
      rate: number(line.rate),
      schedule_date: text(line.scheduleDate || line.schedule_date),
      warehouse: text(line.warehouse),
    }))
    .filter((line) => line.item_code && line.qty > 0);
}

export async function listOpenPurchaseOrders(companyId) {
  const { config } = await resolveWmsErpnextContext(companyId);
  const params = new URLSearchParams({
    fields: JSON.stringify(OPEN_PO_FIELDS),
    filters: JSON.stringify([
      ["Purchase Order", "docstatus", "=", 1],
      ["Purchase Order", "status", "in", ["To Receive and Bill", "To Receive"]],
    ]),
    order_by: "transaction_date desc",
    limit_page_length: "100",
  });
  const response = await erpnextRequestWithConfig(config, `/api/resource/Purchase Order?${params.toString()}`, { method: "GET" });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function getPurchaseOrder(companyId, name) {
  if (!text(name)) throw badRequest("Purchase Order name is required");
  const { config } = await resolveWmsErpnextContext(companyId);
  const doc = await getERPNextDoc(config, "Purchase Order", name);
  if (!doc) throw badRequest("Purchase Order was not found in ERPNext");
  return doc;
}

export async function submitPurchaseOrder(companyId, name) {
  const { config } = await resolveWmsErpnextContext(companyId);
  const doc = await getERPNextDoc(config, "Purchase Order", name);
  if (!doc) throw badRequest("Purchase Order was not found in ERPNext");
  if (Number(doc.docstatus) !== 0) throw badRequest("Only a draft Purchase Order can be submitted");
  return submitERPNextDoc(config, doc);
}

export async function createPurchaseOrder(companyId, input = {}, { submit = false } = {}) {
  const supplier = text(input.supplier);
  if (!supplier) throw badRequest("Supplier is required");

  const scheduleDate = text(input.scheduleDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate)) throw badRequest("Required-by date is required");
  if (scheduleDate < today()) throw badRequest("Required-by date cannot be earlier than today");

  const items = normalizeLines(input.lines).map((line) => ({
    ...line,
    schedule_date: line.schedule_date || scheduleDate,
    warehouse: line.warehouse || text(input.warehouse),
  }));
  if (!items.length) throw badRequest("At least one item with a quantity greater than zero is required");
  if (items.some((line) => line.rate < 0)) throw badRequest("Rate cannot be negative");

  const { config } = await resolveWmsErpnextContext(companyId);
  // An explicit Company from the form wins — required on multi-company ERPNext
  // sites. Falls back to the distributor module's resolver (env var / user
  // default / the-only-company) so single-company sites need zero extra input.
  const explicitCompany = text(input.company);
  const company = explicitCompany || await resolveERPNextTransactionCompany(config, {}).catch((error) => {
    error.message = String(error.message || "").replace(/Sales Orders?/gi, "Purchase Orders");
    throw error;
  });

  const payload = {
    doctype: "Purchase Order",
    supplier,
    company,
    transaction_date: today(),
    schedule_date: scheduleDate,
    items,
  };
  const warehouse = text(input.warehouse);
  if (warehouse) payload.set_warehouse = warehouse;

  const draft = await insertERPNextDoc(config, "Purchase Order", payload);
  if (!draft?.name) throw new Error("ERPNext did not return a saved Purchase Order");
  if (!submit) return draft;
  return submitERPNextDoc(config, draft);
}
