import mongoose from "mongoose";

const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  shelfCode: { type: String, required: true, trim: true },
  rackId: { type: mongoose.Schema.Types.ObjectId, ref: "WmsRack", required: true },
  capacity: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true, collection: "wms_shelves" });
schema.index({ companyId: 1, rackId: 1, shelfCode: 1 }, { unique: true });
export default mongoose.models.WmsShelf || mongoose.model("WmsShelf", schema);
