export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { getItemCartonSetup } from "@/services/integrations/erpnext/wms/itemCartonService";

export async function GET(req, { params }) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const { code } = await params;
    const data = await getItemCartonSetup(user.companyId, decodeURIComponent(code));
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, max-age=15" } });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}
