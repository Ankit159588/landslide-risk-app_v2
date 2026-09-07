const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    isVerified: { type: Boolean, default: false }, // set true after OTP verification
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  // Registration flow pre-hashes the password before it ever reaches this
  // model (so the plaintext never touches the Otp collection either) -
  // detect that and don't hash it a second time.
  if (BCRYPT_HASH_PATTERN.test(this.password)) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
