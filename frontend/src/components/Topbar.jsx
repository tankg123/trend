import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Eye, EyeOff, Home, Languages, LockKeyhole, LogOut, Menu, Moon, Save, Settings, ShieldCheck, Sun, TrendingUp, UserRound, X, Video } from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";
import { useSystemSettings } from "../context/SystemSettingsContext";

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
      <span className="mb-2 block font-black text-slate-700">{label}</span>
      <div className="flex items-center rounded-2xl border border-slate-300 px-4 py-3 focus-within:border-blue-500">
        <input type={shown ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} className="w-full outline-none" required />
        <button type="button" onClick={onToggle} className="ml-2 text-slate-400 hover:text-blue-600">
          {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

export default function Topbar() {
  const location = useLocation();
  const { user, logout, updateSavedUser, canViewAccount, canViewSettings } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const { settings } = useSystemSettings();
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [twoFactorMessage, setTwoFactorMessage] = useState("");
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorForm, setTwoFactorForm] = useState({ code: "", password: "" });
  const [showPasswords, setShowPasswords] = useState({});
  const avatarColor = useMemo(() => randomColor(), []);
  const useUploadedLogo = settings?.logo_mode === "upload" && settings?.logo_data_url;
  const brandName = settings?.brand_name || "ANS Network";
  const subtitle = settings?.brand_subtitle || "MCN Manager System";
  const mobileItems = [
    { name: "Home", path: "/home", icon: Home, show: true },
    { name: "Trend Youtube", path: "/trend-youtube", icon: TrendingUp, show: true },
    { name: "Get Channel", path: "/get-channel", icon: Video, show: true },
    { name: "Trending Videos", path: "/trending-videos", icon: TrendingUp, show: true },
    { name: t("account"), path: "/account", icon: UserRound, show: canViewAccount },
    { name: t("settings"), path: "/settings/system", icon: Settings, show: canViewSettings }
  ].filter((item) => item.show);
  const [form, setForm] = useState({ full_name: user?.full_name || "", email: user?.email || "" });
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm_password: "" });

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

  async function openTwoFactorModal() {
    setTwoFactorMessage("");
    setTwoFactorSetup(null);
    setTwoFactorForm({ code: "", password: "" });
    setTwoFactorOpen(true);
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

  async function setupTwoFactor() {
    try {
      setSaving(true);
      setTwoFactorMessage("");
      const res = await api.post("/auth/2fa/setup");
      setTwoFactorSetup(res.data);
    } catch (error) {
      setTwoFactorMessage(error.response?.data?.message || "Could not setup 2FA");
    } finally {
      setSaving(false);
    }
  }

  async function enableTwoFactor(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setTwoFactorMessage("");
      const res = await api.post("/auth/2fa/enable", { code: twoFactorForm.code });
      updateSavedUser(res.data.user, res.data.token);
      setTwoFactorOpen(false);
    } catch (error) {
      setTwoFactorMessage(error.response?.data?.message || "Could not enable 2FA");
    } finally {
      setSaving(false);
    }
  }

  async function disableTwoFactor(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setTwoFactorMessage("");
      const res = await api.post("/auth/2fa/disable", twoFactorForm);
      updateSavedUser(res.data.user, res.data.token);
      setTwoFactorOpen(false);
    } catch (error) {
      setTwoFactorMessage(error.response?.data?.message || "Could not disable 2FA");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-5">
        <div className="flex min-w-0 items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
            <img src={useUploadedLogo ? settings.logo_data_url : "https://revenue.ansnetwork.vn/images/logo-slideBar.png"} alt={brandName} className={useUploadedLogo ? "h-full w-full object-cover" : "h-6 w-6 object-contain"} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">{brandName}</p>
            <p className="truncate text-[11px] font-bold text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="hidden lg:block" />

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen((value) => !value);
              setOpen(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-blue-200 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen((value) => !value);
              setMobileMenuOpen(false);
            }}
            className="flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 pr-3 shadow-sm hover:border-blue-200"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white" style={{ backgroundColor: avatarColor }}>
              {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-black leading-tight text-slate-900">{user?.full_name || "User"}</span>
              <span className="block text-[10px] font-bold leading-tight text-slate-400">{user?.role}</span>
            </span>
            <ChevronDown size={15} className="text-slate-400" />
          </button>

          {mobileMenuOpen && (
            <div className="absolute right-0 top-12 z-50 max-h-[calc(100vh-76px)] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl lg:hidden">
              <div className="mb-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <img src={useUploadedLogo ? settings.logo_data_url : "https://revenue.ansnetwork.vn/images/logo-slideBar.png"} alt={brandName} className="h-9 w-9 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{brandName}</p>
                  <p className="truncate text-xs font-bold text-slate-500">{subtitle}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {mobileItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path || (location.pathname === "/" && item.path === "/home");
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={["flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-center text-sm font-black", active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"].join(" ")}
                    >
                      <Icon size={17} />
                      <span className="leading-tight">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {open && (
            <div className="absolute right-0 top-12 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-100 p-4">
                <p className="font-black text-slate-900">{user?.full_name}</p>
                <p className="truncate text-sm text-slate-500">{user?.email}</p>
              </div>
              <div className="border-b border-slate-100 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-500">
                  <Languages size={14} /> Language
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setLanguage("en")} className={`rounded-xl px-3 py-2 text-xs font-black ${language === "en" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>EN</button>
                  <button type="button" onClick={() => setLanguage("vi")} className={`rounded-xl px-3 py-2 text-xs font-black ${language === "vi" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>VI</button>
                </div>
              </div>
              <div className="border-b border-slate-100 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-500">
                  <Sun size={14} /> Theme
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setTheme("light")} className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-black ${theme === "light" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Sun size={13} /> Light
                  </button>
                  <button type="button" onClick={() => setTheme("dark")} className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-black ${theme === "dark" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Moon size={13} /> Dark
                  </button>
                </div>
              </div>
              <button type="button" onClick={openSettings} className="flex w-full items-center gap-2 px-4 py-3 text-left font-bold text-slate-700 hover:bg-slate-50">
                <Settings size={16} /> Profile settings
              </button>
              <button type="button" onClick={openPasswordModal} className="flex w-full items-center gap-2 px-4 py-3 text-left font-bold text-slate-700 hover:bg-slate-50">
                <LockKeyhole size={16} /> Change password
              </button>
              <button type="button" onClick={openTwoFactorModal} className="flex w-full items-center gap-2 px-4 py-3 text-left font-bold text-slate-700 hover:bg-slate-50">
                <ShieldCheck size={16} /> Two-factor authentication
              </button>
              <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-3 text-left font-bold text-red-600 hover:bg-red-50">
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={saveProfile} className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Profile settings</h2>
                <p className="mt-1 text-sm text-slate-500">Update your account information.</p>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300"><X size={20} /></button>
            </div>

            <div className="space-y-4 p-6">
              {message && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 font-bold text-red-600">{message}</div>}
              <label className="block">
                <span className="mb-2 block font-black text-slate-700">Full name</span>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-3">
                  <UserRound size={18} className="text-slate-400" />
                  <input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} className="w-full outline-none" required />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block font-black text-slate-700">Email</span>
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" required />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-2xl border border-slate-300 px-5 py-3 font-bold">Cancel</button>
              <button disabled={saving} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-60">
                <Save size={18} /> Save profile
              </button>
            </div>
          </form>
        </div>
      )}

      {passwordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={savePassword} className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Change password</h2>
                <p className="mt-1 text-sm text-slate-500">Use a strong password with uppercase, lowercase, number, and special character.</p>
              </div>
              <button type="button" onClick={() => setPasswordOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300"><X size={20} /></button>
            </div>

            <div className="space-y-4 p-6">
              {passwordMessage && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 font-bold text-red-600">{passwordMessage}</div>}
              <PasswordInput label="Current password" value={passwordForm.current_password} onChange={(value) => setPasswordForm({ ...passwordForm, current_password: value })} shown={showPasswords.current} onToggle={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })} />
              <PasswordInput label="New password" value={passwordForm.new_password} onChange={(value) => setPasswordForm({ ...passwordForm, new_password: value })} shown={showPasswords.next} onToggle={() => setShowPasswords({ ...showPasswords, next: !showPasswords.next })} />
              <PasswordInput label="Confirm new password" value={passwordForm.confirm_password} onChange={(value) => setPasswordForm({ ...passwordForm, confirm_password: value })} shown={showPasswords.confirm} onToggle={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })} />
              <p className="text-xs font-bold text-slate-500">Required: at least 8 characters, uppercase, lowercase, number, and special character.</p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button type="button" onClick={() => setPasswordOpen(false)} className="rounded-2xl border border-slate-300 px-5 py-3 font-bold">Cancel</button>
              <button disabled={saving} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-60">
                <LockKeyhole size={18} /> Change password
              </button>
            </div>
          </form>
        </div>
      )}

      {twoFactorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Two-factor authentication</h2>
                <p className="mt-1 text-sm text-slate-500">Use Google Authenticator or any TOTP app to protect your login.</p>
              </div>
              <button type="button" onClick={() => setTwoFactorOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300"><X size={20} /></button>
            </div>

            <div className="space-y-4 p-6">
              {twoFactorMessage && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 font-bold text-red-600">{twoFactorMessage}</div>}

              {Number(user?.two_factor_enabled || 0) === 1 ? (
                <form onSubmit={disableTwoFactor} className="space-y-4">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 font-bold text-emerald-700">2FA is currently enabled for this account.</div>
                  <PasswordInput label="Current password" value={twoFactorForm.password} onChange={(value) => setTwoFactorForm({ ...twoFactorForm, password: value })} shown={showPasswords.twoFactorPassword} onToggle={() => setShowPasswords({ ...showPasswords, twoFactorPassword: !showPasswords.twoFactorPassword })} />
                  <label className="block">
                    <span className="mb-2 block font-black text-slate-700">Authenticator code</span>
                    <input value={twoFactorForm.code} onChange={(event) => setTwoFactorForm({ ...twoFactorForm, code: event.target.value })} inputMode="numeric" maxLength={6} className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-black tracking-[0.35em]" required />
                  </label>
                  <button disabled={saving} className="w-full rounded-2xl bg-red-600 px-5 py-3 font-black text-white disabled:opacity-60">Disable 2FA</button>
                </form>
              ) : (
                <div className="space-y-4">
                  {!twoFactorSetup ? (
                    <button onClick={setupTwoFactor} disabled={saving} className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-60">Generate QR code</button>
                  ) : (
                    <form onSubmit={enableTwoFactor} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                        <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <img src={twoFactorSetup.qr_url} alt="2FA QR code" className="h-56 w-56" />
                        </div>
                        <div className="rounded-3xl border border-slate-200 p-4">
                          <p className="font-black text-slate-950">Scan this QR in Google Authenticator.</p>
                          <p className="mt-2 text-sm text-slate-500">If the QR image does not load, add this secret manually:</p>
                          <p className="mt-3 break-all rounded-2xl bg-slate-100 p-3 font-mono text-sm font-black text-slate-700">{twoFactorSetup.secret}</p>
                        </div>
                      </div>
                      <label className="block">
                        <span className="mb-2 block font-black text-slate-700">Enter 6-digit code</span>
                        <input value={twoFactorForm.code} onChange={(event) => setTwoFactorForm({ ...twoFactorForm, code: event.target.value })} inputMode="numeric" maxLength={6} placeholder="123456" className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-black tracking-[0.35em]" required />
                      </label>
                      <button disabled={saving} className="w-full rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white disabled:opacity-60">Enable 2FA</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
