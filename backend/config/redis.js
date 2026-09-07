const Redis = require("ioredis");

// Used for fast session bookkeeping: which refresh-token "family" is the
// currently valid one for a given user, so we can enforce single-active-
// session login and get instant logout without waiting on Mongo TTL.
const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

let connected = false;
async function ensureRedis() {
  if (!connected) {
    try {
      await redis.connect();
      connected = true;
      console.log("Redis connected");
    } catch (err) {
      console.error("Redis connection failed - session features degraded:", err.message);
    }
  }
}

module.exports = { redis, ensureRedis };
