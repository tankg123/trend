import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loader2, LogOut, Mail, ShieldCheck, Sparkles } from "lucide-react";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import AccountPage from "./pages/AccountPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import GetChannelPage from "./pages/GetChannelPage";
import GetYoutubeTrendingVideosPage from "./pages/GetYoutubeTrendingVideosPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SettingsPage from "./pages/SettingsPage";
import TrendYoutubePage from "./pages/TrendYoutubePage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { I18nProvider } from "./context/I18nContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SystemSettingsProvider, useSystemSettings } from "./context/SystemSettingsContext";
import LanguageRuntime from "./components/LanguageRuntime";
import ReadOnlyRuntime from "./components/ReadOnlyRuntime";
import ErrorBoundary from "./components/ErrorBoundary";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f6fb]">
      <Loader2 className="animate-spin text-blue-600" size={42} />
    </div>
  );
}

function LockedPage() {
  const { user, logout } = useAuth();
  const { settings } = useSystemSettings();
  const brandName = settings?.brand_name || "ANS Network";

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-[calc(100vh-64px)] overflow-hidden bg-[radial-gradient(circle_at_top_left,#dcfce7,transparent_32%),radial-gradient(circle_at_bottom_right,#dbeafe,transparent_36%)] p-6">
      <div className="mx-auto flex min-h-[calc(100vh-112px)] max-w-5xl items-center justify-center">
        <section className="relative w-full overflow-hidden rounded-[36px] border border-white/70 bg-white/90 p-8 text-center shadow-2xl shadow-slate-900/10 backdrop-blur lg:p-12">
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] bg-emerald-600 text-white shadow-xl shadow-emerald-900/20">
            <Sparkles size={42} />
          </div>

          <div className="relative mt-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
              <ShieldCheck size={18} />
              Account created successfully
            </p>

            <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950 lg:text-5xl">
              Welcome to {brandName}
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 lg:text-lg">
              Your account is ready, but it does not have an active role yet. Please contact the administrator to assign permissions before using the system.
            </p>

            <div className="mx-auto mt-8 grid max-w-2xl gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left md:grid-cols-2">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Account</p>
                <p className="mt-1 font-black text-slate-900">{user?.full_name || "New user"}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <Mail size={15} />
                  {user?.email || "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Next step</p>
                <p className="mt-1 font-black text-slate-900">Contact administrator</p>
                <p className="mt-1 text-sm text-slate-500">Ask an admin to add the correct role in Account Management.</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="mailto:no-reply@ansnetwork.uk" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg shadow-blue-900/20 hover:bg-blue-700">
                <Mail size={18} />
                Contact admin
              </a>
              <button type="button" onClick={handleLogout} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 font-black text-slate-700 hover:bg-slate-50">
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PrivateLayout() {
  const { user, authLoading, canViewAccount, canViewSettings } = useAuth();

  if (authLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex bg-[#f3f6fb]">
      <ReadOnlyRuntime />
      <Sidebar />

      <main className="flex-1 min-w-0">
        <Topbar />
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/trend-youtube" element={<TrendYoutubePage />} />
          <Route path="/get-channel" element={<GetChannelPage />} />
          <Route path="/trending-videos" element={<GetYoutubeTrendingVideosPage />} />
          <Route path="/account" element={canViewAccount ? <AccountPage /> : <Navigate to="/home" replace />} />
          <Route path="/settings" element={<Navigate to="/settings/system" replace />} />
          <Route path="/settings/system" element={canViewSettings ? <SettingsPage /> : <Navigate to="/home" replace />} />
          <Route path="/locked" element={<LockedPage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function PublicRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) return <LoadingScreen />;
  if (user) return <Navigate to="/home" replace />;

  return children;
}

function HomeRoute() {
  const { user, authLoading } = useAuth();

  if (authLoading) return <LoadingScreen />;

  return user ? (
    <div className="min-h-screen flex bg-[#f3f6fb]">
      <ReadOnlyRuntime />
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Topbar />
        <HomePage />
      </main>
    </div>
  ) : <HomePage publicView />;
}

function AppRoutes() {
  return (
    <>
      <LanguageRuntime />
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/home" element={<HomeRoute />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/verify-email" element={<PublicRoute><VerifyEmailPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/*" element={<PrivateLayout />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <I18nProvider>
          <ThemeProvider>
            <SystemSettingsProvider>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </SystemSettingsProvider>
          </ThemeProvider>
        </I18nProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
