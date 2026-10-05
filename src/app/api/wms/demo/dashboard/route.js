export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getWarehouseSession } from "@/lib/wmsAuth";
import WmsRack from "@/models/WmsRack";
import WmsShelf from "@/models/WmsShelf";
import WmsBinLocation from "@/models/WmsBinLocation";
import WmsItemBinAssignment from "@/models/WmsItemBinAssignment";
import WmsBarcodeLabel from "@/models/WmsBarcodeLabel";

export async function GET(req) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    await dbConnect();
    const companyId = user.companyId;
    const warehouseId = String(req.nextUrl.searchParams.get("warehouseId") || "").trim();
    const state = String(req.nextUrl.searchParams.get("state") || "").trim();
    const binFilter = { companyId, ...(warehouseId ? { warehouseId } : {}), ...(state ? { state } : {}) };
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const [rackCount, shelfCount, binCount, assignedCount, barcodeToday, capacityRows, recentBarcodes, recentBins, byWarehouse, byRack, byShelf, barcodesByDay] = await Promise.all([
      WmsRack.countDocuments({ companyId }), WmsShelf.countDocuments({ companyId }), WmsBinLocation.countDocuments({ ...binFilter, status: "Active" }), WmsItemBinAssignment.countDocuments({ companyId, status: "Active", ...(warehouseId ? { warehouseId } : {}) }), WmsBarcodeLabel.countDocuments({ companyId, generatedAt: { $gte: startOfToday }, ...(warehouseId ? { warehouseId } : {}) }),
      WmsBinLocation.aggregate([{ $match: binFilter }, { $group: { _id: null, total: { $sum: "$capacity" } } }]),
      WmsBarcodeLabel.find({ companyId, ...(warehouseId ? { warehouseId } : {}) }).sort({ generatedAt: -1 }).limit(5).populate("binLocationId").lean(),
      WmsBinLocation.find(binFilter).sort({ updatedAt: -1 }).limit(5).populate("rackId shelfId").lean(),
      WmsBinLocation.aggregate([{ $match: binFilter }, { $group: { _id: "$warehouseId", bins: { $sum: 1 }, capacity: { $sum: "$capacity" } } }, { $sort: { bins: -1 } }]),
      WmsBinLocation.aggregate([{ $match: binFilter }, { $lookup: { from: "wms_racks", localField: "rackId", foreignField: "_id", as: "rack" } }, { $unwind: { path: "$rack", preserveNullAndEmptyArrays: true } }, { $group: { _id: { code: "$rack.rackCode", name: "$rack.name" }, bins: { $sum: 1 }, capacity: { $sum: "$capacity" } } }, { $sort: { bins: -1 } }]),
      WmsBinLocation.aggregate([{ $match: binFilter }, { $lookup: { from: "wms_shelves", localField: "shelfId", foreignField: "_id", as: "shelf" } }, { $unwind: { path: "$shelf", preserveNullAndEmptyArrays: true } }, { $group: { _id: "$shelf.shelfCode", bins: { $sum: 1 }, capacity: { $sum: "$capacity" } } }, { $sort: { bins: -1 } }]),
      WmsBarcodeLabel.aggregate([{ $match: { companyId, ...(warehouseId ? { warehouseId } : {}), generatedAt: { $gte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) } } }, { $group: { _id: { $dateToString: { format: "%d %b", date: "$generatedAt" } }, labels: { $sum: 1 }, quantity: { $sum: "$quantity" } } }, { $sort: { _id: 1 } }]),
    ]);
    return NextResponse.json({ success: true, data: { summary: { totalRacks: rackCount, totalShelves: shelfCount, activeBins: binCount, itemsAssigned: assignedCount, barcodesToday: barcodeToday, totalCapacity: capacityRows[0]?.total || 0 }, byWarehouse: byWarehouse.map((row) => ({ warehouse: row._id, bins: row.bins, capacity: row.capacity })), byRack: byRack.map((row) => ({ rack: row._id.code || "Unassigned", name: row._id.name || "", bins: row.bins, capacity: row.capacity })), byShelf: byShelf.map((row) => ({ shelf: row._id || "Unassigned", bins: row.bins, capacity: row.capacity })), barcodesByDay: barcodesByDay.map((row) => ({ day: row._id, labels: row.labels, quantity: row.quantity })), recentBarcodes, recentBins, refreshedAt: new Date().toISOString() } });
  } catch (error) { return NextResponse.json({ success: false, message: error.message || "Unable to load warehouse location analytics." }, { status: 500 }); }
}
