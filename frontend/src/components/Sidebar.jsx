import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, MoreHorizontal, Settings, TrendingUp, UserRound, Video } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";
import { useSystemSettings } from "../context/SystemSettingsContext";

const logoColors = ["#2f8ccf", "#0f9f6e", "#7c3aed", "#ef4444", "#f59e0b", "#0891b2", "#db2777"];

export default function Sidebar() {
  const location = useLocation();
  const { canViewAccount, canViewSettings } = useAuth();
  const { t } = useI18n();
  const { theme } = useTheme();
  const { settings } = useSystemSettings();
  const isDark = theme === "dark";
  const useUploadedLogo = settings.logo_mode === "upload" && settings.logo_data_url;
  const [logoColor] = useState(() => logoColors[Math.floor(Math.random() * logoColors.length)]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "1");

  const menus = [
    { name: "Home", path: "/home", icon: Home, show: true },
    { name: "Trend Youtube", path: "/trend-youtube", icon: TrendingUp, show: true },
    { name: "Get Channel", path: "/get-channel", icon: Video, show: true },
    { name: "Trending Videos", path: "/trending-videos", icon: TrendingUp, show: true },
    { name: t("account"), path: "/account", icon: UserRound, show: canViewAccount },
    { name: t("settings"), path: "/settings/system", icon: Settings, show: canViewSettings }
  ].filter((item) => item.show);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((current) => {
      localStorage.setItem("sidebarCollapsed", current ? "0" : "1");
      return !current;
    });
  }

  return (
    <aside
      className={[
        "h-screen sticky top-0 hidden lg:flex flex-col overflow-hidden border-r transition-all duration-200",
        sidebarCollapsed ? "w-[86px] sidebar-collapsed" : "w-[260px]",
        isDark ? "bg-[#0f172a] text-white border-slate-800" : "bg-white text-slate-950 border-slate-200"
      ].join(" ")}
    >
      <button
        type="button"
        onClick={toggleSidebarCollapsed}
        className={[
          "absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-xl border text-slate-500 transition hover:text-blue-600",
          isDark ? "border-slate-700 bg-slate-900 hover:bg-slate-800" : "border-slate-200 bg-white hover:bg-slate-50"
        ].join(" ")}
        title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
      >
        <MoreHorizontal size={18} />
      </button>

      <div className={["px-5 pt-5 pb-4 text-center shrink-0", sidebarCollapsed ? "px-3 pt-12" : ""].join(" ")}>
        <div
          className={[
            "mx-auto rounded-full flex items-center justify-center shadow-lg shadow-slate-950/25 overflow-hidden ring-4 transition-all",
            sidebarCollapsed ? "w-12 h-12" : "w-28 h-28",
            isDark ? "ring-white/10" : "ring-slate-100"
          ].join(" ")}
          style={{ backgroundColor: useUploadedLogo ? "transparent" : logoColor }}
        >
          <img
            src={useUploadedLogo ? settings.logo_data_url : "https://revenue.ansnetwork.vn/images/logo-slideBar.png"}
            alt={settings.brand_name || "ANS Network"}
            className={useUploadedLogo ? "w-full h-full object-cover" : "w-16 h-16 object-contain"}
          />
        </div>

        {!sidebarCollapsed && (
          <>
            <h1 className="mt-5 text-xl font-black leading-tight">{settings.brand_name || t("appTitle")}</h1>
            <p className={["mt-1 text-sm font-bold", isDark ? "text-slate-400" : "text-slate-500"].join(" ")}>{settings.brand_subtitle || t("appSubtitle")}</p>
          </>
        )}
      </div>

      <nav className={["mx-3 mb-3 px-2 py-2 space-y-2 flex-1 overflow-y-auto rounded-2xl sidebar-scroll", isDark ? "bg-slate-950/20" : "bg-slate-50/50"].join(" ")}>
        {menus.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path || (item.path === "/home" && location.pathname === "/");

          return (
            <Link
              key={item.path}
              to={item.path}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : isDark
                    ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              ].join(" ")}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <Icon size={20} />
              {!sidebarCollapsed && <span className="font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
