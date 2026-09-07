const { redis, ensureRedis } = require("../config/redis");

const keyFor = (userId) => `session:${userId}`;

// Returns the previously active token "family" for this user, if any -
// callers use this to know whether to revoke an older session on new login.
async function getActiveSession(userId) {
  try {
    await ensureRedis();
    return await redis.get(keyFor(userId));
  } catch (err) {
    console.error("Redis getActiveSession failed:", err.message);
    return null; // fail open - Mongo-side refresh token rotation is still authoritative
  }
}

async function setActiveSession(userId, family, ttlSeconds) {
  try {
    await ensureRedis();
    await redis.set(keyFor(userId), family, "EX", ttlSeconds);
  } catch (err) {
    console.error("Redis setActiveSession failed:", err.message);
  }
}

async function clearActiveSession(userId) {
  try {
    await ensureRedis();
    await redis.del(keyFor(userId));
  } catch (err) {
    console.error("Redis clearActiveSession failed:", err.message);
  }
}

module.exports = { getActiveSession, setActiveSession, clearActiveSession };
