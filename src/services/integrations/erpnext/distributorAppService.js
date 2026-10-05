import { buildERPNextConfig, resolveERPNextConnection } from "@/services/integrations/erpnext/connectionService";
import { resolveERPNextDistributorContext as resolveERPNextDistributorIdentityContext } from "@/services/integrations/erpnext/distributorIdentityService";
import { ERPNextError, erpnextRequestWithConfig } from "@/services/integrations/erpnext/erpnextClient";
import { getDistributorPromotionalOffers } from "@/services/integrations/erpnext/distributorPromotionService";

function toNumber(value) {
  const amount = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value) {
  return `Rs ${toNumber(value).toLocaleString("en-IN")}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
}

function normalizeText(value) {
  return String(value || "").trim();
}

function uniqueValues(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function buildQueryString(options = {}) {
  const params = new URLSearchParams();

  if (options.fields?.length) {
    params.set("fields", JSON.stringify(options.fields));
  }
  if (options.filters?.length) {
    params.set("filters", JSON.stringify(options.filters));
  }
  if (options.orFilters?.length) {
    params.set("or_filters", JSON.stringify(options.orFilters));
  }
  if (options.orderBy) {
    params.set("order_by", options.orderBy);
  }
  if (Number.isFinite(options.limitStart)) {
    params.set("limit_start", String(options.limitStart));
  }
  if (Number.isFinite(options.limit)) {
    params.set("limit_page_length", String(options.limit));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

async function listERPNextDocuments(config, doctype, options = {}) {
  const payload = await erpnextRequestWithConfig(
    config,
    `/api/resource/${encodeURIComponent(doctype)}${buildQueryString(options)}`,
    { method: "GET" }
  );

  return Array.isArray(payload?.data) ? payload.data : [];
}

async function readERPNextDocument(config, doctype, name) {
  if (!name) return null;

  const payload = await erpnextRequestWithConfig(
    config,
    `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { method: "GET" }
  );

  return payload?.data || null;
}

async function resolveERPNextCustomerAddress(config, customer) {
  let addressName = normalizeText(customer?.customer_primary_address || customer?.primary_address);
  if (!addressName && customer?.name) {
    const links = await listERPNextDocuments(config, "Dynamic Link", {
      fields: ["parent"],
      filters: [
        ["Dynamic Link", "parenttype", "=", "Address"],
        ["Dynamic Link", "link_doctype", "=", "Customer"],
        ["Dynamic Link", "link_name", "=", customer.name],
      ],
      limit: 1,
    }).catch(() => []);
    addressName = normalizeText(links[0]?.parent);
  }
  if (!addressName) return null;
  const address = await readERPNextDocument(config, "Address", addressName).catch(() => null);
  if (!address) return null;
  const formatted = [address.address_line1, address.address_line2, address.city, address.state, address.pincode, address.country]
    .map(normalizeText)
    .filter(Boolean)
    .join(", ");
  return formatted ? {
    label: normalizeText(address.address_title) || `${normalizeText(customer?.customer_name || customer?.name)} address`,
    type: normalizeText(address.address_type) || "Billing / shipping",
    address: formatted,
  } : null;
}

async function createERPNextDocument(config, doctype, body) {
  const payload = await erpnextRequestWithConfig(
    config,
    `/api/resource/${encodeURIComponent(doctype)}`,
    { method: "POST", body }
  );

  return payload?.data || null;
}

function getDistributorCustomerCandidates(session) {
  return uniqueValues([
    session.account?.erpCustomerName,
    session.account?.distributorCode,
    session.account?.displayName,
    session.user?.mobileNumber,
    session.user?.emailAddress,
  ]);
}

function buildCustomerOrFilters(doctype, customerDoc, session) {
  const values = uniqueValues([
    customerDoc?.name,
    customerDoc?.customer_name,
    session.account?.erpCustomerName,
    session.account?.distributorCode,
    session.account?.displayName,
  ]);

  if (!values.length) return [];

  const fields = doctype === "Payment Entry"
    ? ["party", "party_name"]
    : ["customer", "customer_name"];

  return values.flatMap((value) =>
    fields.map((field) => [doctype, field, "=", value])
  );
}

