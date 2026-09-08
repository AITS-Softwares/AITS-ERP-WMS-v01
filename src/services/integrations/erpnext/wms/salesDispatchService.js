import { resolveWmsErpnextContext } from "@/services/integrations/erpnext/wms/masterDataService";
import { getERPNextDoc, insertAndSubmitERPNextDoc, submitERPNextDoc } from "@/services/integrations/erpnext/wms/wmsDocumentHelpers";

function badRequest(message) { const error = new Error(message); error.status = 400; return error; }
function text(value) { return String(value ?? "").trim(); }
function number(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function today() { return new Date().toISOString().slice(0, 10); }

export async function getSalesOrderForDispatch(companyId, name) {
  const salesOrder = text(name);
  if (!salesOrder) throw badRequest("Sales Order is required");
  const { config } = await resolveWmsErpnextContext(companyId);
  const doc = await getERPNextDoc(config, "Sales Order", salesOrder);
  if (!doc) throw badRequest("Sales Order was not found in ERPNext");
  return doc;
}

export async function submitSalesOrderForDispatch(companyId, name) {
  const salesOrder = await getSalesOrderForDispatch(companyId, name);
  if (Number(salesOrder.docstatus) !== 0) {
    throw badRequest(`Sales Order ${salesOrder.name} is already submitted or cannot be submitted.`);
  }
  if (!text(salesOrder.customer)) throw badRequest("ERPNext requires a customer before submitting this Sales Order.");
  if (!(salesOrder.items || []).length) throw badRequest("ERPNext requires at least one item before submitting this Sales Order.");
  if ((salesOrder.items || []).some((item) => !text(item.item_code) || number(item.qty) <= 0)) {
    throw badRequest("Every Sales Order item must have an item code and a quantity greater than zero.");
  }
  const { config } = await resolveWmsErpnextContext(companyId);
  // ERPNext performs the final accounting, pricing, tax, credit-limit, and
  // stock validations. Nothing is submitted if any of those checks fail.
  return submitERPNextDoc(config, salesOrder);
}

export async function createSalesStockOut(companyId, input = {}) {
  const salesOrder = await getSalesOrderForDispatch(companyId, input.salesOrder);
  if (Number(salesOrder.docstatus) !== 1) throw badRequest("Submit the Sales Order in ERPNext before creating a Stock Out delivery.");
  if (["Completed", "Closed", "Cancelled"].includes(text(salesOrder.status))) throw badRequest(`Sales Order ${salesOrder.name} is ${salesOrder.status} and cannot be dispatched.`);

  const sourceLines = new Map((salesOrder.items || []).map((row) => [row.name, row]));
  const items = (Array.isArray(input.lines) ? input.lines : []).map((line) => {
    const source = sourceLines.get(text(line.salesOrderItem));
    if (!source) return null;
    const qty = number(line.qty);
    if (qty <= 0) return null;
    const remainingQty = Math.max(0, number(source.qty) - number(source.delivered_qty));
    if (qty > remainingQty) throw badRequest(`${source.item_code} can dispatch only ${remainingQty} more ${source.uom || source.stock_uom || "units"}.`);
    const warehouse = text(line.warehouse) || text(source.warehouse) || text(salesOrder.set_warehouse);
    if (!warehouse) throw badRequest(`A source warehouse is required for ${source.item_code}.`);
    return { item_code: source.item_code, item_name: source.item_name, qty, uom: source.uom || source.stock_uom, stock_uom: source.stock_uom || source.uom, conversion_factor: number(source.conversion_factor, 1) || 1, rate: number(source.rate), warehouse, sales_order: salesOrder.name, against_sales_order: salesOrder.name, so_detail: source.name };
  }).filter(Boolean);
  if (!items.length) throw badRequest("Select at least one item and enter a Stock Out quantity.");

  const { config } = await resolveWmsErpnextContext(companyId);
  return insertAndSubmitERPNextDoc(config, "Delivery Note", { doctype: "Delivery Note", customer: salesOrder.customer, company: salesOrder.company, posting_date: today(), set_warehouse: text(salesOrder.set_warehouse) || undefined, items });
}
