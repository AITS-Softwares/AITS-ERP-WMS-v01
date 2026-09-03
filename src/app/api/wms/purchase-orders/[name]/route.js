export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { getPurchaseOrder, submitPurchaseOrder } from "@/services/integrations/erpnext/wms/purchaseOrderService";

export async function GET(req, { params }) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const { name } = await params;
    const doc = await getPurchaseOrder(user.companyId, decodeURIComponent(name));
    return NextResponse.json({ success: true, data: doc }, { headers: { "Cache-Control": "private, max-age=15" } });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}

// Submits a previously-saved draft Purchase Order — the only mutation this route supports.
export async function PATCH(req, { params }) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager or System Manager access is required." }, { status: 401 });
    const { name } = await params;
    const doc = await submitPurchaseOrder(user.companyId, decodeURIComponent(name));
    return NextResponse.json({ success: true, message: `Purchase Order ${doc.name} submitted to ERPNext.`, data: doc });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}
