export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getWarehouseSession } from "@/lib/wmsAuth";
import WmsRack from "@/models/WmsRack";
import WmsShelf from "@/models/WmsShelf";
import WmsBinLocation from "@/models/WmsBinLocation";
import WmsItemBinAssignment from "@/models/WmsItemBinAssignment";
import WmsBarcodeLabel from "@/models/WmsBarcodeLabel";

const layout = [
  { warehouseId: "MUM-01", state: "Maharashtra", rackCode: "R01", rackName: "Receiving Rack", rackCapacity: 200, shelfCode: "S01", shelfCapacity: 100, bins: [["B01", 25, "FG-1001", "Industrial Valve"], ["B02", 25, "FG-1002", "Control Panel"]] },
  { warehouseId: "MUM-01", state: "Maharashtra", rackCode: "R02", rackName: "Reserve Rack", rackCapacity: 160, shelfCode: "S02", shelfCapacity: 80, bins: [["B01", 20, "FG-1003", "Hydraulic Pump"], ["B02", 20, "FG-1004", "Pressure Gauge"]] },
  { warehouseId: "BLR-01", state: "Karnataka", rackCode: "R03", rackName: "Dispatch Rack", rackCapacity: 180, shelfCode: "S03", shelfCapacity: 90, bins: [["B01", 30, "FG-1005", "Drive Assembly"], ["B02", 30, "FG-1006", "Safety Kit"]] },
];

export async function POST(req) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager access is required." }, { status: 401 });
    await dbConnect();
    const summary = { racks: 0, shelves: 0, bins: 0, assignments: 0, barcodes: 0 };
    for (const row of layout) {
      const rack = await WmsRack.findOneAndUpdate({ companyId: user.companyId, rackCode: row.rackCode }, { $setOnInsert: { companyId: user.companyId, rackCode: row.rackCode, name: row.rackName, capacity: row.rackCapacity, status: "Active", createdBy: user.id || null } }, { new: true, upsert: true });
      summary.racks += 1;
      const shelf = await WmsShelf.findOneAndUpdate({ companyId: user.companyId, rackId: rack._id, shelfCode: row.shelfCode }, { $setOnInsert: { companyId: user.companyId, rackId: rack._id, shelfCode: row.shelfCode, capacity: row.shelfCapacity, status: "Active", createdBy: user.id || null } }, { new: true, upsert: true });
      summary.shelves += 1;
      for (const [binNumber, capacity, itemCode, itemName] of row.bins) {
        const binCode = `${row.warehouseId}-${row.rackCode}-${row.shelfCode}-${binNumber}`;
        const bin = await WmsBinLocation.findOneAndUpdate({ companyId: user.companyId, binCode }, { $setOnInsert: { companyId: user.companyId, warehouseId: row.warehouseId, state: row.state, rackId: rack._id, shelfId: shelf._id, binNumber, binCode, capacity, status: "Active", createdBy: user.id || null } }, { new: true, upsert: true });
        await WmsItemBinAssignment.findOneAndUpdate({ companyId: user.companyId, itemCode, warehouseId: row.warehouseId }, { $set: { itemName, binLocationId: bin._id, isDefault: true, status: "Active" }, $setOnInsert: { companyId: user.companyId, itemCode, warehouseId: row.warehouseId } }, { new: true, upsert: true });
        const barcodeValue = `WMS1|${row.warehouseId}|${itemCode}`;
        await WmsBarcodeLabel.findOneAndUpdate({ barcodeValue }, { $set: { companyId: user.companyId, itemCode, itemName, warehouseId: row.warehouseId, binLocationId: bin._id, quantity: Math.max(1, capacity / 5), generatedAt: new Date(), status: "Active" } }, { new: true, upsert: true });
        summary.bins += 1; summary.assignments += 1; summary.barcodes += 1;
      }
    }
    return NextResponse.json({ success: true, data: summary, message: "Presentation data is ready for the dashboard." });
  } catch (error) { return NextResponse.json({ success: false, message: error.message || "Unable to prepare presentation data." }, { status: 500 }); }
}
