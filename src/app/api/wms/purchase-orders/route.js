export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { getWmsMasterRecords } from "@/services/integrations/erpnext/wms/masterDataService";
import { createPurchaseOrder, listOpenPurchaseOrders } from "@/services/integrations/erpnext/wms/purchaseOrderService";

export async function GET(req) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });

    const query = req.nextUrl.searchParams;
    if (query.get("status") === "open") {
      const records = await listOpenPurchaseOrders(user.companyId);
      return NextResponse.json({ success: true, data: { records } }, { headers: { "Cache-Control": "private, max-age=15" } });
    }

    const data = await getWmsMasterRecords(user.companyId, "purchase-orders", {
      page: query.get("page"),
      pageSize: query.get("pageSize"),
      search: query.get("search") || "",
    });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}

export async function POST(req) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager or System Manager access is required." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const doc = await createPurchaseOrder(user.companyId, body, { submit: Boolean(body.submit) });
    return NextResponse.json({
      success: true,
      message: doc.docstatus === 1 ? `Purchase Order ${doc.name} submitted to ERPNext.` : `Purchase Order ${doc.name} saved as a draft in ERPNext.`,
      data: doc,
    });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}
