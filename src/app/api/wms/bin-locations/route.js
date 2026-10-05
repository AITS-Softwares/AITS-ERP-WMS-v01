export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { createBinLocation, listBinLocations } from "@/services/integrations/erpnext/wms/binLocationService";

export async function GET(req) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const data = await listBinLocations(user.companyId, { company: req.nextUrl.searchParams.get("company") || "" });
    return NextResponse.json({ success: true, data });
  } catch (error) { return wmsErrorResponse(error); }
}

export async function POST(req) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager or System Manager access is required." }, { status: 401 });
    const data = await createBinLocation(user.companyId, await req.json().catch(() => ({})));
    return NextResponse.json({ success: true, message: `Location ${data.name} created in ERPNext.`, data });
  } catch (error) { return wmsErrorResponse(error); }
}
