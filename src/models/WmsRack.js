import mongoose from "mongoose";

const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  rackCode: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  capacity: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true, collection: "wms_racks" });
schema.index({ companyId: 1, rackCode: 1 }, { unique: true });
export default mongoose.models.WmsRack || mongoose.model("WmsRack", schema);
