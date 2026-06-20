const axios = require("axios");

const YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3";
let currentKeyIndex = 0;

function getApiKeys() {
  return String(process.env.YOUTUBE_API_KEYS || process.env.YOUTUBE_API_KEY || "")
    .split(/[\s,;]+/)
    .map((key) => key.trim())
    .filter(Boolean);
}

function nextKey(keys) {
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
}

function isQuotaError(error) {
  const status = error?.response?.status;
  const reason = error?.response?.data?.error?.errors?.[0]?.reason || "";
  return status === 403 || reason.includes("quotaExceeded") || reason.includes("dailyLimitExceeded");
}

async function youtubeGet(path, params) {
  const keys = getApiKeys();

  if (!keys.length) {
    const error = new Error("Missing YOUTUBE_API_KEYS in backend .env");
    error.statusCode = 500;
    throw error;
  }

  let lastError;

  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const key = keys[currentKeyIndex % keys.length];

    try {
      const response = await axios.get(`${YOUTUBE_BASE_URL}${path}`, {
        params: { ...params, key },
        timeout: 20000
      });

      return response.data;
    } catch (error) {
      lastError = error;
      if (isQuotaError(error)) {
        nextKey(keys);
        continue;
      }
      throw error;
    }
  }

  const message = lastError?.response?.data?.error?.message || "All YouTube API keys failed or quota exceeded.";
  const error = new Error(message);
  error.statusCode = lastError?.response?.status || 429;
  throw error;
}

function formatISODuration(iso) {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "") || [];
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (!hours) return `${mm}:${ss}`;
  return `${String(hours).padStart(2, "0")}:${mm}:${ss}`;
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function channelPayload(item, sourceInputs = []) {
  return {
    channelId: item.id,
    channelTitle: item.snippet?.title || "",
    channelDescription: item.snippet?.description || "",
    channelCustomUrl: item.snippet?.customUrl || "",
    channelPublishedAt: item.snippet?.publishedAt || "",
    channelAvatarUrl:
      item.snippet?.thumbnails?.default?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.high?.url ||
      "",
    subscriberCount: item.statistics?.hiddenSubscriberCount ? null : Number(item.statistics?.subscriberCount || 0),
    hiddenSubscriberCount: Boolean(item.statistics?.hiddenSubscriberCount),
    channelVideoCount: Number(item.statistics?.videoCount || 0),
    channelViewCount: Number(item.statistics?.viewCount || 0),
    channelUrl: `https://www.youtube.com/channel/${item.id}`,
    sourceInputs
  };
}

