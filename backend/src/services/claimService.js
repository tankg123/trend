const axios = require("axios");
const db = require("../config/database");
const cmsAuthService = require("./googleCmsAuthService");
const { getVideosMetadataFromYoutube } = require("./youtubeService");
const { parseRoles } = require("../middlewares/authMiddleware");

const CONTENT_ID_API_BASE = "https://youtubepartner.googleapis.com/youtube/partner/v1";
const YOUTUBE_PARTNER_SCOPE = "https://www.googleapis.com/auth/youtubepartner";

function normalizeAccount(row) {
  return {
    id: row.id,
    cms_id: row.network_code,
    cms_name: row.name,
    google_email: row.cms_auth_email,
    google_name: row.cms_auth_name,
    scopes: row.cms_auth_scopes || "",
    status: row.cms_auth_status,
    access_token: row.cms_access_token,
    refresh_token: row.cms_refresh_token,
    token_expiry: row.cms_token_expiry
  };
}

function listAccounts() {
  return db.prepare(`
    SELECT
      id,
      name,
      network_code,
      cms_auth_status,
      cms_auth_email,
      cms_auth_name,
      cms_auth_scopes,
      cms_access_token,
      cms_refresh_token,
      cms_token_expiry
    FROM networks
    WHERE cms_auth_status = 'connected'
      AND network_code IS NOT NULL
      AND trim(network_code) != ''
    ORDER BY name COLLATE NOCASE ASC
  `).all().map(normalizeAccount);
}

function isTokenFresh(expiry) {
  if (!expiry) return false;
  const expiryTime = new Date(expiry).getTime();
  if (!Number.isFinite(expiryTime)) return false;
  return expiryTime - Date.now() > 60 * 1000;
}

