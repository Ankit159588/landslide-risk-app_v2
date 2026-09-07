const axios = require("axios");
const { mockPredict } = require("./mockModel");

// ---- Dual mode ML client -------------------------------------------------
// Controlled entirely by env vars so you can flip modes without touching
// code:
//
//   USE_MOCK_ML=true            -> always use the deterministic mock (demos)
//   ML_MODE=direct              -> POST { latitude, longitude } to ML_MODEL_URL,
//                                   no auth header (your own model server)
//   ML_MODE=apikey              -> GET/POST to EXTERNAL_ML_API_URL with an
//                                   `x-api-key` header (third-party risk API)
//
// Both real modes are normalized to the same { prediction, probability }
// shape before being handed back to the controller, regardless of what the
// upstream service actually returns.

async function callDirectModel(lat, lng) {
  const { data } = await axios.post(
    process.env.ML_MODEL_URL,
    { latitude: lat, longitude: lng },
    { timeout: 10000 }
  );
  const prediction = Number(data.prediction);
  const probability = data.probability !== undefined ? Number(data.probability) : null;
  return { prediction, probability };
}

async function callApiKeyModel(lat, lng) {
  const { data } = await axios.get(process.env.EXTERNAL_ML_API_URL, {
    params: { lat, lon: lng },
    headers: { "x-api-key": process.env.EXTERNAL_ML_API_KEY },
    timeout: 10000,
  });
  // Third-party APIs vary in shape - adjust this mapping to match whichever
  // service you're actually integrating. Two common shapes handled here:
  //   { prone: true/false, confidence: 0.82 }
  //   { prediction: 1, probability: 0.82 }
  let prediction;
  let probability = null;
  if (data.prediction !== undefined) {
    prediction = Number(data.prediction);
    probability = data.probability !== undefined ? Number(data.probability) : null;
  } else if (data.prone !== undefined) {
    prediction = data.prone ? 1 : 0;
    probability = data.confidence !== undefined ? Number(data.confidence) : null;
  } else {
    throw new Error("Unrecognized response shape from external ML API");
  }
  return { prediction, probability };
}

// Single entry point used by both the single-point predict endpoint and the
// grid/heatmap endpoint.
async function runModel(lat, lng) {
  if (process.env.USE_MOCK_ML === "true") {
    return mockPredict(lat, lng);
  }

  const mode = (process.env.ML_MODE || "direct").toLowerCase();
  if (mode === "apikey") {
    return callApiKeyModel(lat, lng);
  }
  return callDirectModel(lat, lng);
}

module.exports = { runModel };
