import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Square,
  SquareCheckBig,
  Unlock
} from "lucide-react";
import {
  listContentIdClaimCmsAccounts,
  releaseContentIdClaims,
  searchContentIdClaims
} from "../api/contentIdClaimsApi";

function statusBadge(claim) {
  const inactive = String(claim.status || "").toLowerCase() === "inactive";
  if (inactive) return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-emerald-50 text-emerald-700";
}

function statusLabel(claim) {
  const inactive = String(claim.status || "").toLowerCase() === "inactive";
  if (inactive) return "Released";
  return claim.status || "-";
}

function hasYoutubePartnerScope(account) {
  return String(account.scopes || "").split(/\s+/).includes("https://www.googleapis.com/auth/youtubepartner");
}

function formatAssetLabels(claim) {
  const labels = claim.asset?.labels || [];
  if (!labels.length) return "-";
  return labels.join(", ");
}

function formatRawValue(value) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function formatPolicyValue(policy) {
  if (!policy) return "-";
  if (typeof policy === "string") return policy;
  if (policy.name) return policy.name;
  if (policy.title) return policy.title;
  if (policy.id) return policy.id;
  const actions = (policy.rules || [])
    .map((rule) => rule.action || rule.name || rule.policyAction)
    .filter(Boolean);
  if (actions.length) return actions.join(", ");
  return "-";
}

function getVideoPreview(video) {
  const metadata = video?.metadata || {};
  return {
    title: metadata.title || video?.videoTitle || video?.videoId || "Untitled video",
    channelTitle: metadata.channel_title || video?.channelTitle || "Unknown channel",
    thumbnail: metadata.thumbnail || video?.thumbnail || "",
    durationText: metadata.duration_text || video?.durationText || "",
    url: metadata.url || video?.videoUrl || ""
  };
}

