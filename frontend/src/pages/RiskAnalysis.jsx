import { useState } from "react";
import api from "../api/axiosInstance";
import MapPicker from "../components/MapPicker.jsx";
import LocationSearch from "../components/LocationSearch.jsx";
import RiskResult from "../components/RiskResult.jsx";
import SafetyRecommendations from "../components/SafetyRecommendations.jsx";

export default function RiskAnalysis() {
  const [position, setPosition] = useState(null); // [lat, lng]
  const [locationName, setLocationName] = useState("");
  const [result, setResult] = useState(null);
  const [gridPoints, setGridPoints] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gridLoading, setGridLoading] = useState(false);

  const resetForNewPoint = () => {
    setResult(null);
    setGridPoints([]);
    setError("");
  };

  const handlePick = (lat, lng, label) => {
    setPosition([lat, lng]);
    if (label) setLocationName(label);
    resetForNewPoint();
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => handlePick(pos.coords.latitude, pos.coords.longitude),
      () => setError("Could not access your location")
    );
  };

  const handleAnalyze = async () => {
    if (!position) return;
    setLoading(true);
    setGridLoading(true);
    setError("");
    try {
      const [{ data: predictionData }, gridRes] = await Promise.all([
        api.post("/predict", {
          latitude: position[0],
          longitude: position[1],
          locationName: locationName || undefined,
        }),
        api
          .post("/predict/grid", { latitude: position[0], longitude: position[1], radiusKm: 6, steps: 5 })
          .catch(() => null), // heatmap is a bonus - don't fail the whole analysis if it errors
      ]);
      setResult(predictionData);
      if (gridRes) setGridPoints(gridRes.data.points);
    } catch (err) {
      setError(err.response?.data?.message || "Prediction failed");
    } finally {
      setLoading(false);
      setGridLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl text-slate-50">Landslide risk analysis</h1>
      <p className="mt-2 text-sm text-slate-400">
        Search a place, click the map, or use your current location, then run the analysis.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <LocationSearch onSelect={handlePick} />
        <button
          onClick={handleUseMyLocation}
          className="rounded-lg bg-white/5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10"
        >
          📍 My location
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
        <MapPicker position={position} onChange={handlePick} gridPoints={gridPoints} />
      </div>

      {gridPoints.length > 0 && (
        <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#4b7c5a]" /> Low</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#c2703d]" /> Moderate</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#dc4a2f]" /> High</span>
          <span>— susceptibility in the surrounding area</span>
        </div>
      )}

      {position && (
        <p className="mt-3 text-sm text-slate-400">
          Selected: {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        onClick={handleAnalyze}
        disabled={!position || loading}
        className="mt-6 w-full rounded-lg bg-clay-500 py-3 font-medium text-slate-950 hover:bg-clay-600 disabled:opacity-40"
      >
        {loading ? (gridLoading ? "Analyzing area…" : "Analyzing…") : "Analyze risk"}
      </button>

      <RiskResult result={result} />
      {result && <SafetyRecommendations riskLabel={result.riskLabel} />}
    </div>
  );
}
