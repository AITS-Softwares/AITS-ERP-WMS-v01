export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { createSalesStockOut } from "@/services/integrations/erpnext/wms/salesDispatchService";

export async function POST(req) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager or System Manager access is required." }, { status: 401 });
    const data = await createSalesStockOut(user.companyId, await req.json().catch(() => ({})));
    return NextResponse.json({ success: true, message: `Delivery Note ${data.name} submitted. Stock has been moved out.`, data });
  } catch (error) { return wmsErrorResponse(error); }
}
