export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { resolveWmsBarcode } from "@/services/integrations/erpnext/wms/itemCartonService";

export async function GET(req) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const code = req.nextUrl.searchParams.get("code") || "";
    const data = await resolveWmsBarcode(user.companyId, code);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}
