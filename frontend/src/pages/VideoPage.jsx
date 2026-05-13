import { useEffect, useState } from "react";
import {
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  Video
} from "lucide-react";
import api from "../api/api";

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatDate(date) {
  if (!date) return "N/A";

  try {
    return new Date(date).toLocaleDateString("vi-VN");
  } catch {
    return "N/A";
  }
}

export default function VideoPage() {
  const [videos, setVideos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchVideos(searchValue = search) {
    try {
      setLoading(true);

      const res = await api.get("/videos", {
        params: {
          q: searchValue
        }
      });

      setVideos(res.data.data || []);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Lỗi tải danh sách video"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    try {
      setSyncing(true);
      setMessage("Đang đồng bộ toàn bộ video từ YouTube...");

      const res = await api.post("/videos/sync");

      setMessage(
        `${res.data.message || "Đã đồng bộ video"}: ${res.data.synced || 0} video`
      );
      await fetchVideos();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Lỗi đồng bộ video"
      );
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVideos(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="p-5 lg:p-8">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Video size={18} />
            Video Tracking
          </div>

          <h1 className="text-3xl lg:text-4xl font-black text-slate-900">
            Video
          </h1>

          <p className="text-slate-500 mt-2">
            Theo dõi toàn bộ video, ngày public, view hôm qua, view hôm nay và tăng trưởng.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {syncing ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <RefreshCw size={18} />
          )}
          Sync Video
        </button>
      </div>

      {message && (
        <div className="mb-6 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 px-5 py-4 font-medium">
          {message}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 mb-6">
        <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo Channel ID, tên kênh, title video hoặc Video ID..."
            className="w-full bg-transparent text-slate-700"
          />
        </label>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Danh sách video
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Tổng: {formatNumber(videos.length)} video
            </p>
          </div>

          {loading && <Loader2 className="animate-spin text-blue-600" size={24} />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px]">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-500">
                <th className="p-4">Video</th>
                <th className="p-4">Title</th>
                <th className="p-4">Channel</th>
                <th className="p-4">Public</th>
                <th className="p-4 text-right">View hôm qua</th>
                <th className="p-4 text-right">View hôm nay</th>
                <th className="p-4 text-right">Tăng trưởng</th>
                <th className="p-4 text-right">Link</th>
              </tr>
            </thead>

            <tbody>
              {videos.map((video) => (
                <tr
                  key={video.video_id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="p-4">
                    <img
                      src={video.thumbnail || "https://placehold.co/160x90?text=YT"}
                      alt={video.title}
                      className="w-28 aspect-video rounded-xl object-cover border border-slate-200"
                    />
                  </td>

                  <td className="p-4 max-w-[360px]">
                    <p className="font-black text-slate-900 line-clamp-2">
                      {video.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-2 break-all">
                      {video.video_id}
                    </p>
                  </td>

                  <td className="p-4 max-w-[260px]">
                    <p className="font-bold text-slate-900 line-clamp-1">
                      {video.channel_title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 break-all">
                      {video.channel_id}
                    </p>
                  </td>

                  <td className="p-4 text-slate-600">
                    {formatDate(video.published_at)}
                  </td>

                  <td className="p-4 text-right font-bold text-slate-700">
                    {formatNumber(video.view_count_yesterday)}
                  </td>

                  <td className="p-4 text-right font-black text-slate-900">
                    {formatNumber(video.view_count_today)}
                  </td>

                  <td className="p-4 text-right">
                    <span
                      className={[
                        "inline-flex items-center justify-end gap-1 rounded-full px-3 py-1 text-sm font-black",
                        Number(video.view_growth || 0) >= 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      ].join(" ")}
                    >
                      <TrendingUp size={15} />
                      {formatNumber(video.view_growth)}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <a
                      href={`https://www.youtube.com/watch?v=${video.video_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                      title="Mở video"
                    >
                      <ExternalLink size={17} />
                    </a>
                  </td>
                </tr>
              ))}

              {!loading && videos.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-slate-500">
                    Chưa có video. Bấm Sync Video để lấy dữ liệu từ YouTube.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
