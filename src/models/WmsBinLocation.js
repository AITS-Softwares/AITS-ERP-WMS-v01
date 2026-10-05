import mongoose from "mongoose";

const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  warehouseId: { type: String, required: true, trim: true },
  state: { type: String, trim: true, default: "" },
  rackId: { type: mongoose.Schema.Types.ObjectId, ref: "WmsRack", required: true },
  shelfId: { type: mongoose.Schema.Types.ObjectId, ref: "WmsShelf", required: true },
  binNumber: { type: String, required: true, trim: true },
  binCode: { type: String, required: true, trim: true },
  capacity: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true, collection: "wms_bin_locations" });
schema.index({ companyId: 1, binCode: 1 }, { unique: true });
export default mongoose.models.WmsBinLocation || mongoose.model("WmsBinLocation", schema);
