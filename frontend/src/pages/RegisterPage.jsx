import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LockKeyhole,
  Mail,
  Loader2,
  UserRoundPlus,
  User
} from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { saveAuth } = useAuth();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const res = await api.post("/auth/register", form);

      saveAuth(res.data.token, res.data.user);

      navigate("/");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Đăng ký thất bại"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6fb] flex items-center justify-center p-5">
      <div className="w-full max-w-[560px] bg-white rounded-[32px] shadow-2xl border border-slate-200 p-8 lg:p-10">
        <div className="w-14 h-14 rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/30 mb-6">
          <UserRoundPlus size={30} />
        </div>

        <h1 className="text-3xl font-black text-slate-900">
          Đăng ký tài khoản
        </h1>

        <p className="text-slate-500 mt-2 mb-8">
          Tài khoản mới mặc định là quyền User. Admin có thể đổi sang Manager hoặc Admin.
        </p>

        {message && (
          <div className="mb-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 px-4 py-3 font-medium">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700">
              Họ tên
            </label>

            <div className="mt-2 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-blue-500">
              <User size={20} className="text-slate-400" />

              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="Nhập họ tên"
                className="w-full bg-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Email
            </label>

            <div className="mt-2 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-blue-500">
              <Mail size={20} className="text-slate-400" />

              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className="w-full bg-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Mật khẩu
            </label>

            <div className="mt-2 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-blue-500">
              <LockKeyhole size={20} className="text-slate-400" />

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Ít nhất 6 ký tự"
                className="w-full bg-transparent"
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-black flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 size={20} className="animate-spin" />}
            Đăng ký
          </button>
        </form>

        <p className="text-center text-slate-500 mt-6">
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-blue-600 font-bold">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}