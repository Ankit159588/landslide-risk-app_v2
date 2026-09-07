import { useEffect, useState } from "react";
import api from "../api/axiosInstance";

export default function History() {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/predict/history")
      .then((res) => setEntries(res.data))
      .catch(() => setError("Could not load history"));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl text-slate-50">Recent analyses</h1>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-6 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
        {entries.length === 0 && !error && (
          <p className="p-6 text-sm text-slate-400">No analyses yet. Run one from Risk Analysis.</p>
        )}
        {entries.map((e) => (
          <div key={e._id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-slate-100">{e.locationName || `${e.latitude}, ${e.longitude}`}</p>
              <p className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                e.riskLabel === "Prone" ? "bg-clay-500/20 text-clay-500" : "bg-moss-500/20 text-moss-500"
              }`}
            >
              {e.riskLabel === "Prone" ? "High risk" : "Low risk"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
