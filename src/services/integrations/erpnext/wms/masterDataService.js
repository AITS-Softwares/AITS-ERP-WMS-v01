import dbConnect from "@/lib/db";
import { buildERPNextConfig, resolveERPNextConnection } from "@/services/integrations/erpnext/connectionService";
import { erpnextRequestWithConfig } from "@/services/integrations/erpnext/erpnextClient";

const RESOURCE_DEFINITIONS = {
  items: {
    doctype: "Item",
    fields: ["name", "item_code", "item_name", "item_group", "custom_item_type", "stock_uom", "disabled", "is_stock_item", "has_batch_no", "has_serial_no", "modified"],
    orderBy: "modified desc",
    filters: [
      ["Item", "disabled", "=", 0],
      ["Item", "custom_item_type", "=", "Finished Goods"],
    ],
    searchFields: ["item_code", "item_name"],
  },
  warehouses: {
    doctype: "Warehouse",
    fields: ["name", "warehouse_name", "parent_warehouse", "company", "is_group", "disabled", "modified"],
    orderBy: "modified desc",
    filters: [["Warehouse", "disabled", "=", 0]],
    searchFields: ["warehouse_name", "name"],
  },
  uoms: {
    doctype: "UOM",
    fields: ["name", "must_be_whole_number", "modified"],
    orderBy: "name asc",
    searchFields: ["name"],
  },
  "purchase-orders": {
    doctype: "Purchase Order",
    fields: ["name", "supplier", "supplier_name", "transaction_date", "schedule_date", "set_warehouse", "status", "docstatus", "grand_total", "currency", "per_received", "modified"],
    orderBy: "modified desc",
    filters: [["Purchase Order", "docstatus", "!=", 2]],
    searchFields: ["name", "supplier", "supplier_name"],
  },
  "sales-orders": {
    doctype: "Sales Order",
    fields: ["name", "customer", "customer_name", "transaction_date", "delivery_date", "set_warehouse", "status", "docstatus", "grand_total", "currency", "per_delivered", "modified"],
    orderBy: "modified desc",
    // A Sales Dispatch starts from a Sales Order that still needs warehouse
    // action. Keep cancelled orders out and apply the requested ERPNext
    // statuses on the server, rather than exposing a UI filter.
    filters: [
      ["Sales Order", "docstatus", "!=", 2],
      ["Sales Order", "status", "in", ["Draft", "On Hold", "To Deliver", "To Deliver and Bill"]],
    ],
    searchFields: ["name", "customer", "customer_name"],
  },
  suppliers: {
    doctype: "Supplier",
    fields: ["name", "supplier_name", "supplier_group", "country", "disabled", "modified"],
    orderBy: "supplier_name asc",
    filters: [["Supplier", "disabled", "=", 0]],
    searchFields: ["name", "supplier_name"],
  },
  "purchase-receipts": {
    doctype: "Purchase Receipt",
    fields: ["name", "supplier", "supplier_name", "posting_date", "set_warehouse", "status", "docstatus", "grand_total", "currency", "modified"],
    orderBy: "modified desc",
    filters: [["Purchase Receipt", "docstatus", "!=", 2]],
    searchFields: ["name", "supplier", "supplier_name"],
  },
  companies: {
    doctype: "Company",
    // Company has no `disabled` field (unlike Item/Warehouse/Supplier) —
    // requesting one made Frappe reject the whole query with "Field not
    // permitted in query: disabled".
    fields: ["name", "company_name", "default_currency"],
    orderBy: "company_name asc",
    filters: [["Company", "is_group", "=", 0]],
    searchFields: ["name", "company_name"],
  },
};

export function isWmsResource(resource) {
  return Boolean(RESOURCE_DEFINITIONS[resource]);
}

function safeNumber(value, fallback, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(0, Math.floor(parsed)));
}

function buildQuery(definition, { page = 1, pageSize = 25, search = "", extraFilters } = {}) {
  const limitPageLength = Math.min(100, Math.max(1, safeNumber(pageSize, 25, 100)));
  const limitStart = Math.max(0, (safeNumber(page, 1, 100000) - 1) * limitPageLength);
  const params = new URLSearchParams({
    fields: JSON.stringify(definition.fields),
    limit_page_length: String(limitPageLength),
    limit_start: String(limitStart),
    order_by: definition.orderBy,
  });
  const filters = [...(definition.filters || []), ...(extraFilters || [])];
  if (filters.length) params.set("filters", JSON.stringify(filters));
  // Frappe's /api/resource list endpoint has no generic `search` param — it only
  // understands `filters`/`or_filters`. Build an OR group of `like` filters instead.
  const term = String(search).trim().slice(0, 100);
  if (term && definition.searchFields?.length) {
    const orFilters = definition.searchFields.map((field) => [definition.doctype, field, "like", `%${term}%`]);
    params.set("or_filters", JSON.stringify(orFilters));
  }
  return { query: params.toString(), page: Math.floor(limitStart / limitPageLength) + 1, pageSize: limitPageLength };
}

// Shared by every WMS service (Item/Warehouse/UOM/PO lists here, and the
// Purchase Order / Purchase Receipt write services) so there is exactly one
// place that resolves "which ERPNext site does this company use".
export async function resolveWmsErpnextContext(companyId) {
  await dbConnect();
  const connection = await resolveERPNextConnection({ companyId });
  if (!connection) {
    const error = new Error("ERPNext connection is not configured. Add it in WMS Setup first.");
    error.code = "CONFIG_MISSING";
    throw error;
  }
  return { connection, config: buildERPNextConfig(connection) };
}

export async function getWmsMasterRecords(companyId, resource, options = {}) {
  const definition = RESOURCE_DEFINITIONS[resource];
  if (!definition) throw new Error("Unsupported WMS resource");

  const { connection, config } = await resolveWmsErpnextContext(companyId);
  const { query, page, pageSize } = buildQuery(definition, options);
  const response = await erpnextRequestWithConfig(
    config,
    `/api/resource/${encodeURIComponent(definition.doctype)}?${query}`,
    { method: "GET" }
  );
  const records = Array.isArray(response?.data) ? response.data : [];

  return { resource, doctype: definition.doctype, records, page, pageSize, hasMore: records.length === pageSize, connectionLabel: connection.label };
}

export async function getWmsDashboardData(companyId) {
  const [items, warehouses, purchaseOrders] = await Promise.all([
    getWmsMasterRecords(companyId, "items", { pageSize: 5 }),
    getWmsMasterRecords(companyId, "warehouses", { pageSize: 5 }),
    getWmsMasterRecords(companyId, "purchase-orders", { pageSize: 5 }),
  ]);
  return { items, warehouses, purchaseOrders };
}