function mapInvoiceStatus(invoice) {
  const rawStatus = normalizeText(invoice.status) || "Pending";
  if (rawStatus === "Partly Paid") return "Partial";
  return rawStatus;
}

function buildProductAndStockData(itemDocs, itemPriceDocs, binDocs, preferredWarehouse) {
  const priceMap = new Map();
  for (const price of itemPriceDocs) {
    const itemCode = normalizeText(price.item_code);
    if (!itemCode || priceMap.has(itemCode)) continue;
    priceMap.set(itemCode, {
      rate: toNumber(price.price_list_rate),
      priceList: normalizeText(price.price_list),
      currency: normalizeText(price.currency),
    });
  }

  const itemStockMap = new Map();
  const stockItems = [];

  for (const bin of binDocs) {
    const itemCode = normalizeText(bin.item_code);
    if (!itemCode) continue;

    const row = {
      itemCode,
      item: itemCode,
      warehouseCode: normalizeText(bin.warehouse) || preferredWarehouse || "Main Warehouse",
      actualQty: toNumber(bin.actual_qty),
      reservedQty: toNumber(bin.reserved_qty),
      projectedQty: toNumber(bin.projected_qty),
    };
    row.status = row.projectedQty <= 0 ? "Low" : row.projectedQty <= row.actualQty * 0.25 ? "Watch" : "Healthy";
    stockItems.push(row);

    const existing = itemStockMap.get(itemCode) || { actualQty: 0, projectedQty: 0 };
    existing.actualQty += row.actualQty;
    existing.projectedQty += row.projectedQty;
    itemStockMap.set(itemCode, existing);
  }

  const products = itemDocs.map((item) => {
    const itemCode = normalizeText(item.item_code || item.name);
    const pricing = priceMap.get(itemCode);
    const stock = itemStockMap.get(itemCode);

    return {
      id: itemCode,
      itemCode,
      itemName: normalizeText(item.item_name) || itemCode,
      itemGroup: normalizeText(item.item_group) || "Items",
      stockUom: normalizeText(item.stock_uom) || "Nos",
      standardRate: pricing ? formatCurrency(pricing.rate) : "Price on request",
      gstRate: 0,
      reorderLevel: 0,
      projectedQty: stock?.projectedQty ?? 0,
      stock: `${stock?.projectedQty ?? 0} qty`,
      description: normalizeText(item.description),
      scheme: pricing?.priceList ? `Price list: ${pricing.priceList}` : "",
      highlights: [],
    };
  });

  const categories = [...new Set(products.map((product) => product.itemGroup).filter(Boolean))];

  return {
    categories,
    products,
    stockItems,
  };
}

