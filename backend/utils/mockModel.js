const crypto = require("crypto");

// Deterministic "prediction" derived from the coordinates themselves, so the
// same location always gives the same result in a demo (looks intentional,
// not random) without needing your real model deployed yet.
function mockPredict(latitude, longitude) {
  const hash = crypto
    .createHash("md5")
    .update(`${latitude.toFixed(3)},${longitude.toFixed(3)}`)
    .digest("hex");

  // Turn the first 4 hex chars into a 0-1 float
  const bucket = parseInt(hash.slice(0, 4), 16) / 0xffff;
  const probability = Number(bucket.toFixed(2));
  const prediction = probability >= 0.5 ? 1 : 0;

  return { prediction, probability };
}

module.exports = { mockPredict };
