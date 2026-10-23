import { NextResponse } from "next/server";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import { resolveWmsErpnextContext } from "@/services/integrations/erpnext/wms/masterDataService";
import { erpnextRequestWithConfig } from "@/services/integrations/erpnext/erpnextClient";
import { insertERPNextDoc } from "@/services/integrations/erpnext/wms/wmsDocumentHelpers";

const definitions = {
  racks: ["Rack Master", ["rack_name", "has_shelf", "capacity"]],
  shelves: ["Shelf Master", ["shelf_name", "rack", "capacity", "has_bin"]],
  bins: ["Bin Master", ["bin_code", "rack", "shelf", "capacity"]],
  locations: ["Bin Master Location", ["location", "warehouse", "physical_locations"]],
};
export async function GET(req) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ message: "Warehouse access is required." }, { status: 401 });
    const { config } = await resolveWmsErpnextContext(user.companyId);
    const entries = await Promise.all(Object.entries(definitions).map(async ([key, [doctype, fields]]) => {
      const records = [];
      for (let start = 0; ; start += 100) {
        const query = new URLSearchParams({ fields: JSON.stringify(["name", ...fields.filter((field) => field !== "physical_locations")]), limit_start: String(start), limit_page_length: "100", order_by: "name asc" });
        const payload = await erpnextRequestWithConfig(config, `/api/resource/${encodeURIComponent(doctype)}?${query}`, { method: "GET" });
        const page = payload?.data || []; records.push(...page);
        if (page.length < 100) break;
      }
      return [key, records];
    }));
    return NextResponse.json({ data: Object.fromEntries(entries) });
  } catch (error) { return wmsErrorResponse(error); }
}
export async function POST(req) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ message: "Warehouse management access is required." }, { status: 401 });
    const input = await req.json();
    const definition = definitions[input.kind];
    if (!definition) return NextResponse.json({ message: "Invalid master type." }, { status: 400 });
    const [doctype, fields] = definition;
    const body = Object.fromEntries(fields.filter((field) => input[field] !== undefined).map((field) => [field, input[field]]));
    if (input.kind === "locations") body.physical_locations = (Array.isArray(input.physical_locations) ? input.physical_locations : []).map(({ rack, shelf, bin }) => ({ rack, shelf: shelf || "", bin: bin || "" }));
    const { config } = await resolveWmsErpnextContext(user.companyId);
    const data = await insertERPNextDoc(config, doctype, { doctype, ...body });
    return NextResponse.json({ data, message: `${doctype} ${data.name} created.` });
  } catch (error) { return wmsErrorResponse(error); }
}
