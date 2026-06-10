const axios = require("axios");
const db = require("../config/database");
const { refreshAccessToken } = require("./googleCmsAuthService");

const YOUTUBE_PARTNER_API = "https://www.googleapis.com/youtube/partner/v1";

function toIsoExpiry(expiresIn) {
  const seconds = Number(expiresIn) || 3600;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function getGoogleError(error) {
  const data = error.response?.data;
  if (data?.error?.message) return data.error.message;
  if (data?.error_description) return data.error_description;
  if (data?.message) return data.message;
  return error.message || "Google Content ID request failed";
}

function getConnectedNetwork(networkId) {
  const network = db.prepare("SELECT * FROM networks WHERE id = ?").get(Number(networkId));
  if (!network) {
    const error = new Error("Network not found");
    error.status = 404;
    throw error;
  }

  if (network.cms_auth_status !== "connected") {
    const error = new Error("CMS auth is not connected for this network");
    error.status = 400;
    throw error;
  }

  if (!String(network.network_code || "").trim()) {
    const error = new Error("Network ID is required before using Content ID API");
    error.status = 400;
    throw error;
  }

  if (!network.cms_access_token && !network.cms_refresh_token) {
    const error = new Error("CMS token is missing. Please re-auth CMS.");
    error.status = 400;
    throw error;
  }

  return network;
}

async function getAccessToken(network) {
  const expiry = network.cms_token_expiry ? new Date(network.cms_token_expiry).getTime() : 0;
  if (network.cms_access_token && expiry > Date.now() + 60 * 1000) {
    return network.cms_access_token;
  }

  if (!network.cms_refresh_token) {
    const error = new Error("CMS refresh token is missing. Please re-auth CMS.");
    error.status = 400;
    throw error;
  }

  try {
    const refreshed = await refreshAccessToken(network.cms_refresh_token);
    const nextExpiry = toIsoExpiry(refreshed.expires_in);
    db.prepare(`
      UPDATE networks
      SET cms_access_token = ?,
          cms_token_expiry = ?,
          cms_auth_status = 'connected',
          cms_auth_error = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(refreshed.access_token, nextExpiry, network.id);

    return refreshed.access_token;
  } catch (error) {
    const message = getGoogleError(error);
    db.prepare(`
      UPDATE networks
      SET cms_auth_status = 'error',
          cms_auth_error = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(message, network.id);
    throw new Error(message);
  }
}

async function createClaim(networkId, payload) {
  const network = getConnectedNetwork(networkId);
  const accessToken = await getAccessToken(network);
  const contentOwnerId = String(network.network_code || "").trim();

  const body = {
    assetId: String(payload.asset_id || "").trim(),
    videoId: String(payload.video_id || "").trim(),
    contentType: String(payload.content_type || "audiovisual").trim() || "audiovisual",
    policy: {
      id: String(payload.policy_id || "").trim()
    }
  };

  const response = await axios.post(`${YOUTUBE_PARTNER_API}/claims`, body, {
    params: { onBehalfOfContentOwner: contentOwnerId },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 30000
  });

  return {
    network,
    contentOwnerId,
    data: response.data
  };
}

async function getClaim(networkId, claimId) {
  const network = getConnectedNetwork(networkId);
  const accessToken = await getAccessToken(network);
  const contentOwnerId = String(network.network_code || "").trim();

  const response = await axios.get(`${YOUTUBE_PARTNER_API}/claims/${encodeURIComponent(claimId)}`, {
    params: { onBehalfOfContentOwner: contentOwnerId },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 30000
  });

  return {
    network,
    contentOwnerId,
    data: response.data
  };
}

function getNestedValue(object, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], object);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function firstArrayValue(value) {
  if (Array.isArray(value)) return value.find((item) => item !== undefined && item !== null && item !== "") || "";
  return value || "";
}

function findDeepValue(object, keys) {
  const wanted = new Set(keys.map((key) => String(key).toLowerCase()));
  const queue = [object];
  const seen = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      if (wanted.has(String(key).toLowerCase())) {
        const normalized = firstArrayValue(value);
        if (normalized !== undefined && normalized !== null && normalized !== "") return normalized;
      }
      if (value && typeof value === "object") queue.push(value);
    }
  }

  return "";
}

