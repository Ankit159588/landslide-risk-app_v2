const mongoose = require("mongoose");

// A very simple region lookup: each authority document covers a rectangular
// lat/lng box (a district, roughly). When a prediction inside that box comes
// back "disaster prone", every email in `emails` gets alerted.
const authoritySchema = new mongoose.Schema({
  district: { type: String, required: true },
  state: { type: String, required: true },
  minLat: { type: Number, required: true },
  maxLat: { type: Number, required: true },
  minLng: { type: Number, required: true },
  maxLng: { type: Number, required: true },
  emails: { type: [String], required: true },
});

authoritySchema.statics.findForCoordinates = function (lat, lng) {
  return this.find({
    minLat: { $lte: lat },
    maxLat: { $gte: lat },
    minLng: { $lte: lng },
    maxLng: { $gte: lng },
  });
};

module.exports = mongoose.model("Authority", authoritySchema);
