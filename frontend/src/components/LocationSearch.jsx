import { useEffect, useRef, useState } from "react";

// Nominatim is OpenStreetMap's free geocoding search - no API key required,
// fine for a demo/SIH volume of requests. Swap NOMINATIM_URL for a paid
// geocoder later if you need production-scale rate limits.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export default function LocationSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `${NOMINATIM_URL}?format=json&addressdetails=0&limit=5&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const data = await res.json();
        setSuggestions(data);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePick = (place) => {
    setQuery(place.display_name);
    setOpen(false);
    onSelect(Number(place.lat), Number(place.lon), place.display_name);
  };

  return (
    <div ref={boxRef} className="relative flex-1">
      <input
        placeholder="Search a place (village, town, landmark)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        className="w-full rounded-lg bg-white/5 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-clay-500"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-slate-500">searching…</span>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-xl">
          {suggestions.map((s) => (
            <li key={s.place_id}>
              <button
                type="button"
                onClick={() => handlePick(s)}
                className="block w-full truncate px-4 py-2 text-left text-sm text-slate-200 hover:bg-white/10"
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
