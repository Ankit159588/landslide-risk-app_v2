import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10">
      <Link to="/" className="flex items-center gap-2 font-display text-xl tracking-tight text-slate-50">
        Terra<span className="text-clay-500">Watch</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-body font-medium tracking-wide text-slate-400">v3</span>
      </Link>
      <div className="flex items-center gap-6 text-sm text-slate-300">
        <Link to="/" className="hover:text-slate-50">Home</Link>
        {user && <Link to="/analyze" className="hover:text-slate-50">Risk Analysis</Link>}
        {user && <Link to="/history" className="hover:text-slate-50">History</Link>}
        {user ? (
          <button onClick={handleLogout} className="text-clay-500 hover:text-clay-600">
            Log out
          </button>
        ) : (
          <>
            <Link to="/login" className="hover:text-slate-50">Log in</Link>
            <Link
              to="/register"
              className="rounded-full bg-clay-500 px-4 py-1.5 text-slate-950 font-medium hover:bg-clay-600"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
