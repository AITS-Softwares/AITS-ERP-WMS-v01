export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getWarehouseSession } from "@/lib/wmsAuth";
import WmsBinLocation from "@/models/WmsBinLocation";
import WmsItemBinAssignment from "@/models/WmsItemBinAssignment";
import WmsBarcodeLabel from "@/models/WmsBarcodeLabel";

export async function GET(req) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    await dbConnect(); const query = req.nextUrl.searchParams; const type = query.get("type") || "bins"; const warehouseId = String(query.get("warehouseId") || "").trim(); const state = String(query.get("state") || "").trim(); const binFilter = { companyId: user.companyId, ...(warehouseId ? { warehouseId } : {}), ...(state ? { state } : {}) };
    let rows = [];
    if (type === "assignments") rows = await WmsItemBinAssignment.find({ companyId: user.companyId, ...(warehouseId ? { warehouseId } : {}) }).populate({ path: "binLocationId", populate: "rackId shelfId" }).lean();
    else if (type === "barcodes") rows = await WmsBarcodeLabel.find({ companyId: user.companyId, ...(warehouseId ? { warehouseId } : {}) }).sort({ generatedAt: -1 }).populate({ path: "binLocationId", populate: "rackId shelfId" }).lean();
    else rows = await WmsBinLocation.find(binFilter).populate("rackId shelfId").lean();
    return NextResponse.json({ success: true, filters: { type, warehouseId, state }, summary: { count: rows.length }, rows });
  } catch (error) { return NextResponse.json({ success: false, message: error.message || "Unable to load Local WMS report." }, { status: 500 }); }
}