export default function ContentIdClaimPage() {
  const [accounts, setAccounts] = useState([]);
  const [videoInput, setVideoInput] = useState("");
  const [result, setResult] = useState(null);
  const [selectedClaims, setSelectedClaims] = useState({});
  const [loading, setLoading] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedCount = Object.values(selectedClaims).filter(Boolean).length;
  const connectedAccounts = accounts.filter((account) => account.status === "connected" && hasYoutubePartnerScope(account));
  const missingScopeAccounts = accounts.filter((account) => account.status === "connected" && !hasYoutubePartnerScope(account));

  const selectedReleases = useMemo(() => {
    const claims = [];
    for (const video of result?.videos || []) {
      for (const claim of video.claims || []) {
        const key = `${claim.accountId}:${claim.id}`;
        if (selectedClaims[key]) {
          claims.push({
            accountId: claim.accountId,
            claimId: claim.id,
            videoId: claim.videoId || video.videoId,
            assetId: claim.assetId || claim.asset?.id || null
          });
        }
      }
    }
    return claims;
  }, [result, selectedClaims]);

  async function loadAccounts() {
    const data = await listContentIdClaimCmsAccounts();
    setAccounts(data);
  }

  useEffect(() => {
    loadAccounts().catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  function toggleClaim(claim) {
    if (!claim.canRelease) return;
    const key = `${claim.accountId}:${claim.id}`;
    setSelectedClaims((current) => ({ ...current, [key]: !current[key] }));
  }

  function selectAllReleasable() {
    const next = {};
    for (const video of result?.videos || []) {
      for (const claim of video.claims || []) {
        if (claim.canRelease) next[`${claim.accountId}:${claim.id}`] = true;
      }
    }
    setSelectedClaims(next);
  }

  async function handleSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setSelectedClaims({});

    try {
      const data = await searchContentIdClaims({ videoInput });
      setResult(data);
      setMessage(`Checked ${data.totals.videos} video(s), found ${data.totals.claims} claim(s).`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  function applyReleaseResults(releaseResults = []) {
    if (!releaseResults.length) return;
    const releaseByKey = new Map(releaseResults.map((item) => [`${item.accountId}:${item.claimId}`, item]));

    setResult((current) => {
      if (!current?.videos) return current;
      return {
        ...current,
        videos: current.videos.map((video) => {
          const claims = (video.claims || []).map((claim) => {
            const release = releaseByKey.get(`${claim.accountId}:${claim.id}`);
            if (!release?.ok) return claim;
            const releasedClaim = release.claim || {};
            return {
              ...claim,
              ...releasedClaim,
              id: claim.id,
              accountId: claim.accountId,
              videoId: claim.videoId || video.videoId,
              asset: releasedClaim.asset || claim.asset,
              status: releasedClaim.status || "inactive",
              canRelease: false
            };
          });
          return { ...video, claims, claimCount: claims.length };
        })
      };
    });
  }

  async function handleRelease() {
    if (!selectedReleases.length) return;
    if (!window.confirm(`Release ${selectedReleases.length} selected claim(s)?`)) return;

    setReleasing(true);
    setError("");
    setMessage("");

    try {
      const data = await releaseContentIdClaims(selectedReleases);
      applyReleaseResults(data.results || []);
      setSelectedClaims({});
      setMessage(`Released ${data.successCount} claim(s), ${data.failedCount} failed. Status verified with claims.list.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setReleasing(false);
    }
  }

  return (
    <div className="space-y-5 p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">
              <FileSearch size={14} /> Content ID
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">Claim Manager</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Check claims by video links or video IDs, show claims owned by authorized CMS networks, and release them.
            </p>
          </div>
          <button
            type="button"
            onClick={loadAccounts}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} /> Refresh CMS
          </button>
        </div>
        {message && <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</div>}
        {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleSearch} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-black text-slate-950">Claim lookup</h2>
            <p className="mt-1 text-sm text-slate-500">The system will check every authorized CMS network automatically.</p>
          </div>

          {!!missingScopeAccounts.length && (
            <div className="space-y-2">
              {missingScopeAccounts.map((account) => (
                <div key={`missing-${account.id}`} className="rounded-2xl border border-red-200 bg-red-50 p-3 text-left">
                  <p className="font-black text-red-700">{account.cms_name}</p>
                  <p className="mt-1 text-xs font-bold text-red-600">
                    Missing YouTube Partner scope. Re-auth this CMS in Settings &gt; Network.
                  </p>
                </div>
              ))}
            </div>
          )}

          {!connectedAccounts.length && !missingScopeAccounts.length && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No CMS has been authorized yet.
            </div>
          )}

          <label className="block">
            <span className="text-sm font-black text-slate-800">Video links / IDs</span>
            <textarea
              value={videoInput}
              onChange={(event) => setVideoInput(event.target.value)}
              rows={10}
              placeholder={"One video link or video ID per line\nhttps://www.youtube.com/watch?v=VIDEO_ID\nVIDEO_ID"}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <button
            type="submit"
            disabled={loading || !connectedAccounts.length}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-lg shadow-blue-900/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <FileSearch size={18} />} Get claim
          </button>
        </form>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-400">Videos</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{result?.totals?.videos || 0}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-400">Claims</p>
              <p className="mt-2 text-3xl font-black text-blue-600">{result?.totals?.claims || 0}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-400">Releasable</p>
              <p className="mt-2 text-3xl font-black text-emerald-600">{result?.totals?.releasable || 0}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-400">Selected</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{selectedCount}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllReleasable}
                disabled={!result?.totals?.releasable}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <CheckCircle2 size={16} /> Select all
              </button>
              <button
                type="button"
                onClick={() => setSelectedClaims({})}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Clear selection
              </button>
            </div>
            <button
              type="button"
              onClick={handleRelease}
              disabled={!selectedCount || releasing}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-red-900/20 hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {releasing ? <Loader2 className="animate-spin" size={17} /> : <Unlock size={17} />} Release selected ({selectedCount})
            </button>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-lg font-black text-slate-950">Claim results</h2>
              {result?.invalid?.length ? (
                <p className="mt-1 text-sm text-red-500">Invalid input skipped: {result.invalid.join(", ")}</p>
              ) : null}
              {result?.metadataError ? (
                <p className="mt-1 text-sm font-bold text-amber-600">
                  Video preview could not be loaded from YouTube Data API: {result.metadataError}
                </p>
              ) : null}
            </div>

            <div className="divide-y divide-slate-100">
              {(result?.videos || []).map((video) => {
                const preview = getVideoPreview(video);
                return (
                  <div key={video.videoId} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <a
                          href={preview.url || video.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="relative h-16 w-28 flex-none overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                          title="Watch on YouTube"
                        >
                          {preview.thumbnail ? (
                            <img src={preview.thumbnail} alt={preview.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-black text-slate-400">
                              No image
                            </div>
                          )}
                          {preview.durationText ? (
                            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-black text-white">
                              {preview.durationText}
                            </span>
                          ) : null}
                        </a>
                        <div className="min-w-0">
                          <a
                            href={preview.url || video.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block max-w-4xl break-words text-base font-black text-slate-950 hover:text-blue-700"
                          >
                            {preview.title}
                          </a>
                          <p className="mt-1 text-sm font-bold text-slate-500">{preview.channelTitle}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <a
                              href={preview.url || video.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-black text-amber-600 hover:underline"
                            >
                              Watch on YouTube <ExternalLink size={13} />
                            </a>
                            <span className="font-mono text-xs font-bold text-slate-400">{video.videoId}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {video.claimCount ? `${video.claimCount} claim(s) owned by this CMS` : "No claim owned by this CMS"}
                          </p>
                        </div>
                      </div>
                      {video.claimCount ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          <ShieldCheck size={14} /> Owned claim found
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                          <ShieldAlert size={14} /> No owned claim
                        </span>
                      )}
                    </div>

                  {video.errors?.length ? (
                    <div className="mt-3 space-y-1 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-600">
                      {video.errors.map((item) => (
                        <p key={`${video.videoId}-${item.accountId}`}>{item.cmsName}: {item.message}</p>
                      ))}
                    </div>
                  ) : null}

                  {video.claims?.length ? (
                    <div className="mt-4 overflow-auto rounded-2xl border border-slate-200">
                      <table className="min-w-[1180px] w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="w-12 px-4 py-3">Select</th>
                            <th className="px-4 py-3">Claim</th>
                            <th className="px-4 py-3">CMS owner</th>
                            <th className="px-4 py-3">Asset</th>
                            <th className="px-4 py-3">ISRC</th>
                            <th className="px-4 py-3">UPC</th>
                            <th className="px-4 py-3">Asset Label</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Policy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {video.claims.map((claim) => {
                            const key = `${claim.accountId}:${claim.id}`;
                            const checked = Boolean(selectedClaims[key]);
                            return (
                              <tr key={key} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleClaim(claim)}
                                    disabled={!claim.canRelease}
                                    className="text-blue-600 disabled:text-slate-300"
                                  >
                                    {checked ? <SquareCheckBig size={19} /> : <Square size={19} />}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-mono text-xs font-black text-slate-950">{claim.id}</p>
                                  <p className="mt-1 text-xs text-emerald-700">Managed by this CMS</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-black text-slate-950">{claim.cmsName}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-mono text-xs font-black text-slate-700">{claim.assetId || "-"}</p>
                                  <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500" title={claim.asset?.title || ""}>
                                    {claim.asset?.title || "-"}
                                  </p>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-emerald-700">{claim.asset?.isrc || "-"}</td>
                                <td className="px-4 py-3 font-mono text-xs text-blue-700">{claim.asset?.upc || "-"}</td>
                                <td className="max-w-[260px] truncate px-4 py-3 text-xs text-slate-600" title={formatAssetLabels(claim)}>
                                  {formatAssetLabels(claim)}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={["rounded-full px-2 py-1 text-xs font-black", statusBadge(claim)].join(" ")}>
                                    {statusLabel(claim)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-600">{claim.contentType || claim.origin || "-"}</td>
                                <td
                                  className="max-w-md truncate px-4 py-3 text-xs text-slate-500"
                                  title={formatRawValue(claim.policy)}
                                >
                                  {formatPolicyValue(claim.policy)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
                );
              })}

              {!result && <div className="p-10 text-center text-sm text-slate-500">Enter video links or IDs to start claim lookup.</div>}
              {result && !result.videos?.length && <div className="p-10 text-center text-sm text-slate-500">No result.</div>}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
