const db = require("../config/database");
const { getChannelFromYoutube } = require("../services/youtubeService");

function parseChannel(row) {
  if (!row) return row;

  try {
    return {
      ...row,
      latest_videos: JSON.parse(row.latest_videos || "[]")
    };
  } catch {
    return {
      ...row,
      latest_videos: []
    };
  }
}

function getCurrentChannelNetwork(channelId, startMonth = "") {
  if (!channelId) return null;

  if (startMonth) {
    return db.prepare(`
      SELECT h.*, n.name AS network_name
      FROM channel_network_history h
      JOIN networks n ON n.id = h.new_network_id
      WHERE h.channel_id = ? AND h.start_month <= ?
      ORDER BY h.start_month DESC, h.id DESC
      LIMIT 1
    `).get(channelId, startMonth);
  }

  return db.prepare(`
    SELECT h.*, n.name AS network_name
    FROM channel_network_history h
    JOIN networks n ON n.id = h.new_network_id
    WHERE h.channel_id = ?
    ORDER BY h.start_month DESC, h.id DESC
    LIMIT 1
  `).get(channelId);
}

function parseHistory(row) {
  return {
    ...row,
    old_network: row.old_network_id
      ? { id: row.old_network_id, name: row.old_network_name || "" }
      : null,
    new_network: {
      id: row.new_network_id,
      name: row.new_network_name || ""
    }
  };
}

function saveChannelData(data) {
  const existing = db.prepare("SELECT latest_videos FROM channels WHERE channel_id = ?").get(data.channel_id);
  const latestVideos = data.latest_videos === undefined
    ? (existing?.latest_videos || "[]")
    : JSON.stringify(data.latest_videos || []);

  db.prepare(`
    INSERT INTO channels (
      channel_id,
      title,
      description,
      custom_url,
      thumbnail,
      view_count,
      subscriber_count,
      video_count,
      country,
      published_at,
      latest_videos,
      status,
      status_error,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(channel_id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      custom_url = excluded.custom_url,
      thumbnail = excluded.thumbnail,
      view_count = excluded.view_count,
      subscriber_count = excluded.subscriber_count,
      video_count = excluded.video_count,
      country = excluded.country,
      published_at = excluded.published_at,
      latest_videos = excluded.latest_videos,
      status = excluded.status,
      status_error = excluded.status_error,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    data.channel_id,
    data.title,
    data.description,
    data.custom_url,
    data.thumbnail,
    data.view_count,
    data.subscriber_count,
    data.video_count,
    data.country,
    data.published_at,
    latestVideos,
    "active",
    null
  );
}

function shouldMarkChannelError(channel, error) {
  const message = String(error?.message || "");
  const hasUsableData = Boolean(channel?.thumbnail) || Number(channel?.view_count || 0) > 0;
  if (hasUsableData && /403|quota|forbidden/i.test(message)) return false;
  return true;
}

exports.getAllChannels = (req, res) => {
  try {
    const keyword = String(req.query.keyword || "").trim();

    let rows;

    if (keyword) {
      rows = db
        .prepare(`
          SELECT * FROM channels
          WHERE title LIKE ?
             OR channel_id LIKE ?
             OR custom_url LIKE ?
          ORDER BY updated_at DESC, id DESC
        `)
        .all(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    } else {
      rows = db
        .prepare(`
          SELECT * FROM channels
          ORDER BY updated_at DESC, id DESC
        `)
        .all();
    }

    const data = rows.map((row) => {
      const channel = parseChannel(row);
      const network = getCurrentChannelNetwork(channel.channel_id);
      return {
        ...channel,
        current_network: network
          ? {
              id: network.new_network_id,
              name: network.network_name,
              start_month: network.start_month,
              created_at: network.created_at
            }
          : null
      };
    });

    res.json({
      success: true,
      total: rows.length,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách channel",
      error: error.message
    });
  }
};

exports.addChannel = async (req, res) => {
  try {
    const { channel_input } = req.body;

    if (!channel_input) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập Channel ID, YouTube URL hoặc @handle"
      });
    }

    const data = await getChannelFromYoutube(channel_input);

    saveChannelData(data);

    const saved = parseChannel(db
      .prepare("SELECT * FROM channels WHERE channel_id = ?")
      .get(data.channel_id));

    res.json({
      success: true,
      message: "Đã thêm/cập nhật channel thành công",
      data: saved
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi thêm channel",
      error: error.message
    });
  }
};

exports.refreshChannel = async (req, res) => {
  try {
    const { id } = req.params;

    const oldChannel = db
      .prepare("SELECT * FROM channels WHERE id = ?")
      .get(id);

    if (!oldChannel) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy channel"
      });
    }

    const data = await getChannelFromYoutube(oldChannel.channel_id);
    saveChannelData(data);

    const updated = parseChannel(db
      .prepare("SELECT * FROM channels WHERE id = ?")
      .get(id));

    res.json({
      success: true,
      message: "Đã cập nhật dữ liệu mới từ YouTube",
      data: updated
    });
  } catch (error) {
    if (req.params?.id) {
      const existing = db.prepare("SELECT * FROM channels WHERE id = ?").get(req.params.id);
      if (!shouldMarkChannelError(existing, error)) {
        db.prepare("UPDATE channels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
      } else {
      db.prepare(`
        UPDATE channels
        SET status = ?, status_error = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run("error", error.message, req.params.id);
      }
    }

    res.status(500).json({
      success: false,
      message: "Lỗi refresh channel",
      error: error.message
    });
  }
};

