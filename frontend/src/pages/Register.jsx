import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register, verifyRegisterOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("details"); // "details" | "otp"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(name, email, password);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await verifyRegisterOtp(email, otp);
      navigate("/analyze");
    } catch (err) {
      setError(err.response?.data?.message || "Incorrect OTP");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-sm px-6">
      <h1 className="font-display text-3xl text-slate-50">
        {step === "details" ? "Create account" : "Verify your email"}
      </h1>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {step === "details" ? (
        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <input
            required placeholder="Full name" value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-white/5 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-clay-500"
          />
          <input
            type="email" required placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-white/5 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-clay-500"
          />
          <input
            type="password" required minLength={8} placeholder="Password (min 8 chars)" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-white/5 px-4 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-clay-500"
          />
          <button disabled={busy} className="w-full rounded-lg bg-clay-500 py-2.5 font-medium text-slate-950 hover:bg-clay-600 disabled:opacity-50">
            {busy ? "Sending code…" : "Send verification code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <p className="text-sm text-slate-400">Enter the code sent to {email}</p>
          <input
            required placeholder="6-digit code" value={otp} maxLength={6}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full rounded-lg bg-white/5 px-4 py-2.5 tracking-widest text-slate-100 outline-none focus:ring-2 focus:ring-clay-500"
          />
          <button disabled={busy} className="w-full rounded-lg bg-clay-500 py-2.5 font-medium text-slate-950 hover:bg-clay-600 disabled:opacity-50">
            {busy ? "Verifying…" : "Verify & create account"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-slate-400">
        Already have an account? <Link to="/login" className="text-clay-500">Log in</Link>
      </p>
    </div>
  );
}
