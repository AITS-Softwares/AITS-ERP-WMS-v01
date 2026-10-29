import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { findScannedLocation } from "@/lib/wmsLocationQr";
import { listPhysicalLocations } from "@/services/integrations/erpnext/wms/physicalLocationService";

export async function GET(req) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const code = req.nextUrl.searchParams.get("code") || "";
    const locations = await listPhysicalLocations(user.companyId, req.nextUrl.searchParams.get("company") || "");
    const location = findScannedLocation(locations, code);
    if (!location) return NextResponse.json({ success: false, message: "No unique warehouse location matches this barcode." }, { status: 404 });
    return NextResponse.json({ success: true, data: location });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}
