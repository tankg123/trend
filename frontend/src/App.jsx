import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate
} from "react-router-dom";
import { BarChart3, BriefcaseBusiness, Building2, ChevronDown, CircleDollarSign, Disc3, FileAudio, FileSpreadsheet, Landmark, Network, PackageSearch, Percent, ReceiptText, Settings, Tags, Users, UsersRound, Video, WalletCards, UserRound, Loader2 } from "lucide-react";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ChannelManagementPage from "./pages/ChannelManagementPage";
import CollaboratorsPage from "./pages/CollaboratorsPage";
import RevenueSharingPage from "./pages/RevenueSharingPage";
import ChannelPage from "./pages/ChannelPage";
import AccountPage from "./pages/AccountPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ManagerReportPage from "./pages/ManagerReportPage";
import ReportDashboardPage from "./pages/ReportDashboardPage";
import PartnerPage from "./pages/PartnerPage";
import GroupChannelPage from "./pages/GroupChannelPage";
import NetworkPage from "./pages/NetworkPage";
import ExchangeRatePage from "./pages/ExchangeRatePage";
import CompanyPage from "./pages/CompanyPage";
import SettingsPage from "./pages/SettingsPage";
import ContentIdCreatorPage from "./pages/ContentIdCreatorPage";
import ContentIdProductsPage from "./pages/ContentIdProductsPage";
import ContentIdSettingsPage from "./pages/ContentIdSettingsPage";
import ContentIdCatalogPage from "./pages/ContentIdCatalogPage";
import { ExpenseAccountsPage, ExpenseCategoriesPage, ExpenseOverviewPage, ExpenseRevenuePage, ExpenseTransactionsPage } from "./pages/ExpensePages";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { I18nProvider, useI18n } from "./context/I18nContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SystemSettingsProvider } from "./context/SystemSettingsContext";
import LanguageToggle from "./components/LanguageToggle";
import LanguageRuntime from "./components/LanguageRuntime";
import ErrorBoundary from "./components/ErrorBoundary";

function LockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Account locked</h1>
        <p className="mt-3 text-slate-500">Your role does not have access to any page. Please contact an admin if you need permissions.</p>
      </div>
    </div>
  );
}

