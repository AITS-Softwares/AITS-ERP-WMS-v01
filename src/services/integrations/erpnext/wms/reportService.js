import { resolveWmsErpnextContext } from "@/services/integrations/erpnext/wms/masterDataService";
import { erpnextRequestWithConfig } from "@/services/integrations/erpnext/erpnextClient";

function text(value) { return String(value ?? "").trim(); }

// These are finance, sales-partner, quality, maintenance, and stock-entry
// action reports. They do not belong in the warehouse-report selector.
const EXCLUDED_REPORT_NAMES = [
  "maintenance schedule",
  "requested item",
  "stock entry",
  "quality action",
  "sales partner commission",
  "sales invoice",
  "trial balance",
  "general ledger",
  "gl entry",
];

export async function listStandardErpnextReports(companyId) {
  const { config } = await resolveWmsErpnextContext(companyId);
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "report_name", "ref_doctype", "report_type", "is_standard", "disabled"]),
    filters: JSON.stringify([["Report", "is_standard", "=", "Yes"], ["Report", "disabled", "=", 0]]),
    order_by: "report_name asc",
    limit_page_length: "500",
  });
  const response = await erpnextRequestWithConfig(config, `/api/resource/Report?${params}`, { method: "GET" });
  return (response?.data || []).filter((report) => {
    const reportName = text(report.report_name || report.name).toLowerCase();
    return text(report.report_type) === "Query Report" && !EXCLUDED_REPORT_NAMES.some((name) => reportName.includes(name));
  });
}

export async function runStandardErpnextReport(companyId, reportName) {
  const name = text(reportName);
  if (!name) throw new Error("Select an ERPNext report first.");
  const { config } = await resolveWmsErpnextContext(companyId);
  const response = await erpnextRequestWithConfig(config, "/api/method/frappe.desk.query_report.run", {
    method: "POST",
    body: { report_name: name, filters: {} },
  });
  const data = response?.message || response || {};
  return { columns: Array.isArray(data.columns) ? data.columns : [], rows: Array.isArray(data.result) ? data.result : [] };
}
