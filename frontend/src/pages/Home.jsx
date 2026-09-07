import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <p className="text-xs uppercase tracking-widest text-clay-500">North Eastern Region · Early Warning</p>
      <h1 className="mt-4 font-display text-5xl leading-tight text-slate-50">
        Is this ground stable enough to trust?
      </h1>
      <p className="mt-4 text-slate-400">
        Pick a point on the map. Our model checks it against terrain and historical patterns and
        tells you whether the location is landslide-prone — and alerts local authorities if it is.
      </p>
      <Link
        to={user ? "/analyze" : "/register"}
        className="mt-8 inline-block rounded-full bg-clay-500 px-8 py-3 font-medium text-slate-950 hover:bg-clay-600"
      >
        Analyze a location
      </Link>

      <div className="mt-20 grid grid-cols-1 gap-8 text-left sm:grid-cols-3">
        {[
          ["01", "Select location", "Click a point on the map or search a place."],
          ["02", "Model runs", "Latitude and longitude are sent to our prediction model."],
          ["03", "Get the result", "See the risk classification and, if needed, authorities are alerted."],
        ].map(([n, title, body]) => (
          <div key={n} className="border-l border-white/10 pl-4">
            <p className="text-sm text-clay-500">{n}</p>
            <p className="mt-1 font-medium text-slate-100">{title}</p>
            <p className="mt-1 text-sm text-slate-400">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