function parseInputLine(line) {
  const raw = String(line || "").trim();
  const clean = raw.replace(/[<>]/g, "").trim();
  if (!clean) return null;

  const directChannelId = clean.match(/^(UC[a-zA-Z0-9_-]{20,})$/);
  if (directChannelId) return { type: "channelId", value: directChannelId[1], raw };

  const directHandle = clean.match(/^@([a-zA-Z0-9._-]{2,})$/);
  if (directHandle) return { type: "handle", value: `@${directHandle[1]}`, raw };

  try {
    const url = new URL(clean.startsWith("http") ? clean : `https://${clean}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);

    if (host === "youtu.be" && parts[0]) {
      return { type: "videoId", value: parts[0], raw };
    }

    if (host.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return { type: "videoId", value: v, raw };

      const channelIndex = parts.findIndex((part) => part.toLowerCase() === "channel");
      if (channelIndex >= 0 && parts[channelIndex + 1]?.startsWith("UC")) {
        return { type: "channelId", value: parts[channelIndex + 1], raw };
      }

      const userIndex = parts.findIndex((part) => part.toLowerCase() === "user");
      if (userIndex >= 0 && parts[userIndex + 1]) {
        return { type: "username", value: parts[userIndex + 1], raw };
      }

      const handlePart = parts.find((part) => part.startsWith("@"));
      if (handlePart) return { type: "handle", value: handlePart, raw };

      const shortsIndex = parts.findIndex((part) => part.toLowerCase() === "shorts");
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) {
        return { type: "videoId", value: parts[shortsIndex + 1], raw };
      }
    }
  } catch {
    return { type: "unknown", value: clean, raw };
  }

  return { type: "unknown", value: clean, raw };
}

exports.getChannelsByKeyword = async (req, res) => {
  try {
    const keyword = String(req.query.keyword || req.query.q || "").trim();
    const order = ["date", "viewCount", "relevance", "rating", "title"].includes(req.query.order)
      ? req.query.order
      : "date";
    const maxChannels = Math.max(1, Math.min(200, Number(req.query.maxChannels || 50)));
    const regionCode = String(req.query.regionCode || "").trim().toUpperCase();

    if (!keyword) {
      return res.status(400).json({ success: false, message: "Keyword is required" });
    }

    const channelMap = new Map();
    let pageToken = "";
    let guard = 0;

    while (channelMap.size < maxChannels && guard < 30) {
      guard += 1;
      const searchData = await youtubeGet("/search", {
        part: "snippet",
        type: "video",
        maxResults: 50,
        order,
        q: keyword,
        safeSearch: "none",
        ...(pageToken ? { pageToken } : {}),
        ...(regionCode ? { regionCode } : {})
      });

      for (const item of searchData.items || []) {
        if (item?.id?.kind !== "youtube#video") continue;
        const channelId = item.snippet?.channelId;
        if (!channelId || channelMap.has(channelId)) continue;

        channelMap.set(channelId, {
          channelId,
          channelTitle: item.snippet?.channelTitle || "",
          channelAvatarUrl: "",
          subscriberCount: null,
          channelVideoCount: null,
          channelViewCount: null,
          videoId: item.id.videoId,
          videoTitle: item.snippet?.title || "",
          publishedAt: item.snippet?.publishedAt || "",
          thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
          duration: "",
          durationSeconds: 0,
          viewCount: 0
        });

        if (channelMap.size >= maxChannels) break;
      }

      pageToken = searchData.nextPageToken || "";
      if (!pageToken) break;
    }

    const rows = Array.from(channelMap.values());
    const channelIds = rows.map((row) => row.channelId).filter(Boolean);
    const videoIds = rows.map((row) => row.videoId).filter(Boolean);

    for (const batch of chunk(channelIds, 50)) {
      const channelsData = await youtubeGet("/channels", {
        part: "snippet,statistics",
        id: batch.join(",")
      });

      const channelDetailsMap = new Map((channelsData.items || []).map((item) => [item.id, item]));

      for (const row of rows) {
        const channel = channelDetailsMap.get(row.channelId);
        if (!channel) continue;

        row.channelTitle = channel.snippet?.title || row.channelTitle || "";
        row.channelAvatarUrl =
          channel.snippet?.thumbnails?.default?.url ||
          channel.snippet?.thumbnails?.medium?.url ||
          channel.snippet?.thumbnails?.high?.url ||
          "";
        row.subscriberCount = channel.statistics?.hiddenSubscriberCount ? null : Number(channel.statistics?.subscriberCount || 0);
        row.channelVideoCount = Number(channel.statistics?.videoCount || 0);
        row.channelViewCount = Number(channel.statistics?.viewCount || 0);
      }
    }

    for (const batch of chunk(videoIds, 50)) {
      const videosData = await youtubeGet("/videos", {
        part: "statistics,snippet,contentDetails",
        id: batch.join(",")
      });

      const videoMap = new Map((videosData.items || []).map((item) => [item.id, item]));

      for (const row of rows) {
        const video = videoMap.get(row.videoId);
        if (!video) continue;

        const duration = formatISODuration(video.contentDetails?.duration);
        const durationParts = duration.split(":").map(Number);
        const durationSeconds = durationParts.length === 3
          ? durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2]
          : durationParts[0] * 60 + durationParts[1];

        row.videoTitle = row.videoTitle || video.snippet?.title || "";
        row.publishedAt = row.publishedAt || video.snippet?.publishedAt || "";
        row.thumbnailUrl = video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.high?.url || row.thumbnailUrl || "";
        row.duration = duration;
        row.durationSeconds = durationSeconds;
        row.viewCount = Number(video.statistics?.viewCount || 0);
      }
    }

    rows.sort((a, b) => {
      if (order === "viewCount") return b.viewCount - a.viewCount;
      return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
    });

    res.json({
      success: true,
      data: rows,
      meta: {
        keyword,
        order,
        regionCode,
        requested: maxChannels,
        returned: rows.length
      }
    });
  } catch (error) {
    res.status(error.statusCode || error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.error?.message || error.message || "Could not fetch YouTube trend data"
    });
  }
};

exports.getChannelsFromInputs = async (req, res) => {
  try {
    const rawInputs = Array.isArray(req.body?.inputs)
      ? req.body.inputs
      : String(req.body?.inputs || req.body?.text || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const parsedInputs = rawInputs.map(parseInputLine).filter(Boolean);
    if (!parsedInputs.length) {
      return res.status(400).json({ success: false, message: "Please enter at least one channel or video link." });
    }

    const channelIds = [];
    const videoIds = [];
    const handles = [];
    const usernames = [];
    const inputSourcesByChannelId = new Map();
    const unresolved = [];

    for (const item of parsedInputs) {
      if (item.type === "channelId") {
        channelIds.push(item.value);
        inputSourcesByChannelId.set(item.value, unique([...(inputSourcesByChannelId.get(item.value) || []), item.raw]));
      } else if (item.type === "videoId") {
        videoIds.push(item.value);
      } else if (item.type === "handle") {
        handles.push(item);
      } else if (item.type === "username") {
        usernames.push(item);
      } else {
        unresolved.push({ input: item.raw, reason: "Unsupported input format" });
      }
    }

    const videoInputById = new Map();
    parsedInputs.filter((item) => item.type === "videoId").forEach((item) => videoInputById.set(item.value, item.raw));

    for (const batch of chunk(unique(videoIds), 50)) {
      const videosData = await youtubeGet("/videos", {
        part: "snippet",
        id: batch.join(",")
      });

      const foundVideoIds = new Set();
      for (const video of videosData.items || []) {
        foundVideoIds.add(video.id);
        const channelId = video.snippet?.channelId;
        if (!channelId) continue;
        channelIds.push(channelId);
        inputSourcesByChannelId.set(channelId, unique([...(inputSourcesByChannelId.get(channelId) || []), videoInputById.get(video.id)]));
      }

      batch
        .filter((videoId) => !foundVideoIds.has(videoId))
        .forEach((videoId) => unresolved.push({ input: videoInputById.get(videoId) || videoId, reason: "Video not found" }));
    }

    const handleChannelIds = [];
    for (const handle of handles) {
      const data = await youtubeGet("/channels", {
        part: "snippet,statistics",
        forHandle: handle.value
      });
      const channel = data.items?.[0];
      if (!channel) {
        unresolved.push({ input: handle.raw, reason: "Handle not found" });
        continue;
      }
      handleChannelIds.push(channel.id);
      inputSourcesByChannelId.set(channel.id, unique([...(inputSourcesByChannelId.get(channel.id) || []), handle.raw]));
    }

    for (const username of usernames) {
      const data = await youtubeGet("/channels", {
        part: "snippet,statistics",
        forUsername: username.value
      });
      const channel = data.items?.[0];
      if (!channel) {
        unresolved.push({ input: username.raw, reason: "Username not found" });
        continue;
      }
      handleChannelIds.push(channel.id);
      inputSourcesByChannelId.set(channel.id, unique([...(inputSourcesByChannelId.get(channel.id) || []), username.raw]));
    }

    const allChannelIds = unique([...channelIds, ...handleChannelIds]);
    const channels = [];
    const foundChannelIds = new Set();

    for (const batch of chunk(allChannelIds, 50)) {
      const channelsData = await youtubeGet("/channels", {
        part: "snippet,statistics",
        id: batch.join(",")
      });

      for (const channel of channelsData.items || []) {
        foundChannelIds.add(channel.id);
        channels.push(channelPayload(channel, inputSourcesByChannelId.get(channel.id) || []));
      }
    }

    allChannelIds
      .filter((channelId) => !foundChannelIds.has(channelId))
      .forEach((channelId) => unresolved.push({ input: channelId, reason: "Channel not found" }));

    channels.sort((a, b) => a.channelTitle.localeCompare(b.channelTitle, undefined, { sensitivity: "base", numeric: true }));

    res.json({
      success: true,
      data: channels,
      unresolved,
      meta: {
        inputs: parsedInputs.length,
        returned: channels.length,
        unresolved: unresolved.length
      }
    });
  } catch (error) {
    res.status(error.statusCode || error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.error?.message || error.message || "Could not fetch YouTube channel data"
    });
  }
};
