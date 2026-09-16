export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { submitSalesOrderForDispatch } from "@/services/integrations/erpnext/wms/salesDispatchService";

export async function POST(req, { params }) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager or System Manager access is required." }, { status: 401 });
    const { code } = await params;
    const data = await submitSalesOrderForDispatch(user.companyId, decodeURIComponent(code));
    return NextResponse.json({ success: true, message: `Sales Order ${data.name} submitted in ERPNext.`, data });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}
