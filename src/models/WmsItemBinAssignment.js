import mongoose from "mongoose";

const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  itemId: { type: String, trim: true, default: "" },
  itemCode: { type: String, required: true, trim: true },
  itemName: { type: String, trim: true, default: "" },
  warehouseId: { type: String, required: true, trim: true },
  binLocationId: { type: mongoose.Schema.Types.ObjectId, ref: "WmsBinLocation", required: true },
  isDefault: { type: Boolean, default: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
}, { timestamps: true, collection: "wms_item_bin_assignments" });
schema.index({ companyId: 1, itemCode: 1, warehouseId: 1 }, { unique: true });
export default mongoose.models.WmsItemBinAssignment || mongoose.model("WmsItemBinAssignment", schema);