function buildNotificationsFromERP(orders, invoices, dispatches, offers = []) {
  const recentInvoices = invoices
    .slice()
    .sort((a, b) => b.sortTime - a.sortTime)
    .slice(0, 3)
    .map((invoice) => ({
      id: `erp-invoice-created-${invoice.invoiceNumber}`,
      type: "invoice",
      title: `Invoice ${invoice.invoiceNumber} generated`,
      body: `Sales Invoice created for ${invoice.amount}. Due ${invoice.dueDate}.`,
      tone: "green",
      time: invoice.postingDate,
      href: `/distributor/invoices/${encodeURIComponent(invoice.invoiceNumber)}`,
      sortTime: invoice.sortTime,
    }));

  const overdue = invoices
    .filter((invoice) => invoice.openBalanceRaw > 0 && invoice.dueDateRaw && invoice.dueDateRaw < Date.now())
    .slice(0, 3)
    .map((invoice) => ({
      id: `erp-invoice-${invoice.invoiceNumber}`,
      type: "invoice",
      title: `Overdue invoice ${invoice.invoiceNumber}`,
      body: `Outstanding amount ${invoice.remainingAmount} requires follow-up.`,
      tone: "amber",
      time: invoice.dueDate,
      href: `/distributor/invoices/${encodeURIComponent(invoice.invoiceNumber)}`,
      sortTime: invoice.dueDateRaw,
    }));

  const pendingOrders = orders
    .filter((order) => !["Completed", "Closed", "Delivered"].includes(order.status))
    .slice(0, 2)
    .map((order) => ({
      id: `erp-order-${order.documentNumberOrder}`,
      type: "order",
      title: `Order ${order.documentNumberOrder}`,
      body: `${order.status} with value ${order.grandTotal}.`,
      tone: "blue",
      time: order.postingDate,
      href: `/distributor/orders/${encodeURIComponent(order.documentNumberOrder)}`,
      sortTime: order.sortTime,
    }));

  const activeDispatches = dispatches
    .filter((dispatch) => dispatch.status !== "Completed" && dispatch.status !== "Delivered")
    .slice(0, 2)
    .map((dispatch) => ({
      id: `erp-dispatch-${dispatch.documentNumberDelivery}`,
      type: "dispatch",
      title: `Dispatch ${dispatch.documentNumberDelivery}`,
      body: `${dispatch.status} for Sales Order ${dispatch.salesOrder || "-"}.`,
      tone: "green",
      time: dispatch.deliveryDate,
      href: `/distributor/dispatch/${encodeURIComponent(dispatch.documentNumberDelivery)}`,
      sortTime: dispatch.sortTime,
    }));

  const offerAnnouncements = offers
    .slice(0, 2)
    .map((offer, index) => ({
      id: `offer-${offer.title}-${index}`,
      type: "offer",
      title: offer.title,
      body: offer.description || "New distributor offer available.",
      tone: "green",
      time: offer.validity || "Active",
      href: "/distributor/offers",
      sortTime: Date.now() - index,
    }));

  return [...recentInvoices, ...overdue, ...pendingOrders, ...activeDispatches, ...offerAnnouncements]
    .sort((a, b) => b.sortTime - a.sortTime)
    .map(({ sortTime, ...entry }) => entry);
}

export function getERPNextErrorMessage(error) {
  const readMessage = (value) => {
    if (!value) return "";
    if (typeof value === "string") {
      try { return readMessage(JSON.parse(value)); } catch { return value.replace(/<[^>]+>/g, "").trim(); }
    }
    if (Array.isArray(value)) return value.map(readMessage).find(Boolean) || "";
    if (typeof value === "object") return readMessage(value.message || value.exc || value._server_messages || value.data);
    return "";
  };
  const detailedMessage = readMessage(error?.details?._server_messages || error?.details?.message || error?.details);
  if (detailedMessage && detailedMessage !== "ERPNext request failed") return detailedMessage;

  if (error?.code === "AUTH_FAILED") return "ERPNext authentication failed.";
  if (error?.code === "TIMEOUT") return "ERPNext did not respond in time.";
  if (error?.code === "NETWORK_ERROR") return "ERPNext could not be reached.";
  return error?.message || "ERPNext request failed";
}

export async function resolveERPNextDistributorContext(session) {
  return resolveERPNextDistributorIdentityContext(session);
}

export async function resolveERPNextTransactionCompany(config, customer = {}) {
  const configuredCompany = normalizeText(process.env.ERP_NEXT_DISTRIBUTOR_COMPANY) || normalizeText(customer.company);
  if (configuredCompany) return configuredCompany;

  const userDefault = await erpnextRequestWithConfig(config, "/api/method/frappe.defaults.get_user_default", {
    method: "POST",
    body: { doctype: "Company" },
  }).then((response) => normalizeText(response?.message || response?.data)).catch(() => "");
  if (userDefault) return userDefault;

  const companies = await listERPNextDocuments(config, "Company", {
    fields: ["name"],
    filters: [["Company", "is_group", "=", 0]],
    orderBy: "name asc",
    limit: 2,
  });
  if (companies.length === 1) return normalizeText(companies[0].name);
  if (companies.length > 1) throw new ERPNextError("ERPNext has multiple Companies. Set ERP_NEXT_DISTRIBUTOR_COMPANY to the Company used for distributor Sales Orders.", { status: 400, code: "COMPANY_REQUIRED" });
  throw new ERPNextError("No active ERPNext Company is available for Sales Orders.", { status: 400, code: "COMPANY_REQUIRED" });
}

