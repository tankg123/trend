import { useMemo, useState } from "react";
import { ChevronDown, Eye, EyeOff, Languages, LockKeyhole, LogOut, Moon, Save, Settings, Sun, UserRound, X } from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";

const avatarColors = ["#2563eb", "#059669", "#7c3aed", "#dc2626", "#d97706", "#0891b2", "#be185d"];

function randomColor() {
  return avatarColors[Math.floor(Math.random() * avatarColors.length)];
}

function strongPasswordError(password) {
  if (String(password || "").length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter";
  if (!/\d/.test(password)) return "Password must include a number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a special character";
  return "";
}

function PasswordInput({ label, value, onChange, shown, onToggle }) {
  return (
    <label className="block">
      <span className="font-black text-slate-700 mb-2 block">{label}</span>
      <div className="flex items-center rounded-2xl border border-slate-300 px-4 py-3 focus-within:border-blue-500">
        <input
          type={shown ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full outline-none"
          required
        />
        <button type="button" onClick={onToggle} className="ml-2 text-slate-400 hover:text-blue-600">
          {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

export default function Topbar() {
  const { user, logout, updateSavedUser } = useAuth();
  const { language, setLanguage } = useI18n();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [showPasswords, setShowPasswords] = useState({});
  const avatarColor = useMemo(() => randomColor(), []);
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    email: user?.email || ""
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  function openSettings() {
    setForm({ full_name: user?.full_name || "", email: user?.email || "" });
    setMessage("");
    setSettingsOpen(true);
    setOpen(false);
  }

  function openPasswordModal() {
    setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    setPasswordMessage("");
    setShowPasswords({});
    setPasswordOpen(true);
    setOpen(false);
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage("");
      const res = await api.put("/auth/profile", form);
      updateSavedUser(res.data.user, res.data.token);
      setSettingsOpen(false);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    const strengthError = strongPasswordError(passwordForm.new_password);
    if (strengthError) {
      setPasswordMessage(strengthError);
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMessage("New password confirmation does not match");
      return;
    }

    try {
      setSaving(true);
      setPasswordMessage("");
      await api.put("/auth/change-password", passwordForm);
      setPasswordOpen(false);
    } catch (error) {
      setPasswordMessage(error.response?.data?.message || "Could not change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 h-14 bg-white/95 backdrop-blur border-b border-slate-200 px-4 lg:px-5 flex items-center justify-between">
        <div className="lg:hidden flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
            <img src="https://revenue.ansnetwork.vn/images/logo-slideBar.png" alt="ANS" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-950">ANS Network</p>
            <p className="text-[11px] font-bold text-slate-500">MCN Manager System</p>
          </div>
        </div>

        <div className="hidden lg:block" />

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-2 pr-3 flex items-center gap-2 shadow-sm hover:border-blue-200"
          >
            <span className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-black" style={{ backgroundColor: avatarColor }}>
              {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </span>
            <span className="hidden sm:block text-left">
              <span className="block text-xs font-black text-slate-900 leading-tight">{user?.full_name || "User"}</span>
              <span className="block text-[10px] font-bold text-slate-400 leading-tight">{user?.role}</span>
            </span>
            <ChevronDown size={15} className="text-slate-400" />
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <p className="font-black text-slate-900">{user?.full_name}</p>
                <p className="text-sm text-slate-500 truncate">{user?.email}</p>
              </div>
              <div className="p-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-black text-slate-500 mb-2">
                  <Languages size={14} /> Language
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setLanguage("en")} className={`rounded-xl px-3 py-2 text-xs font-black ${language === "en" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>EN</button>
                  <button type="button" onClick={() => setLanguage("vi")} className={`rounded-xl px-3 py-2 text-xs font-black ${language === "vi" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>VI</button>
                </div>
              </div>
              <div className="p-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-black text-slate-500 mb-2">
                  <Sun size={14} /> Theme
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`rounded-xl px-3 py-2 text-xs font-black flex items-center justify-center gap-1 ${theme === "light" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    <Sun size={13} /> Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`rounded-xl px-3 py-2 text-xs font-black flex items-center justify-center gap-1 ${theme === "dark" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    <Moon size={13} /> Dark
                  </button>
                </div>
              </div>
              <button type="button" onClick={openSettings} className="w-full px-4 py-3 flex items-center gap-2 text-left font-bold text-slate-700 hover:bg-slate-50">
                <Settings size={16} /> Profile settings
              </button>
              <button type="button" onClick={openPasswordModal} className="w-full px-4 py-3 flex items-center gap-2 text-left font-bold text-slate-700 hover:bg-slate-50">
                <LockKeyhole size={16} /> Change password
              </button>
              <button type="button" onClick={handleLogout} className="w-full px-4 py-3 flex items-center gap-2 text-left font-bold text-red-600 hover:bg-red-50">
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={saveProfile} className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Profile settings</h2>
                <p className="text-sm text-slate-500 mt-1">Update your account information.</p>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} className="w-11 h-11 rounded-xl border border-slate-300 flex items-center justify-center"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              {message && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 font-bold text-red-600">{message}</div>}
              <label className="block">
                <span className="font-black text-slate-700 mb-2 block">Full name</span>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3">
                  <UserRound size={18} className="text-slate-400" />
                  <input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} className="w-full outline-none" required />
                </div>
              </label>
              <label className="block">
                <span className="font-black text-slate-700 mb-2 block">Email</span>
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" required />
              </label>
            </div>

            <div className="px-6 py-5 border-t border-slate-200 flex justify-end gap-3">
              <button type="button" onClick={() => setSettingsOpen(false)} className="px-5 py-3 rounded-2xl border border-slate-300 font-bold">Cancel</button>
              <button disabled={saving} className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-black flex items-center gap-2 disabled:opacity-60">
                <Save size={18} /> Save profile
              </button>
            </div>
          </form>
        </div>
      )}

      {passwordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={savePassword} className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Change password</h2>
                <p className="text-sm text-slate-500 mt-1">Use a strong password with uppercase, lowercase, number, and special character.</p>
              </div>
              <button type="button" onClick={() => setPasswordOpen(false)} className="w-11 h-11 rounded-xl border border-slate-300 flex items-center justify-center"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              {passwordMessage && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 font-bold text-red-600">{passwordMessage}</div>}
              <PasswordInput label="Current password" value={passwordForm.current_password} onChange={(value) => setPasswordForm({ ...passwordForm, current_password: value })} shown={showPasswords.current} onToggle={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })} />
              <PasswordInput label="New password" value={passwordForm.new_password} onChange={(value) => setPasswordForm({ ...passwordForm, new_password: value })} shown={showPasswords.next} onToggle={() => setShowPasswords({ ...showPasswords, next: !showPasswords.next })} />
              <PasswordInput label="Confirm new password" value={passwordForm.confirm_password} onChange={(value) => setPasswordForm({ ...passwordForm, confirm_password: value })} shown={showPasswords.confirm} onToggle={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })} />
              <p className="text-xs font-bold text-slate-500">Required: at least 8 characters, uppercase, lowercase, number, and special character.</p>
            </div>

            <div className="px-6 py-5 border-t border-slate-200 flex justify-end gap-3">
              <button type="button" onClick={() => setPasswordOpen(false)} className="px-5 py-3 rounded-2xl border border-slate-300 font-bold">Cancel</button>
              <button disabled={saving} className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-black flex items-center gap-2 disabled:opacity-60">
                <LockKeyhole size={18} /> Change password
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
