export const customReports = [
  { id: "stock", title: "Warehouse Stock Balance", description: "Current ERPNext item balances by warehouse.", columns: [["item_code", "Item"], ["warehouse", "Warehouse"], ["stock_uom", "Stock UOM"], ["actual_qty", "Actual quantity"], ["reserved_qty", "Reserved quantity"], ["projected_qty", "Projected quantity"]] },
  { id: "locations", title: "Location & Capacity", description: "Warehouse, rack, shelf, bin, configured capacity and barcode assignments.", columns: [["warehouseName", "Warehouse"], ["location", "Location"], ["rack", "Rack"], ["shelf", "Shelf"], ["bin", "Bin"], ["capacity", "Configured capacity"], ["barcode", "Barcode"]] },
  { id: "stock-out", title: "Stock-Out History", description: "Submitted Delivery Note lines, including returns and source locations.", columns: [["posting_date", "Date"], ["document", "Delivery Note"], ["customer", "Customer"], ["item_code", "Item"], ["warehouse", "Warehouse"], ["rack", "Rack"], ["shelf", "Shelf"], ["bin", "Bin"], ["qty", "Order quantity"], ["uom", "Order UOM"], ["stock_qty", "Stock quantity"], ["stock_uom", "Stock UOM"], ["movement", "Movement"]] },
];

export function filterCustomReport(rows, { search = "", warehouse = "" } = {}) {
  const term = search.trim().toLowerCase();
  return rows.filter((row) => (!warehouse || (row.warehouse || row.warehouseName) === warehouse) && (!term || Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(term))));
}

export function customReportCsv(columns, rows) {
  const cell = (value) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text) && typeof value !== "number") text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return "\ufeff" + [columns.map(([, label]) => cell(label)).join(","), ...rows.map((row) => columns.map(([key]) => cell(row[key])).join(","))].join("\r\n");
}
