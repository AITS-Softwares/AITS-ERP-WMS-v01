export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { createMaterialReceiptStockEntry } from "@/services/integrations/erpnext/wms/stockEntryService";

export async function POST(req) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager or System Manager access is required." }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const data = await createMaterialReceiptStockEntry(user.companyId, body);
    return NextResponse.json({ success: true, message: `Stock Entry ${data.name} submitted. ERPNext stock has been updated.`, data });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}
