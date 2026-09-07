export default function RiskResult({ result }) {
  if (!result) return null;

  const isProne = result.riskLabel === "Prone";

  return (
    <div
      className={`mt-6 rounded-xl border p-6 ${
        isProne ? "border-clay-500/40 bg-clay-500/10" : "border-moss-500/40 bg-moss-500/10"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-400">Prediction result</p>
      <p className={`mt-1 font-display text-3xl ${isProne ? "text-clay-500" : "text-moss-500"}`}>
        {isProne ? "Landslide Prone" : "Not Landslide Prone"}
      </p>

      {result.probability !== null && result.probability !== undefined && (
        <p className="mt-2 text-sm text-slate-300">
          Model confidence: {(result.probability * 100).toFixed(1)}%
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-300">
        <div>
          <p className="text-slate-500">Latitude</p>
          <p>{result.latitude}</p>
        </div>
        <div>
          <p className="text-slate-500">Longitude</p>
          <p>{result.longitude}</p>
        </div>
      </div>

      {result.alertSent && (
        <p className="mt-4 text-sm text-clay-500">
          District authorities for this area have been notified by email.
        </p>
      )}

      <p className="mt-4 text-xs text-slate-500">
        This is a model-based risk assessment, not a certainty. Follow local disaster-management
        advisories for the area.
      </p>
    </div>
  );
}
