const HIGH_RISK_ACTIONS = [
  "Avoid unnecessary construction or excavation on the slope.",
  "Watch for early warning signs: new cracks in ground or walls, tilting trees or poles, unusual springs or seepage.",
  "Increase monitoring during and after heavy or prolonged rainfall.",
  "Keep a clear evacuation route in mind and share it with people nearby.",
  "Report visible ground movement to local disaster-management authorities immediately.",
];

const LOW_RISK_ACTIONS = [
  "No significant susceptibility was predicted for this point.",
  "Continue normal land use and periodic monitoring, especially before monsoon season.",
  "Still report any visible cracks or slope movement if you notice them.",
];

export default function SafetyRecommendations({ riskLabel }) {
  const isProne = riskLabel === "Prone";
  const actions = isProne ? HIGH_RISK_ACTIONS : LOW_RISK_ACTIONS;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">
        {isProne ? "What to do about it" : "Recommendation"}
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        {actions.map((a, i) => (
          <li key={i} className="flex gap-2">
            <span className={isProne ? "text-clay-500" : "text-moss-500"}>•</span>
            <span>{a}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
