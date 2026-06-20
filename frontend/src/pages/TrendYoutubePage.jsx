import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowDownZA, Copy, Download, Loader2, Search, TrendingUp } from "lucide-react";
import api from "../api/api";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function compactNumber(value) {
  if (value === null || value === undefined || value === "") return "-";
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));
}

function downloadText(filename, text, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function sortLabel(active, direction, text) {
  if (!active) return text;
  return `${text} ${direction === "asc" ? "A-Z" : "Z-A"}`;
}

export default function TrendYoutubePage() {
  const [form, setForm] = useState({
    keyword: "",
    order: "date",
    maxChannels: 50,
    regionCode: ""
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sort, setSort] = useState({ key: "", direction: "desc" });

  const sortedRows = useMemo(() => {
    const nextRows = [...rows];
    if (!sort.key) return nextRows;

    nextRows.sort((a, b) => {
      let valueA = a[sort.key] ?? "";
      let valueB = b[sort.key] ?? "";

      if (sort.key === "publishedAt") {
        valueA = new Date(valueA || 0).getTime();
        valueB = new Date(valueB || 0).getTime();
      }

      if (sort.key === "viewCount" || sort.key === "durationSeconds") {
        valueA = Number(valueA || 0);
        valueB = Number(valueB || 0);
      }

      if (typeof valueA === "string") {
        return sort.direction === "asc"
          ? valueA.localeCompare(valueB, undefined, { sensitivity: "base", numeric: true })
          : valueB.localeCompare(valueA, undefined, { sensitivity: "base", numeric: true });
      }
      return sort.direction === "asc" ? valueA - valueB : valueB - valueA;
    });

    return nextRows;
  }, [rows, sort]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc"
    }));
  }

  async function searchChannels(event) {
    event.preventDefault();
    const keyword = form.keyword.trim();
    if (!keyword) {
      setMessage("Please enter a keyword.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const response = await api.get("/youtube-trend/keyword", {
        params: {
          keyword,
          order: form.order,
          maxChannels: form.maxChannels,
          regionCode: form.regionCode.trim().toUpperCase()
        },
        timeout: 120000
      });

      setRows(response.data.data || []);
      setMessage(`Found ${response.data.data?.length || 0} channels.`);
    } catch (error) {
      setRows([]);
      setMessage(error.response?.data?.message || "Could not fetch YouTube channels.");
    } finally {
      setLoading(false);
    }
  }

  async function copyChannelIds() {
    const ids = sortedRows.map((row) => row.channelId).filter(Boolean);
    if (!ids.length) {
      setMessage("No Channel IDs to copy.");
      return;
    }

    const text = ids.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setMessage(`Copied ${ids.length} Channel IDs.`);
    } catch {
      downloadText("channel_ids.txt", text);
      setMessage("Clipboard was blocked, so the Channel IDs were downloaded as TXT.");
    }
  }

  async function copySingleChannelId(channelId) {
    if (!channelId) return;

    try {
      await navigator.clipboard.writeText(channelId);
      setMessage(`Copied Channel ID: ${channelId}`);
    } catch {
      downloadText("channel_id.txt", channelId);
      setMessage("Clipboard was blocked, so the Channel ID was downloaded as TXT.");
    }
  }

  function exportCsv() {
    if (!sortedRows.length) {
      setMessage("No data to export.");
      return;
    }

    const header = ["#", "Channel Name", "Channel ID", "Subscribers", "Channel Videos", "Channel Views", "Channel Avatar", "Video Thumbnail", "Picked Video Title", "Duration", "Published At", "Views", "Video Link", "Channel Link"];
    const data = sortedRows.map((row, index) => [
      index + 1,
      row.channelTitle,
      row.channelId,
      row.subscriberCount ?? "",
      row.channelVideoCount ?? "",
      row.channelViewCount ?? "",
      row.channelAvatarUrl,
      row.thumbnailUrl,
      row.videoTitle,
      row.duration,
      formatDate(row.publishedAt),
      row.viewCount,
      `https://www.youtube.com/watch?v=${row.videoId}`,
      `https://www.youtube.com/channel/${row.channelId}`
    ]);

    const csv = [header, ...data].map((line) => line.map(csvEscape).join(",")).join("\n");
    downloadText("channels_by_keyword.csv", csv, "text/csv;charset=utf-8");
    setMessage(`Exported ${sortedRows.length} rows.`);
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-600">
            <TrendingUp size={18} />
            Trend Youtube
          </div>
          <h1 className="text-3xl font-black text-slate-950 lg:text-4xl">Trend Youtube</h1>
          <p className="mt-2 text-slate-500">Get by Keyword</p>
        </div>
      </div>

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={searchChannels} className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_180px_160px_160px_auto] xl:items-end">
          <label className="block">
            <span className="text-sm font-black text-slate-700">Keyword</span>
            <input
              value={form.keyword}
              onChange={(event) => updateField("keyword", event.target.value)}
              placeholder="Enter keyword, e.g. EDM remix"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-700">Strategy</span>
            <select value={form.order} onChange={(event) => updateField("order", event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold outline-none focus:border-blue-500">
              <option value="date">Latest Upload</option>
              <option value="viewCount">Most Viewed</option>
              <option value="relevance">Relevance</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-700">Max Channels</span>
            <input
              type="number"
              min="1"
              max="200"
              value={form.maxChannels}
              onChange={(event) => updateField("maxChannels", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-700">Region</span>
            <input
              value={form.regionCode}
              onChange={(event) => updateField("regionCode", event.target.value.toUpperCase())}
              placeholder="VN, US"
              maxLength="2"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 uppercase outline-none focus:border-blue-500"
            />
          </label>

          <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            Get Channels
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">
            <Download size={18} />
            Export CSV
          </button>
          <button type="button" onClick={copyChannelIds} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">
            <Copy size={18} />
            Copy Channel IDs
          </button>
        </div>

        {message && <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 font-bold text-blue-700">{message}</div>}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead>
              <tr className="bg-blue-600 text-left text-sm font-black text-white">
                <th className="p-4">#</th>
                <th className="cursor-pointer p-4" onClick={() => toggleSort("channelTitle")}>
                  <span className="inline-flex items-center gap-2">
                    {sortLabel(sort.key === "channelTitle", sort.direction, "Channel")}
                    {sort.key === "channelTitle" && (sort.direction === "asc" ? <ArrowDownAZ size={15} /> : <ArrowDownZA size={15} />)}
                  </span>
                </th>
                <th className="cursor-pointer p-4" onClick={() => toggleSort("videoTitle")}>
                  <span className="inline-flex items-center gap-2">
                    {sortLabel(sort.key === "videoTitle", sort.direction, "Video")}
                    {sort.key === "videoTitle" && (sort.direction === "asc" ? <ArrowDownAZ size={15} /> : <ArrowDownZA size={15} />)}
                  </span>
                </th>
                <th className="cursor-pointer p-4" onClick={() => toggleSort("durationSeconds")}>Duration</th>
                <th className="cursor-pointer p-4" onClick={() => toggleSort("publishedAt")}>Published At</th>
                <th className="cursor-pointer p-4" onClick={() => toggleSort("viewCount")}>Views</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => (
                <tr key={`${row.channelId}-${row.videoId}`} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-700">{index + 1}</td>
                  <td className="p-4">
                    <div className="flex min-w-[300px] items-center gap-3">
                      <a
                        href={`https://www.youtube.com/channel/${row.channelId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100"
                        title="Open channel"
                      >
                        {row.channelAvatarUrl ? (
                          <img src={row.channelAvatarUrl} alt={row.channelTitle || "Channel avatar"} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="text-sm font-black text-slate-400">{(row.channelTitle || "?").charAt(0).toUpperCase()}</span>
                        )}
                      </a>
                      <div className="min-w-0">
                        <a
                          href={`https://www.youtube.com/channel/${row.channelId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate font-black text-slate-900 hover:text-blue-600"
                          title={row.channelTitle}
                        >
                          {row.channelTitle || "-"}
                        </a>
                        <div className="mt-1 flex max-w-[260px] items-center gap-2">
                          <span className="truncate text-xs font-semibold text-slate-400" title={row.channelId}>{row.channelId}</span>
                          <button
                            type="button"
                            onClick={() => copySingleChannelId(row.channelId)}
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            title="Copy Channel ID"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-400">
                          <span>Sub: {compactNumber(row.subscriberCount)}</span>
                          <span>Videos: {compactNumber(row.channelVideoCount)}</span>
                          <span>Views: {compactNumber(row.channelViewCount)}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex min-w-[480px] items-center gap-4">
                      <a href={`https://www.youtube.com/watch?v=${row.videoId}`} target="_blank" rel="noreferrer" className="block w-[150px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100" title="Open video">
                        {row.thumbnailUrl ? (
                          <img src={row.thumbnailUrl} alt={row.videoTitle || "Video thumbnail"} className="aspect-video w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex aspect-video w-full items-center justify-center text-xs font-bold text-slate-400">No image</div>
                        )}
                      </a>
                      <div className="min-w-0">
                        <a
                          href={`https://www.youtube.com/watch?v=${row.videoId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-2 font-semibold leading-6 text-slate-900 hover:text-blue-600"
                          title={row.videoTitle}
                        >
                          {row.videoTitle || "-"}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-slate-700">{row.duration}</td>
                  <td className="p-4 text-slate-600">{formatDate(row.publishedAt)}</td>
                  <td className="p-4 font-bold text-slate-900">{Number(row.viewCount || 0).toLocaleString()}</td>
                </tr>
              ))}

              {!sortedRows.length && (
                <tr>
                  <td colSpan="6" className="p-10 text-center font-medium text-slate-500">
                    Search a keyword to load YouTube channels.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
