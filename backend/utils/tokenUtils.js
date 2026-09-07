const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken");
const { getActiveSession, setActiveSession, clearActiveSession } = require("./sessionStore");

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

function msFromExpiry(expiry) {
  // supports "15m", "7d", "1h" style strings
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) return 15 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * unitMs[unit];
}

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY,
  });
}

function signRefreshToken(user, family) {
  // family stays constant across rotations; jti is unique per issued token
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: user._id.toString(), family, jti },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
  return { token, jti };
}

// Issues a brand-new access+refresh pair and starts a new rotation family.
// Used at login/register/OTP-verify. If SINGLE_SESSION_LOGIN is enabled,
// any previously active session for this user (tracked in Redis) is
// revoked first, so logging in on a new device signs the old one out -
// mirrors how most bank/OTP apps behave.
async function issueTokenPair(user) {
  if (process.env.SINGLE_SESSION_LOGIN === "true") {
    const previousFamily = await getActiveSession(user._id.toString());
    if (previousFamily) {
      await RefreshToken.updateMany({ family: previousFamily }, { revoked: true });
    }
  }

  const family = crypto.randomUUID();
  const { token: refreshToken } = signRefreshToken(user, family);
  const accessToken = signAccessToken(user);
  const ttlMs = msFromExpiry(REFRESH_EXPIRY);

  await RefreshToken.create({
    user: user._id,
    tokenHash: RefreshToken.hash(refreshToken),
    family,
    expiresAt: new Date(Date.now() + ttlMs),
  });

  await setActiveSession(user._id.toString(), family, Math.floor(ttlMs / 1000));

  return { accessToken, refreshToken };
}

// Rotates an existing refresh token: verifies it, checks it hasn't already
// been used (reuse => whole family revoked, likely theft), marks it used,
// and issues a new pair in the same family.
async function rotateRefreshToken(rawToken) {
  let payload;
  try {
    payload = jwt.verify(rawToken, REFRESH_SECRET);
  } catch {
    const err = new Error("Invalid or expired refresh token");
    err.status = 401;
    throw err;
  }

  const tokenHash = RefreshToken.hash(rawToken);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored || stored.revoked) {
    // Token reuse or unknown token: nuke the whole family as a precaution.
    if (stored) {
      await RefreshToken.updateMany(
        { family: stored.family },
        { revoked: true }
      );
    }
    const err = new Error("Refresh token reuse detected. Please log in again.");
    err.status = 401;
    throw err;
  }

  // mark this token as spent
  stored.revoked = true;

  const User = require("../models/User");
  const user = await User.findById(payload.sub);
  if (!user) {
    const err = new Error("User no longer exists");
    err.status = 401;
    throw err;
  }

  const { token: newRefreshToken } = signRefreshToken(user, stored.family);
  stored.replacedByHash = RefreshToken.hash(newRefreshToken);
  await stored.save();

  await RefreshToken.create({
    user: user._id,
    tokenHash: RefreshToken.hash(newRefreshToken),
    family: stored.family,
    expiresAt: new Date(Date.now() + msFromExpiry(REFRESH_EXPIRY)),
  });

  const accessToken = signAccessToken(user);
  await setActiveSession(user._id.toString(), stored.family, Math.floor(msFromExpiry(REFRESH_EXPIRY) / 1000));
  return { accessToken, refreshToken: newRefreshToken, user };
}

async function revokeRefreshToken(rawToken) {
  const tokenHash = RefreshToken.hash(rawToken);
  const stored = await RefreshToken.findOneAndUpdate({ tokenHash }, { revoked: true });
  if (stored) await clearActiveSession(stored.user.toString());
}

async function revokeAllForUser(userId) {
  await RefreshToken.updateMany({ user: userId }, { revoked: true });
  await clearActiveSession(userId.toString());
}

module.exports = {
  signAccessToken,
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
};