export async function resolveERPNextActiveWarehouse(config, warehouse) {
  const name = normalizeText(warehouse);
  if (!name) return "";
  const records = await listERPNextDocuments(config, "Warehouse", {
    fields: ["name"],
    filters: [["Warehouse", "name", "=", name], ["Warehouse", "disabled", "=", 0]],
    limit: 1,
  }).catch(() => []);
  return records[0]?.name ? name : "";
}

export async function resolveERPNextTransactionPricing(config, company, customer = {}) {
  const configuredPriceList = normalizeText(process.env.ERP_NEXT_DISTRIBUTOR_PRICE_LIST);
  const requestedPriceList = configuredPriceList || normalizeText(customer.default_price_list);
  const [companyRecords, priceLists] = await Promise.all([
    listERPNextDocuments(config, "Company", { fields: ["name", "default_currency"], filters: [["Company", "name", "=", company]], limit: 1 }),
    listERPNextDocuments(config, "Price List", { fields: ["name", "currency"], filters: [["Price List", "selling", "=", 1], ["Price List", "enabled", "=", 1]], orderBy: "name asc", limit: 100 }),
  ]);
  const priceList = requestedPriceList
    ? priceLists.find((record) => normalizeText(record.name) === requestedPriceList)
    : (priceLists.find((record) => normalizeText(record.name) === "Standard Selling") || priceLists[0]);
  if (!priceList?.name) throw new ERPNextError("No enabled selling Price List is available in ERPNext.", { status: 400, code: "PRICE_LIST_REQUIRED" });

  const companyCurrency = normalizeText(companyRecords[0]?.default_currency);
  const currency = normalizeText(priceList.currency) || normalizeText(customer.default_currency) || companyCurrency;
  if (!currency || currency.toLowerCase() === "none") {
    throw new ERPNextError(`Currency is not configured on ERPNext Price List ${priceList.name} or Company ${company}.`, { status: 400, code: "CURRENCY_REQUIRED" });
  }
  return { priceList: normalizeText(priceList.name), currency, companyCurrency };
}

