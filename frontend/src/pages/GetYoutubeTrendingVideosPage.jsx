import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowDownZA, Copy, Download, ExternalLink, Loader2, Search, TrendingUp } from "lucide-react";
import api from "../api/api";

const countries = [
  { code: "AE", name: "United Arab Emirates" },
  { code: "AR", name: "Argentina" },
  { code: "AT", name: "Austria" },
  { code: "AU", name: "Australia" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BR", name: "Brazil" },
  { code: "CA", name: "Canada" },
  { code: "CH", name: "Switzerland" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "DE", name: "Germany" },
  { code: "DK", name: "Denmark" },
  { code: "EG", name: "Egypt" },
  { code: "ES", name: "Spain" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "HK", name: "Hong Kong" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IN", name: "India" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "MX", name: "Mexico" },
  { code: "MY", name: "Malaysia" },
  { code: "NL", name: "Netherlands" },
  { code: "NO", name: "Norway" },
  { code: "NZ", name: "New Zealand" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SE", name: "Sweden" },
  { code: "SG", name: "Singapore" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Turkey" },
  { code: "TW", name: "Taiwan" },
  { code: "UA", name: "Ukraine" },
  { code: "US", name: "United States" },
  { code: "VN", name: "Vietnam" },
  { code: "ZA", name: "South Africa" }
];

const categories = [
  { value: "", label: "All Categories" },
  { value: "10", label: "Music" },
  { value: "1", label: "Film & Animation" },
  { value: "20", label: "Gaming" },
  { value: "24", label: "Entertainment" },
  { value: "25", label: "News & Politics" },
  { value: "17", label: "Sports" },
  { value: "28", label: "Science & Tech" }
];

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
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

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function sortLabel(active, direction, text) {
  if (!active) return text;
  return `${text} ${direction === "asc" ? "A-Z" : "Z-A"}`;
}

export default function GetYoutubeTrendingVideosPage() {
  const [form, setForm] = useState({
    regionCode: "VN",
    categoryId: "",
    maxResults: 50
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sort, setSort] = useState({ key: "", direction: "desc" });

  const selectedCountry = countries.find((country) => country.code === form.regionCode);

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

      if (["viewCount", "likeCount", "commentCount", "durationSeconds"].includes(sort.key)) {
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

  async function fetchTrendingVideos(event) {
    event.preventDefault();
    const regionCode = form.regionCode.trim().toUpperCase();

    if (!/^[A-Z]{2}$/.test(regionCode)) {
      setMessage("Please enter a valid 2-letter country code, e.g. VN or US.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const response = await api.get("/youtube-trend/trending-videos", {
        params: {
          regionCode,
          categoryId: form.categoryId,
          maxResults: form.maxResults
        },
        timeout: 120000
      });

      const nextRows = response.data.data || [];
      setRows(nextRows);
      setMessage(`Found ${nextRows.length} trending video(s)${selectedCountry ? ` in ${selectedCountry.name}` : ""}.`);
    } catch (error) {
      setRows([]);
      setMessage(error.response?.data?.message || "Could not fetch trending videos.");
    } finally {
      setLoading(false);
    }
  }

  async function copyText(text, successMessage, filename) {
    if (!text) {
      setMessage("No data to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setMessage(successMessage);
    } catch {
      downloadText(filename, text);
      setMessage("Clipboard was blocked, so the data was downloaded as TXT.");
    }
  }

  function copyChannelIds() {
    const ids = sortedRows.map((row) => row.channelId).filter(Boolean);
    copyText(ids.join("\n"), `Copied ${ids.length} Channel IDs.`, "trending_channel_ids.txt");
  }

  function copySingleChannelId(channelId) {
    copyText(channelId, `Copied Channel ID: ${channelId}`, "channel_id.txt");
  }

  function exportCsv() {
    if (!sortedRows.length) {
      setMessage("No data to export.");
      return;
    }

    const header = ["#", "Video Title", "Channel Name", "Channel ID", "Duration", "Published At", "Views", "Likes", "Comments", "Video URL", "Channel URL", "Thumbnail URL"];
    const data = sortedRows.map((row, index) => [
      index + 1,
      row.videoTitle,
      row.channelTitle,
      row.channelId,
      row.duration,
      formatDate(row.publishedAt),
      row.viewCount,
      row.likeCount,
      row.commentCount,
      row.videoUrl,
      row.channelUrl,
      row.thumbnailUrl
    ]);

    const csv = [header, ...data].map((line) => line.map(csvEscape).join(",")).join("\r\n");
    downloadText("youtube_trending_videos.csv", `\uFEFF${csv}`, "text/csv;charset=utf-8");
    setMessage(`Exported ${sortedRows.length} trending video(s).`);
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-600">
          <TrendingUp size={18} />
          Trending Videos
        </div>
        <h1 className="text-3xl font-black text-slate-950 lg:text-4xl">Get Youtube Trending Videos</h1>
        <p className="mt-2 text-slate-500">Fetch most popular YouTube videos by country and category.</p>
      </div>

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={fetchTrendingVideos} className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_220px_180px_auto] xl:items-end">
          <label className="block">
            <span className="text-sm font-black text-slate-700">Country Code</span>
            <input
              list="trending-country-codes"
              value={form.regionCode}
              onChange={(event) => updateField("regionCode", event.target.value.toUpperCase().slice(0, 2))}
              placeholder="VN"
              maxLength="2"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 uppercase outline-none focus:border-blue-500"
            />
            <datalist id="trending-country-codes">
              {countries.map((country) => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-700">Category</span>
            <select
              value={form.categoryId}
              onChange={(event) => updateField("categoryId", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold outline-none focus:border-blue-500"
            >
              {categories.map((category) => (
                <option key={category.value || "all"} value={category.value}>{category.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-700">Number of Videos</span>
            <input
              type="number"
              min="1"
              max="200"
              value={form.maxResults}
              onChange={(event) => updateField("maxResults", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
            />
          </label>

          <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            Get Videos
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
                <th className="cursor-pointer p-4" onClick={() => toggleSort("videoTitle")}>
                  <span className="inline-flex items-center gap-2">
                    {sortLabel(sort.key === "videoTitle", sort.direction, "Video")}
                    {sort.key === "videoTitle" && (sort.direction === "asc" ? <ArrowDownAZ size={15} /> : <ArrowDownZA size={15} />)}
                  </span>
                </th>
                <th className="cursor-pointer p-4" onClick={() => toggleSort("channelTitle")}>
                  <span className="inline-flex items-center gap-2">
                    {sortLabel(sort.key === "channelTitle", sort.direction, "Channel")}
                    {sort.key === "channelTitle" && (sort.direction === "asc" ? <ArrowDownAZ size={15} /> : <ArrowDownZA size={15} />)}
                  </span>
                </th>
                <th className="cursor-pointer p-4" onClick={() => toggleSort("durationSeconds")}>Duration</th>
                <th className="cursor-pointer p-4" onClick={() => toggleSort("publishedAt")}>Published At</th>
                <th className="cursor-pointer p-4" onClick={() => toggleSort("viewCount")}>Views</th>
                <th className="p-4">Open</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => (
                <tr key={row.videoId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-700">{index + 1}</td>
                  <td className="p-4">
                    <div className="flex min-w-[460px] items-center gap-4">
                      <a href={row.videoUrl} target="_blank" rel="noreferrer" className="block w-[150px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100" title="Open video">
                        {row.thumbnailUrl ? (
                          <img src={row.thumbnailUrl} alt={row.videoTitle || "Video thumbnail"} className="aspect-video w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex aspect-video w-full items-center justify-center text-xs font-bold text-slate-400">No image</div>
                        )}
                      </a>
                      <a href={row.videoUrl} target="_blank" rel="noreferrer" className="line-clamp-2 font-semibold leading-6 text-slate-900 hover:text-blue-600" title={row.videoTitle}>
                        {row.videoTitle || "-"}
                      </a>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="min-w-[300px]">
                      <a href={row.channelUrl} target="_blank" rel="noreferrer" className="block truncate font-black text-slate-900 hover:text-blue-600" title={row.channelTitle}>
                        {row.channelTitle || "-"}
                      </a>
                      <div className="mt-1 flex max-w-[280px] items-center gap-2">
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
                    </div>
                  </td>
                  <td className="p-4 font-bold text-slate-700">{row.duration}</td>
                  <td className="p-4 text-slate-600">{formatDate(row.publishedAt)}</td>
                  <td className="p-4 font-bold text-slate-900">{Number(row.viewCount || 0).toLocaleString()}</td>
                  <td className="p-4">
                    <a href={row.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-600 hover:bg-red-100">
                      Video <ExternalLink size={14} />
                    </a>
                  </td>
                </tr>
              ))}

              {!sortedRows.length && (
                <tr>
                  <td colSpan="7" className="p-10 text-center font-medium text-slate-500">
                    Choose a country and click Get Videos.
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