async function getFreshAccessTokenForAccount(accountId) {
  const row = db.prepare(`
    SELECT *
    FROM networks
    WHERE id = ?
      AND cms_auth_status = 'connected'
      AND network_code IS NOT NULL
      AND trim(network_code) != ''
  `).get(Number(accountId));

  if (!row) throw new Error("CMS network is not connected.");
  if (row.cms_access_token && isTokenFresh(row.cms_token_expiry)) {
    return { accessToken: row.cms_access_token, account: normalizeAccount(row) };
  }
  if (!row.cms_refresh_token) throw new Error("CMS refresh token is missing. Please re-auth this CMS network.");

  const token = await cmsAuthService.refreshAccessToken(row.cms_refresh_token);
  const accessToken = token.access_token;
  if (!accessToken) throw new Error("Could not refresh CMS access token.");

  const expiresAt = new Date(Date.now() + (Number(token.expires_in || 3600) * 1000)).toISOString();
  db.prepare(`
    UPDATE networks
    SET cms_access_token = ?,
        cms_token_expiry = ?,
        cms_auth_error = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(accessToken, expiresAt, row.id);

  const updated = { ...row, cms_access_token: accessToken, cms_token_expiry: expiresAt };
  return { accessToken, account: normalizeAccount(updated) };
}

function extractVideoId(input) {
  const value = String(input || "").trim();
  if (!value) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || null;
    if (url.searchParams.get("v")) return url.searchParams.get("v");

    const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
  } catch {
    const match = value.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }

  return null;
}

function parseVideoInputs(input) {
  const values = Array.isArray(input) ? input : String(input || "").split(/[\n,\s]+/);
  const seen = new Set();
  const invalid = [];
  const videoIds = [];

  values.forEach((raw) => {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return;
    const videoId = extractVideoId(trimmed);
    if (!videoId) {
      invalid.push(trimmed);
      return;
    }
    if (!seen.has(videoId)) {
      seen.add(videoId);
      videoIds.push(videoId);
    }
  });

  return { videoIds, invalid };
}

function getClaimPolicy(rawClaim) {
  return rawClaim.policy || rawClaim.appliedPolicy || rawClaim.applied_policy || null;
}

function isInactiveClaim(claim) {
  return String(claim?.status || "").toLowerCase() === "inactive";
}

function isOwnedCmsClaim(rawClaim) {
  const policy = getClaimPolicy(rawClaim);
  if (!policy || typeof policy !== "object") return false;
  if (policy.kind === "youtubePartner#policy") return true;
  return Boolean(policy.id || policy.name || Array.isArray(policy.rules));
}

function hasYoutubePartnerScope(account) {
  return String(account.scopes || "").split(/\s+/).includes(YOUTUBE_PARTNER_SCOPE);
}

function actorHasRole(user, role) {
  const target = String(role || "").toLowerCase();
  return parseRoles(user?.roles?.length ? user.roles : user?.role).some((item) => String(item).toLowerCase() === target);
}

function isLimitedClaimManager(user) {
  return actorHasRole(user, "Claim Manager") && !actorHasRole(user, "admin") && !actorHasRole(user, "Content ID");
}

function normalizeLabelKey(value) {
  return String(value || "").trim().toLowerCase();
}

function getAllowedLabelKeys(user) {
  if (!isLimitedClaimManager(user)) return null;
  return new Set(
    db.prepare(`
      SELECT l.name, l.display_name
      FROM user_content_id_labels ucil
      JOIN content_id_labels l ON l.id = ucil.label_id
      WHERE ucil.user_id = ?
    `).all(user.id).flatMap((label) => [label.name, label.display_name]).map(normalizeLabelKey).filter(Boolean)
  );
}

function claimMatchesAllowedLabels(claim, allowedLabelKeys) {
  if (!allowedLabelKeys) return true;
  const labels = normalizeLabels(claim.asset?.labels || []);
  return labels.some((label) => allowedLabelKeys.has(normalizeLabelKey(label)));
}

function normalizeClaim(rawClaim, account, videoId) {
  return {
    id: rawClaim.id,
    videoId: rawClaim.videoId || rawClaim.video_id || videoId,
    assetId: rawClaim.assetId || rawClaim.asset_id || rawClaim.asset?.id || null,
    status: rawClaim.status || null,
    contentType: rawClaim.contentType || rawClaim.content_type || null,
    origin: rawClaim.origin || null,
    isPartnerUploaded: rawClaim.isPartnerUploaded || rawClaim.is_partner_uploaded || false,
    policy: getClaimPolicy(rawClaim),
    matchInfo: rawClaim.matchInfo || rawClaim.match_info || null,
    timeCreated: rawClaim.timeCreated || rawClaim.createdTime || rawClaim.created_at || null,
    accountId: account.id,
    cmsName: account.cms_name,
    googleEmail: account.google_email,
    ownership: "owned_cms_policy_claim",
    canRelease: String(rawClaim.status || "").toLowerCase() !== "inactive",
    raw: rawClaim
  };
}

function normalizeLabels(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : item.name || item.label || item.id || "")).filter(Boolean);
  }
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function normalizeAsset(rawAsset) {
  if (!rawAsset) return null;
  const metadata =
    rawAsset.metadata ||
    rawAsset.metadataEffective ||
    rawAsset.metadataMine ||
    rawAsset.metadataOwner ||
    rawAsset.metadataOriginal ||
    {};

  return {
    id: rawAsset.id || rawAsset.assetId || rawAsset.asset_id || null,
    title: rawAsset.title || metadata.title || metadata.name || rawAsset.customId || null,
    type: rawAsset.type || rawAsset.assetType || rawAsset.kind || null,
    customId: rawAsset.customId || metadata.customId || metadata.custom_id || null,
    isrc: metadata.isrc || rawAsset.isrc || null,
    upc: metadata.upc || metadata.grid || rawAsset.upc || rawAsset.grid || null,
    labels: normalizeLabels(rawAsset.labels || rawAsset.assetLabels || rawAsset.label || metadata.labels || metadata.assetLabels),
    metadata,
    raw: rawAsset
  };
}

function attachAssetToClaim(claim, asset) {
  if (!asset) return claim;
  return {
    ...claim,
    asset: {
      id: asset.id || claim.assetId,
      title: asset.title,
      type: asset.type,
      customId: asset.customId,
      isrc: asset.isrc,
      upc: asset.upc,
      labels: asset.labels || []
    }
  };
}

async function fetchAssetMetadata({ accessToken, account, assetId }) {
  if (!assetId) return null;

  try {
    const response = await axios.get(`${CONTENT_ID_API_BASE}/assets/${encodeURIComponent(assetId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        onBehalfOfContentOwner: account.cms_id,
        fetchMetadata: "effective"
      },
      timeout: 20000
    });
    return normalizeAsset(response.data);
  } catch {
    try {
      const response = await axios.get(`${CONTENT_ID_API_BASE}/assetSearch`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          onBehalfOfContentOwner: account.cms_id,
          assetId,
          fetchMetadata: "effective"
        },
        timeout: 20000
      });
      return normalizeAsset((response.data.items || response.data.assets || [])[0]);
    } catch {
      return null;
    }
  }
}

