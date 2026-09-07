const PredictionHistory = require("../models/PredictionHistory");
const Authority = require("../models/Authority");
const { sendEmail, disasterAlertTemplate } = require("../utils/sendEmail");
const { runModel } = require("../utils/modelClient");

const ALERT_THRESHOLD = Number(process.env.DISASTER_ALERT_THRESHOLD || 0.5);

function validateCoords(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

function riskColor(probability, prediction) {
  // Falls back to binary color if the model doesn't return a probability
  if (probability === null || probability === undefined) {
    return prediction === 1 ? "red" : "green";
  }
  if (probability >= 0.66) return "red";
  if (probability >= 0.33) return "orange";
  return "green";
}

// POST /api/predict  { latitude, longitude, locationName? }
async function predict(req, res, next) {
  try {
    const { latitude, longitude, locationName } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "latitude and longitude are required" });
    }
    const coords = validateCoords(latitude, longitude);
    if (!coords) return res.status(400).json({ message: "Invalid latitude/longitude" });
    const { lat, lng } = coords;

    let modelResult;
    try {
      modelResult = await runModel(lat, lng);
    } catch (mlErr) {
      console.error("ML model request failed:", mlErr.message);
      return res.status(502).json({ message: "Prediction service unavailable. Try again shortly." });
    }

    const { prediction, probability } = modelResult;
    if (![0, 1].includes(prediction)) {
      return res.status(502).json({ message: "Unexpected response from prediction model" });
    }

    const isProne = prediction === 1;
    const riskLabel = isProne ? "Prone" : "Not Prone";
    const shouldAlert = isProne && (probability === null || probability >= ALERT_THRESHOLD);

    let authoritiesAlerted = [];
    if (shouldAlert) {
      const authorities = await Authority.findForCoordinates(lat, lng);
      const emails = [...new Set(authorities.flatMap((a) => a.emails))];
      if (emails.length > 0) {
        const { subject, html, text } = disasterAlertTemplate({
          locationName,
          latitude: lat,
          longitude: lng,
          riskLabel,
          probability,
        });
        try {
          await sendEmail({ to: emails, subject, html, text });
          authoritiesAlerted = emails;
        } catch (mailErr) {
          console.error("Failed to send disaster alert email:", mailErr.message);
        }
      }
    }

    const history = await PredictionHistory.create({
      user: req.userId,
      latitude: lat,
      longitude: lng,
      locationName,
      prediction,
      riskLabel,
      probability,
      authoritiesAlerted,
    });

    res.json({
      latitude: lat,
      longitude: lng,
      locationName: locationName || null,
      prediction,
      riskLabel,
      probability,
      alertSent: authoritiesAlerted.length > 0,
      historyId: history._id,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/predict/grid  { latitude, longitude, radiusKm?, steps? }
// Samples a small grid of points around the center so the frontend can draw
// a heatmap-style susceptibility overlay, instead of just one marker.
async function predictGrid(req, res, next) {
  try {
    const { latitude, longitude, radiusKm = 5, steps = 5 } = req.body;
    const coords = validateCoords(latitude, longitude);
    if (!coords) return res.status(400).json({ message: "Invalid latitude/longitude" });
    const { lat, lng } = coords;

    const clampedSteps = Math.min(Math.max(Number(steps) || 5, 3), 7); // cap grid size
    const clampedRadius = Math.min(Math.max(Number(radiusKm) || 5, 1), 25); // km

    // Rough km -> degree conversion (good enough at this zoom level)
    const latDegPerKm = 1 / 110.574;
    const lngDegPerKm = 1 / (111.32 * Math.cos((lat * Math.PI) / 180));

    const half = Math.floor(clampedSteps / 2);
    const offsets = Array.from({ length: clampedSteps }, (_, i) => i - half);
    const step = clampedRadius / (half || 1);

    const points = [];
    for (const dy of offsets) {
      for (const dx of offsets) {
        const pointLat = lat + dy * step * latDegPerKm;
        const pointLng = lng + dx * step * lngDegPerKm;
        points.push({ pointLat, pointLng });
      }
    }

    // Run all grid cells in parallel - fine at this grid size (max 7x7=49),
    // and the mock/direct/apikey client all handle concurrent calls fine.
    const results = await Promise.all(
      points.map(async ({ pointLat, pointLng }) => {
        try {
          const { prediction, probability } = await runModel(pointLat, pointLng);
          return {
            latitude: pointLat,
            longitude: pointLng,
            prediction,
            probability,
            color: riskColor(probability, prediction),
          };
        } catch {
          return { latitude: pointLat, longitude: pointLng, prediction: null, probability: null, color: "gray" };
        }
      })
    );

    res.json({ center: { latitude: lat, longitude: lng }, radiusKm: clampedRadius, points: results });
  } catch (err) {
    next(err);
  }
}

// GET /api/predict/history
async function getHistory(req, res, next) {
  try {
    const history = await PredictionHistory.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

module.exports = { predict, predictGrid, getHistory };
