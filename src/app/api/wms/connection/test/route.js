export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getWarehouseSession } from "@/lib/wmsAuth";
import ErpNextConnection from "@/models/ErpNextConnection";
import { buildERPNextConfig } from "@/services/integrations/erpnext/connectionService";
import { ERPNextError, erpnextRequestWithConfig } from "@/services/integrations/erpnext/erpnextClient";
import { getERPNextErrorMessage } from "@/services/integrations/erpnext/distributorAppService";

function messageFor(error) {
  if (error.code === "CONFIG_MISSING") return "ERPNext URL, API key, or API secret is missing.";
  if (error.code === "AUTH_FAILED") return "ERPNext rejected the API key or secret.";
  if (error.code === "TIMEOUT") return "ERPNext did not respond in time.";
  if (error.code === "NETWORK_ERROR") return "ERPNext could not be reached.";
  return getERPNextErrorMessage(error);
}

export async function POST(req) {
  let user;
  let connection;
  try {
    user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager or System Manager access is required." }, { status: 401 });
    await dbConnect();
    connection = await ErpNextConnection.findOne({ companyId: user.companyId, isActive: true }).sort({ isDefault: -1, updatedAt: -1 });
    if (!connection) return NextResponse.json({ success: false, message: "Save an ERPNext connection before testing it." }, { status: 400 });
    const result = await erpnextRequestWithConfig(buildERPNextConfig(connection), "/api/method/frappe.auth.get_logged_user", { method: "GET" });
    const loggedUser = String(result?.message || "");
    connection.lastTestedAt = new Date();
    connection.lastTestStatus = "success";
    connection.lastTestMessage = loggedUser || "Connection verified";
    await connection.save();
    return NextResponse.json({ success: true, message: "ERPNext connection verified.", loggedUser });
  } catch (rawError) {
    const error = rawError instanceof ERPNextError ? rawError : new ERPNextError(rawError.message || "ERPNext connection test failed", { code: rawError.code });
    if (connection) {
      connection.lastTestedAt = new Date();
      connection.lastTestStatus = "failure";
      connection.lastTestMessage = messageFor(error);
      await connection.save().catch(() => null);
    }
    return NextResponse.json({ success: false, message: messageFor(error) }, { status: error.status || 500 });
  }
}

