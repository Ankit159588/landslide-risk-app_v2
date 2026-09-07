const mongoose = require("mongoose");
const crypto = require("crypto");

// We never store the raw refresh token, only a SHA-256 hash of it.
// "family" groups every token descended from the same original login,
// so if a rotated-out (already-used) token is presented again, we know
// the token was stolen/replayed and can revoke the whole family.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    replacedByHash: { type: String, default: null },
  },
  { timestamps: true }
);

refreshTokenSchema.statics.hash = function (rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

// TTL index: Mongo auto-deletes the doc once expiresAt passes
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
