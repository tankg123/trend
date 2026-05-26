import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveAuth } = useAuth();
  const initialEmail = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return location.state?.email || params.get("email") || "";
  }, [location.search, location.state]);
  const fromLogin = Boolean(location.state?.fromLogin);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [message, setMessage] = useState(
    fromLogin
      ? "This account is not verified yet. Please wait 60 seconds, then send a new verification code."
      : location.state?.message || ""
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (resendCountdown <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setResendCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  async function verify(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const res = await api.post("/auth/verify-email", { email, code });
      if (res.data.token && res.data.user) {
        saveAuth(res.data.token, res.data.user);
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Could not verify email");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    try {
      setResending(true);
      setError("");
      setMessage("");
      const res = await api.post("/auth/resend-verification", { email });
      setMessage(res.data.message || "Verification code sent");
      setResendCountdown(60);
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend verification code");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6fb] flex items-center justify-center p-5">
      <div className="w-full max-w-[560px] rounded-[32px] border border-slate-200 bg-white p-8 shadow-2xl lg:p-10">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/20">
          <MailCheck size={30} />
        </div>

        <h1 className="text-3xl font-black text-slate-900">Verify your email</h1>
        <p className="mt-2 text-slate-500">
          Enter the 6-digit code sent to your company email address.
        </p>

        {message && (
          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 font-medium text-blue-700">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 font-medium text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={verify} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Verification code</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500">
              <ShieldCheck size={20} className="text-slate-400" />
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                className="w-full bg-transparent text-lg font-black tracking-[0.35em] outline-none"
              />
            </div>
          </label>

          <button
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-black text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading && <Loader2 size={20} className="animate-spin" />}
            Verify and continue
          </button>
        </form>

        {resendCountdown > 0 ? (
          <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-3 font-bold text-slate-500">
            <RefreshCw size={18} className="animate-spin" />
            {fromLogin ? "Send" : "Resend"} code available in {resendCountdown}s
          </div>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={resending || !email}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {resending ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {fromLogin ? "Send code" : "Resend code"}
          </button>
        )}

        <p className="mt-6 text-center text-slate-500">
          Already verified?{" "}
          <Link to="/login" className="font-bold text-blue-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
