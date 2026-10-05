export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getWarehouseSession } from "@/lib/wmsAuth";
import WmsBinLocation from "@/models/WmsBinLocation";
import WmsBarcodeLabel from "@/models/WmsBarcodeLabel";

export async function POST(req) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager access is required." }, { status: 401 });
    const { binLocationId } = await req.json();
    await dbConnect();
    const bin = await WmsBinLocation.findOne({ _id: binLocationId, companyId: user.companyId });
    if (!bin) return NextResponse.json({ success: false, message: "The selected bin location was not found." }, { status: 404 });
    const barcodeValue = `BIN|${bin.binCode}`;
    const label = await WmsBarcodeLabel.findOneAndUpdate(
      { companyId: user.companyId, barcodeValue },
      { $set: { companyId: user.companyId, barcodeValue, itemCode: `BIN-${bin.binCode}`, itemName: "Bin Location Label", warehouseId: bin.warehouseId, binLocationId: bin._id, quantity: 0, generatedAt: new Date(), status: "Active" } },
      { new: true, upsert: true },
    );
    return NextResponse.json({ success: true, data: label, message: `Barcode label created for ${bin.binCode}.` });
  } catch (error) { return NextResponse.json({ success: false, message: error.message || "Unable to generate a bin barcode." }, { status: 500 }); }
}