function getOwnerFromAsset(asset, contentOwnerId) {
  const ownership = asset.ownership || {};
  const generalOwner = Array.isArray(ownership.general)
    ? ownership.general.find((item) => item?.owner || item?.contentOwner || item?.contentOwnerId)
    : null;
  const territorialOwner = Array.isArray(ownership.territorialOwners)
    ? ownership.territorialOwners.find((item) => item?.owner || item?.contentOwner || item?.contentOwnerId)
    : null;

  return getNestedValue({
    ...asset,
    generalOwner,
    territorialOwner
  }, [
    "contentOwnerId",
    "content_owner_id",
    "owner",
    "ownerId",
    "ownership.owner",
    "ownership.contentOwner",
    "ownership.contentOwnerId",
    "generalOwner.owner",
    "generalOwner.contentOwner",
    "generalOwner.contentOwnerId",
    "territorialOwner.owner",
    "territorialOwner.contentOwner",
    "territorialOwner.contentOwnerId"
  ]) || contentOwnerId;
}

function normalizeAsset(rawAsset, contentOwnerId) {
  const metadata = rawAsset.metadata || rawAsset.metadataDetails || rawAsset.assetMetadata || rawAsset.snippet || {};
  const soundRecording = metadata.soundRecordingMetadata
    || metadata.soundRecording
    || rawAsset.soundRecordingMetadata
    || rawAsset.soundRecording
    || {};
  const album = metadata.albumMetadata || metadata.album || rawAsset.albumMetadata || rawAsset.album || {};
  const ownership = rawAsset.ownership || {};
  const assetOwnerId = getOwnerFromAsset(rawAsset, contentOwnerId);
  const title = getNestedValue({ metadata, soundRecording, album, rawAsset }, [
    "metadata.title",
    "metadata.name",
    "metadata.assetTitle",
    "soundRecording.title",
    "soundRecording.name",
    "album.title",
    "album.name",
    "rawAsset.title",
    "rawAsset.name"
  ]) || findDeepValue(rawAsset, ["title", "assetTitle", "name"]);
  const isrc = firstArrayValue(getNestedValue({ metadata, soundRecording, rawAsset }, [
    "metadata.isrc",
    "metadata.isrcs",
    "metadata.isrcCode",
    "soundRecording.isrc",
    "soundRecording.isrcs",
    "soundRecording.isrcCode",
    "rawAsset.isrc",
    "rawAsset.isrcs"
  ])) || findDeepValue(rawAsset, ["isrc", "isrcs", "isrcCode"]);
  const upc = firstArrayValue(getNestedValue({ metadata, soundRecording, album, rawAsset }, [
    "metadata.upc",
    "metadata.upcs",
    "metadata.upcCode",
    "metadata.albumUpc",
    "soundRecording.upc",
    "soundRecording.upcs",
    "album.upc",
    "album.upcs",
    "rawAsset.upc",
    "rawAsset.upcs"
  ])) || findDeepValue(rawAsset, ["upc", "upcs", "upcCode", "albumUpc"]);

  return {
    asset_id: rawAsset.id || rawAsset.assetId || rawAsset.asset_id || "",
    asset_owner_id: assetOwnerId,
    asset_owner_name: getNestedValue(rawAsset, [
      "ownerName",
      "contentOwnerName",
      "ownership.ownerName",
      "ownership.contentOwnerName"
    ]) || assetOwnerId,
    asset_title: title,
    isrc,
    upc,
    asset_label: getNestedValue({ metadata, soundRecording, album, rawAsset }, [
      "metadata.assetLabel",
      "metadata.customId",
      "metadata.label",
      "soundRecording.assetLabel",
      "soundRecording.label",
      "album.label",
      "rawAsset.customId",
      "rawAsset.assetLabel",
      "rawAsset.label"
    ]),
    record_label: getNestedValue({ metadata, soundRecording, album, rawAsset }, [
      "metadata.recordLabel",
      "metadata.label",
      "soundRecording.recordLabel",
      "soundRecording.label",
      "album.recordLabel",
      "album.label",
      "rawAsset.recordLabel"
    ]),
    ownership,
    raw: rawAsset
  };
}

