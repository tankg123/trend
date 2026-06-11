const axios = require("axios");
const {
  getAccessToken,
  getConnectedNetwork,
  getGoogleError,
  YOUTUBE_PARTNER_API
} = require("./googleContentIdService");

function getChannelIdFromWhitelist(item) {
  return item.channelId
    || item.channel_id
    || item.youtubeChannelId
    || item.youtube_channel_id
    || item.id
    || "";
}

function normalizeWhitelistItem(item, network, contentOwnerId) {
  const channelId = getChannelIdFromWhitelist(item);
  return {
    whitelist_id: item.id || item.whitelistId || item.whitelist_id || channelId,
    channel_id: channelId,
    content_owner_id: item.contentOwnerId || item.content_owner_id || contentOwnerId,
    network_id: network.id,
    network_name: network.name,
    raw: item
  };
}

async function listWhitelistsFromCms(networkId) {
  const network = getConnectedNetwork(networkId);
  const accessToken = await getAccessToken(network);
  const contentOwnerId = String(network.network_code || "").trim();
  const items = [];
  let pageToken = "";

  do {
    const response = await axios.get(`${YOUTUBE_PARTNER_API}/whitelists`, {
      params: {
        onBehalfOfContentOwner: contentOwnerId,
        maxResults: 50,
        pageToken: pageToken || undefined
      },
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 30000
    });

    const rows = response.data.items || response.data.whitelists || [];
    rows.forEach((row) => {
      const item = normalizeWhitelistItem(row, network, contentOwnerId);
      if (item.channel_id) items.push(item);
    });
    pageToken = response.data.nextPageToken || "";
  } while (pageToken);

  return { network, contentOwnerId, items };
}

async function insertWhitelistToCms(networkId, channelId) {
  const network = getConnectedNetwork(networkId);
  const accessToken = await getAccessToken(network);
  const contentOwnerId = String(network.network_code || "").trim();
  const body = { id: channelId };

  const response = await axios.post(`${YOUTUBE_PARTNER_API}/whitelists`, body, {
    params: { onBehalfOfContentOwner: contentOwnerId },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 30000
  });

  return {
    network,
    contentOwnerId,
    item: normalizeWhitelistItem(response.data || { id: channelId }, network, contentOwnerId)
  };
}

async function deleteWhitelistFromCms(networkId, whitelistId) {
  const network = getConnectedNetwork(networkId);
  const accessToken = await getAccessToken(network);
  const contentOwnerId = String(network.network_code || "").trim();

  await axios.delete(`${YOUTUBE_PARTNER_API}/whitelists/${encodeURIComponent(whitelistId)}`, {
    params: { onBehalfOfContentOwner: contentOwnerId },
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 30000
  });

  return { network, contentOwnerId };
}

module.exports = {
  deleteWhitelistFromCms,
  getGoogleError,
  insertWhitelistToCms,
  listWhitelistsFromCms
};
