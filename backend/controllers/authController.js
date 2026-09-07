const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Otp = require("../models/Otp");
const { generateOtp, hashOtp } = require("../utils/otp");
const { sendEmail, otpEmailTemplate } = require("../utils/sendEmail");
const {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
} = require("../utils/tokenUtils");

const OTP_EXPIRY_MS = (Number(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000;

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/auth", // only sent to auth routes
};

function setRefreshCookie(res, token) {
  res.cookie("refreshToken", token, {
    ...REFRESH_COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function createAndSendOtp({ email, purpose, pendingUser }) {
  const otp = generateOtp();
  await Otp.deleteMany({ email, purpose }); // clear any earlier pending OTPs
  await Otp.create({
    email,
    purpose,
    otpHash: hashOtp(otp),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    pendingUser,
  });

  const { subject, html, text } = otpEmailTemplate(otp, purpose);
  await sendEmail({ to: email, subject, html, text });
}

// ---------- Step 1: Register (password-based, gated by OTP) ----------
// POST /api/auth/register  { name, email, password }
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    // Hash password now so we never store it in plaintext, even temporarily
    const passwordHash = await bcrypt.hash(password, 10);

    await createAndSendOtp({
      email: email.toLowerCase(),
      purpose: "register",
      pendingUser: { name, email: email.toLowerCase(), password: passwordHash },
    });

    res.status(200).json({
      message: "OTP sent to your email. Verify it to complete registration.",
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/register/verify-otp  { email, otp }
async function verifyRegisterOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "email and otp are required" });
    }

    const record = await Otp.findOne({ email: email.toLowerCase(), purpose: "register" });
    if (!record) {
      return res.status(400).json({ message: "No pending registration for this email" });
    }
    if (record.expiresAt < new Date()) {
      await record.deleteOne();
      return res.status(400).json({ message: "OTP expired. Please register again." });
    }
    if (record.attempts >= 5) {
      await record.deleteOne();
      return res.status(429).json({ message: "Too many attempts. Please register again." });
    }
    if (record.otpHash !== hashOtp(otp)) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    // OTP correct: create the real user now
    const user = await User.create({
      name: record.pendingUser.name,
      email: record.pendingUser.email,
      password: record.pendingUser.password, // already hashed; User pre-save hook
      isVerified: true,                       // won't double-hash since it detects the format below
    });

    await record.deleteOne();

    const { accessToken, refreshToken } = await issueTokenPair(user);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      message: "Registration complete",
      accessToken,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

// ---------- Login: password based ----------
// POST /api/auth/login  { email, password }
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const { accessToken, refreshToken } = await issueTokenPair(user);
    setRefreshCookie(res, refreshToken);

    res.json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

// ---------- Login: OTP based (passwordless) ----------
// POST /api/auth/login/request-otp  { email }
async function requestLoginOtp(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal whether the account exists
      return res.status(200).json({ message: "If that account exists, an OTP has been sent." });
    }

    await createAndSendOtp({ email: user.email, purpose: "login" });
    res.status(200).json({ message: "If that account exists, an OTP has been sent." });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login/verify-otp  { email, otp }
async function verifyLoginOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "email and otp are required" });
    }

    const record = await Otp.findOne({ email: email.toLowerCase(), purpose: "login" });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired or not found. Request a new one." });
    }
    if (record.attempts >= 5) {
      await record.deleteOne();
      return res.status(429).json({ message: "Too many attempts. Request a new OTP." });
    }
    if (record.otpHash !== hashOtp(otp)) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "Account no longer exists" });

    await record.deleteOne();

    const { accessToken, refreshToken } = await issueTokenPair(user);
    setRefreshCookie(res, refreshToken);

    res.json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

// ---------- Rotating refresh token ----------
// POST /api/auth/refresh  (reads refreshToken from httpOnly cookie)
async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (!rawToken) return res.status(401).json({ message: "No refresh token provided" });

    const { accessToken, refreshToken } = await rotateRefreshToken(rawToken);
    setRefreshCookie(res, refreshToken);

    res.json({ accessToken });
  } catch (err) {
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    next(err);
  }
}

// POST /api/auth/logout
async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (rawToken) await revokeRefreshToken(rawToken);
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout-all  (requires access token) - revokes every session
async function logoutAll(req, res, next) {
  try {
    await revokeAllForUser(req.userId);
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.json({ message: "Logged out from all devices" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  verifyRegisterOtp,
  login,
  requestLoginOtp,
  verifyLoginOtp,
  refresh,
  logout,
  logoutAll,
};
