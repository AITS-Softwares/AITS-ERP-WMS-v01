import { getWmsMasterRecords, resolveWmsErpnextContext } from "@/services/integrations/erpnext/wms/masterDataService";
import { getERPNextDoc, insertAndSubmitERPNextDoc } from "@/services/integrations/erpnext/wms/wmsDocumentHelpers";
import { getPhysicalLocation } from "@/services/integrations/erpnext/wms/physicalLocationService";

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

export async function listPurchaseReceipts(companyId, options = {}) {
  return getWmsMasterRecords(companyId, "purchase-receipts", options);
}

export async function getPurchaseReceipt(companyId, name) {
  if (!text(name)) throw badRequest("Purchase Receipt name is required");
  const { config } = await resolveWmsErpnextContext(companyId);
  const doc = await getERPNextDoc(config, "Purchase Receipt", name);
  if (!doc) throw badRequest("Purchase Receipt was not found in ERPNext");
  return doc;
}

export async function createPurchaseReceipt(companyId, input = {}) {
  const poName = text(input.purchaseOrder);
  if (!poName) throw badRequest("Select the Purchase Order to receive against");

  const { config } = await resolveWmsErpnextContext(companyId);
  const po = await getERPNextDoc(config, "Purchase Order", poName);
  if (!po) throw badRequest("Purchase Order was not found in ERPNext");
  if (Number(po.docstatus) !== 1) throw badRequest("Only a submitted Purchase Order can be received against");
  if (["Completed", "Closed", "Cancelled"].includes(text(po.status))) throw badRequest(`This Purchase Order is ${po.status} and cannot receive more stock`);

  const poItemsByName = new Map((po.items || []).map((row) => [row.name, row]));
  const headerLocation = text(input.physicalLocation) ? await getPhysicalLocation(config, input.physicalLocation) : null;
  const headerWarehouse = headerLocation?.warehouse || text(po.set_warehouse);

  const lines = Array.isArray(input.lines) ? input.lines : [];
  const items = (await Promise.all(lines
    .map(async (line) => {
      const poRow = poItemsByName.get(text(line.poItemName));
      if (!poRow) return null;
      const receivedQty = number(line.receivedQty);
      if (receivedQty <= 0) return null;
      const location = text(line.physicalLocation) ? await getPhysicalLocation(config, line.physicalLocation) : headerLocation;
      if (!location) throw badRequest(`Select a rack, shelf, and bin location for ${poRow.item_code}.`);
      return {
        item_code: poRow.item_code,
        item_name: poRow.item_name,
        qty: receivedQty,
        rejected_qty: Math.max(0, number(line.rejectedQty)),
        uom: poRow.uom,
        rate: number(poRow.rate),
        ...location,
        batch_no: text(line.batchNo) || undefined,
        purchase_order: po.name,
        purchase_order_item: poRow.name,
      };
    }))).filter(Boolean);

  if (!items.length) throw badRequest("Enter a received quantity greater than zero for at least one item");
  if (items.some((line) => !line.warehouse)) throw badRequest("A receiving warehouse is required for every line");

  const payload = {
    doctype: "Purchase Receipt",
    supplier: po.supplier,
    company: po.company,
    posting_date: today(),
    set_warehouse: headerWarehouse || undefined,
    items,
  };

  return insertAndSubmitERPNextDoc(config, "Purchase Receipt", payload);
}