async function hydrateClaimsWithAssets(claims) {
  const groups = new Map();
  claims.forEach((claim) => {
    if (!claim.assetId || !claim.accountId) return;
    const key = String(claim.accountId);
    if (!groups.has(key)) groups.set(key, { accountId: claim.accountId, assetIds: new Set() });
    groups.get(key).assetIds.add(claim.assetId);
  });

  const assetByKey = new Map();
  for (const group of groups.values()) {
    const { accessToken, account } = await getFreshAccessTokenForAccount(group.accountId);
    const assetIds = Array.from(group.assetIds);
    const assets = await Promise.all(assetIds.map((assetId) => fetchAssetMetadata({ accessToken, account, assetId })));
    assets.forEach((asset, index) => {
      if (asset) assetByKey.set(`${group.accountId}:${assetIds[index]}`, asset);
    });
  }

  return claims.map((claim) => attachAssetToClaim(claim, assetByKey.get(`${claim.accountId}:${claim.assetId}`)));
}

function googleErrorMessage(error) {
  const data = error.response?.data;
  if (data?.error?.message) return data.error.message;
  if (data?.error_description) return data.error_description;
  return error.message || "Google Content ID API error";
}

async function listClaimsForVideo(account, videoId) {
  if (!hasYoutubePartnerScope(account)) {
    throw new Error("This CMS is missing the YouTube Partner scope. Please re-auth the CMS network.");
  }

  const { accessToken } = await getFreshAccessTokenForAccount(account.id);
  const response = await axios.get(`${CONTENT_ID_API_BASE}/claims`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      onBehalfOfContentOwner: account.cms_id,
      videoId,
      maxResults: 50
    },
    timeout: 20000
  });

  return (response.data.items || [])
    .filter(isOwnedCmsClaim)
    .map((claim) => normalizeClaim(claim, account, videoId));
}

async function searchClaims({ accountIds, videoInput, user }) {
  const { videoIds, invalid } = parseVideoInputs(videoInput);
  if (!videoIds.length) throw new Error("Please enter at least one valid video link or video ID.");

  const allAccounts = listAccounts().filter((account) => account.status === "connected");
  const wantedIds = (accountIds || []).map((id) => Number(id)).filter(Boolean);
  const accounts = wantedIds.length ? allAccounts.filter((account) => wantedIds.includes(Number(account.id))) : allAccounts;
  const allowedLabelKeys = getAllowedLabelKeys(user);

  if (!accounts.length) throw new Error("No connected CMS network is available for claim lookup.");

  let metadataByVideoId = {};
  let metadataError = null;
  try {
    metadataByVideoId = await getVideosMetadataFromYoutube(videoIds);
  } catch (error) {
    metadataError = googleErrorMessage(error);
  }

  const videos = [];
  for (const videoId of videoIds) {
    const claims = [];
    const errors = [];
    const metadata = metadataByVideoId[videoId] || null;

    for (const account of accounts) {
      try {
        const cmsClaims = await listClaimsForVideo(account, videoId);
        claims.push(...cmsClaims);
      } catch (error) {
        errors.push({ accountId: account.id, cmsName: account.cms_name, message: googleErrorMessage(error) });
      }
    }

    const hydratedClaims = (await hydrateClaimsWithAssets(claims)).filter((claim) => claimMatchesAllowedLabels(claim, allowedLabelKeys));
    videos.push({
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      metadata,
      videoTitle: metadata?.title || "",
      channelTitle: metadata?.channel_title || "",
      thumbnail: metadata?.thumbnail || "",
      durationText: metadata?.duration_text || "",
      publishedAt: metadata?.published_at || "",
      claimCount: hydratedClaims.length,
      claims: hydratedClaims,
      errors,
      status: hydratedClaims.length ? "claimed_by_authorized_cms" : "no_authorized_cms_claim"
    });
  }

  return {
    accounts: accounts.map((account) => ({
      id: account.id,
      cms_name: account.cms_name,
      google_email: account.google_email,
      status: account.status,
      scopes: account.scopes
    })),
    invalid,
    metadataError,
    videoIds,
    videos,
    totals: {
      videos: videoIds.length,
      claims: videos.reduce((sum, video) => sum + video.claims.length, 0),
      releasable: videos.reduce((sum, video) => sum + video.claims.filter((claim) => claim.canRelease).length, 0),
      errors: videos.reduce((sum, video) => sum + video.errors.length, 0)
    }
  };
}