function saveManagedChannelData(data, meta = {}) {
  db.prepare(`
    INSERT INTO managed_channels (
      channel_id, title, description, custom_url, thumbnail,
      view_count, subscriber_count, video_count, country, published_at,
      network_id, partner_id, collaborator_id, revenue_sharing_id, colab_revenue_sharing_id,
      note, status, status_error, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(channel_id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      custom_url = excluded.custom_url,
      thumbnail = excluded.thumbnail,
      view_count = excluded.view_count,
      subscriber_count = excluded.subscriber_count,
      video_count = excluded.video_count,
      country = excluded.country,
      published_at = excluded.published_at,
      network_id = excluded.network_id,
      partner_id = excluded.partner_id,
      collaborator_id = excluded.collaborator_id,
      revenue_sharing_id = excluded.revenue_sharing_id,
      colab_revenue_sharing_id = excluded.colab_revenue_sharing_id,
      note = excluded.note,
      status = excluded.status,
      status_error = excluded.status_error,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    data.channel_id,
    data.title || data.channel_id,
    data.description || "",
    data.custom_url || "",
    data.thumbnail || "",
    Number(data.view_count || 0),
    Number(data.subscriber_count || 0),
    Number(data.video_count || 0),
    data.country || "",
    data.published_at || "",
    meta.network_id || null,
    meta.partner_id || null,
    meta.collaborator_id || null,
    meta.sharing_id || null,
    meta.colab_sharing_id || meta.sharing_id || null,
    meta.note || "",
    data.status || "active",
    data.status_error || null
  );
}

function managedChannelRows(keyword = "") {
  const search = `%${String(keyword || "").trim()}%`;
  return db.prepare(`
    SELECT mc.*,
           n.name AS network_name,
           p.partner_name, p.display_name AS partner_display_name,
           c.name AS collaborator_name, c.display_name AS collaborator_display_name,
           rs.name AS revenue_sharing_name, rs.share_rate AS revenue_share_rate,
           crs.name AS colab_revenue_sharing_name, crs.share_rate AS colab_revenue_share_rate
    FROM managed_channels mc
    LEFT JOIN networks n ON n.id = mc.network_id
    LEFT JOIN partners p ON p.id = mc.partner_id
    LEFT JOIN collaborators c ON c.id = mc.collaborator_id
    LEFT JOIN revenue_sharings rs ON rs.id = mc.revenue_sharing_id
    LEFT JOIN revenue_sharings crs ON crs.id = mc.colab_revenue_sharing_id
    WHERE ? = '%%'
       OR mc.title LIKE ?
       OR mc.channel_id LIKE ?
       OR mc.custom_url LIKE ?
    ORDER BY mc.updated_at DESC, mc.id DESC
  `).all(search, search, search, search);
}

function sharingRateTotal(partnerSharingId, collaboratorSharingId) {
  const ids = [partnerSharingId, collaboratorSharingId]
    .filter((id) => id !== null && id !== undefined && id !== "")
    .map((id) => Number(id));

  if (!ids.length) return 0;

  const stmt = db.prepare("SELECT share_rate FROM revenue_sharings WHERE id = ?");
  return ids.reduce((sum, id) => {
    const row = stmt.get(id);
    return sum + Number(row?.share_rate || 0);
  }, 0);
}

function validateSharingLimit(partnerSharingId, collaboratorSharingId) {
  const total = sharingRateTotal(partnerSharingId, collaboratorSharingId);
  if (total > 100) {
    return `Partner Sharing and Collaborator Sharing cannot exceed 100% total. Current total is ${total}%.`;
  }
  return null;
}

exports.getManagedChannels = (req, res) => {
  try {
    const rows = managedChannelRows(req.query.keyword);
    res.json({ success: true, total: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load managed channels", error: error.message });
  }
};

exports.updateManagedChannel = (req, res) => {
  try {
    const current = db.prepare("SELECT * FROM managed_channels WHERE id = ?").get(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: "Managed channel not found" });
    }

    const data = req.body || {};
    const nullable = (value) => value === "" || value === undefined ? null : value;
    const nextRevenueSharingId = nullable(data.revenue_sharing_id ?? data.sharing_id ?? current.revenue_sharing_id);
    const nextColabSharingId = nullable(data.colab_revenue_sharing_id ?? data.colab_sharing_id ?? current.colab_revenue_sharing_id);
    const sharingError = validateSharingLimit(nextRevenueSharingId, nextColabSharingId);

    if (sharingError) {
      return res.status(400).json({ success: false, message: sharingError });
    }

    db.prepare(`
      UPDATE managed_channels
      SET title = ?,
          custom_url = ?,
          network_id = ?,
          partner_id = ?,
          collaborator_id = ?,
          revenue_sharing_id = ?,
          colab_revenue_sharing_id = ?,
          note = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.title ?? current.title,
      data.custom_url ?? current.custom_url,
      nullable(data.network_id ?? current.network_id),
      nullable(data.partner_id ?? current.partner_id),
      nullable(data.collaborator_id ?? current.collaborator_id),
      nextRevenueSharingId,
      nextColabSharingId,
      data.note ?? current.note,
      data.status || current.status || "active",
      current.id
    );

    const updated = managedChannelRows(current.channel_id).find((row) => row.id === current.id);
    res.json({ success: true, message: "Managed channel updated", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not update managed channel", error: error.message });
  }
};

exports.deleteManagedChannel = (req, res) => {
  try {
    const result = db.prepare("DELETE FROM managed_channels WHERE id = ?").run(req.params.id);
    if (!result.changes) {
      return res.status(404).json({ success: false, message: "Managed channel not found" });
    }
    res.json({ success: true, message: "Managed channel deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not delete managed channel", error: error.message });
  }
};

exports.bulkUpdateManagedChannels = (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id) => Number(id)).filter(Boolean) : [];
    const updates = req.body?.updates || {};

    if (!ids.length) {
      return res.status(400).json({ success: false, message: "Please select at least one channel" });
    }

    const nullable = (value) => value === "" || value === undefined ? null : value;
    const has = (key) => Object.prototype.hasOwnProperty.call(updates, key);
    const selectCurrent = db.prepare("SELECT * FROM managed_channels WHERE id = ?");
    const updateStmt = db.prepare(`
      UPDATE managed_channels
      SET network_id = ?,
          partner_id = ?,
          collaborator_id = ?,
          revenue_sharing_id = ?,
          colab_revenue_sharing_id = ?,
          note = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const transaction = db.transaction(() => {
      let changed = 0;
      for (const id of ids) {
        const current = selectCurrent.get(id);
        if (!current) continue;

        const nextRevenueSharingId = has("revenue_sharing_id") || has("sharing_id")
          ? nullable(updates.revenue_sharing_id ?? updates.sharing_id)
          : current.revenue_sharing_id;
        const nextColabSharingId = has("colab_revenue_sharing_id") || has("colab_sharing_id")
          ? nullable(updates.colab_revenue_sharing_id ?? updates.colab_sharing_id)
          : current.colab_revenue_sharing_id;
        const sharingError = validateSharingLimit(nextRevenueSharingId, nextColabSharingId);

        if (sharingError) {
          throw new Error(`${current.title || current.channel_id}: ${sharingError}`);
        }

        changed += updateStmt.run(
          has("network_id") ? nullable(updates.network_id) : current.network_id,
          has("partner_id") ? nullable(updates.partner_id) : current.partner_id,
          has("collaborator_id") ? nullable(updates.collaborator_id) : current.collaborator_id,
          nextRevenueSharingId,
          nextColabSharingId,
          has("note") ? updates.note : current.note,
          has("status") ? updates.status || "active" : current.status,
          current.id
        ).changes;
      }
      return changed;
    });

    const changed = transaction();
    res.json({ success: true, message: `Updated ${changed} channels`, updated: changed });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Could not update selected channels" });
  }
};

exports.bulkDeleteManagedChannels = (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id) => Number(id)).filter(Boolean) : [];
    if (!ids.length) {
      return res.status(400).json({ success: false, message: "Please select at least one channel" });
    }

    const stmt = db.prepare("DELETE FROM managed_channels WHERE id = ?");
    const transaction = db.transaction(() => ids.reduce((total, id) => total + stmt.run(id).changes, 0));
    const deleted = transaction();

    res.json({ success: true, message: `Deleted ${deleted} channels`, deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not delete selected channels", error: error.message });
  }
};

exports.addChannelsBulk = async (req, res) => {
  try {
    const { channel_inputs, network_id, partner_id, collaborator_id, sharing_id, colab_sharing_id, note } = req.body;
    const sharingError = validateSharingLimit(sharing_id, colab_sharing_id);
    if (sharingError) {
      return res.status(400).json({ success: false, message: sharingError });
    }

    const inputs = String(channel_inputs || "")
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!inputs.length) {
      return res.status(400).json({ success: false, message: "Please enter at least one channel" });
    }

    const created = [];
    const errors = [];

    for (const input of inputs) {
      try {
        const data = await getChannelFromYoutube(input);
        saveManagedChannelData(data, { network_id, partner_id, collaborator_id, sharing_id, colab_sharing_id, note });
        const saved = managedChannelRows(data.channel_id).find((row) => row.channel_id === data.channel_id);
        created.push(saved);
      } catch (error) {
        const fallbackId = String(input || "").match(/UC[a-zA-Z0-9_-]+/)?.[0] || String(input || "").replace(/[^a-zA-Z0-9_-]/g, "");
        if (fallbackId) {
          saveManagedChannelData({
            channel_id: fallbackId,
            title: "Channel error / die",
            status: "error",
            status_error: error.message
          }, { network_id, partner_id, collaborator_id, sharing_id, colab_sharing_id, note });
        }
        errors.push({ input, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Created ${created.length} channels`,
      data: created,
      errors
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not add channels", error: error.message });
  }
};

