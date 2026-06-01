import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import api from "../api/api";

const PASSWORD_HINT = "At least 8 characters with uppercase, lowercase, number, and special character.";

export default function ForgotPasswordPage() {
  const [form, setForm] = useState({
    email: "",
    code: "",
    password: "",
    confirm_password: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setTimeout(() => setCountdown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "code" ? value.replace(/\D/g, "").slice(0, 6) : value
    }));
  }

  async function sendCode() {
    try {
      setLoadingSend(true);
      setError("");
      setMessage("");
      const res = await api.post("/auth/forgot-password", { email: form.email });
      setMessage(res.data.message || "If this email exists, a password reset code has been sent.");
      setCountdown(60);
    } catch (err) {
      const retryAfter = Number(err.response?.data?.retry_after || 60);
      if (err.response?.status === 429) setCountdown(retryAfter);
      setError(err.response?.data?.message || "Could not send reset code");
    } finally {
      setLoadingSend(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    try {
      setLoadingReset(true);
      setError("");
      setMessage("");
      const res = await api.post("/auth/reset-password", form);
      setMessage(res.data.message || "Password reset successfully. Please sign in with your new password.");
      setForm((current) => ({ ...current, code: "", password: "", confirm_password: "" }));
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset password");
    } finally {
      setLoadingReset(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6fb] flex items-center justify-center p-5">
      <div className="w-full max-w-[620px] rounded-[32px] border border-slate-200 bg-white p-8 shadow-2xl lg:p-10">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-900/20">
          <LockKeyhole size={30} />
        </div>

        <h1 className="text-3xl font-black text-slate-900">Reset your password</h1>
        <p className="mt-2 text-slate-500">
          Enter your email, receive a 6-digit code, then set a new password.
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

        <form onSubmit={resetPassword} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Email</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500">
              <Mail size={20} className="text-slate-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="name@company.com"
                required
                className="w-full bg-transparent outline-none"
              />
            </div>
          </label>

          {countdown > 0 ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-3 font-bold text-slate-500">
              <RefreshCw size={18} className="animate-spin" />
              Send code available in {countdown}s
            </div>
          ) : (
            <button
              type="button"
              onClick={sendCode}
              disabled={loadingSend || !form.email}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingSend ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              Send reset code
            </button>
          )}

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Reset code</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500">
              <ShieldCheck size={20} className="text-slate-400" />
              <input
                name="code"
                value={form.code}
                onChange={updateField}
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                required
                className="w-full bg-transparent text-lg font-black tracking-[0.35em] outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">New password</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500">
              <LockKeyhole size={20} className="text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={updateField}
                placeholder={PASSWORD_HINT}
                required
                className="w-full bg-transparent outline-none"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-400">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Confirm new password</span>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500">
              <LockKeyhole size={20} className="text-slate-400" />
              <input
                type={showConfirm ? "text" : "password"}
                name="confirm_password"
                value={form.confirm_password}
                onChange={updateField}
                placeholder="Confirm new password"
                required
                className="w-full bg-transparent outline-none"
              />
              <button type="button" onClick={() => setShowConfirm((value) => !value)} className="text-slate-400">
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button
            disabled={loadingReset}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-black text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loadingReset && <Loader2 size={20} className="animate-spin" />}
            Reset password
          </button>
        </form>

        <p className="mt-6 text-center text-slate-500">
          Remember your password?{" "}
          <Link to="/login" className="font-bold text-blue-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
