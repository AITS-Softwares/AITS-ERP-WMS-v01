import { erpnextRequestWithConfig } from "@/services/integrations/erpnext/erpnextClient";

function query(fields, filters) {
  return new URLSearchParams({ fields: JSON.stringify(fields), filters: JSON.stringify(filters), limit_page_length: "1" }).toString();
}

// ERPNext's standard Bin doctype stores calculated item balances per Warehouse.
export async function getWarehouseAvailableQty(config, warehouse, itemCode) {
  const filters = [["Bin", "warehouse", "=", warehouse], ["Bin", "item_code", "=", itemCode]];
  const payload = await erpnextRequestWithConfig(config, `/api/resource/Bin?${query(["actual_qty", "reserved_qty"], filters)}`, { method: "GET" });
  const row = Array.isArray(payload?.data) ? payload.data[0] : null;
  return { actualQty: Number(row?.actual_qty || 0), reservedQty: Number(row?.reserved_qty || 0) };
}
