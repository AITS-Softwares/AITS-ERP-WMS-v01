import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { listPhysicalLocations } from "@/services/integrations/erpnext/wms/physicalLocationService";
export async function GET(req) { try { const user = getWarehouseSession(req); if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 }); return NextResponse.json({ success: true, data: await listPhysicalLocations(user.companyId, req.nextUrl.searchParams.get("company") || "") }); } catch (error) { return wmsErrorResponse(error); } }
