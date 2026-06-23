import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowDownZA, CheckSquare, Copy, Download, Loader2, Search, Square, Trash2, Video } from "lucide-react";
import api from "../api/api";

const sampleInput = [
  "Each line one link:",
  "https://youtube.com/@channel",
  "https://youtube.com/channel/UC...",
  "https://youtube.com/watch?v=...",
  "@username"
].join("\n");

function compactNumber(value) {
  if (value === null || value === undefined || value === "") return "-";
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadText(filename, text, type) {
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

export default function GetChannelPage() {
  const [inputs, setInputs] = useState("");
  const [rows, setRows] = useState([]);
  const [unresolved, setUnresolved] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [uploadSort, setUploadSort] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const sortedRows = useMemo(() => {
    const nextRows = [...rows];
    if (!uploadSort) return nextRows;

    nextRows.sort((a, b) => {
      const timeA = new Date(a.latestVideos?.[0]?.publishedAt || 0).getTime();
      const timeB = new Date(b.latestVideos?.[0]?.publishedAt || 0).getTime();

      if (!timeA && !timeB) return a.channelTitle.localeCompare(b.channelTitle, undefined, { sensitivity: "base", numeric: true });
      if (!timeA) return 1;
      if (!timeB) return -1;
      return uploadSort === "asc" ? timeA - timeB : timeB - timeA;
    });

    return nextRows;
  }, [rows, uploadSort]);

  const selectedRows = useMemo(() => {
    const selected = new Set(selectedIds);
    return rows.filter((row) => selected.has(row.channelId));
  }, [rows, selectedIds]);

  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  function toggleAll() {
    setSelectedIds(allSelected ? [] : rows.map((row) => row.channelId));
  }

  function toggleRow(channelId) {
    setSelectedIds((current) => (
      current.includes(channelId)
        ? current.filter((id) => id !== channelId)
        : [...current, channelId]
    ));
  }

  function toggleUploadSort() {
    setUploadSort((current) => (current === "desc" ? "asc" : "desc"));
  }

  async function copyText(text, successMessage, filename = "channel_ids.txt") {
    if (!text) {
      setMessage("No data to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setMessage(successMessage);
    } catch {
      downloadText(filename, text, "text/plain;charset=utf-8");
      setMessage("Clipboard was blocked, so the data was downloaded as TXT.");
    }
  }

  async function copyOne(channelId) {
    copyText(channelId, `Copied Channel ID: ${channelId}`, "channel_id.txt");
  }

  function copyAllIds() {
    const ids = rows.map((row) => row.channelId).join("\n");
    copyText(ids, `Copied ${rows.length} Channel IDs.`);
  }

  function copySelectedIds() {
    const ids = selectedRows.map((row) => row.channelId).join("\n");
    copyText(ids, `Copied ${selectedRows.length} selected Channel IDs.`);
  }

  function deleteSelectedRows() {
    if (!selectedIds.length) {
      setMessage("No selected channels to delete.");
      return;
    }

    const selected = new Set(selectedIds);
    setRows((current) => current.filter((row) => !selected.has(row.channelId)));
    setSelectedIds([]);
    setMessage(`Removed ${selected.size} selected channel(s) from the list.`);
  }

  function exportExcel() {
    const exportRows = selectedRows.length ? selectedRows : rows;
    if (!exportRows.length) {
      setMessage("No data to export.");
      return;
    }

    const header = [
      "#",
      "Channel Name",
      "Channel ID",
      "Subscribers",
      "Videos",
      "Total Views",
      "Channel URL",
      "Avatar URL",
      "Source Inputs",
      "Last Video 1 Title",
      "Last Video 1 URL",
      "Last Video 1 Published At",
      "Last Video 2 Title",
      "Last Video 2 URL",
      "Last Video 2 Published At"
    ];
    const lines = exportRows.map((row, index) => [
      index + 1,
      row.channelTitle,
      row.channelId,
      row.subscriberCount ?? "",
      row.channelVideoCount ?? "",
      row.channelViewCount ?? "",
      row.channelUrl,
      row.channelAvatarUrl,
      (row.sourceInputs || []).join(" | "),
      row.latestVideos?.[0]?.videoTitle || "",
      row.latestVideos?.[0]?.videoUrl || "",
      formatDate(row.latestVideos?.[0]?.publishedAt),
      row.latestVideos?.[1]?.videoTitle || "",
      row.latestVideos?.[1]?.videoUrl || "",
      formatDate(row.latestVideos?.[1]?.publishedAt)
    ]);

    const csv = [header, ...lines].map((line) => line.map(csvEscape).join(",")).join("\r\n");
    downloadText("youtube_channels.csv", `\uFEFF${csv}`, "text/csv;charset=utf-8");
    setMessage(`Exported ${exportRows.length} channel(s).`);
  }

  async function fetchChannels(event, includeLastVideos = false) {
    event?.preventDefault();
    const cleanInputs = inputs.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!cleanInputs.length) {
      setMessage("Please enter at least one channel or video link.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setRows([]);
      setUnresolved([]);
      setSelectedIds([]);
      setUploadSort("");

      const response = await api.post("/youtube-trend/channels", { inputs: cleanInputs, includeLastVideos }, { timeout: 300000 });
      const nextRows = response.data.data || [];
      const nextUnresolved = response.data.unresolved || [];
      const latestVideoErrors = Number(response.data.meta?.latestVideoErrors || 0);

      setRows(nextRows);
      setUnresolved(nextUnresolved);
      setMessage(
        `Found ${nextRows.length} channel(s)${includeLastVideos ? " with last videos" : ""}` +
        `${nextUnresolved.length ? `, ${nextUnresolved.length} unresolved input(s)` : ""}` +
        `${latestVideoErrors ? `, ${latestVideoErrors} channel(s) without last videos` : ""}.`
      );
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not fetch channels.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-600">
          <Video size={18} />
          Get Channel
        </div>
        <h1 className="text-3xl font-black text-slate-950 lg:text-4xl">Get Channel</h1>
        <p className="mt-2 text-slate-500">Paste one channel, handle, or video link per line.</p>
      </div>

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={(event) => fetchChannels(event, false)} className="space-y-4">
          <label className="block">
            <span className="text-sm font-black text-slate-700">Channel inputs</span>
            <textarea
              value={inputs}
              onChange={(event) => setInputs(event.target.value)}
              placeholder={sampleInput}
              className="mt-2 min-h-44 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-blue-500"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-60">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
              Get Channels
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => fetchChannels(null, true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Video size={18} />}
              Get Channels & Last Videos
            </button>
            <button type="button" onClick={copyAllIds} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">
              <Copy size={18} />
              Copy All Channel IDs
            </button>
            <button type="button" onClick={copySelectedIds} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">
              <CheckSquare size={18} />
              Copy Selected
            </button>
            <button
              type="button"
              onClick={toggleUploadSort}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50"
              title="Sort by latest video upload time"
            >
              {uploadSort === "asc" ? <ArrowDownAZ size={18} /> : <ArrowDownZA size={18} />}
              Last Video {uploadSort === "asc" ? "A-Z" : "Z-A"}
            </button>
            <button
              type="button"
              onClick={deleteSelectedRows}
              disabled={!selectedIds.length}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-3 font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={18} />
              Delete Selected
            </button>
            <button type="button" onClick={exportExcel} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">
              <Download size={18} />
              Export Excel
            </button>
          </div>
        </form>

        {message && <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 font-bold text-blue-700">{message}</div>}

        {unresolved.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            {unresolved.map((item) => `${item.input}: ${item.reason}`).join(" | ")}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="bg-blue-600 text-left text-sm font-black text-white">
                <th className="w-16 p-4">
                  <button type="button" onClick={toggleAll} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" title="Select all">
                    {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="w-16 p-4">#</th>
                <th className="p-4">Channel Informations</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => {
                const selected = selectedIds.includes(row.channelId);
                return (
                  <tr
                    key={row.channelId}
                    className={`border-t transition-colors ${
                      selected
                        ? "border-blue-100 bg-blue-50 hover:bg-blue-100"
                        : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <td className="p-4">
                      <button type="button" onClick={() => toggleRow(row.channelId)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-blue-50 hover:text-blue-600">
                        {selected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="p-4 font-bold text-slate-700">{index + 1}</td>
                    <td className="p-4">
                      <div className="flex min-w-[760px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex min-w-[520px] items-center gap-4">
                          <a
                            href={row.channelUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100"
                            title="Open channel"
                          >
                            {row.channelAvatarUrl ? (
                              <img src={row.channelAvatarUrl} alt={row.channelTitle || "Channel avatar"} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <span className="text-lg font-black text-slate-400">{(row.channelTitle || "?").charAt(0).toUpperCase()}</span>
                            )}
                          </a>
                          <div className="min-w-0">
                            <a href={row.channelUrl} target="_blank" rel="noreferrer" className="block truncate text-lg font-black text-slate-950 hover:text-blue-600" title={row.channelTitle}>
                              {row.channelTitle || "-"}
                            </a>
                            <div className="mt-1 flex max-w-[420px] items-center gap-2">
                              <span className="truncate text-xs font-semibold text-slate-400" title={row.channelId}>{row.channelId}</span>
                              <button
                                type="button"
                                onClick={() => copyOne(row.channelId)}
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                title="Copy Channel ID"
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-500">
                              <span>Sub: {row.hiddenSubscriberCount ? "Hidden" : compactNumber(row.subscriberCount)}</span>
                              <span>Videos: {compactNumber(row.channelVideoCount)}</span>
                              <span>Total views: {compactNumber(row.channelViewCount)}</span>
                              <span>Created: {formatDate(row.channelPublishedAt) || "-"}</span>
                            </div>
                          </div>
                        </div>

                        {row.latestVideos?.length > 0 && (
                          <div className="grid min-w-[520px] max-w-[640px] grid-cols-1 gap-3 md:grid-cols-2">
                            {row.latestVideos.slice(0, 2).map((video) => (
                              <a
                                key={video.videoId}
                                href={video.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 hover:border-blue-200 hover:bg-blue-50"
                                title={video.videoTitle}
                              >
                                <span className="block w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                  {video.thumbnailUrl ? (
                                    <img src={video.thumbnailUrl} alt={video.videoTitle || "Latest video thumbnail"} className="aspect-video w-full object-cover" loading="lazy" />
                                  ) : (
                                    <span className="flex aspect-video w-full items-center justify-center text-[11px] font-bold text-slate-400">No image</span>
                                  )}
                                </span>
                                <span className="min-w-0">
                                  <span className="line-clamp-2 text-sm font-black leading-5 text-slate-900 group-hover:text-blue-600">{video.videoTitle || "-"}</span>
                                  <span className="mt-1 block text-xs font-bold text-slate-400">{formatDate(video.publishedAt)}</span>
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!sortedRows.length && (
                <tr>
                  <td colSpan="3" className="p-10 text-center font-medium text-slate-500">
                    Paste inputs and click Get Channels.
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
