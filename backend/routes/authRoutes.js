const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  register,
  verifyRegisterOtp,
  login,
  requestLoginOtp,
  verifyLoginOtp,
  refresh,
  logout,
  logoutAll,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Throttle OTP requests / login attempts to slow brute force & email spam
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { message: "Too many OTP requests. Please wait a few minutes." },
});
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Please wait a few minutes." },
});

router.post("/register", otpLimiter, register);
router.post("/register/verify-otp", verifyRegisterOtp);

router.post("/login", loginLimiter, login);
router.post("/login/request-otp", otpLimiter, requestLoginOtp);
router.post("/login/verify-otp", verifyLoginOtp);

router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", protect, logoutAll);

module.exports = router;
