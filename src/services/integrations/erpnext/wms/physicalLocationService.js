import { erpnextRequestWithConfig } from "@/services/integrations/erpnext/erpnextClient";
import { getERPNextDoc } from "@/services/integrations/erpnext/wms/wmsDocumentHelpers";
import { resolveWmsErpnextContext } from "@/services/integrations/erpnext/wms/masterDataService";

const text = (value) => String(value ?? "").trim();
const query = (fields, filters) => new URLSearchParams({ fields: JSON.stringify(fields), filters: JSON.stringify(filters), limit_page_length: "1000" }).toString();
function badRequest(message) { const error = new Error(message); error.status = 400; return error; }

export async function listPhysicalLocations(companyId, company = "") {
  const { config } = await resolveWmsErpnextContext(companyId);
  const locationPayload = await erpnextRequestWithConfig(config, `/api/resource/Bin%20Master%20Location?${query(["name", "location", "warehouse"], [])}`, { method: "GET" });
  const locations = Array.isArray(locationPayload?.data) ? locationPayload.data : [];
  if (!locations.length) return [];
  const warehousePayload = await erpnextRequestWithConfig(config, `/api/resource/Warehouse?${query(["name", "warehouse_name", "company"], [["Warehouse", "name", "in", locations.map((row) => row.warehouse)]])}`, { method: "GET" });
  const warehouses = new Map((warehousePayload?.data || []).map((row) => [row.name, row]));
  const selected = locations.filter((row) => !company || warehouses.get(row.warehouse)?.company === company);
  if (!selected.length) return [];
  const documents = await Promise.all(selected.map((row) => getERPNextDoc(config, "Bin Master Location", row.name)));
  const pathPayload = { data: documents.flatMap((document) => (document?.physical_locations || []).map((row) => ({ ...row, parent: document.name }))) };
  const parents = new Map(selected.map((row) => [row.name, row]));
  return (pathPayload?.data || []).map((row) => { const parent = parents.get(row.parent); const warehouse = warehouses.get(parent?.warehouse); return { ...row, warehouse: parent?.warehouse, warehouseName: warehouse?.warehouse_name || parent?.warehouse, location: parent?.location, label: [parent?.location, row.rack, row.shelf, row.bin].filter(Boolean).join(" / ") }; });
}

export async function getPhysicalLocation(config, name) {
  const path = await getERPNextDoc(config, "Bin Physical Location", text(name));
  if (!path?.parent) throw badRequest("Select a valid physical bin location.");
  const parent = await getERPNextDoc(config, "Bin Master Location", path.parent).catch(() => null);
  if (!parent) throw badRequest("The selected physical location no longer exists.");
  return { warehouse: parent.warehouse, custom_physical_location: parent.name, custom_rack: path.rack, custom_shelf: path.shelf, custom_bin: path.bin };
}
