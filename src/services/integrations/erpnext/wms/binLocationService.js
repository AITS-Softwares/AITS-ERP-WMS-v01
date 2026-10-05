import { erpnextRequestWithConfig } from "@/services/integrations/erpnext/erpnextClient";
import { insertERPNextDoc } from "@/services/integrations/erpnext/wms/wmsDocumentHelpers";
import { resolveWmsErpnextContext } from "@/services/integrations/erpnext/wms/masterDataService";

const text = (value) => String(value ?? "").trim();

function query(fields, filters) {
  return new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: "1000",
    order_by: "warehouse_name asc",
  }).toString();
}

// ERPNext's Bin doctype is a calculated balance. A physical WMS bin is
// represented by a leaf Warehouse below its store/warehouse parent.
export async function listBinLocations(companyId, { company = "" } = {}) {
  const { config } = await resolveWmsErpnextContext(companyId);
  const warehouseFilters = [["Warehouse", "disabled", "=", 0], ["Warehouse", "is_group", "=", 0]];
  if (text(company)) warehouseFilters.push(["Warehouse", "company", "=", text(company)]);
  const warehousePayload = await erpnextRequestWithConfig(config, `/api/resource/Warehouse?${query(["name", "warehouse_name", "parent_warehouse", "company"], warehouseFilters)}`, { method: "GET" });
  const locations = Array.isArray(warehousePayload?.data) ? warehousePayload.data : [];
  if (!locations.length) return [];
  const names = locations.map((location) => location.name);
  const stockPayload = await erpnextRequestWithConfig(config, `/api/resource/Bin?${query(["item_code", "warehouse", "actual_qty", "reserved_qty", "projected_qty"], [["Bin", "warehouse", "in", names]])}`, { method: "GET" });
  const stock = Array.isArray(stockPayload?.data) ? stockPayload.data : [];
  const totals = new Map();
  stock.forEach((row) => {
    const current = totals.get(row.warehouse) || { actualQty: 0, reservedQty: 0, projectedQty: 0, itemCount: 0 };
    current.actualQty += Number(row.actual_qty || 0);
    current.reservedQty += Number(row.reserved_qty || 0);
    current.projectedQty += Number(row.projected_qty || 0);
    current.itemCount += 1;
    totals.set(row.warehouse, current);
  });
  return locations.map((location) => ({ ...location, ...(totals.get(location.name) || { actualQty: 0, reservedQty: 0, projectedQty: 0, itemCount: 0 }) }));
}

export async function createBinLocation(companyId, input = {}) {
  const warehouseName = text(input.warehouseName);
  const parentWarehouse = text(input.parentWarehouse);
  const company = text(input.company);
  if (!warehouseName || !parentWarehouse || !company) {
    const error = new Error("Bin name, parent store, and company are required."); error.status = 400; throw error;
  }
  const { config } = await resolveWmsErpnextContext(companyId);
  return insertERPNextDoc(config, "Warehouse", { doctype: "Warehouse", warehouse_name: warehouseName, parent_warehouse: parentWarehouse, company, is_group: input.isGroup ? 1 : 0 });
}

export async function getBinAvailableQty(config, warehouse, itemCode) {
  const filters = [["Bin", "warehouse", "=", warehouse], ["Bin", "item_code", "=", itemCode]];
  const payload = await erpnextRequestWithConfig(config, `/api/resource/Bin?${query(["actual_qty", "reserved_qty"], filters)}`, { method: "GET" });
  const row = Array.isArray(payload?.data) ? payload.data[0] : null;
  return { actualQty: Number(row?.actual_qty || 0), reservedQty: Number(row?.reserved_qty || 0) };
}
