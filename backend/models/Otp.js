const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    purpose: { type: String, enum: ["register", "login"], required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 }, // failed-verify counter, throttles brute force
    // For "register" purpose we stash the pending signup data here so we only
    // create the User once the OTP is verified.
    pendingUser: {
      name: String,
      email: String,
      password: String, // already hashed before saving into this field
    },
  },
  { timestamps: true }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Otp", otpSchema);
