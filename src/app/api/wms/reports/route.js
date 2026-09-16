export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { listStandardErpnextReports, runStandardErpnextReport } from "@/services/integrations/erpnext/wms/reportService";

export async function GET(req) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    return NextResponse.json({ success: true, data: await listStandardErpnextReports(user.companyId) });
  } catch (error) { return wmsErrorResponse(error); }
}

export async function POST(req) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ success: true, data: await runStandardErpnextReport(user.companyId, body.reportName) });
  } catch (error) { return wmsErrorResponse(error); }
}
