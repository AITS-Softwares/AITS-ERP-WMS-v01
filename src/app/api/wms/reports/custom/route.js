import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { runCustomReport } from "@/services/integrations/erpnext/wms/customReportService";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const query = req.nextUrl.searchParams;
    const data = await runCustomReport(user.companyId, { type: query.get("type"), from: query.get("from") || "", to: query.get("to") || "" });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return wmsErrorResponse(error); }
}
