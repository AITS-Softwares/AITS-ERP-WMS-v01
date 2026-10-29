import { resolveWmsErpnextContext } from "@/services/integrations/erpnext/wms/masterDataService";
import { erpnextRequestWithConfig } from "@/services/integrations/erpnext/erpnextClient";
import { getERPNextDoc } from "@/services/integrations/erpnext/wms/wmsDocumentHelpers";
import { listPhysicalLocations } from "@/services/integrations/erpnext/wms/physicalLocationService";
import { customReports } from "@/lib/wmsCustomReports";

function invalid(message) { const error = new Error(message); error.status = 400; return error; }

async function list(config, doctype, fields, filters, limit, orderBy = "name asc") {
  const rows = [];
  while (rows.length <= limit) {
    const size = Math.min(100, limit + 1 - rows.length);
    const query = new URLSearchParams({ fields: JSON.stringify(fields), filters: JSON.stringify(filters), limit_start: String(rows.length), limit_page_length: String(size), order_by: orderBy });
    const payload = await erpnextRequestWithConfig(config, `/api/resource/${encodeURIComponent(doctype)}?${query}`, { method: "GET" });
    const page = payload?.data;
    if (!Array.isArray(page)) throw new Error(`ERPNext returned invalid ${doctype} report data.`);
    rows.push(...page);
    if (page.length < size || rows.length > limit) break;
  }
  return { rows: rows.slice(0, limit), truncated: rows.length > limit };
}

export async function runCustomReport(companyId, { type, from = "", to = "" }) {
  const definition = customReports.find((report) => report.id === type);
  if (!definition) throw invalid("Select a valid custom report.");
  if (type === "stock-out") {
    const validDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
    if (!validDate(from) || !validDate(to) || from > to) throw invalid("Enter a valid start and end date in order.");
  }
  let rows, note = "", truncated = false;
  if (type === "locations") {
    rows = await listPhysicalLocations(companyId);
    note = "Configured capacity is a location setting, not measured occupancy. Source location and warehouse lists are limited to 1,000 records each.";
  } else {
    const { config } = await resolveWmsErpnextContext(companyId);
    if (type === "stock") {
      const result = await list(config, "Bin", ["name", "item_code", "warehouse", "stock_uom", "actual_qty", "reserved_qty", "projected_qty"], [], 5000);
      rows = result.rows; truncated = result.truncated;
      note = "Quantities are in each item's stock UOM. These are warehouse balances; quantities are not allocated to racks, shelves or physical bins.";
    } else {
      const result = await list(config, "Delivery Note", ["name"], [["docstatus", "=", 1], ["posting_date", ">=", from], ["posting_date", "<=", to]], 200, "posting_date desc, name desc");
      truncated = result.truncated;
      rows = [];
      for (let index = 0; index < result.rows.length; index += 5) {
        const documents = await Promise.all(result.rows.slice(index, index + 5).map((row) => getERPNextDoc(config, "Delivery Note", row.name)));
        for (const doc of documents) {
          if (!doc || Number(doc.docstatus) !== 1) continue;
          for (const item of doc.items || []) rows.push({ posting_date: doc.posting_date, document: doc.name, customer: doc.customer_name || doc.customer, item_code: item.item_code, warehouse: item.warehouse, rack: item.custom_rack, shelf: item.custom_shelf, bin: item.custom_bin, qty: item.qty, uom: item.uom, stock_qty: item.stock_qty, stock_uom: item.stock_uom, movement: doc.is_return ? "Return" : "Stock out" });
        }
      }
      note = "Submitted Delivery Notes only. Returns retain their signed quantities. Blank locations were not recorded on the source document.";
    }
  }
  return { type, rows, note, truncated, limit: type === "stock" ? 5000 : type === "stock-out" ? 200 : 1000, generatedAt: new Date().toISOString() };
}
