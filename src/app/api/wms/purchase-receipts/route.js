export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { createPurchaseReceipt, listPurchaseReceipts } from "@/services/integrations/erpnext/wms/purchaseReceiptService";

export async function GET(req) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const query = req.nextUrl.searchParams;
    const data = await listPurchaseReceipts(user.companyId, {
      page: query.get("page"),
      pageSize: query.get("pageSize"),
      search: query.get("search") || "",
    });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}

// Creating a GRN always submits the Purchase Receipt in ERPNext — that submit
// is the real "stock in" action, not a draft save. See docs/wms-field-mapping-contract.md.
export async function POST(req) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager or System Manager access is required." }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const doc = await createPurchaseReceipt(user.companyId, body);
    return NextResponse.json({ success: true, message: `GRN ${doc.name} submitted. ERPNext stock has been updated.`, data: doc });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}
