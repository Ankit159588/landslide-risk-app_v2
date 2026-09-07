const mongoose = require("mongoose");

const predictionHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    locationName: { type: String },
    prediction: { type: Number, required: true }, // raw model output, e.g. 0 or 1
    riskLabel: { type: String, required: true }, // "Prone" | "Not Prone"
    probability: { type: Number, default: null }, // null if model doesn't return one
    authoritiesAlerted: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PredictionHistory", predictionHistorySchema);
