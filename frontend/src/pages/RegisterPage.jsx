import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, LockKeyhole, Mail, ShieldCheck, User, UserRoundPlus } from "lucide-react";
import api from "../api/api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");
      const res = await api.post("/auth/register", form);

      navigate("/verify-email", {
        state: {
          email: res.data.email || form.email,
          message: res.data.message
        }
      });
    } catch (error) {
      setMessage(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6fb] flex items-center justify-center p-5">
      <div className="w-full max-w-[620px] bg-white rounded-[32px] shadow-2xl border border-slate-200 p-8 lg:p-10">
        <div className="w-14 h-14 rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/30 mb-6">
          <UserRoundPlus size={30} />
        </div>

        <h1 className="text-3xl font-black text-slate-900">Create account</h1>
        <p className="text-slate-500 mt-2 mb-8">
          Register with your company email. You must verify your email before signing in.
        </p>

        {message && (
          <div className="mb-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 px-4 py-3 font-medium">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">First name</span>
              <div className="mt-2 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-blue-500">
                <User size={20} className="text-slate-400" />
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  placeholder="First name"
                  required
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Last name</span>
              <div className="mt-2 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-blue-500">
                <User size={20} className="text-slate-400" />
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  placeholder="Last name"
                  required
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Email</span>
            <div className="mt-2 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-blue-500">
              <Mail size={20} className="text-slate-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="name@company.com"
                required
                className="w-full bg-transparent outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Password</span>
            <div className="mt-2 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-blue-500">
              <LockKeyhole size={20} className="text-slate-400" />
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Uppercase, lowercase, number, and special character"
                required
                className="w-full bg-transparent outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Confirm password</span>
            <div className="mt-2 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-blue-500">
              <ShieldCheck size={20} className="text-slate-400" />
              <input
                type="password"
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                placeholder="Confirm password"
                required
                className="w-full bg-transparent outline-none"
              />
            </div>
          </label>

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-black flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 size={20} className="animate-spin" />}
            Create account
          </button>
        </form>

        <p className="text-center text-slate-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 font-bold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
