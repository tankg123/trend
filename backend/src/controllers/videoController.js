const db = require("../config/database");
const { getAllVideosFromYoutube } = require("../services/youtubeService");

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function saveVideos(videos) {
  const today = todayKey();
  const existingStmt = db.prepare("SELECT * FROM videos WHERE video_id = ?");
  const upsertStmt = db.prepare(`
    INSERT INTO videos (
      video_id,
      channel_id,
      channel_title,
      title,
      thumbnail,
      published_at,
      view_count_today,
      view_count_yesterday,
      view_growth,
      last_checked_date,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(video_id) DO UPDATE SET
      channel_id = excluded.channel_id,
      channel_title = excluded.channel_title,
      title = excluded.title,
      thumbnail = excluded.thumbnail,
      published_at = excluded.published_at,
      view_count_today = excluded.view_count_today,
      view_count_yesterday = excluded.view_count_yesterday,
      view_growth = excluded.view_growth,
      last_checked_date = excluded.last_checked_date,
      updated_at = CURRENT_TIMESTAMP
  `);

  const transaction = db.transaction((items) => {
    for (const video of items) {
      const existing = existingStmt.get(video.video_id);
      const todayViews = Number(video.view_count || 0);
      const yesterdayViews =
        existing && existing.last_checked_date !== today
          ? Number(existing.view_count_today || 0)
          : Number(existing?.view_count_yesterday || 0);

      upsertStmt.run(
        video.video_id,
        video.channel_id,
        video.channel_title,
        video.title,
        video.thumbnail,
        video.published_at,
        todayViews,
        yesterdayViews,
        todayViews - yesterdayViews,
        today
      );
    }
  });

  transaction(videos);
}

async function syncVideosNow(channelId = "") {
  const channels = channelId
    ? db.prepare("SELECT * FROM channels WHERE channel_id = ?").all(channelId)
    : db.prepare("SELECT * FROM channels WHERE status != 'error' ORDER BY id DESC").all();

  let synced = 0;
  const errors = [];

  for (const channel of channels) {
    try {
      const videos = await getAllVideosFromYoutube(channel.channel_id);
      saveVideos(videos);
      synced += videos.length;
    } catch (error) {
      errors.push({
        channel_id: channel.channel_id,
        error: error.message
      });
    }
  }

  return {
    channels: channels.length,
    synced,
    errors
  };
}

exports.getAllVideos = (req, res) => {
  try {
    const q = String(req.query.q || req.query.keyword || "").trim();
    const where = [];
    const params = [];

    if (q) {
      where.push(`(
        channel_id LIKE ?
        OR channel_title LIKE ?
        OR title LIKE ?
        OR video_id LIKE ?
      )`);
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    const rows = db
      .prepare(`
        SELECT *
        FROM videos
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY datetime(published_at) DESC, id DESC
      `)
      .all(...params);

    res.json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách video",
      error: error.message
    });
  }
};

exports.syncVideos = async (req, res) => {
  try {
    const channelId = String(req.query.channel_id || "").trim();
    const result = await syncVideosNow(channelId);

    res.json({
      success: true,
      message: "Đã đồng bộ video vào backend",
      channels: result.channels,
      synced: result.synced,
      errors: result.errors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi đồng bộ video",
      error: error.message
    });
  }
};

exports.syncVideosNow = syncVideosNow;
