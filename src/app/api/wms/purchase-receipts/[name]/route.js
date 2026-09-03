export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { getPurchaseReceipt } from "@/services/integrations/erpnext/wms/purchaseReceiptService";

export async function GET(req, { params }) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const { name } = await params;
    const doc = await getPurchaseReceipt(user.companyId, decodeURIComponent(name));
    return NextResponse.json({ success: true, data: doc }, { headers: { "Cache-Control": "private, max-age=15" } });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}