function normalizeClaim(rawClaim, network, contentOwnerId) {
  const policy = rawClaim.policy || rawClaim.policyDetails || rawClaim.matchPolicy || {};
  const asset = rawClaim.asset || rawClaim.assetDetails || rawClaim.assetSnippet || {};
  const matchInfo = rawClaim.matchInfo || rawClaim.match || rawClaim.details || {};
  const claimId = rawClaim.id || rawClaim.claimId || rawClaim.claim_id || "";
  const videoId = rawClaim.videoId || rawClaim.video_id || getNestedValue(rawClaim, ["video.id", "videoDetails.videoId"]);
  const assetId = rawClaim.assetId || rawClaim.asset_id || asset.id || asset.assetId || "";
  const cmsOwner = rawClaim.contentOwnerId || rawClaim.content_owner_id || rawClaim.owner || "";
  const hasPolicy = Boolean(
    policy.id ||
    policy.policyId ||
    policy.name ||
    rawClaim.policyName ||
    Object.keys(policy || {}).length
  );
  const managedBySelectedCms = hasPolicy;

  return {
    id: claimId,
    claim_id: claimId,
    video_id: videoId,
    asset_id: assetId,
    asset_title: asset.title || asset.name || rawClaim.assetTitle || "",
    asset_label: rawClaim.assetLabel || rawClaim.asset_label || asset.label || asset.customId || "",
    isrc: rawClaim.isrc || asset.isrc || getNestedValue(rawClaim, ["assetMetadata.isrc", "metadata.isrc"]),
    upc: rawClaim.upc || asset.upc || getNestedValue(rawClaim, ["assetMetadata.upc", "metadata.upc"]),
    status: String(rawClaim.status || rawClaim.claimStatus || "").toLowerCase(),
    type: rawClaim.contentType || rawClaim.content_type || rawClaim.type || "",
    policy_id: policy.id || policy.policyId || "",
    policy_name: policy.name || rawClaim.policyName || "",
    match_policy: policy,
    cms_owner_id: cmsOwner,
    cms_owner_name: network.name,
    network_id: network.id,
    network_name: network.name,
    content_owner_id: contentOwnerId,
    has_policy: hasPolicy,
    managed_by_selected_cms: managedBySelectedCms,
    raw: rawClaim,
    releasable: Boolean(claimId) && managedBySelectedCms
  };
}

async function getAsset(networkId, assetId) {
  const network = getConnectedNetwork(networkId);
  const accessToken = await getAccessToken(network);
  const contentOwnerId = String(network.network_code || "").trim();

  const response = await axios.get(`${YOUTUBE_PARTNER_API}/assets/${encodeURIComponent(assetId)}`, {
    params: { onBehalfOfContentOwner: contentOwnerId },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 30000
  });

  return {
    network,
    contentOwnerId,
    asset: normalizeAsset(response.data || {}, contentOwnerId)
  };
}

async function getAssetsByIds(networkId, assetIds) {
  const ids = Array.from(new Set((assetIds || []).map((id) => String(id || "").trim()).filter(Boolean)));
  const network = getConnectedNetwork(networkId);
  const accessToken = await getAccessToken(network);
  const contentOwnerId = String(network.network_code || "").trim();
  const assets = new Map();
  const errors = [];

  async function fetchAssetDetail(assetId) {
    const response = await axios.get(`${YOUTUBE_PARTNER_API}/assets/${encodeURIComponent(assetId)}`, {
      params: {
        onBehalfOfContentOwner: contentOwnerId,
        fetchMetadata: true,
        includeMetadata: true
      },
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 30000
    });
    return normalizeAsset(response.data || {}, contentOwnerId);
  }

  for (let index = 0; index < ids.length; index += 50) {
    const chunk = ids.slice(index, index + 50);
    try {
      const response = await axios.get(`${YOUTUBE_PARTNER_API}/assets`, {
        params: {
          onBehalfOfContentOwner: contentOwnerId,
          id: chunk.join(","),
          maxResults: chunk.length,
          fetchMetadata: true,
          includeMetadata: true
        },
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 30000
      });
      const rows = response.data.items || response.data.assets || [];
      rows.forEach((row) => {
        const asset = normalizeAsset(row, contentOwnerId);
        if (asset.asset_id) assets.set(asset.asset_id, asset);
      });
    } catch {
      const results = await Promise.allSettled(chunk.map(async (assetId) => {
        return fetchAssetDetail(assetId);
      }));
      results.forEach((result, resultIndex) => {
        const assetId = chunk[resultIndex];
        if (result.status === "fulfilled") {
          assets.set(assetId, result.value);
        } else {
          errors.push({ asset_id: assetId, message: getGoogleError(result.reason) });
        }
      });
    }
  }

  const missingMetadataIds = ids.filter((id) => {
    const asset = assets.get(id);
    return asset && (!asset.asset_title || !asset.isrc || !asset.upc);
  });
  if (missingMetadataIds.length) {
    const results = await Promise.allSettled(missingMetadataIds.map((assetId) => fetchAssetDetail(assetId)));
    results.forEach((result, resultIndex) => {
      const assetId = missingMetadataIds[resultIndex];
      if (result.status === "fulfilled") {
        assets.set(assetId, { ...assets.get(assetId), ...result.value });
      } else if (!errors.some((error) => error.asset_id === assetId)) {
        errors.push({ asset_id: assetId, message: getGoogleError(result.reason) });
      }
    });
  }

  return { assets, errors };
}

