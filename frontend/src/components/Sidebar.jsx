import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BriefcaseBusiness,
  BarChart3,
  Building2,
  ChevronDown,
  CircleDollarSign,
  FileSpreadsheet,
  Network,
  Percent,
  Settings,
  UserRound,
  Users,
  UsersRound,
  Video
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";
import { useSystemSettings } from "../context/SystemSettingsContext";

const logoColors = ["#2f8ccf", "#0f9f6e", "#7c3aed", "#ef4444", "#f59e0b", "#0891b2", "#db2777"];

export default function Sidebar() {
  const location = useLocation();
  const { canViewReports, canViewChannelManagement, canViewPartner, canViewAccount, canViewSettings } = useAuth();
  const { t } = useI18n();
  const { theme } = useTheme();
  const { settings } = useSystemSettings();
  const isDark = theme === "dark";
  const useUploadedLogo = settings.logo_mode === "upload" && settings.logo_data_url;
  const logoColor = useMemo(() => logoColors[Math.floor(Math.random() * logoColors.length)], []);
  const channelPaths = ["/channel-management", "/channel-management/collaborators", "/channel-management/sharing"];
  const reportPaths = ["/report-dashboard", "/reports", "/channels", "/networks", "/exchange-rates", "/companies", "/groups"];
  const settingsPaths = ["/settings/system"];
  const [channelOpen, setChannelOpen] = useState(channelPaths.includes(location.pathname) || location.pathname === "/");
  const [reportOpen, setReportOpen] = useState(reportPaths.includes(location.pathname));
  const [settingsOpen, setSettingsOpen] = useState(settingsPaths.includes(location.pathname));

  const channelMenus = [
    { name: "Channel Management", path: "/channel-management", icon: Video },
    { name: "Collaborators", path: "/channel-management/collaborators", icon: Users },
    { name: "Sharing", path: "/channel-management/sharing", icon: Percent }
  ];

  const reportMenus = [
    { name: "Dashboard", path: "/report-dashboard", icon: BarChart3 },
    { name: t("report"), path: "/reports", icon: FileSpreadsheet },
    { name: "Channel", path: "/channels", icon: Video },
    { name: t("network"), path: "/networks", icon: Network },
    { name: t("exchangeRates"), path: "/exchange-rates", icon: CircleDollarSign },
    { name: t("company"), path: "/companies", icon: BriefcaseBusiness },
    { name: t("group"), path: "/groups", icon: UsersRound }
  ];

  const menus = [
    ...(canViewPartner ? [{ name: t("partner"), path: "/partners", icon: Building2 }] : []),
    ...(canViewAccount ? [{ name: t("account"), path: "/account", icon: UserRound }] : [])
  ];

  const settingsMenus = [
    { name: t("systemSettings"), path: "/settings/system", icon: Settings }
  ];

  return (
    <aside
      className={[
        "w-[260px] h-screen sticky top-0 p-5 hidden lg:flex flex-col overflow-hidden border-r",
        isDark ? "bg-[#0f172a] text-white border-slate-800" : "bg-white text-slate-950 border-slate-200"
      ].join(" ")}
    >
      <div className="mb-8 text-center">
        <div
          className={[
            "mx-auto w-28 h-28 rounded-full flex items-center justify-center shadow-lg shadow-slate-950/25 overflow-hidden ring-4",
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

        <h1 className="mt-5 text-xl font-black leading-tight">{settings.brand_name || t("appTitle")}</h1>
        <p className={["mt-1 text-sm font-bold", isDark ? "text-slate-400" : "text-slate-500"].join(" ")}>{settings.brand_subtitle || t("appSubtitle")}</p>
      </div>

      <nav className="space-y-2 flex-1">
        {(canViewReports || canViewChannelManagement) && (
          <>
          {canViewChannelManagement && (
          <div>
            <button
              type="button"
              onClick={() => setChannelOpen((open) => !open)}
              className={[
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
                channelPaths.includes(location.pathname) || location.pathname === "/"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : isDark
                    ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              ].join(" ")}
            >
              <Video size={20} />
              <span className="font-medium flex-1 text-left">Channel Management</span>
              <ChevronDown size={17} className={channelOpen ? "rotate-180 transition" : "transition"} />
            </button>

            {channelOpen && (
              <div className={["mt-2 ml-6 space-y-1 border-l pl-3", isDark ? "border-slate-700" : "border-slate-200"].join(" ")}>
                {channelMenus.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path || (location.pathname === "/" && item.path === "/channel-management");
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={[
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all",
                        active
                          ? isDark
                            ? "bg-blue-500/20 text-white"
                            : "bg-blue-50 text-blue-700"
                          : isDark
                            ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      ].join(" ")}
                    >
                      <Icon size={16} />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {canViewReports && (
          <div>
            <button
              type="button"
              onClick={() => setReportOpen((open) => !open)}
              className={[
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
                reportPaths.includes(location.pathname)
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : isDark
                    ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              ].join(" ")}
            >
              <FileSpreadsheet size={20} />
              <span className="font-medium flex-1 text-left">{t("report")}</span>
              <ChevronDown size={17} className={reportOpen ? "rotate-180 transition" : "transition"} />
            </button>

            {reportOpen && (
              <div className={["mt-2 ml-6 space-y-1 border-l pl-3", isDark ? "border-slate-700" : "border-slate-200"].join(" ")}>
                {reportMenus.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={[
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all",
                        active
                          ? isDark
                            ? "bg-blue-500/20 text-white"
                            : "bg-blue-50 text-blue-700"
                          : isDark
                            ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      ].join(" ")}
                    >
                      <Icon size={16} />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          )}
          </>
        )}

        {menus.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;

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
            >
              <Icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}

        {canViewSettings && (
          <div>
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              className={[
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
                settingsPaths.includes(location.pathname)
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : isDark
                    ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              ].join(" ")}
            >
              <Settings size={20} />
              <span className="font-medium flex-1 text-left">{t("settings")}</span>
              <ChevronDown size={17} className={settingsOpen ? "rotate-180 transition" : "transition"} />
            </button>

            {settingsOpen && (
              <div className={["mt-2 ml-6 space-y-1 border-l pl-3", isDark ? "border-slate-700" : "border-slate-200"].join(" ")}>
                {settingsMenus.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={[
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all",
                        active
                          ? isDark
                            ? "bg-blue-500/20 text-white"
                            : "bg-blue-50 text-blue-700"
                          : isDark
                            ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      ].join(" ")}
                    >
                      <Icon size={16} />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

    </aside>
  );
}
