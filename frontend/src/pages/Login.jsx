import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login, requestLoginOtp, verifyLoginOtp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("password"); // "password" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/analyze");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await requestLoginOtp(email);
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send OTP");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await verifyLoginOtp(email, otp);
      navigate("/analyze");
    } catch (err) {
      setError(err.response?.data?.message || "Incorrect OTP");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-sm px-6">
      <h1 className="font-display text-3xl text-slate-50">Log in</h1>

      <div className="mt-6 flex gap-2 text-sm">
        <button
          onClick={() => { setMode("password"); setError(""); }}
          className={`rounded-full px-4 py-1.5 ${mode === "password" ? "bg-clay-500 text-slate-950" : "bg-white/5 text-slate-300"}`}
        >
          Password
        </button>
        <button
          onClick={() => { setMode("otp"); setError(""); }}
          className={`rounded-full px-4 py-1.5 ${mode === "otp" ? "bg-clay-500 text-slate-950" : "bg-white/5 text-slate-300"}`}
        >
          Email OTP
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {mode === "password" ? (
        <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
          <input
            type="email" required placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-white/5 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-clay-500"
          />
          <input
            type="password" required placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-white/5 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-clay-500"
          />
          <button disabled={busy} className="w-full rounded-lg bg-clay-500 py-2.5 font-medium text-slate-950 hover:bg-clay-600 disabled:opacity-50">
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>
      ) : !otpSent ? (
        <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
          <input
            type="email" required placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-white/5 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-clay-500"
          />
          <button disabled={busy} className="w-full rounded-lg bg-clay-500 py-2.5 font-medium text-slate-950 hover:bg-clay-600 disabled:opacity-50">
            {busy ? "Sending…" : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
          <p className="text-sm text-slate-400">Enter the code sent to {email}</p>
          <input
            required placeholder="6-digit code" value={otp} maxLength={6}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full rounded-lg bg-white/5 px-4 py-2.5 tracking-widest text-slate-100 outline-none focus:ring-2 focus:ring-clay-500"
          />
          <button disabled={busy} className="w-full rounded-lg bg-clay-500 py-2.5 font-medium text-slate-950 hover:bg-clay-600 disabled:opacity-50">
            {busy ? "Verifying…" : "Verify & log in"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-slate-400">
        No account? <Link to="/register" className="text-clay-500">Register</Link>
      </p>
    </div>
  );
}
