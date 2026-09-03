import { resolveWmsErpnextContext } from "@/services/integrations/erpnext/wms/masterDataService";
import { erpnextRequestWithConfig } from "@/services/integrations/erpnext/erpnextClient";
import { getERPNextDoc, insertERPNextDoc } from "@/services/integrations/erpnext/wms/wmsDocumentHelpers";

export const MASTER_CARTON_UOM = "Master Carton";

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

async function updateERPNextDoc(config, doctype, name, body) {
  const payload = await erpnextRequestWithConfig(config, `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { method: "PUT", body });
  return payload?.data || null;
}

async function ensureMasterCartonUom(config) {
  const existing = await getERPNextDoc(config, "UOM", MASTER_CARTON_UOM).catch(() => null);
  if (existing) return existing;
  // UOM autonames from `uom_name` on newer ERPNext and from a prompted `name`
  // on older sites — send both so the created doc is named "Master Carton" either way.
  return insertERPNextDoc(config, "UOM", { doctype: "UOM", name: MASTER_CARTON_UOM, uom_name: MASTER_CARTON_UOM, must_be_whole_number: 1 });
}

export async function getItemCartonSetup(companyId, itemCode) {
  const code = text(itemCode);
  if (!code) throw badRequest("Item code is required");
  const { config } = await resolveWmsErpnextContext(companyId);
  const doc = await getERPNextDoc(config, "Item", code);
  if (!doc) throw badRequest("Item was not found in ERPNext");

  const cartonRow = (doc.uoms || []).find((row) => row.uom === MASTER_CARTON_UOM);
  return {
    itemCode: doc.item_code,
    itemName: doc.item_name,
    stockUom: doc.stock_uom,
    cartonConversionFactor: cartonRow ? number(cartonRow.conversion_factor) : null,
    uoms: (doc.uoms || []).map((row) => ({ uom: row.uom, conversionFactor: number(row.conversion_factor) })),
    barcodes: (doc.barcodes || []).map((row) => ({ barcode: row.barcode, uom: row.uom || doc.stock_uom })),
  };
}

export async function setItemCartonConversion(companyId, itemCode, conversionFactor) {
  const code = text(itemCode);
  if (!code) throw badRequest("Item code is required");
  const factor = number(conversionFactor);
  if (!(factor > 0)) throw badRequest("Master Carton conversion factor must be greater than zero");

  const { config } = await resolveWmsErpnextContext(companyId);
  await ensureMasterCartonUom(config);
  const doc = await getERPNextDoc(config, "Item", code);
  if (!doc) throw badRequest("Item was not found in ERPNext");

  const uoms = [...(doc.uoms || [])];
  const existingIndex = uoms.findIndex((row) => row.uom === MASTER_CARTON_UOM);
  if (existingIndex >= 0) uoms[existingIndex] = { ...uoms[existingIndex], conversion_factor: factor };
  else uoms.push({ uom: MASTER_CARTON_UOM, conversion_factor: factor });

  await updateERPNextDoc(config, "Item", code, { uoms });
  return getItemCartonSetup(companyId, code);
}

function buildBarcodeValue(itemCode, uom) {
  const slug = `${itemCode}-${uom}`.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return slug.slice(0, 40);
}

export async function generateItemBarcode(companyId, itemCode, uom) {
  const code = text(itemCode);
  const targetUom = text(uom) || MASTER_CARTON_UOM;
  if (!code) throw badRequest("Item code is required");

  const { config } = await resolveWmsErpnextContext(companyId);
  const doc = await getERPNextDoc(config, "Item", code);
  if (!doc) throw badRequest("Item was not found in ERPNext");
  if (targetUom !== doc.stock_uom && !(doc.uoms || []).some((row) => row.uom === targetUom)) {
    throw badRequest(`${targetUom} is not a registered UOM for this item yet — set its conversion factor first`);
  }

  const barcodes = [...(doc.barcodes || [])];
  const existing = barcodes.find((row) => row.uom === targetUom);
  if (existing?.barcode) return { itemCode: doc.item_code, uom: targetUom, barcode: existing.barcode, created: false };

  const barcodeValue = buildBarcodeValue(doc.item_code, targetUom);
  barcodes.push({ barcode: barcodeValue, uom: targetUom });
  await updateERPNextDoc(config, "Item", code, { barcodes });
  return { itemCode: doc.item_code, uom: targetUom, barcode: barcodeValue, created: true };
}

export async function resolveWmsBarcode(companyId, barcodeValue) {
  const code = text(barcodeValue);
  if (!code) throw badRequest("Barcode value is required");

  const { config } = await resolveWmsErpnextContext(companyId);
  const params = new URLSearchParams({
    fields: JSON.stringify(["name"]),
    filters: JSON.stringify([["Item Barcode", "barcode", "=", code]]),
    limit_page_length: "1",
  });
  const response = await erpnextRequestWithConfig(config, `/api/resource/Item?${params.toString()}`, { method: "GET" });
  const match = Array.isArray(response?.data) ? response.data[0] : null;
  if (!match?.name) throw badRequest(`No item is registered against barcode ${code}`);

  const doc = await getERPNextDoc(config, "Item", match.name);
  const barcodeRow = (doc.barcodes || []).find((row) => row.barcode === code);
  const uom = barcodeRow?.uom || doc.stock_uom;
  const conversionRow = (doc.uoms || []).find((row) => row.uom === uom);

  return {
    itemCode: doc.item_code,
    itemName: doc.item_name,
    stockUom: doc.stock_uom,
    uom,
    conversionFactor: conversionRow ? number(conversionRow.conversion_factor, 1) : 1,
    barcode: code,
  };
}