export async function buildDistributorConnectedAppData(session, { baseData } = {}) {
  const localData = baseData || {
    workflowHistoryMap: {},
    profile: {},
    savedAddresses: [],
    notifications: [],
    offers: [],
    invoices: [],
  };
  const { workflowHistoryMap = {}, ...localDataForClient } = localData;
  const liveContext = await resolveERPNextDistributorContext(session);

  if (!liveContext?.config || !liveContext.customer) {
    return {
      ...localDataForClient,
      categories: [],
      products: [],
      stockItems: [],
      orders: [],
      invoices: [],
      dispatches: [],
      creditNotes: [],
      financeSummary: [],
      ledgerEntries: [],
      dashboardStats: [],
      source: {
        mode: liveContext?.config ? "erpnext-not-mapped" : "erpnext-not-configured",
        label: liveContext?.config ? "ERPNext connected but distributor customer is not mapped yet" : "ERPNext connection is not configured",
      },
    };
  }

  const { config, customer } = liveContext;
  const erpAddress = await resolveERPNextCustomerAddress(config, customer).catch(() => null);
  const promotionalOffers = await getDistributorPromotionalOffers({ companyId: session.companyId, context: liveContext }).catch(() => []);
  const offers = [...promotionalOffers, ...(localData.offers || [])];
  const localInvoiceMap = new Map((localData.invoices || []).map((invoice) => [invoice.invoiceNumber || invoice.id, invoice]));
  const customerFilters = buildCustomerOrFilters("Sales Order", customer, session);
  const invoiceFilters = buildCustomerOrFilters("Sales Invoice", customer, session);
  const deliveryFilters = buildCustomerOrFilters("Delivery Note", customer, session);
  const paymentFilters = buildCustomerOrFilters("Payment Entry", customer, session);

  // The full catalogue is served by /api/distributor/products. Keep this
  // dashboard payload deliberately small for mobile/WebView performance.
  const itemDocs = await listERPNextDocuments(config, "Item", {
    fields: ["name", "item_code", "item_name", "item_group", "stock_uom", "description"],
    filters: [["Item", "disabled", "=", 0]],
    orderBy: "item_name asc",
    limit: 20,
  });

  const itemCodes = itemDocs.map((item) => normalizeText(item.item_code || item.name)).filter(Boolean);

  const [itemPriceDocs, binDocs, orderDocs, invoiceDocs, creditNoteDocs, deliveryDocs, paymentDocs] = await Promise.all([
    itemCodes.length
      ? listERPNextDocuments(config, "Item Price", {
          fields: ["item_code", "price_list_rate", "price_list", "currency"],
          filters: [
            ["Item Price", "selling", "=", 1],
            ["Item Price", "item_code", "in", itemCodes],
          ],
          orderBy: "modified desc",
          limit: 1500,
        }).catch(() => [])
      : [],
    itemCodes.length
      ? listERPNextDocuments(config, "Bin", {
          fields: ["item_code", "warehouse", "actual_qty", "reserved_qty", "projected_qty"],
          filters: [
            ["Bin", "item_code", "in", itemCodes],
            ...(session.account?.preferredWarehouse
              ? [["Bin", "warehouse", "=", session.account.preferredWarehouse]]
              : []),
          ],
          orderBy: "modified desc",
          limit: 1500,
        }).catch(() => [])
      : [],
    customerFilters.length
      ? listERPNextDocuments(config, "Sales Order", {
          fields: ["name", "customer", "customer_name", "transaction_date", "delivery_date", "status", "workflow_state", "grand_total", "po_no", "modified"],
          filters: [["Sales Order", "docstatus", "!=", 2]],
          orFilters: customerFilters,
          orderBy: "modified desc",
          limit: 20,
        })
      : [],
    invoiceFilters.length
      ? listERPNextDocuments(config, "Sales Invoice", {
          fields: ["name", "customer", "customer_name", "posting_date", "due_date", "status", "grand_total", "outstanding_amount", "is_return", "return_against", "modified"],
          filters: [
            ["Sales Invoice", "docstatus", "!=", 2],
            ["Sales Invoice", "is_return", "=", 0],
          ],
          orFilters: invoiceFilters,
          orderBy: "modified desc",
          limit: 20,
        })
      : [],
    invoiceFilters.length
      ? listERPNextDocuments(config, "Sales Invoice", {
          fields: ["name", "posting_date", "status", "grand_total", "return_against", "modified"],
          filters: [
            ["Sales Invoice", "docstatus", "!=", 2],
            ["Sales Invoice", "is_return", "=", 1],
          ],
          orFilters: invoiceFilters,
          orderBy: "modified desc",
          limit: 20,
        }).catch(() => [])
      : [],
    deliveryFilters.length
      ? listERPNextDocuments(config, "Delivery Note", {
          fields: ["name", "customer", "customer_name", "posting_date", "status", "lr_no", "vehicle_no", "transporter_name", "contact_display", "contact_mobile", "modified"],
          filters: [["Delivery Note", "docstatus", "!=", 2]],
          orFilters: deliveryFilters,
          orderBy: "modified desc",
          limit: 20,
        }).catch(() => [])
      : [],
    paymentFilters.length
      ? listERPNextDocuments(config, "Payment Entry", {
          fields: ["name", "posting_date", "payment_type", "party", "party_name", "paid_amount", "received_amount", "reference_no", "docstatus", "modified"],
          filters: [
            ["Payment Entry", "docstatus", "!=", 2],
            ["Payment Entry", "payment_type", "=", "Receive"],
          ],
          orFilters: paymentFilters,
          orderBy: "modified desc",
          limit: 20,
        }).catch(() => [])
      : [],
  ]);

  const orderDetails = await Promise.all(
    orderDocs.map((order) => readERPNextDocument(config, "Sales Order", order.name).catch(() => null))
  );
  const orderDetailMap = new Map(orderDetails.filter(Boolean).map((order) => [order.name, order]));

  const deliveryDetails = await Promise.all(
    deliveryDocs.map((delivery) => readERPNextDocument(config, "Delivery Note", delivery.name).catch(() => null))
  );
  const deliveryDetailMap = new Map(deliveryDetails.filter(Boolean).map((delivery) => [delivery.name, delivery]));

  const { categories, products, stockItems } = buildProductAndStockData(
    itemDocs,
    itemPriceDocs,
    binDocs,
    session.account?.preferredWarehouse || ""
  );

  const orders = orderDocs.map((order) => {
    const detail = orderDetailMap.get(order.name);
    const items = Array.isArray(detail?.items) ? detail.items : [];
    const postingValue = order.transaction_date || detail?.transaction_date || detail?.creation;
    const deliveryValue = order.delivery_date || detail?.delivery_date;

    return {
      id: order.name,
      documentNumberOrder: order.name,
      customerName: normalizeText(order.customer_name || customer.customer_name || customer.name),
      postingDate: formatDate(postingValue),
      expectedDeliveryDate: formatDate(deliveryValue),
      deliveryDate: formatDate(deliveryValue),
      status: normalizeText(order.workflow_state || detail?.workflow_state || order.status) || "Open",
      erpStatus: normalizeText(order.status) || "Open",
      workflowState: normalizeText(order.workflow_state || detail?.workflow_state),
      grandTotal: formatCurrency(order.grand_total),
      amount: formatCurrency(order.grand_total),
      shipTo: normalizeText(detail?.shipping_address_name || detail?.customer_address),
      remarks: normalizeText(detail?.remarks),
      items: items.map((line) => ({
        itemCode: normalizeText(line.item_code),
        itemName: normalizeText(line.item_name) || normalizeText(line.item_code),
        quantity: toNumber(line.qty),
        unitPrice: formatCurrency(line.rate),
        totalAmount: formatCurrency(line.amount),
      })),
      history: (workflowHistoryMap[`salesOrder:${order.name}`] || [])
        .slice()
        .sort((a, b) => b.sortTime - a.sortTime)
        .map(({ sortTime, ...entry }) => entry),
      sortTime: new Date(postingValue || Date.now()).getTime(),
    };
  });

  const invoices = invoiceDocs.map((invoice) => {
    const postingDate = invoice.posting_date || invoice.modified;
    const dueDateRaw = invoice.due_date ? new Date(invoice.due_date).getTime() : 0;
    const localInvoice = localInvoiceMap.get(invoice.name) || {};

    return {
      id: invoice.name,
      invoiceNumber: invoice.name,
      postingDate: formatDate(postingDate),
      dueDate: formatDate(invoice.due_date),
      paymentStatus: mapInvoiceStatus(invoice),
      status: mapInvoiceStatus(invoice),
      grandTotal: formatCurrency(invoice.grand_total),
      amount: formatCurrency(invoice.grand_total),
      remainingAmount: formatCurrency(invoice.outstanding_amount),
      balance: formatCurrency(invoice.outstanding_amount),
      salesOrder: "-",
      orderId: "",
      openBalanceRaw: toNumber(invoice.outstanding_amount),
      dueDateRaw,
      remarks: localInvoice.remarks || "",
      attachments: Array.isArray(localInvoice.attachments) ? localInvoice.attachments : [],
      sortTime: new Date(postingDate || Date.now()).getTime(),
    };
  });

  const dispatches = deliveryDocs.map((delivery) => {
    const detail = deliveryDetailMap.get(delivery.name);
    const firstItem = Array.isArray(detail?.items) ? detail.items[0] : null;
    const postingValue = delivery.posting_date || delivery.modified;

    return {
      id: delivery.name,
      documentNumberDelivery: delivery.name,
      salesOrder: normalizeText(firstItem?.against_sales_order || detail?.against_sales_order),
      order: normalizeText(firstItem?.against_sales_order || detail?.against_sales_order),
      deliveryDate: formatDate(postingValue),
      eta: formatDate(postingValue),
      vehicleNumber: normalizeText(delivery.vehicle_no || detail?.vehicle_no),
      vehicle: normalizeText(delivery.vehicle_no || detail?.vehicle_no),
      driver: normalizeText(detail?.driver || ""),
      contact: normalizeText(delivery.contact_mobile || delivery.contact_display || detail?.contact_mobile || detail?.contact_display),
      status: normalizeText(delivery.status) || "Pending",
      sortTime: new Date(postingValue || Date.now()).getTime(),
    };
  });

  const creditNotes = creditNoteDocs.map((note) => ({
    id: note.name,
    documentNumberCreditNote: note.name,
    against: normalizeText(note.return_against) || "-",
    postingDate: formatDate(note.posting_date),
    amount: formatCurrency(note.grand_total),
    status: normalizeText(note.status) || "Issued",
    sortTime: new Date(note.posting_date || note.modified || Date.now()).getTime(),
  }));

  const receiptDocs = paymentDocs.filter((payment) => normalizeText(payment.payment_type) === "Receive");
  const totalOutstanding = invoices.reduce((sum, invoice) => sum + invoice.openBalanceRaw, 0);
  const overdueInvoices = invoices.filter((invoice) => invoice.dueDateRaw && invoice.dueDateRaw < Date.now() && invoice.openBalanceRaw > 0);
  const overdueOutstanding = overdueInvoices.reduce((sum, invoice) => sum + invoice.openBalanceRaw, 0);
  const totalReceipts = receiptDocs.reduce((sum, payment) => sum + toNumber(payment.received_amount || payment.paid_amount), 0);
  const totalCreditNotes = creditNotes.reduce((sum, note) => sum + toNumber(note.amount), 0);

  const financeSummary = [
    { label: "Outstanding", value: formatCurrency(totalOutstanding), change: `${invoices.length} Sales Invoices` },
    { label: "Overdue", value: formatCurrency(overdueOutstanding), change: `${overdueInvoices.length} overdue invoices` },
    { label: "Receipts", value: formatCurrency(totalReceipts), change: `${receiptDocs.length} receipt entries` },
    { label: "Credit Notes", value: formatCurrency(totalCreditNotes), change: `${creditNotes.length} issued notes` },
  ];

  const ledgerRows = [
    ...invoiceDocs.map((invoice) => ({
      date: new Date(invoice.posting_date || invoice.modified || Date.now()),
      ref: invoice.name,
      type: "Sales Invoice",
      amount: toNumber(invoice.grand_total),
      delta: toNumber(invoice.grand_total),
    })),
    ...creditNoteDocs.map((note) => ({
      date: new Date(note.posting_date || note.modified || Date.now()),
      ref: note.name,
      type: "Credit Note",
      amount: toNumber(note.grand_total),
      delta: -toNumber(note.grand_total),
    })),
    ...receiptDocs.map((payment) => ({
      date: new Date(payment.posting_date || payment.modified || Date.now()),
      ref: payment.name,
      type: "Payment",
      amount: toNumber(payment.received_amount || payment.paid_amount),
      delta: -toNumber(payment.received_amount || payment.paid_amount),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let runningBalance = 0;
  const ledgerEntries = ledgerRows
    .map((entry) => {
      runningBalance += entry.delta;
      return {
        date: formatDate(entry.date),
        ref: entry.ref,
        type: entry.type,
        amount: formatCurrency(entry.amount),
        balance: formatCurrency(runningBalance),
        sortDate: entry.date.getTime(),
      };
    })
    .sort((a, b) => b.sortDate - a.sortDate)
    .map(({ sortDate, ...entry }) => entry);

  const notifications = buildNotificationsFromERP(orders, invoices, dispatches, offers);
  const mergedNotifications = [...notifications, ...(localData.notifications || [])]
    .filter(Boolean)
    .reduce((acc, entry) => {
      if (!acc.some((item) => item.id === entry.id)) acc.push(entry);
      return acc;
    }, [])
    .slice(0, 12);

  return {
    ...localDataForClient,
    profile: {
      ...localData.profile,
      name: normalizeText(customer.customer_name) || localData.profile?.name || "",
      code: normalizeText(customer.name) || localData.profile?.code || "",
      phone: normalizeText(customer.mobile_no) || localData.profile?.phone || "",
      route: normalizeText(customer.territory) || localData.profile?.route || "",
      preferredWarehouse: normalizeText(session.account?.preferredWarehouse) || localData.profile?.preferredWarehouse || "",
    },
    savedAddresses: erpAddress
      ? [erpAddress, ...(localData.savedAddresses || []).filter((address) => normalizeText(address.address) !== erpAddress.address)]
      : (localData.savedAddresses || []),
    categories,
    products,
    stockItems,
    orders,
    invoices,
    dispatches,
    creditNotes,
    financeSummary,
    ledgerEntries,
    dashboardStats: [
      { label: "Open Sales Orders", value: String(orders.length), change: `${dispatches.length} dispatch records` },
      { label: "Outstanding", value: formatCurrency(totalOutstanding), change: `${invoices.length} invoice records` },
      { label: "Items", value: String(products.length), change: `${categories.length} item groups` },
      { label: "Credit Notes", value: String(creditNotes.length), change: formatCurrency(totalCreditNotes) },
    ],
    notifications: mergedNotifications,
    offers,
    source: {
      mode: "erpnext",
      label: liveContext.connection.label,
      customer: customer.name,
    },
  };
}

export async function createERPNextDistributorSalesOrder(session, body) {
  const liveContext = await resolveERPNextDistributorContext(session);
  if (!liveContext?.config || !liveContext.customer) {
    return null;
  }

  const lines = Array.isArray(body.lines) ? body.lines : [];
  if (!lines.length) {
    throw new ERPNextError("At least one order line is required");
  }

  const today = new Date().toISOString().slice(0, 10);
  const deliveryDate = normalizeText(body.deliveryDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
    throw new ERPNextError("Requested delivery date is required", { status: 400, code: "DELIVERY_DATE_REQUIRED" });
  }
  if (deliveryDate < today) {
    throw new ERPNextError("Requested delivery date cannot be earlier than the order date", { status: 400, code: "DELIVERY_DATE_INVALID" });
  }
  const [company, preferredWarehouse] = await Promise.all([
    resolveERPNextTransactionCompany(liveContext.config, liveContext.customer),
    resolveERPNextActiveWarehouse(liveContext.config, session.account?.preferredWarehouse),
  ]);
  const pricing = await resolveERPNextTransactionPricing(liveContext.config, company, liveContext.customer);
  const remarks = [
    normalizeText(body.remarks),
    normalizeText(body.shipTo) ? `Ship to: ${normalizeText(body.shipTo)}` : "",
  ].filter(Boolean).join(" | ");

  const payload = {
    doctype: "Sales Order",
    customer: liveContext.customer.name,
    company,
    selling_price_list: pricing.priceList,
    currency: pricing.currency,
    ...(pricing.companyCurrency && pricing.companyCurrency === pricing.currency ? { conversion_rate: 1 } : {}),
    transaction_date: today,
    delivery_date: deliveryDate,
    po_no: normalizeText(body.poReference),
    set_warehouse: preferredWarehouse,
    remarks,
    items: lines.map((line) => ({
      item_code: normalizeText(line.itemCode),
      qty: Math.max(1, toNumber(line.qty)),
      schedule_date: deliveryDate,
      uom: normalizeText(line.uom),
      warehouse: preferredWarehouse,
    })),
  };

  payload.items = payload.items.filter((line) => line.item_code);

  if (!payload.items.length) {
    throw new ERPNextError("At least one valid item code is required");
  }

  if (!payload.po_no) {
    delete payload.po_no;
  }
  if (!payload.set_warehouse) {
    delete payload.set_warehouse;
    payload.items = payload.items.map(({ warehouse, ...line }) => line);
  }

  return createERPNextDocument(liveContext.config, "Sales Order", payload);
}
