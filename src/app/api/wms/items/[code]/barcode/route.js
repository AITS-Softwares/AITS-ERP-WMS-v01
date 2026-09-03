export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { generateItemBarcode } from "@/services/integrations/erpnext/wms/itemCartonService";

export async function POST(req, { params }) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager or System Manager access is required." }, { status: 401 });
    const { code } = await params;
    const body = await req.json().catch(() => ({}));
    const data = await generateItemBarcode(user.companyId, decodeURIComponent(code), body.uom);
    return NextResponse.json({ success: true, message: data.created ? `Barcode registered for ${data.itemCode} (${data.uom}).` : `Existing barcode reused for ${data.itemCode} (${data.uom}).`, data });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}
