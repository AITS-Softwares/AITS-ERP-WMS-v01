import dbConnect from "@/lib/db";
import WmsCartonBarcode from "@/models/WmsCartonBarcode";

export async function markCartonBarcodeScanned(companyId, id) {
  await dbConnect();
  const now = new Date();
  const candidate = await WmsCartonBarcode.findOne({ _id: id, companyId, status: { $in: ["Generated", "Updated"] }, scannedAt: null, $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }] }).lean();
  const record = candidate ? await WmsCartonBarcode.findOneAndUpdate(
    { _id: candidate._id, companyId, status: candidate.status, scannedAt: null },
    { $set: { status: "Receiving", priorStatus: candidate.status } },
    { new: true },
  ) : null;
  if (!record) {
    const existing = await WmsCartonBarcode.findOne({ _id: id, companyId }).lean();
    const error = new Error(existing?.scannedAt || existing?.status === "Receiving" ? "This carton barcode has already been scanned or is being received." : existing?.status === "Regenerated" ? "This label has been regenerated. Scan the replacement barcode." : "Barcode not found or past its product expiry date.");
    error.status = 400;
    throw error;
  }
  return record;
}

export async function completeCartonBarcodeScan(companyId, id) {
  await dbConnect();
  const record = await WmsCartonBarcode.findOneAndUpdate(
    { _id: id, companyId, status: "Receiving", scannedAt: null },
    { $set: { status: "Scanned", scannedAt: new Date() } },
    { new: true },
  );
  if (!record) {
    const error = new Error("The stock receipt succeeded, but the barcode status could not be updated. Refresh Barcode Master.");
    error.status = 409;
    throw error;
  }
  return record;
}

export async function releaseCartonBarcodeScan(companyId, id) {
  await dbConnect();
  const record = await WmsCartonBarcode.findOne({ _id: id, companyId, status: "Receiving", scannedAt: null }).lean();
  if (record) await WmsCartonBarcode.updateOne({ _id: record._id, companyId, status: "Receiving" }, { $set: { status: record.priorStatus || "Generated" } });
}

export async function resolveCartonMasterBarcode(companyId, barcodeValue) {
  const code = String(barcodeValue || "").trim();
  if (!code.startsWith("WMSMC-")) return null;
  await dbConnect();
  const record = await WmsCartonBarcode.findOne({ companyId, barcodeValue: code }).lean();
  if (!record) return null;
  const expired = record.expiryDate && new Date(record.expiryDate).getTime() < Date.now();
  if (expired) {
    const error = new Error(`Carton barcode ${code} expired on ${new Date(record.expiryDate).toLocaleDateString()}.`);
    error.status = 400;
    throw error;
  }
  if (record.status === "Regenerated") {
    const error = new Error("This label has been regenerated. Scan the replacement barcode.");
    error.status = 400;
    throw error;
  }
  return {
    itemCode: record.itemCode,
    itemName: record.itemName,
    stockUom: record.stockUom || "Piece",
    uom: record.uom,
    conversionFactor: record.quantity,
    barcode: record.barcodeValue,
    barcodeMasterId: String(record._id),
    status: record.status,
    expiryDate: record.expiryDate,
    scannedAt: record.scannedAt,
    alreadyScanned: Boolean(record.scannedAt),
  };
}
