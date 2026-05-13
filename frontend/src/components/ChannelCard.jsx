import {
  Eye,
  Users,
  Video,
  Trash2,
  RefreshCw,
  ExternalLink,
  Calendar,
  PlayCircle,
  Copy,
  Check,
  Info
} from "lucide-react";
import { useState } from "react";

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    notation: number >= 1000000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(number);
}

function formatDate(date) {
  if (!date) return "N/A";

  try {
    return new Date(date).toLocaleDateString("vi-VN");
  } catch {
    return "N/A";
  }
}

function getLatestVideos(channel) {
  if (Array.isArray(channel.latest_videos)) return channel.latest_videos;

  try {
    return JSON.parse(channel.latest_videos || "[]");
  } catch {
    return [];
  }
}

export default function ChannelCard({
  channel,
  onDelete,
  onRefresh,
  onOpenDetail,
  canRefresh = false,
  canDelete = false
}) {
  const [copied, setCopied] = useState(false);
  const latestVideos = getLatestVideos(channel).slice(0, 2);
  const isError = channel.status === "error";
  const statusClasses = isError
    ? "border-red-200 bg-red-50/50 hover:shadow-red-100"
    : "border-emerald-200 bg-emerald-50/40 hover:shadow-emerald-100";
  const statusBadgeClasses = isError
    ? "bg-red-100 text-red-700"
    : "bg-emerald-100 text-emerald-700";

  async function handleCopyChannelId() {
    try {
      await navigator.clipboard.writeText(channel.channel_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  const stats = [
    {
      label: "Views",
      value: formatNumber(channel.view_count),
      icon: Eye,
      color: "text-blue-600"
    },
    {
      label: "Subs",
      value: formatNumber(channel.subscriber_count),
      icon: Users,
      color: "text-emerald-600"
    },
    {
      label: "Videos",
      value: formatNumber(channel.video_count),
      icon: Video,
      color: "text-purple-600"
    }
  ];

  return (
    <div
      className={[
        "rounded-2xl border shadow-sm hover:shadow-lg transition-all overflow-hidden",
        statusClasses
      ].join(" ")}
    >
      <div className="p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px_auto] gap-4 xl:items-center">
          <div className="flex gap-3 min-w-0">
            <img
              src={channel.thumbnail || "https://placehold.co/96x96?text=YT"}
              alt={channel.title}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 line-clamp-1">
                  {channel.title}
                </h3>

                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase",
                    statusBadgeClasses
                  ].join(" ")}
                  title={channel.status_error || ""}
                >
                  {isError ? "error" : "active"}
                </span>

                <a
                  href={`https://www.youtube.com/channel/${channel.channel_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 shrink-0 rounded-xl bg-slate-100 hover:bg-blue-50 flex items-center justify-center text-slate-600 hover:text-blue-600"
                  title="Mở channel trên YouTube"
                >
                  <ExternalLink size={16} />
                </a>

                <button
                  type="button"
                  onClick={() => onOpenDetail?.(channel)}
                  className="w-8 h-8 shrink-0 rounded-xl bg-slate-100 hover:bg-emerald-50 flex items-center justify-center text-slate-600 hover:text-emerald-700"
                  title="Xem chi tiết channel"
                >
                  <Info size={16} />
                </button>
              </div>

              <div className="mt-1 flex items-center gap-2 min-w-0">
                <p className="text-sm text-slate-500 truncate">
                  {channel.channel_id}
                </p>

                <button
                  type="button"
                  onClick={handleCopyChannelId}
                  className="w-6 h-6 shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center"
                  title="Copy Channel ID"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {stats.map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      key={stat.label}
                      className="inline-flex items-center gap-1.5 text-slate-600"
                    >
                      <Icon size={13} className={stat.color} />
                      <span>{stat.label}</span>
                      <span className="font-black text-slate-900">
                        {stat.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
            <div className="flex items-center gap-2 text-sm text-slate-800 font-black mb-2">
              <PlayCircle size={16} className="text-red-600" />
              <span>2 video mới nhất</span>
            </div>

            {latestVideos.length > 0 ? (
              <div className="space-y-2">
                {latestVideos.map((video) => (
                  <a
                    key={video.video_id || video.url}
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 px-3 py-2 hover:border-red-200 hover:bg-red-50 transition-colors"
                    title={video.title}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">
                        {video.title || "Video YouTube"}
                      </p>

                      <p className="text-xs text-slate-500">
                        Published: {formatDate(video.published_at)}
                      </p>
                    </div>

                    <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white">
                      <PlayCircle size={13} />
                      Xem
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Chưa có dữ liệu video. Bấm Refresh để cập nhật.
              </p>
            )}
          </div>

          <div className="flex xl:flex-col items-center justify-between xl:justify-center gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar size={14} />
              <span>{formatDate(channel.published_at)}</span>
            </div>

            <div className="flex items-center gap-2">
              {canRefresh && (
                <button
                  onClick={() => onRefresh(channel.id)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 flex items-center justify-center"
                  title="Refresh"
                >
                  <RefreshCw size={15} />
                </button>
              )}

              {canDelete && (
                <button
                  onClick={() => onDelete(channel.id)}
                  className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