async function enrichClaimsWithAssets(networkId, claims) {
  const assetIds = claims.map((claim) => claim.asset_id).filter(Boolean);
  const { assets, errors } = await getAssetsByIds(networkId, assetIds);

  const enriched = claims.map((claim) => {
    const asset = assets.get(String(claim.asset_id || "").trim());
    const assetOwnerId = asset?.asset_owner_id || claim.cms_owner_id || claim.content_owner_id || "";

    return {
      ...claim,
      asset_owner_id: assetOwnerId,
      asset_owner_name: asset?.asset_owner_name || assetOwnerId || "-",
      asset_title: asset?.asset_title || claim.asset_title || "",
      isrc: asset?.isrc || claim.isrc || "",
      upc: asset?.upc || claim.upc || "",
      asset_label: asset?.asset_label || claim.asset_label || "",
      record_label: asset?.record_label || claim.record_label || "",
      asset_lookup_error: asset ? "" : (errors.find((error) => error.asset_id === claim.asset_id)?.message || ""),
      releasable: Boolean(claim.claim_id) && Boolean(claim.managed_by_selected_cms)
    };
  });

  return { claims: enriched, assetErrors: errors };
}

async function listClaimsByVideo(networkId, videoId, options = {}) {
  const network = getConnectedNetwork(networkId);
  const accessToken = await getAccessToken(network);
  const contentOwnerId = String(network.network_code || "").trim();
  const limit = Math.min(Math.max(Number(options.limit) || 100, 1), 500);
  const claims = [];
  let pageToken = "";

  do {
    const response = await axios.get(`${YOUTUBE_PARTNER_API}/claims`, {
      params: {
        onBehalfOfContentOwner: contentOwnerId,
        videoId,
        maxResults: Math.min(limit, 50),
        pageToken: pageToken || undefined
      },
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 30000
    });

    const rows = response.data.items || response.data.claims || [];
    rows.forEach((claim) => claims.push(normalizeClaim(claim, network, contentOwnerId)));
    pageToken = response.data.nextPageToken || "";
  } while (pageToken && claims.length < limit);

  return { network, contentOwnerId, claims: claims.slice(0, limit) };
}

async function listClaimsByChannel(networkId, channelId, options = {}) {
  const network = getConnectedNetwork(networkId);
  const accessToken = await getAccessToken(network);
  const contentOwnerId = String(network.network_code || "").trim();
  const limit = Math.min(Math.max(Number(options.limit) || 200, 1), 1000);
  const claims = [];
  let pageToken = "";

  do {
    const response = await axios.get(`${YOUTUBE_PARTNER_API}/claims`, {
      params: {
        onBehalfOfContentOwner: contentOwnerId,
        uploaderChannelId: channelId,
        maxResults: Math.min(limit, 50),
        pageToken: pageToken || undefined
      },
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 30000
    });

    const rows = response.data.items || response.data.claims || [];
    rows.forEach((claim) => claims.push(normalizeClaim(claim, network, contentOwnerId)));
    pageToken = response.data.nextPageToken || "";
  } while (pageToken && claims.length < limit);

  return { network, contentOwnerId, claims: claims.slice(0, limit) };
}

async function releaseClaim(networkId, claimId) {
  const network = getConnectedNetwork(networkId);
  const accessToken = await getAccessToken(network);
  const contentOwnerId = String(network.network_code || "").trim();

  let response;
  try {
    response = await axios.delete(`${YOUTUBE_PARTNER_API}/claims/${encodeURIComponent(claimId)}`, {
      params: { onBehalfOfContentOwner: contentOwnerId },
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 30000
    });
  } catch (error) {
    if (error.response?.status !== 404) throw error;
    response = await axios.post(`${YOUTUBE_PARTNER_API}/claims/${encodeURIComponent(claimId)}/release`, {}, {
      params: { onBehalfOfContentOwner: contentOwnerId },
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 30000
    });
  }

  return {
    network,
    contentOwnerId,
    data: response.data || {}
  };
}

module.exports = {
  createClaim,
  getClaim,
  enrichClaimsWithAssets,
  getGoogleError,
  getAsset,
  getAssetsByIds,
  listClaimsByChannel,
  listClaimsByVideo,
  releaseClaim
};
