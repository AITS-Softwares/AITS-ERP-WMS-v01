export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import dbConnect from "@/lib/db";
import { getWarehouseSession } from "@/lib/wmsAuth";
import { wmsErrorResponse } from "@/lib/wmsApiError";
import WmsCartonBarcode from "@/models/WmsCartonBarcode";
import { getItemCartonSetup } from "@/services/integrations/erpnext/wms/itemCartonService";

export async function GET(req) {
  try {
    const user = getWarehouseSession(req);
    if (!user) return NextResponse.json({ success: false, message: "Warehouse access is required." }, { status: 401 });
    await dbConnect();
    const search = (req.nextUrl.searchParams.get("search") || "").trim();
    const filter = { companyId: user.companyId };
    if (search) filter.$or = ["barcodeValue", "itemCode", "itemName", "status"].map((key) => ({ [key]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }));
    const records = await WmsCartonBarcode.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
    return NextResponse.json({ success: true, data: records });
  } catch (error) { return wmsErrorResponse(error); }
}

export async function POST(req) {
  try {
    const user = getWarehouseSession(req, { manage: true });
    if (!user) return NextResponse.json({ success: false, message: "Warehouse Manager or System Manager access is required." }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const itemCode = String(body.itemCode || "").trim();
    const cartonCount = Number(body.cartonCount);
    const quantity = Number(body.quantity);
    const totalQuantity = Number(body.totalQuantity);
    if (!itemCode) return NextResponse.json({ success: false, message: "Select an item." }, { status: 400 });
    const usesTotal = Number.isInteger(totalQuantity) && totalQuantity > 0;
    if (usesTotal && totalQuantity > 500) return NextResponse.json({ success: false, message: "Generate no more than 500 barcodes per batch." }, { status: 400 });
    if (!usesTotal && (!Number.isInteger(cartonCount) || cartonCount < 1 || cartonCount > 500)) return NextResponse.json({ success: false, message: "Enter a total barcode count, or a carton count." }, { status: 400 });
    if (!usesTotal && (!Number.isInteger(quantity) || quantity < 1)) return NextResponse.json({ success: false, message: "Pieces per carton must be a positive whole number." }, { status: 400 });
    const expiryDate = body.expiryDate ? new Date(`${body.expiryDate}T23:59:59.999Z`) : null;
    if (body.expiryDate && Number.isNaN(expiryDate.getTime())) return NextResponse.json({ success: false, message: "Enter a valid expiry date." }, { status: 400 });

    const item = await getItemCartonSetup(user.companyId, itemCode);
    const erpCartonFactor = Number(item.cartonConversionFactor);
    const piecesPerCarton = Number.isFinite(erpCartonFactor) && erpCartonFactor > 0 ? erpCartonFactor : 1;
    const cartonQuantities = usesTotal
      ? Array.from({ length: totalQuantity }, () => piecesPerCarton)
      : Array.from({ length: cartonCount }, () => quantity);
    if (cartonQuantities.length > 500) return NextResponse.json({ success: false, message: "This would create more than 500 barcode labels." }, { status: 400 });
    await dbConnect();
    const records = cartonQuantities.map((cartonQuantity) => ({
      companyId: user.companyId,
      barcodeValue: `WMSMC-${randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`,
      itemCode: item.itemCode,
      itemName: item.itemName,
      stockUom: item.stockUom,
      uom: "Master Carton",
      quantity: cartonQuantity,
      expiryDate,
      barcodeExpiresAt: expiryDate,
      status: "Generated",
    }));
    const created = await WmsCartonBarcode.insertMany(records, { ordered: true });
    return NextResponse.json({ success: true, message: `${created.length} carton barcode${created.length === 1 ? "" : "s"} saved. Barcode validity follows the product expiry date, if set.`, data: created }, { status: 201 });
  } catch (error) { return wmsErrorResponse(error); }
}
