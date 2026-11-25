export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { completeCartonBarcodeScan, markCartonBarcodeScanned, releaseCartonBarcodeScan } from "@/services/integrations/erpnext/wms/cartonBarcodeMasterService";

export async function POST(req, { params }) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const { id } = await params;
    const data = await markCartonBarcodeScanned(user.companyId, id);
    return NextResponse.json({ success: true, message: "Barcode reserved for receiving.", data });
  } catch (error) { return wmsErrorResponse(error); }
}

export async function PATCH(req, { params }) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const { id } = await params;
    const data = await completeCartonBarcodeScan(user.companyId, id);
    return NextResponse.json({ success: true, message: "Barcode status updated to Scanned.", data });
  } catch (error) { return wmsErrorResponse(error); }
}

export async function DELETE(req, { params }) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const { id } = await params;
    await releaseCartonBarcodeScan(user.companyId, id);
    return NextResponse.json({ success: true });
  } catch (error) { return wmsErrorResponse(error); }
}
