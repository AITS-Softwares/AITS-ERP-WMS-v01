export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import WmsCartonBarcode from "@/models/WmsCartonBarcode";

export async function PATCH(req, { params }) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager or System Manager access is required." }, { status: 401 });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const expiryDate = body.expiryDate ? new Date(`${body.expiryDate}T23:59:59.999Z`) : null;
    if (body.expiryDate && Number.isNaN(expiryDate?.getTime())) return NextResponse.json({ success: false, message: "Enter a valid expiry date." }, { status: 400 });
    await dbConnect();
    const record = await WmsCartonBarcode.findOneAndUpdate(
      { _id: id, companyId: user.companyId, status: { $nin: ["Regenerated", "Receiving"] } },
      { $set: { expiryDate, barcodeExpiresAt: expiryDate, status: "Updated" } },
      { new: true, runValidators: true },
    );
    if (!record) return NextResponse.json({ success: false, message: "Barcode record was not found or has been regenerated." }, { status: 404 });
    return NextResponse.json({ success: true, message: "Barcode expiry and record status updated.", data: record });
  } catch (error) { return wmsErrorResponse(error); }
}

export async function POST(req, { params }) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager or System Manager access is required." }, { status: 401 });
    const { id } = await params;
    await dbConnect();
    const previous = await WmsCartonBarcode.findOne({ _id: id, companyId: user.companyId, status: { $in: ["Generated", "Updated"] }, scannedAt: null }).lean();
    if (!previous) return NextResponse.json({ success: false, message: "Barcode record was not found or has already been regenerated." }, { status: 404 });
    const next = await WmsCartonBarcode.create({
      companyId: user.companyId,
      barcodeValue: `WMSMC-${(await import("node:crypto")).randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`,
      itemCode: previous.itemCode,
      itemName: previous.itemName,
      stockUom: previous.stockUom,
      uom: previous.uom,
      quantity: previous.quantity,
      expiryDate: previous.expiryDate,
      barcodeExpiresAt: previous.expiryDate,
      regeneratedFrom: previous.barcodeValue,
      status: "Generated",
    });
    await WmsCartonBarcode.updateOne({ _id: previous._id }, { $set: { status: "Regenerated" } });
    return NextResponse.json({ success: true, message: "Barcode regenerated. The prior label is marked Regenerated.", data: next }, { status: 201 });
  } catch (error) { return wmsErrorResponse(error); }
}