function MobileNav() {
  const location = useLocation();
  const { canViewReports, canViewChannelManagement, canViewContentId, canViewExpense, canViewPartner, canViewAccount, canViewSettings, canViewPartnerGroups } = useAuth();
  const { t } = useI18n();
  const channelPaths = ["/channel-management", "/channel-management/collaborators", "/channel-management/sharing"];
  const reportPaths = ["/report-dashboard", "/reports", "/channels", "/networks", "/exchange-rates", "/companies", "/groups"];
  const contentIdPaths = ["/content-id/creator", "/content-id/products", "/content-id/labels", "/content-id/artists"];
  const expensePaths = ["/expenses/overview", "/expenses/categories", "/expenses/transactions", "/expenses/accounts", "/expenses/revenue"];
  const settingsPaths = ["/settings/system", "/settings/content-id"];
  const [channelOpen, setChannelOpen] = useState(channelPaths.includes(location.pathname) || location.pathname === "/");
  const [reportOpen, setReportOpen] = useState(reportPaths.includes(location.pathname));
  const [contentIdOpen, setContentIdOpen] = useState(contentIdPaths.includes(location.pathname));
  const [expenseOpen, setExpenseOpen] = useState(expensePaths.includes(location.pathname));

  const channelMenus = [
    { name: "Channel Management", path: "/channel-management", icon: Video },
    { name: "Collaborators", path: "/channel-management/collaborators", icon: Users },
    { name: "Sharing", path: "/channel-management/sharing", icon: Percent }
  ].filter(() => canViewChannelManagement);

  const reportMenus = [
    {
      name: "Dashboard",
      path: "/report-dashboard",
      icon: BarChart3
    },
    {
      name: t("report"),
      path: "/reports",
      icon: FileSpreadsheet
    },
    {
      name: "Channel",
      path: "/channels",
      icon: Video
    },
    {
      name: t("network"),
      path: "/networks",
      icon: Network
    },
    {
      name: t("exchangeRates"),
      path: "/exchange-rates",
      icon: CircleDollarSign
    },
    {
      name: t("company"),
      path: "/companies",
      icon: BriefcaseBusiness
    },
    {
      name: t("group"),
      path: "/groups",
      icon: UsersRound
    }
  ].filter(() => canViewReports);

  const menus = [
    {
      name: t("partner"),
      path: "/partners",
      icon: Building2,
      show: canViewPartner
    },
    {
      name: t("account"),
      path: "/account",
      icon: UserRound,
      show: canViewAccount
    }
  ].filter((item) => item.show);

  const settingsMenus = [
    {
      name: t("systemSettings"),
      path: "/settings/system",
      icon: Settings
    },
    {
      name: "Content ID Setting",
      path: "/settings/content-id",
      icon: Disc3
    }
  ].filter(() => canViewSettings);

  return (
    <div className="lg:hidden sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-black text-slate-900">
          <img src="/ans-logo.png" alt="ANS Network" className="h-8 w-8 object-contain" />
          {t("appTitle")}
        </div>

        <LanguageToggle compact />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(canViewChannelManagement || canViewReports || canViewContentId || canViewExpense) && (
          <div className="col-span-2">
            {canViewChannelManagement && (
            <>
            <button
              type="button"
              onClick={() => setChannelOpen((open) => !open)}
              className={[
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold mb-2",
                channelOpen ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
              ].join(" ")}
            >
              <Video size={17} />
              Channel Management
              <ChevronDown size={16} className={channelOpen ? "rotate-180 transition" : "transition"} />
            </button>
            {channelOpen && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {channelMenus.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path || (location.pathname === "/" && item.path === "/channel-management");
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={[
                        "flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold",
                        active ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-slate-50 text-slate-600"
                      ].join(" ")}
                    >
                      <Icon size={16} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
            </>
            )}
            {canViewReports && (
            <>
            <button
              type="button"
              onClick={() => setReportOpen((open) => !open)}
              className={[
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold",
                reportOpen ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
              ].join(" ")}
            >
              <FileSpreadsheet size={17} />
              {t("report")}
              <ChevronDown size={16} className={reportOpen ? "rotate-180 transition" : "transition"} />
            </button>
            {reportOpen && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {reportMenus.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={[
                        "flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold",
                        active ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-slate-50 text-slate-600"
                      ].join(" ")}
                    >
                      <Icon size={16} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
            </>
            )}
            {canViewContentId && (
            <>
            <button
              type="button"
              onClick={() => setContentIdOpen((open) => !open)}
              className={[
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold mt-2",
                contentIdOpen ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
              ].join(" ")}
            >
              <Disc3 size={17} />
              Content ID
              <ChevronDown size={16} className={contentIdOpen ? "rotate-180 transition" : "transition"} />
            </button>
            {contentIdOpen && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { name: "Creator CSV", path: "/content-id/creator", icon: FileAudio },
                  { name: "Product Manager", path: "/content-id/products", icon: PackageSearch },
                  { name: "Label", path: "/content-id/labels", icon: Tags },
                  { name: "Artist", path: "/content-id/artists", icon: UserRound }
                ].map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={[
                        "flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold",
                        active ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-slate-50 text-slate-600"
                      ].join(" ")}
                    >
                      <Icon size={16} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
            </>
            )}
            {canViewExpense && (
            <>
            <button
              type="button"
              onClick={() => setExpenseOpen((open) => !open)}
              className={[
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold mt-2",
                expenseOpen ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
              ].join(" ")}
            >
              <WalletCards size={17} />
              Expense
              <ChevronDown size={16} className={expenseOpen ? "rotate-180 transition" : "transition"} />
            </button>
            {expenseOpen && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { name: t("overview"), path: "/expenses/overview", icon: BarChart3 },
                  { name: t("expenseGroups"), path: "/expenses/categories", icon: ReceiptText },
                  { name: t("transactions"), path: "/expenses/transactions", icon: FileSpreadsheet },
                  { name: t("accounts"), path: "/expenses/accounts", icon: Landmark },
                  { name: t("revenue"), path: "/expenses/revenue", icon: CircleDollarSign }
                ].map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} className={["flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold", active ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-slate-50 text-slate-600"].join(" ")}>
                      <Icon size={16} /> {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
            </>
            )}
          </div>
        )}
        {menus.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={[
                "flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold",
                active
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600"
              ].join(" ")}
            >
              <Icon size={17} />
              {item.name}
            </Link>
          );
        })}
        {canViewPartnerGroups && !canViewReports && (
          <Link
            to="/groups"
            className={[
              "col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold",
              location.pathname === "/groups" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
            ].join(" ")}
          >
            <UsersRound size={17} />
            {t("group")}
          </Link>
        )}
        {canViewSettings && (
          <div className="col-span-2">
            <div className="grid grid-cols-1 gap-2">
              {settingsMenus.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={[
                      "flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold",
                      active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                    ].join(" ")}
                  >
                    <Icon size={17} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrivateLayout() {
  const { user, authLoading, canViewReports, canViewChannelManagement, canViewContentId, canViewExpense, canViewPartner, canViewAccount, canViewSettings, canViewPartnerGroups } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f6fb]">
        <Loader2 className="animate-spin text-blue-600" size={42} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const defaultPath = canViewChannelManagement ? "/channel-management" : canViewReports ? "/report-dashboard" : canViewExpense ? "/expenses/overview" : canViewContentId ? "/content-id/creator" : canViewPartnerGroups ? "/groups" : canViewPartner ? "/partners" : canViewAccount ? "/account" : canViewSettings ? "/settings/system" : "/locked";

  return (
    <div className="min-h-screen flex bg-[#f3f6fb]">
      <Sidebar />

      <main className="flex-1 min-w-0">
        <Topbar />
        <MobileNav />

        <Routes>
          <Route
            path="/"
            element={
              <Navigate to={defaultPath} replace />
            }
          />
          <Route
            path="/channel-management"
            element={
              canViewChannelManagement ? (
                <ChannelManagementPage />
              ) : (
                <Navigate to={defaultPath} replace />
              )
            }
          />
          <Route
            path="/channel-management/collaborators"
            element={
              canViewChannelManagement ? (
                <CollaboratorsPage />
              ) : (
                <Navigate to={defaultPath} replace />
              )
            }
          />
          <Route
            path="/channel-management/sharing"
            element={
              canViewChannelManagement ? (
                <RevenueSharingPage />
              ) : (
                <Navigate to={defaultPath} replace />
              )
            }
          />
          <Route
            path="/report-dashboard"
            element={
              canViewReports ? (
                <ReportDashboardPage />
              ) : (
                <Navigate to={defaultPath} replace />
              )
            }
          />
          <Route
            path="/reports"
            element={
              canViewReports ? (
                <ManagerReportPage />
              ) : (
                <Navigate to={defaultPath} replace />
              )
            }
          />
          <Route
            path="/channels"
            element={
              canViewReports ? (
                <ChannelPage />
              ) : (
                <Navigate to={defaultPath} replace />
              )
            }
          />
          <Route
            path="/networks"
            element={
              canViewReports ? (
                <NetworkPage />
              ) : (
                <Navigate to={defaultPath} replace />
              )
            }
          />
          <Route
            path="/exchange-rates"
            element={
              canViewReports ? (
                <ExchangeRatePage />
              ) : (
                <Navigate to={defaultPath} replace />
              )
            }
          />
          <Route
            path="/companies"
            element={
              canViewReports ? (
                <CompanyPage />
              ) : (
                <Navigate to={defaultPath} replace />
              )
            }
          />
          <Route
            path="/partners"
            element={
              canViewPartner ? (
                <PartnerPage />
              ) : (
                <Navigate to={defaultPath} replace />
              )
            }
          />
          <Route
            path="/groups"
            element={
              canViewPartnerGroups ? (
                <GroupChannelPage />
              ) : (
                <Navigate to={defaultPath} replace />
              )
            }
          />
          <Route path="/content-id" element={<Navigate to="/content-id/creator" replace />} />
          <Route
            path="/content-id/creator"
            element={canViewContentId ? <ContentIdCreatorPage /> : <Navigate to={defaultPath} replace />}
          />
          <Route
            path="/content-id/products"
            element={canViewContentId ? <ContentIdProductsPage /> : <Navigate to={defaultPath} replace />}
          />
          <Route
            path="/content-id/labels"
            element={canViewContentId ? <ContentIdCatalogPage type="labels" /> : <Navigate to={defaultPath} replace />}
          />
          <Route
            path="/content-id/artists"
            element={canViewContentId ? <ContentIdCatalogPage type="artists" /> : <Navigate to={defaultPath} replace />}
          />
          <Route path="/expenses" element={<Navigate to="/expenses/overview" replace />} />
          <Route path="/expenses/overview" element={canViewExpense ? <ExpenseOverviewPage /> : <Navigate to={defaultPath} replace />} />
          <Route path="/expenses/categories" element={canViewExpense ? <ExpenseCategoriesPage /> : <Navigate to={defaultPath} replace />} />
          <Route path="/expenses/transactions" element={canViewExpense ? <ExpenseTransactionsPage /> : <Navigate to={defaultPath} replace />} />
          <Route path="/expenses/accounts" element={canViewExpense ? <ExpenseAccountsPage /> : <Navigate to={defaultPath} replace />} />
          <Route path="/expenses/revenue" element={canViewExpense ? <ExpenseRevenuePage /> : <Navigate to={defaultPath} replace />} />
          <Route path="/account" element={canViewAccount ? <AccountPage /> : <Navigate to={defaultPath} replace />} />
          <Route path="/settings" element={<Navigate to="/settings/system" replace />} />
          <Route path="/settings/system" element={canViewSettings ? <SettingsPage /> : <Navigate to={defaultPath} replace />} />
          <Route path="/settings/content-id" element={canViewSettings ? <ContentIdSettingsPage /> : <Navigate to={defaultPath} replace />} />
          <Route path="/locked" element={<LockedPage />} />
          <Route path="*" element={<Navigate to={defaultPath} replace />} />
        </Routes>
      </main>
    </div>
  );
}

function PublicRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f6fb]">
        <Loader2 className="animate-spin text-blue-600" size={42} />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <>
      <LanguageRuntime />
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

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
