import mongoose from "mongoose";

const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  barcodeValue: { type: String, required: true, trim: true },
  itemCode: { type: String, required: true, trim: true },
  itemName: { type: String, trim: true, default: "" },
  warehouseId: { type: String, required: true, trim: true },
  binLocationId: { type: mongoose.Schema.Types.ObjectId, ref: "WmsBinLocation", required: true },
  quantity: { type: Number, default: 1, min: 0 },
  generatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["Active", "Void"], default: "Active" },
}, { timestamps: true, collection: "wms_barcode_labels" });
schema.index({ barcodeValue: 1 }, { unique: true });
export default mongoose.models.WmsBarcodeLabel || mongoose.model("WmsBarcodeLabel", schema);
