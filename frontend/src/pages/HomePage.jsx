import { Link } from "react-router-dom";
import { BarChart3, CircleDollarSign, Disc3, FileSpreadsheet, Headphones, Mail, Music2, Network, Sparkles, UsersRound, WalletCards } from "lucide-react";
import { useSystemSettings } from "../context/SystemSettingsContext";

const featureCards = [
  {
    title: "Revenue reports",
    text: "Import monthly channel revenue, review clean summaries, and keep every payout cycle traceable.",
    icon: FileSpreadsheet,
    color: "bg-emerald-50 text-emerald-700"
  },
  {
    title: "Partner payouts",
    text: "Manage partner profiles, contracts, exchange rates, group fees, and international invoice exports.",
    icon: UsersRound,
    color: "bg-blue-50 text-blue-700"
  },
  {
    title: "Channel operations",
    text: "Track networks, sharing rates, collaborators, health status, and channel performance in one place.",
    icon: Network,
    color: "bg-violet-50 text-violet-700"
  },
  {
    title: "Email automation",
    text: "Send revenue notifications now, schedule them later, and follow up automatically when needed.",
    icon: Mail,
    color: "bg-amber-50 text-amber-700"
  }
];

export default function HomePage({ publicView = false }) {
  const { settings } = useSystemSettings();
  const brandName = settings?.brand_name || "ANS Network";
  const subtitle = settings?.brand_subtitle || "MCN Manager System";
  const logoSrc = settings?.logo_data_url
    ? settings.logo_data_url
    : "/ans-logo.png";
  const isUploadedLogo = Boolean(settings?.logo_data_url);

  return (
    <div className={`${publicView ? "min-h-screen" : "min-h-[calc(100vh-56px)]"} bg-[radial-gradient(circle_at_top_left,#dcfce7,transparent_32%),radial-gradient(circle_at_bottom_right,#dbeafe,transparent_34%),#f3f6fb] p-4 lg:p-8`}>
      {publicView && (
        <header className="mx-auto mb-5 flex max-w-7xl items-center justify-between rounded-[28px] border border-white/80 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <img
                src={logoSrc}
                alt={brandName}
                className={isUploadedLogo ? "h-full w-full object-cover" : "h-full w-full object-contain p-1.5"}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-slate-950">{brandName}</p>
              <p className="truncate text-sm font-bold text-slate-500">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-black text-slate-700 hover:bg-slate-50">Sign in</Link>
            <Link to="/register" className="rounded-2xl bg-blue-600 px-4 py-2 font-black text-white shadow-lg shadow-blue-900/15 hover:bg-blue-700">Register</Link>
          </div>
        </header>
      )}

      <section className="relative overflow-hidden rounded-[34px] border border-white/80 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.05fr_.95fr] lg:p-10 xl:p-12">
          <div className="relative z-10 flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black uppercase tracking-wider text-emerald-700">
              <Sparkles size={17} />
              MCN Manager System
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-tight text-slate-950 md:text-5xl xl:text-6xl">
              Welcome to {brandName}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              A professional workspace for music and entertainment teams to manage YouTube revenue reports, partner payouts, contracts, channel sharing, and payment communication.
            </p>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                ["Revenue workflow", "Organized", CircleDollarSign],
                ["Partner portal", "Active", UsersRound],
                ["Profit control", "Ready", BarChart3]
              ].map(([label, value, Icon]) => (
                <div key={label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <Icon className="mb-4 text-emerald-600" size={24} />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-[32px] border border-emerald-100 bg-slate-950 p-5 text-white shadow-2xl shadow-emerald-900/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,.35),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,.28),transparent_30%)]" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-200">Music revenue desk</p>
                <h2 className="mt-2 text-2xl font-black">Partner payout board</h2>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <Music2 size={28} />
              </div>
            </div>

            <div className="relative mt-8 space-y-4">
              {[
                ["Channel revenue", "Verified monthly data", "Report", "bg-emerald-400"],
                ["Partner payout", "Contract and bank-ready", "Payout", "bg-blue-400"],
                ["Report status", "Reviewed and approved", "Ready", "bg-amber-300"]
              ].map(([label, name, value, color]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <div className="flex items-center gap-4">
                    <span className={`h-12 w-12 rounded-2xl ${color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-300">{label}</p>
                      <p className="truncate text-lg font-black">{name}</p>
                    </div>
                    <p className="text-xl font-black text-emerald-200">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative mt-7 grid grid-cols-3 gap-3">
              {[Disc3, Headphones, WalletCards].map((Icon, index) => (
                <div key={index} className="flex h-24 items-center justify-center rounded-3xl border border-white/10 bg-white/10">
                  <Icon size={30} className="text-emerald-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {featureCards.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${item.color}`}>
                <Icon size={26} />
              </div>
              <h2 className="text-xl font-black text-slate-950">{item.title}</h2>
              <p className="mt-3 leading-7 text-slate-500">{item.text}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
