import { NextResponse } from "next/server";
import { ERPNextError } from "@/services/integrations/erpnext/erpnextClient";
import { getERPNextErrorMessage } from "@/services/integrations/erpnext/distributorAppService";

// Every WMS route was showing ERPNextError's generic wrapper text
// ("ERPNext request failed") instead of the actual reason ERPNext sent back
// (permission denied on a doctype, a validation error, etc.) — this decodes
// `_server_messages` the same way the distributor module already does.
export function wmsErrorResponse(error, fallbackStatus = 500) {
  if (error instanceof ERPNextError) {
    return NextResponse.json({ success: false, message: getERPNextErrorMessage(error) }, { status: error.status || 502 });
  }
  return NextResponse.json({ success: false, message: error.message || "Unable to complete this WMS request." }, { status: error.status || fallbackStatus });
}