function listCollaborators(req, res) {
  try {
    const keyword = `%${String(req.query.keyword || "").trim()}%`;
    const rows = db.prepare(`
      SELECT * FROM collaborators
      WHERE name LIKE ? OR display_name LIKE ?
      ORDER BY updated_at DESC, id DESC
    `).all(keyword, keyword);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load collaborators", error: error.message });
  }
}

function createCollaborator(req, res) {
  try {
    const data = req.body || {};
    if (!data.name) return res.status(400).json({ success: false, message: "Name is required" });
    const result = db.prepare(`
      INSERT INTO collaborators (name, display_name, theme_color, status, dashboard_enabled, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.name, data.display_name || "", data.theme_color || "#137fec", data.status || "active", data.dashboard_enabled ? 1 : 0, data.notes || "");
    res.json({ success: true, data: db.prepare("SELECT * FROM collaborators WHERE id = ?").get(result.lastInsertRowid) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not create collaborator", error: error.message });
  }
}

function updateCollaborator(req, res) {
  try {
    const data = req.body || {};
    db.prepare(`
      UPDATE collaborators
      SET name = ?, display_name = ?, theme_color = ?, status = ?, dashboard_enabled = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(data.name, data.display_name || "", data.theme_color || "#137fec", data.status || "active", data.dashboard_enabled ? 1 : 0, data.notes || "", req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not update collaborator", error: error.message });
  }
}

function deleteCollaborator(req, res) {
  try {
    db.prepare("DELETE FROM collaborators WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not delete collaborator", error: error.message });
  }
}

function listRevenueSharings(req, res) {
  try {
    const keyword = `%${String(req.query.keyword || "").trim()}%`;
    const rows = db.prepare(`
      SELECT * FROM revenue_sharings
      WHERE name LIKE ? OR notes LIKE ?
      ORDER BY share_rate DESC, updated_at DESC
    `).all(keyword, keyword);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load revenue sharings", error: error.message });
  }
}

function createRevenueSharing(req, res) {
  try {
    const data = req.body || {};
    if (!data.name) return res.status(400).json({ success: false, message: "Name is required" });
    const result = db.prepare(`
      INSERT INTO revenue_sharings (name, share_rate, theme_color, status, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.name, Number(data.share_rate || 0), data.theme_color || "#137fec", data.status || "active", data.notes || "");
    res.json({ success: true, data: db.prepare("SELECT * FROM revenue_sharings WHERE id = ?").get(result.lastInsertRowid) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not create revenue sharing", error: error.message });
  }
}

function updateRevenueSharing(req, res) {
  try {
    const data = req.body || {};
    db.prepare(`
      UPDATE revenue_sharings
      SET name = ?, share_rate = ?, theme_color = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(data.name, Number(data.share_rate || 0), data.theme_color || "#137fec", data.status || "active", data.notes || "", req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not update revenue sharing", error: error.message });
  }
}

function deleteRevenueSharing(req, res) {
  try {
    db.prepare("DELETE FROM revenue_sharings WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not delete revenue sharing", error: error.message });
  }
}

exports.listCollaborators = listCollaborators;
exports.createCollaborator = createCollaborator;
exports.updateCollaborator = updateCollaborator;
exports.deleteCollaborator = deleteCollaborator;
exports.listRevenueSharings = listRevenueSharings;
exports.createRevenueSharing = createRevenueSharing;
exports.updateRevenueSharing = updateRevenueSharing;
exports.deleteRevenueSharing = deleteRevenueSharing;

exports.syncAllChannels = async (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM channels ORDER BY id ASC").all();
    let synced = 0;
    const errors = [];

    for (const channel of rows) {
      try {
        const data = await getChannelFromYoutube(channel.channel_id);
        saveChannelData(data);
        synced += 1;
      } catch (error) {
        errors.push({
          id: channel.id,
          channel_id: channel.channel_id,
          error: error.message
        });

        if (shouldMarkChannelError(channel, error)) {
          db.prepare(`
            UPDATE channels
            SET status = ?, status_error = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run("error", error.message, channel.id);
        } else {
          db.prepare("UPDATE channels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(channel.id);
        }
      }
    }

    res.json({
      success: true,
      message: "Đã sync lại toàn bộ channel",
      total: rows.length,
      synced,
      errors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi sync toàn bộ channel",
      error: error.message
    });
  }
};

exports.syncAllChannelsBasic = async (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM channels ORDER BY id ASC").all();
    let synced = 0;
    const errors = [];

    for (const channel of rows) {
      try {
        const data = await getChannelFromYoutube(channel.channel_id, { includeLatest: false });
        saveChannelData(data);
        synced += 1;
      } catch (error) {
        errors.push({
          id: channel.id,
          channel_id: channel.channel_id,
          error: error.message
        });

        if (shouldMarkChannelError(channel, error)) {
          db.prepare(`
            UPDATE channels
            SET status = ?, status_error = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run("error", error.message, channel.id);
        } else {
          db.prepare("UPDATE channels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(channel.id);
        }
      }
    }

    res.json({
      success: true,
      message: "Đã sync lại stats toàn bộ channel",
      total: rows.length,
      synced,
      errors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi sync stats toàn bộ channel",
      error: error.message
    });
  }
};

exports.getChannelDetail = (req, res) => {
  try {
    const { id } = req.params;
    const month = String(req.query.month || "");

    const channel = parseChannel(db.prepare("SELECT * FROM channels WHERE id = ?").get(id));

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy channel"
      });
    }

    const revenueRows = db.prepare(`
      SELECT cr.month, cr.network_id, n.name AS network_name,
             SUM(cr.revenue) AS revenue, MIN(cr.created_at) AS created_at
      FROM channel_revenues cr
      LEFT JOIN networks n ON n.id = cr.network_id
      WHERE cr.channel_id = ?
      GROUP BY cr.month, cr.network_id
      ORDER BY cr.month DESC, n.name COLLATE NOCASE
    `).all(channel.channel_id);
    const periodRows = month
      ? revenueRows.filter((row) => row.month === month)
      : revenueRows;
    const totalRevenue = revenueRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
    const periodRevenue = periodRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
    const networks = new Set(revenueRows.map((row) => row.network_id).filter(Boolean));
    const byMonth = revenueRows.reduce((items, row) => {
      const found = items.find((item) => item.month === row.month);
      if (found) {
        found.revenue += Number(row.revenue || 0);
      } else {
        items.push({ month: row.month, revenue: Number(row.revenue || 0) });
      }
      return items;
    }, []);
    const byNetwork = revenueRows.reduce((items, row) => {
      const key = row.network_id || 0;
      const found = items.find((item) => Number(item.network_id || 0) === Number(key));
      if (found) {
        found.revenue += Number(row.revenue || 0);
      } else {
        items.push({
          network_id: row.network_id,
          network_name: row.network_name || "No network",
          revenue: Number(row.revenue || 0)
        });
      }
      return items;
    }, []);
    const history = db.prepare(`
      SELECT h.*, old.name AS old_network_name, next.name AS new_network_name
      FROM channel_network_history h
      LEFT JOIN networks old ON old.id = h.old_network_id
      JOIN networks next ON next.id = h.new_network_id
      WHERE h.channel_id = ?
      ORDER BY h.start_month DESC, h.id DESC
    `).all(channel.channel_id).map(parseHistory);
    const currentNetwork = getCurrentChannelNetwork(channel.channel_id, month) || getCurrentChannelNetwork(channel.channel_id);

    res.json({
      success: true,
      data: {
        channel,
        month,
        current_network: currentNetwork
          ? {
              id: currentNetwork.new_network_id,
              name: currentNetwork.network_name,
              start_month: currentNetwork.start_month
            }
          : null,
        network_history: history,
        revenue_rows: revenueRows,
        breakdown: {
          by_month: byMonth,
          by_network: byNetwork
        },
        summary: {
          total_month: byMonth.length,
          networks: networks.size,
          total_revenue: totalRevenue,
          period_revenue: periodRevenue,
          remaining: totalRevenue,
          remaining_period: periodRevenue
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy chi tiết channel",
      error: error.message
    });
  }
};

exports.changeChannelNetwork = (req, res) => {
  try {
    const { id } = req.params;
    const { network_id, start_month, note } = req.body;

    if (!network_id || !start_month || !/^\d{4}-\d{2}$/.test(String(start_month))) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn network và tháng bắt đầu dạng YYYY-MM"
      });
    }

    const channel = db.prepare("SELECT * FROM channels WHERE id = ?").get(id);
    const network = db.prepare("SELECT * FROM networks WHERE id = ?").get(network_id);

    if (!channel || !network) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy channel hoặc network"
      });
    }

    const oldNetwork = getCurrentChannelNetwork(channel.channel_id, start_month) || getCurrentChannelNetwork(channel.channel_id);

    db.prepare(`
      INSERT INTO channel_network_history (channel_id, old_network_id, new_network_id, start_month, note)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      channel.channel_id,
      oldNetwork?.new_network_id || null,
      network.id,
      start_month,
      note || ""
    );

    res.json({
      success: true,
      message: "Đã đổi network cho channel",
      data: {
        old_network: oldNetwork
          ? { id: oldNetwork.new_network_id, name: oldNetwork.network_name }
          : null,
        new_network: { id: network.id, name: network.name },
        start_month
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi đổi network channel",
      error: error.message
    });
  }
};

exports.deleteChannel = (req, res) => {
  try {
    const { id } = req.params;

    const result = db
      .prepare("DELETE FROM channels WHERE id = ?")
      .run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy channel"
      });
    }

    res.json({
      success: true,
      message: "Đã xóa channel"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi xóa channel",
      error: error.message
    });
  }
};

exports.getStats = (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total_channels,
        COALESCE(SUM(view_count), 0) AS total_views,
        COALESCE(SUM(subscriber_count), 0) AS total_subscribers,
        COALESCE(SUM(video_count), 0) AS total_videos
      FROM channels
    `).get();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy thống kê",
      error: error.message
    });
  }
};
