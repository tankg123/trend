import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  CalendarDays,
  Check,
  Copy,
  DollarSign,
  Eye,
  ExternalLink,
  ListChecks,
  Loader2,
  Network,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Video,
  X
} from "lucide-react";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import PaginationFooter from "../components/PaginationFooter";

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    notation: number >= 1000000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(number);
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("vi-VN");
  } catch {
    return "-";
  }
}

export default function ChannelPage() {
  const { user, isAdmin, isManager } = useAuth();

  const [channels, setChannels] = useState([]);
  const [stats, setStats] = useState(null);
  const [channelInput, setChannelInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncingInfo, setSyncingInfo] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [networks, setNetworks] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [channelDetail, setChannelDetail] = useState(null);
  const [detailMonth, setDetailMonth] = useState(currentMonth());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortConfig, setSortConfig] = useState(null);
  const [copiedChannelId, setCopiedChannelId] = useState("");
  const [networkForm, setNetworkForm] = useState({
    network_id: "",
    start_month: currentMonth(),
    note: ""
  });

  const canAddChannel = isAdmin || isManager;
  const canRefreshChannel = isAdmin || isManager;
  const canDeleteChannel = isAdmin || isManager;

  async function fetchChannels(searchValue = "") {
    try {
      setPageLoading(true);
      const res = await api.get("/channels", {
        params: {
          keyword: searchValue
        }
      });
      setChannels(res.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || error.response?.data?.error || "Lỗi tải danh sách channel");
    } finally {
      setPageLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await api.get("/channels/stats");
      setStats(res.data.data);
    } catch {
      setStats(null);
    }
  }

  async function fetchNetworks() {
    try {
      const res = await api.get("/reports/networks");
      setNetworks(res.data.data || []);
    } catch {
      setNetworks([]);
    }
  }

  async function openChannelDetail(channel, selectedMonth = detailMonth) {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      const res = await api.get(`/channels/${channel.id}/detail`, {
        params: {
          month: selectedMonth
        }
      });
      const data = res.data.data;
      setChannelDetail(data);
      setNetworkForm({
        network_id: String(data.current_network?.id || ""),
        start_month: selectedMonth,
        note: ""
      });
    } catch (error) {
      setMessage(error.response?.data?.message || error.response?.data?.error || "Lỗi tải chi tiết channel");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDetailMonthChange(value) {
    setDetailMonth(value);
    if (channelDetail?.channel) {
      await openChannelDetail(channelDetail.channel, value);
    }
  }

  async function handleChangeNetwork(e) {
    e.preventDefault();

    if (!channelDetail?.channel) return;

    try {
      setLoading(true);
      const res = await api.post(`/channels/${channelDetail.channel.id}/network`, networkForm);
      setMessage(res.data.message || "Đã đổi network cho channel");
      await openChannelDetail(channelDetail.channel, networkForm.start_month);
    } catch (error) {
      setMessage(error.response?.data?.message || error.response?.data?.error || "Lỗi đổi network channel");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddChannel(e) {
    e.preventDefault();

    if (!canAddChannel) {
      setMessage("Bạn không có quyền thêm channel");
      return;
    }

    if (!channelInput.trim()) {
      setMessage("Vui lòng nhập Channel ID, YouTube URL hoặc @handle");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const res = await api.post("/channels", {
        channel_input: channelInput
      });
      setMessage(res.data.message || "Đã thêm channel");
      setChannelInput("");
      await fetchChannels(keyword);
      await fetchStats();
    } catch (error) {
      setMessage(error.response?.data?.error || error.response?.data?.message || "Lỗi thêm channel");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!canDeleteChannel) {
      setMessage("Bạn không có quyền xóa channel");
      return;
    }

    if (!window.confirm("Bạn có chắc muốn xóa channel này không?")) return;

    try {
      await api.delete(`/channels/${id}`);
      setMessage("Đã xóa channel");
      await fetchChannels(keyword);
      await fetchStats();
    } catch (error) {
      setMessage(error.response?.data?.message || error.response?.data?.error || "Lỗi xóa channel");
    }
  }

  async function handleRefresh(id) {
    if (!canRefreshChannel) {
      setMessage("Bạn không có quyền cập nhật channel");
      return;
    }

    try {
      setMessage("Đang cập nhật dữ liệu từ YouTube...");
      await api.put(`/channels/${id}/refresh`);
      setMessage("Đã cập nhật dữ liệu mới");
      await fetchChannels(keyword);
      await fetchStats();
      if (channelDetail?.channel?.id === id) {
        await openChannelDetail(channelDetail.channel, detailMonth);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || error.response?.data?.error || "Lỗi refresh channel");
    }
  }

  async function handleSyncChannelInfo() {
    if (!canRefreshChannel) {
      setMessage("Bạn không có quyền sync channel");
      return;
    }

    try {
      setSyncingInfo(true);
      setMessage("Syncing channel info in 50-channel batches...");
      const res = await api.post("/channels/sync-basic", {}, { timeout: 300000 });
      const errors = res.data.errors?.length || 0;
      setMessage(`${res.data.message || "Synced channel info"}: ${res.data.synced || 0}/${res.data.total || 0} channels${res.data.batches ? `, ${res.data.batches} batches` : ""}${errors ? `, ${errors} errors` : ""}`);
      await fetchChannels(keyword);
      await fetchStats();
    } catch (error) {
      setMessage(error.response?.data?.message || error.response?.data?.error || "Could not sync channel info");
    } finally {
      setSyncingInfo(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchChannels();
      fetchStats();
      fetchNetworks();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchChannels(keyword);
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(channels.length / pageSize));
    if (page > pageCount) setPage(pageCount);
  }, [channels.length, page, pageSize]);

  const statCards = [
    {
      name: "Total Channels",
      value: stats?.total_channels || 0,
      icon: ListChecks,
      bg: "bg-slate-900",
      text: "text-white"
    },
    {
      name: "Total Views",
      value: formatNumber(stats?.total_views || 0),
      icon: Eye,
      bg: "bg-blue-600",
      text: "text-white"
    },
    {
      name: "Total Subscribers",
      value: formatNumber(stats?.total_subscribers || 0),
      icon: Users,
      bg: "bg-emerald-600",
      text: "text-white"
    },
    {
      name: "Total Videos",
      value: formatNumber(stats?.total_videos || 0),
      icon: Video,
      bg: "bg-purple-600",
      text: "text-white"
    }
  ];

  function toggleSort(key) {
    setSortConfig((current) => ({
      key,
      direction: current?.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
    setPage(1);
  }

  async function handleCopyChannelId(channelId) {
    if (!channelId) return;

    try {
      await navigator.clipboard.writeText(channelId);
      setCopiedChannelId(channelId);
      setTimeout(() => setCopiedChannelId(""), 2500);
    } catch {
      setMessage("Could not copy channel ID");
    }
  }

  const sortedChannels = useMemo(() => {
    if (!sortConfig) return channels;

    const direction = sortConfig.direction === "asc" ? 1 : -1;

    return [...channels].sort((a, b) => {
      if (sortConfig.key === "total_revenue") {
        return (Number(a.total_revenue || 0) - Number(b.total_revenue || 0)) * direction;
      }

      return String(a.title || a.channel_id || "").localeCompare(String(b.title || b.channel_id || ""), "en", {
        sensitivity: "base"
      }) * direction;
    });
  }, [channels, sortConfig]);

  const paginatedChannels = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedChannels.slice(start, start + pageSize);
  }, [sortedChannels, page, pageSize]);

  return (
    <div className="p-5 lg:p-8">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Video size={18} />
            YouTube Data API v3
          </div>

          <h1 className="text-3xl lg:text-4xl font-black text-slate-900">
            Channel Manager
          </h1>

          <p className="text-slate-500 mt-2">
            Thêm channel, tự động lấy thumbnail, tên, view, subscriber, video mới nhất và network history.
          </p>

          <div className="mt-3 inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-600 shadow-sm">
            <span>Đang đăng nhập:</span>
            <span className="font-bold text-slate-900">{user?.full_name}</span>
            <span className="uppercase bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-black">
              {user?.role}
            </span>
          </div>
        </div>

        {canAddChannel ? (
          <div className="flex flex-col gap-3 w-full xl:w-[760px]">
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleSyncChannelInfo}
                disabled={syncingInfo}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-2xl px-5 py-3 font-bold flex items-center justify-center gap-2"
              >
                {syncingInfo ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                Sync channel info
              </button>
            </div>

            <form
              onSubmit={handleAddChannel}
              className="bg-white rounded-3xl p-3 shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3"
            >
              <input
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="Nhập Channel ID, YouTube URL hoặc @handle..."
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500"
              />

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin" size={19} /> : <Plus size={19} />}
                Add
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 w-full xl:w-[520px]">
            <p className="text-sm text-slate-500">
              Tài khoản quyền <b>User</b> chỉ được xem danh sách channel, không được thêm channel mới.
            </p>
          </div>
        )}
      </div>

      {message && (
        <div className="mb-6 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 px-5 py-4 font-medium">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.name} className={`${item.bg} ${item.text} rounded-3xl p-5 shadow-lg`}>
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm opacity-80">{item.name}</p>
                <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Icon size={22} />
                </div>
              </div>
              <p className="text-3xl font-black">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-3">
          <Search size={20} className="text-slate-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên channel, Channel ID hoặc custom URL..."
            className="w-full py-3 text-slate-700"
          />
        </div>
      </div>

      {pageLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      ) : channels.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <Video size={50} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-800">Chưa có channel nào</h3>
          <p className="text-slate-500 mt-2">Hãy nhập Channel ID, YouTube URL hoặc @handle để thêm channel đầu tiên.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-5 py-4 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort("title")}
                      className="inline-flex items-center gap-2 font-black hover:text-blue-600"
                    >
                      Channel
                      <ArrowUpDown size={14} />
                      {sortConfig?.key === "title" ? (
                        <span className="normal-case text-blue-600">{sortConfig.direction === "asc" ? "A-Z" : "Z-A"}</span>
                      ) : null}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-left">Network</th>
                  <th className="px-5 py-4 text-right">Views</th>
                  <th className="px-5 py-4 text-right">Subscribers</th>
                  <th className="px-5 py-4 text-right">Videos</th>
                  <th className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort("total_revenue")}
                      className="inline-flex items-center justify-end gap-2 font-black hover:text-blue-600"
                    >
                      Total Revenue
                      <ArrowUpDown size={14} />
                      {sortConfig?.key === "total_revenue" ? (
                        <span className="normal-case text-blue-600">{sortConfig.direction === "asc" ? "Low" : "High"}</span>
                      ) : null}
                    </button>
                  </th>
                  <th className="px-5 py-4 text-left">Updated</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedChannels.map((channel) => {
                  const channelUrl = `https://www.youtube.com/channel/${channel.channel_id}`;
                  const isError = channel.status === "error";

                  return (
                    <tr key={channel.id} className={isError ? "bg-red-50/70" : "hover:bg-slate-50/70"}>
                      <td className="px-5 py-4 min-w-[360px]">
                        <div className="flex items-center gap-4">
                          <a href={channelUrl} target="_blank" rel="noreferrer" title="Open channel">
                            <img
                              src={channel.thumbnail || "https://placehold.co/80x80?text=YT"}
                              alt={channel.title || channel.channel_id}
                              className={`w-14 h-14 rounded-2xl object-cover border ${isError ? "border-red-200" : "border-slate-200"} bg-slate-100`}
                            />
                          </a>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openChannelDetail(channel)}
                                className="text-left font-black text-slate-900 hover:text-blue-600 truncate max-w-[260px]"
                              >
                                {channel.title || "Channel error / die"}
                              </button>
                              <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${isError ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
                                {channel.status || "active"}
                              </span>
                              <a href={channelUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600">
                                <ExternalLink size={14} />
                              </a>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs font-mono text-emerald-700">
                              <span className="truncate max-w-[260px]">{channel.channel_id}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyChannelId(channel.channel_id)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center"
                                title="Copy channel ID"
                              >
                                {copiedChannelId === channel.channel_id ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                            {channel.status_error ? (
                              <p className="mt-1 text-xs text-red-500 line-clamp-1">{channel.status_error}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-700 font-semibold min-w-[180px]">
                        {channel.current_network?.name || "-"}
                      </td>
                      <td className="px-5 py-4 text-right font-bold">{formatNumber(channel.view_count)}</td>
                      <td className="px-5 py-4 text-right font-bold">{formatNumber(channel.subscriber_count)}</td>
                      <td className="px-5 py-4 text-right font-bold">{formatNumber(channel.video_count)}</td>
                      <td className="px-5 py-4 text-right font-black text-slate-900">{money(channel.total_revenue)}</td>
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap">{formatDate(channel.updated_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openChannelDetail(channel)}
                            className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center"
                            title="Detail"
                          >
                            <Pencil size={16} />
                          </button>
                          {canRefreshChannel ? (
                            <button
                              type="button"
                              onClick={() => handleRefresh(channel.id)}
                              className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-blue-50 text-blue-600 inline-flex items-center justify-center"
                              title="Refresh this channel"
                            >
                              <RefreshCw size={16} />
                            </button>
                          ) : null}
                          {canDeleteChannel ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(channel.id)}
                              className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 inline-flex items-center justify-center"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
            <PaginationFooter
              total={channels.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
        </div>
      )}

      {detailOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-7xl max-h-[94vh] overflow-y-auto bg-[#f3f6fb] rounded-3xl shadow-2xl">
            <div className="bg-white border-b border-slate-200 px-5 py-4 sticky top-0 z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={channelDetail?.channel?.thumbnail || "https://placehold.co/96x96?text=YT"}
                    alt={channelDetail?.channel?.title || "Channel"}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 bg-slate-100"
                  />
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-slate-900 truncate">{channelDetail?.channel?.title || "Channel detail"}</h2>
                    <p className="text-xs font-mono text-slate-500 truncate">{channelDetail?.channel?.channel_id}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Current network: <b>{channelDetail?.current_network?.name || "Chưa gán"}</b>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleRefresh(channelDetail?.channel?.id)}
                    className="bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold flex items-center gap-2"
                  >
                    <RefreshCw size={17} />
                    Làm mới
                  </button>
                  <label className="bg-white border border-slate-300 rounded-2xl px-4 flex items-center gap-2">
                    <CalendarDays size={17} />
                    <input
                      type="month"
                      value={detailMonth}
                      onChange={(e) => handleDetailMonthChange(e.target.value)}
                      className="py-3 bg-transparent outline-none"
                    />
                  </label>
                  <button
                    onClick={() => setDetailOpen(false)}
                    className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center"
                    title="Đóng"
                  >
                    <X size={19} />
                  </button>
                </div>
              </div>
            </div>

            {detailLoading ? (
              <div className="py-24 flex justify-center">
                <Loader2 className="animate-spin text-blue-600" size={38} />
              </div>
            ) : (
              <div className="p-5 space-y-5">
                <div className="grid md:grid-cols-5 gap-4">
                  {[
                    { label: "Total Month", value: channelDetail?.summary?.total_month || 0, icon: CalendarDays },
                    { label: "Networks", value: channelDetail?.summary?.networks || 0, icon: Network },
                    { label: "Total Revenue", value: money(channelDetail?.summary?.total_revenue), icon: DollarSign },
                    { label: "Revenue Period", value: money(channelDetail?.summary?.period_revenue), icon: DollarSign },
                    { label: "Remaining", value: money(channelDetail?.summary?.remaining), icon: Percent }
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
                          <Icon size={15} />
                          {item.label}
                        </div>
                        <p className="text-2xl font-black text-slate-900">{item.value}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid xl:grid-cols-[1.1fr_.9fr] gap-5">
                  <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Change Network</h3>
                    <form onSubmit={handleChangeNetwork} className="grid lg:grid-cols-[1fr_180px_1fr_auto] gap-3">
                      <select
                        value={networkForm.network_id}
                        onChange={(e) => setNetworkForm({ ...networkForm, network_id: e.target.value })}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none"
                        required
                      >
                        <option value="">Chọn network</option>
                        {networks.map((network) => (
                          <option key={network.id} value={network.id}>{network.name}</option>
                        ))}
                      </select>
                      <input
                        type="month"
                        value={networkForm.start_month}
                        onChange={(e) => setNetworkForm({ ...networkForm, start_month: e.target.value })}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none"
                        required
                      />
                      <input
                        value={networkForm.note}
                        onChange={(e) => setNetworkForm({ ...networkForm, note: e.target.value })}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none"
                        placeholder="Ghi chú chuyển network"
                      />
                      <button disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-5 py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                        <Pencil size={17} />
                        Lưu
                      </button>
                    </form>

                    <div className="mt-5">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Network History</h4>
                      {!channelDetail?.network_history?.length ? (
                        <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500">Channel này chưa có lịch sử network.</div>
                      ) : (
                        <div className="space-y-2">
                          {channelDetail.network_history.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="font-black text-slate-900">{item.start_month}</span>
                                <span className="text-slate-600">
                                  {item.old_network?.name || "None"} → <b>{item.new_network?.name}</b>
                                </span>
                              </div>
                              {item.note ? <p className="text-slate-500 mt-1">{item.note}</p> : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Revenue Breakdown</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <h4 className="font-black text-slate-900 mb-3">By month</h4>
                        <div className="space-y-2">
                          {(channelDetail?.breakdown?.by_month || []).map((item) => (
                            <div key={item.month} className="flex justify-between text-sm">
                              <span>{item.month}</span>
                              <b>{money(item.revenue)}</b>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <h4 className="font-black text-slate-900 mb-3">By network</h4>
                        <div className="space-y-2">
                          {(channelDetail?.breakdown?.by_network || []).map((item) => (
                            <div key={item.network_id || item.network_name} className="flex justify-between text-sm">
                              <span>{item.network_name}</span>
                              <b>{money(item.revenue)}</b>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <section className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Revenue Rows</h3>
                  </div>
                  {!channelDetail?.revenue_rows?.length ? (
                    <div className="p-8 text-center text-slate-500">Channel này chưa có dữ liệu revenue.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="text-left px-5 py-3">Month</th>
                            <th className="text-left px-5 py-3">Network</th>
                            <th className="text-right px-5 py-3">Revenue</th>
                            <th className="text-left px-5 py-3">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {channelDetail.revenue_rows.map((row) => (
                            <tr key={`${row.month}-${row.network_id}`}>
                              <td className="px-5 py-4 font-bold">{row.month}</td>
                              <td className="px-5 py-4">{row.network_name || "-"}</td>
                              <td className="px-5 py-4 text-right font-black">{money(row.revenue)}</td>
                              <td className="px-5 py-4 text-slate-500">{formatDate(row.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
