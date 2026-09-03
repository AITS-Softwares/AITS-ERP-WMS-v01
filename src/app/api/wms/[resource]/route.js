export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { getWmsMasterRecords, isWmsResource } from "@/services/integrations/erpnext/wms/masterDataService";

export async function GET(req, { params }) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    const { resource } = await params;
    if (!isWmsResource(resource)) return NextResponse.json({ success: false, message: "Unknown WMS resource." }, { status: 404 });
    const query = req.nextUrl.searchParams;
    const company = query.get("company") || "";
    const data = await getWmsMasterRecords(user.companyId, resource, {
      page: query.get("page"),
      pageSize: query.get("pageSize"),
      search: query.get("search") || "",
      // Warehouses belong to one ERPNext Company — scope the picker once a
      // Purchase Order's Company is known, so cross-company mismatches can't happen.
      extraFilters: resource === "warehouses" && company ? [["Warehouse", "company", "=", company]] : undefined,
    });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (error) {
    return wmsErrorResponse(error);
  }
}
