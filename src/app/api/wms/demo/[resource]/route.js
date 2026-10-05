export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getWarehouseSession } from "@/lib/wmsAuth";
import WmsRack from "@/models/WmsRack";
import WmsShelf from "@/models/WmsShelf";
import WmsBinLocation from "@/models/WmsBinLocation";
import WmsItemBinAssignment from "@/models/WmsItemBinAssignment";
import WmsBarcodeLabel from "@/models/WmsBarcodeLabel";

const models = { racks: WmsRack, shelves: WmsShelf, "bin-locations": WmsBinLocation, assignments: WmsItemBinAssignment, barcodes: WmsBarcodeLabel };
const populate = { shelves: "rackId", "bin-locations": "rackId shelfId", assignments: "binLocationId", barcodes: "binLocationId" };
const clean = (value) => String(value ?? "").trim();
const response = (data, summary = {}, message = "") => NextResponse.json({ success: true, data, summary, message });

export async function GET(req, { params }) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const { resource } = await params; const Model = models[resource];
    if (!Model) return NextResponse.json({ success: false, message: "Unknown Local WMS resource." }, { status: 404 });
    await dbConnect();
    const filter = { companyId: user.companyId };
    const warehouseId = clean(req.nextUrl.searchParams.get("warehouseId"));
    const rackId = clean(req.nextUrl.searchParams.get("rackId"));
    if (warehouseId && ["bin-locations", "assignments", "barcodes"].includes(resource)) filter.warehouseId = warehouseId;
    if (rackId && resource === "shelves") filter.rackId = rackId;
    let query = Model.find(filter).sort({ createdAt: -1 });
    if (populate[resource]) query = query.populate(populate[resource]);
    const data = await query.lean();
    return response(data, { count: data.length });
  } catch (error) { return NextResponse.json({ success: false, message: error.message || "Unable to load Local WMS data." }, { status: 500 }); }
}

export async function POST(req, { params }) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager access is required." }, { status: 401 });
    const { resource } = await params; const Model = models[resource];
    if (!Model) return NextResponse.json({ success: false, message: "Unknown Local WMS resource." }, { status: 404 });
    const body = await req.json().catch(() => ({})); await dbConnect();
    const base = { companyId: user.companyId, createdBy: user.id || null };
    let record;
    if (resource === "racks") {
      if (!clean(body.rackCode) || !clean(body.name)) throw new Error("Rack code and name are required.");
      record = await Model.create({ ...base, rackCode: clean(body.rackCode), name: clean(body.name), capacity: Number(body.capacity || 0), status: body.status || "Active" });
    } else if (resource === "shelves") {
      if (!clean(body.shelfCode) || !clean(body.rackId)) throw new Error("Shelf code and rack are required.");
      record = await Model.create({ ...base, shelfCode: clean(body.shelfCode), rackId: body.rackId, capacity: Number(body.capacity || 0), status: body.status || "Active" });
    } else if (resource === "bin-locations") {
      const rack = await WmsRack.findOne({ _id: body.rackId, companyId: user.companyId }); const shelf = await WmsShelf.findOne({ _id: body.shelfId, rackId: body.rackId, companyId: user.companyId });
      if (!rack || !shelf || !clean(body.warehouseId) || !clean(body.binNumber)) throw new Error("Warehouse, rack, shelf, and bin number are required.");
      const binCode = clean(body.binCode) || `${clean(body.warehouseId)}-${rack.rackCode}-${shelf.shelfCode}-${clean(body.binNumber)}`;
      record = await Model.create({ ...base, warehouseId: clean(body.warehouseId), state: clean(body.state), rackId: rack._id, shelfId: shelf._id, binNumber: clean(body.binNumber), binCode, capacity: Number(body.capacity || 0), status: body.status || "Active" });
    } else if (resource === "assignments") {
      const bin = await WmsBinLocation.findOne({ _id: body.binLocationId, companyId: user.companyId, warehouseId: clean(body.warehouseId) });
      if (!bin || !clean(body.itemCode)) throw new Error("Choose an item and a bin from the same warehouse.");
      record = await Model.create({ companyId: user.companyId, itemId: clean(body.itemId), itemCode: clean(body.itemCode), itemName: clean(body.itemName), warehouseId: clean(body.warehouseId), binLocationId: bin._id, isDefault: true, status: "Active" });
    } else {
      const assignment = await WmsItemBinAssignment.findOne({ _id: body.assignmentId, companyId: user.companyId }).populate("binLocationId");
      if (!assignment) throw new Error("Select a valid item-bin assignment.");
      const id = new WmsBarcodeLabel()._id.toString();
      record = await Model.create({ companyId: user.companyId, barcodeValue: `WMS1|${id}|${id.slice(-4).toUpperCase()}`, itemCode: assignment.itemCode, itemName: assignment.itemName, warehouseId: assignment.warehouseId, binLocationId: assignment.binLocationId._id, quantity: Number(body.quantity || 1), generatedAt: new Date(), status: "Active" });
    }
    return response(record, {}, `${resource} record saved.`);
  } catch (error) { return NextResponse.json({ success: false, message: error.message || "Unable to save Local WMS data." }, { status: 400 }); }
}
