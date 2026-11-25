import mongoose from "mongoose";

const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  barcodeValue: { type: String, required: true, trim: true },
  itemCode: { type: String, required: true, trim: true },
  itemName: { type: String, trim: true, default: "" },
  stockUom: { type: String, trim: true, default: "Piece" },
  uom: { type: String, trim: true, default: "Master Carton" },
  quantity: { type: Number, required: true, min: 1 },
  expiryDate: { type: Date, default: null },
  barcodeExpiresAt: { type: Date, default: null, index: true },
  status: { type: String, enum: ["Generated", "Receiving", "Scanned", "Updated", "Regenerated"], default: "Generated", index: true },
  priorStatus: { type: String, default: "Generated" },
  scannedAt: { type: Date, default: null },
  regeneratedFrom: { type: String, default: "" },
}, { timestamps: true, collection: "wms_carton_barcodes" });

schema.index({ companyId: 1, barcodeValue: 1 }, { unique: true });
schema.index({ companyId: 1, itemCode: 1, createdAt: -1 });

export default mongoose.models.WmsCartonBarcode || mongoose.model("WmsCartonBarcode", schema);