async function getClaimForAccount({ accountId, claimId }) {
  if (!accountId || !claimId) throw new Error("Missing CMS account or claim ID.");
  const { accessToken, account } = await getFreshAccessTokenForAccount(accountId);
  const response = await axios.get(`${CONTENT_ID_API_BASE}/claims/${encodeURIComponent(claimId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { onBehalfOfContentOwner: account.cms_id },
    timeout: 20000
  });

  const normalized = normalizeClaim(response.data, account, response.data.videoId || null);
  return (await hydrateClaimsWithAssets([normalized]))[0];
}

async function releaseClaim({ accountId, claimId }) {
  if (!accountId || !claimId) throw new Error("Missing CMS account or claim ID.");

  const { accessToken, account } = await getFreshAccessTokenForAccount(accountId);
  const response = await axios.patch(
    `${CONTENT_ID_API_BASE}/claims/${encodeURIComponent(claimId)}`,
    { status: "inactive" },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { onBehalfOfContentOwner: account.cms_id },
      timeout: 60000
    }
  );

  const released = normalizeClaim(response.data, account, response.data.videoId || null);
  try {
    return await getClaimForAccount({ accountId, claimId });
  } catch {
    return released;
  }
}

async function releaseClaims({ releases, user }) {
  const items = Array.isArray(releases) ? releases : [];
  if (!items.length) throw new Error("Please select at least one claim to release.");
  const allowedLabelKeys = getAllowedLabelKeys(user);

  const results = [];
  for (const item of items) {
    try {
      if (allowedLabelKeys) {
        const currentClaim = await getClaimForAccount({ accountId: item.accountId, claimId: item.claimId });
        if (!claimMatchesAllowedLabels(currentClaim, allowedLabelKeys)) {
          throw new Error("This claim is not assigned to your allowed labels.");
        }
      }

      const released = await releaseClaim({ accountId: item.accountId, claimId: item.claimId });
      results.push({ ok: true, accountId: item.accountId, claimId: item.claimId, claim: released, verified: isInactiveClaim(released) });
    } catch (error) {
      try {
        const currentClaim = await getClaimForAccount({ accountId: item.accountId, claimId: item.claimId });
        if (isInactiveClaim(currentClaim)) {
          results.push({
            ok: true,
            accountId: item.accountId,
            claimId: item.claimId,
            claim: currentClaim,
            verified: true,
            message: "Release was verified after the request finished."
          });
          continue;
        }
      } catch {
        // Keep the original Google/API error below.
      }
      results.push({ ok: false, accountId: item.accountId, claimId: item.claimId, message: googleErrorMessage(error) });
    }
  }

  return {
    results,
    successCount: results.filter((item) => item.ok).length,
    failedCount: results.filter((item) => !item.ok).length
  };
}

module.exports = {
  extractVideoId,
  getFreshAccessTokenForAccount,
  listAccounts,
  parseVideoInputs,
  releaseClaims,
  searchClaims
};
