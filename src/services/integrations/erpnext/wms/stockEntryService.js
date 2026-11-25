import { resolveWmsErpnextContext } from "@/services/integrations/erpnext/wms/masterDataService";
import { insertAndSubmitERPNextDoc } from "@/services/integrations/erpnext/wms/wmsDocumentHelpers";

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function text(value) { return String(value ?? "").trim(); }

export async function createMaterialReceiptStockEntry(companyId, input = {}) {
  const itemCode = text(input.itemCode);
  const warehouse = text(input.warehouse);
  const company = text(input.company);
  const qty = Number(input.qty);
  if (!itemCode) throw badRequest("Scan a barcode and select an item first.");
  if (!warehouse) throw badRequest("Select the receiving warehouse.");
  if (!company) throw badRequest("Select the ERPNext company.");
  if (!Number.isFinite(qty) || qty <= 0) throw badRequest("Enter a quantity greater than zero.");

  const { config } = await resolveWmsErpnextContext(companyId);
  const payload = {
    doctype: "Stock Entry",
    stock_entry_type: "Material Receipt",
    purpose: "Material Receipt",
    company,
    posting_date: text(input.postingDate) || new Date().toISOString().slice(0, 10),
    remarks: text(input.remarks) || undefined,
    items: [{ item_code: itemCode, qty, t_warehouse: warehouse }],
  };
  return insertAndSubmitERPNextDoc(config, "Stock Entry", payload);
}
