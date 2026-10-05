export const runtime = "nodejs";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getWarehouseSession } from "@/lib/wmsAuth";
import WmsRack from "@/models/WmsRack";
import WmsShelf from "@/models/WmsShelf";
import WmsBinLocation from "@/models/WmsBinLocation";
import WmsItemBinAssignment from "@/models/WmsItemBinAssignment";

const clean = (value) => String(value ?? "").trim();
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

async function readRows(file) {
  const fileName = clean(file.name).toLowerCase();
  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) throw new Error("The Excel file does not contain a worksheet.");
    const worksheet = workbook.Sheets[firstSheet];
    const values = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false });
    const headerRow = values.findIndex((row) => clean(row[0]) === "warehouseCode");
    if (headerRow === -1) throw new Error("The Excel file must contain a warehouseCode header column.");
    return XLSX.utils.sheet_to_json(worksheet, { range: headerRow + 1, defval: "", raw: false });
  }
  if (fileName.endsWith(".csv")) {
    const parsed = Papa.parse(await file.text(), { header: true, skipEmptyLines: true, transformHeader: (header) => clean(header) });
    if (parsed.errors.length) throw new Error("The CSV file could not be read.");
    return parsed.data;
  }
  throw new Error("Upload an Excel (.xlsx or .xls) or CSV file.");
}

export async function POST(req) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager access is required." }, { status: 401 });
    const form = await req.formData(); const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return NextResponse.json({ success: false, message: "Choose an Excel or CSV file first." }, { status: 400 });
    const rows = await readRows(file);
    if (!rows.length) return NextResponse.json({ success: false, message: "The uploaded file has no data rows." }, { status: 400 });
    await dbConnect(); const results = { rows: rows.length, racks: 0, shelves: 0, bins: 0, assignments: 0, skipped: 0 };
    for (const row of rows) {
      const warehouseId = clean(row.warehouseCode); const rackCode = clean(row.rackCode); const shelfCode = clean(row.shelfCode); const binNumber = clean(row.binNumber);
      if (!warehouseId || !rackCode || !shelfCode || !binNumber) { results.skipped += 1; continue; }
      const rack = await WmsRack.findOneAndUpdate({ companyId: user.companyId, rackCode }, { $setOnInsert: { companyId: user.companyId, rackCode, name: clean(row.rackName) || rackCode, capacity: number(row.rackCapacity), status: "Active", createdBy: user.id || null } }, { new: true, upsert: true }); results.racks += 1;
      const shelf = await WmsShelf.findOneAndUpdate({ companyId: user.companyId, rackId: rack._id, shelfCode }, { $setOnInsert: { companyId: user.companyId, rackId: rack._id, shelfCode, capacity: number(row.shelfCapacity), status: "Active", createdBy: user.id || null } }, { new: true, upsert: true }); results.shelves += 1;
      const binCode = `${warehouseId}-${rackCode}-${shelfCode}-${binNumber}`;
      const bin = await WmsBinLocation.findOneAndUpdate({ companyId: user.companyId, binCode }, { $setOnInsert: { companyId: user.companyId, warehouseId, state: clean(row.state), rackId: rack._id, shelfId: shelf._id, binNumber, binCode, capacity: number(row.binCapacity), status: "Active", createdBy: user.id || null } }, { new: true, upsert: true }); results.bins += 1;
      if (clean(row.itemCode)) { await WmsItemBinAssignment.findOneAndUpdate({ companyId: user.companyId, itemCode: clean(row.itemCode), warehouseId }, { $set: { itemName: clean(row.itemName), binLocationId: bin._id, isDefault: true, status: "Active" }, $setOnInsert: { companyId: user.companyId, itemCode: clean(row.itemCode), warehouseId } }, { upsert: true }); results.assignments += 1; }
    }
    return NextResponse.json({ success: true, data: results, message: `Imported ${results.bins} bin rows, with ${results.assignments} item assignments, for Local WMS testing.` });
  } catch (error) { return NextResponse.json({ success: false, message: error.message || "Bulk import failed." }, { status: 500 }); }
}
