const db = require("../config/database");

const CODE_TYPES = new Set(["ISRC", "UPC"]);

function normalizeCode(value, type) {
  const code = String(value || "").trim().replace(/\s+/g, "").toUpperCase();
  if (!code) return "";

  if (type === "ISRC") {
    return code.replace(/[^A-Z0-9]/g, "");
  }

  return code.replace(/[^0-9A-Z]/g, "");
}

function isValidCode(code, type) {
  if (type === "ISRC") return /^[A-Z0-9]{12}$/.test(code);
  if (type === "UPC") return /^[0-9A-Z]{8,14}$/.test(code);
  return false;
}

function parseCodes(codes, type) {
  const rawList = Array.isArray(codes)
    ? codes
    : String(codes || "").split(/[\r\n,;\t ]+/);

  const seen = new Set();
  const valid = [];
  const invalid = [];

  rawList.forEach((value) => {
    const code = normalizeCode(value, type);
    if (!code) return;
    if (!isValidCode(code, type)) {
      invalid.push(code);
      return;
    }
    if (!seen.has(code)) {
      seen.add(code);
      valid.push(code);
    }
  });

  return { valid, invalid };
}

function moneySafeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function splitArtists(value) {
  return String(value || "")
    .split(/[;,|]/)
    .map((artist) => normalizeName(artist))
    .filter(Boolean);
}

function getOrCreateLabel(name) {
  const cleanName = normalizeName(name);
  if (!cleanName) return null;

  const existing = db.prepare("SELECT * FROM content_id_labels WHERE lower(name) = lower(?)").get(cleanName);
  if (existing) return existing;

  const result = db.prepare("INSERT INTO content_id_labels (name, display_name) VALUES (?, ?)").run(cleanName, cleanName);
  return db.prepare("SELECT * FROM content_id_labels WHERE id = ?").get(result.lastInsertRowid);
}

function getOrCreateArtist(name) {
  const cleanName = normalizeName(name);
  if (!cleanName) return null;

  const existing = db.prepare("SELECT * FROM content_id_artists WHERE lower(name) = lower(?)").get(cleanName);
  if (existing) return existing;

  const result = db.prepare("INSERT INTO content_id_artists (name, display_name) VALUES (?, ?)").run(cleanName, cleanName);
  return db.prepare("SELECT * FROM content_id_artists WHERE id = ?").get(result.lastInsertRowid);
}

function getCodeSummary(req, res) {
  const rows = db.prepare(`
    SELECT type, status, COUNT(*) AS count
    FROM content_id_codes
    GROUP BY type, status
  `).all();

  const summary = {
    ISRC: { unused: 0, used: 0, reserved: 0, total: 0 },
    UPC: { unused: 0, used: 0, reserved: 0, total: 0 }
  };

  rows.forEach((row) => {
    if (!summary[row.type]) return;
    summary[row.type][row.status] = row.count;
    summary[row.type].total += row.count;
  });

  res.json({ success: true, summary });
}

function listCodes(req, res) {
  const type = String(req.query.type || "").toUpperCase();
  const status = String(req.query.status || "");
  const search = String(req.query.search || "").trim();
  const limit = Math.min(Math.max(Number(req.query.limit) || 300, 1), 1000);

  const clauses = [];
  const params = [];

  if (CODE_TYPES.has(type)) {
    clauses.push("type = ?");
    params.push(type);
  }

  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }

  if (search) {
    clauses.push("(code LIKE ? OR album_title LIKE ? OR song_title LIKE ? OR artist LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const codes = db.prepare(`
    SELECT *
    FROM content_id_codes
    ${where}
    ORDER BY
      CASE status WHEN 'unused' THEN 0 WHEN 'reserved' THEN 1 ELSE 2 END,
      id DESC
    LIMIT ?
  `).all(...params, limit);

  res.json({ success: true, codes });
}

function addCodes(req, res) {
  const type = String(req.body.type || "").toUpperCase();
  if (!CODE_TYPES.has(type)) {
    return res.status(400).json({ success: false, message: "Invalid code type" });
  }

  const { valid, invalid } = parseCodes(req.body.codes, type);
  const notes = String(req.body.notes || "").trim();

  const insert = db.prepare(`
    INSERT OR IGNORE INTO content_id_codes (type, code, notes)
    VALUES (?, ?, ?)
  `);

  let added = 0;
  const transaction = db.transaction(() => {
    valid.forEach((code) => {
      const result = insert.run(type, code, notes || null);
      added += result.changes;
    });
  });

  transaction();

  res.json({
    success: true,
    added,
    duplicates: valid.length - added,
    invalid,
    totalParsed: valid.length + invalid.length
  });
}

function updateCode(req, res) {
  const id = Number(req.params.id);
  const status = String(req.body.status || "").trim();
  const notes = String(req.body.notes || "").trim();

  const code = db.prepare("SELECT * FROM content_id_codes WHERE id = ?").get(id);
  if (!code) {
    return res.status(404).json({ success: false, message: "Code not found" });
  }

  const nextStatus = status || code.status;
  if (!["unused", "used", "reserved"].includes(nextStatus)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  db.prepare(`
    UPDATE content_id_codes
    SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(nextStatus, notes || null, id);

  res.json({ success: true, code: db.prepare("SELECT * FROM content_id_codes WHERE id = ?").get(id) });
}

function deleteCode(req, res) {
  const id = Number(req.params.id);
  const code = db.prepare("SELECT * FROM content_id_codes WHERE id = ?").get(id);

  if (!code) {
    return res.status(404).json({ success: false, message: "Code not found" });
  }

  if (code.status === "used") {
    return res.status(400).json({ success: false, message: "Used codes cannot be deleted" });
  }

  db.prepare("DELETE FROM content_id_codes WHERE id = ?").run(id);
  res.json({ success: true });
}

function getAvailableCodes(req, res) {
  const type = String(req.query.type || "").toUpperCase();
  const count = Math.min(Math.max(Number(req.query.count) || 1, 1), 500);

  if (!CODE_TYPES.has(type)) {
    return res.status(400).json({ success: false, message: "Invalid code type" });
  }

  const codes = db.prepare(`
    SELECT code
    FROM content_id_codes
    WHERE type = ? AND status = 'unused'
    ORDER BY id ASC
    LIMIT ?
  `).all(type, count).map((row) => row.code);

  res.json({ success: true, codes, requested: count, available: codes.length });
}

function ensureCodeCanBeUsed(code, type) {
  const existing = db.prepare("SELECT * FROM content_id_codes WHERE code = ?").get(code);
  if (existing && existing.type !== type) {
    throw new Error(`${code} already exists as ${existing.type}`);
  }
  if (existing && existing.status === "used") {
    throw new Error(`${type} ${code} is already used`);
  }
}

function saveProduct(req, res) {
  const product = req.body.product || {};
  const tracks = Array.isArray(req.body.tracks) ? req.body.tracks : [];

  const albumTitle = String(product.album_title || "").trim();
  const albumArtist = String(product.album_artist || "").trim();
  const albumUpc = normalizeCode(product.album_upc, "UPC");
  const releaseDate = String(product.release_date || "").trim();
  const label = String(product.label || "").trim();

  if (!albumTitle) {
    return res.status(400).json({ success: false, message: "Album title is required" });
  }
  if (!albumUpc || !isValidCode(albumUpc, "UPC")) {
    return res.status(400).json({ success: false, message: "Valid UPC is required" });
  }
  if (!tracks.length) {
    return res.status(400).json({ success: false, message: "At least one track is required" });
  }

  try {
    ensureCodeCanBeUsed(albumUpc, "UPC");
    const isrcsInPayload = new Set();
    tracks.forEach((track) => {
      const isrc = normalizeCode(track.isrc, "ISRC");
      if (!isValidCode(isrc, "ISRC")) {
        throw new Error(`Invalid ISRC: ${track.isrc || "-"}`);
      }
      if (isrcsInPayload.has(isrc)) {
        throw new Error(`Duplicated ISRC in this product: ${isrc}`);
      }
      isrcsInPayload.add(isrc);
      ensureCodeCanBeUsed(isrc, "ISRC");
    });

    const save = db.transaction(() => {
      const labelRow = getOrCreateLabel(label);
      const productResult = db.prepare(`
        INSERT INTO content_id_products (
          label_id, album_title, album_artist, album_upc, genre, label, release_date,
          ownership, match_policy, ddex_party_id, album_art_filename, track_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        labelRow?.id || null,
        albumTitle,
        albumArtist || null,
        albumUpc,
        String(product.genre || "").trim() || null,
        label || null,
        releaseDate || null,
        String(product.ownership || "").trim() || null,
        String(product.match_policy || "").trim() || null,
        String(product.ddex_party_id || "").trim() || null,
        String(product.album_art_filename || "").trim() || null,
        tracks.length
      );

      const productId = productResult.lastInsertRowid;
      const insertTrack = db.prepare(`
        INSERT INTO content_id_tracks (
          product_id, track_number, filename, isrc, song_title, artist, custom_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const insertUsedCode = db.prepare(`
        INSERT INTO content_id_codes (
          type, code, status, album_title, song_title, artist, product_id, track_id, used_at
        )
        VALUES (?, ?, 'used', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      const markUsed = db.prepare(`
        UPDATE content_id_codes
        SET status = 'used',
            album_title = ?,
            song_title = ?,
            artist = ?,
            product_id = ?,
            track_id = ?,
            used_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE type = ? AND code = ?
      `);
      const insertTrackArtist = db.prepare(`
        INSERT OR IGNORE INTO content_id_track_artists (track_id, artist_id)
        VALUES (?, ?)
      `);

      tracks.forEach((track, index) => {
        const isrc = normalizeCode(track.isrc, "ISRC");
        const songTitle = String(track.song_title || "").trim();
        const artist = splitArtists(track.artist).join(", ");
        const trackResult = insertTrack.run(
          productId,
          Number(track.track_number) || index + 1,
          String(track.filename || "").trim(),
          isrc,
          songTitle,
          artist || null,
          String(track.custom_id || "").trim() || null
        );

        const updated = markUsed.run(albumTitle, songTitle, artist || null, productId, trackResult.lastInsertRowid, "ISRC", isrc);
        if (!updated.changes) {
          insertUsedCode.run("ISRC", isrc, albumTitle, songTitle, artist || null, productId, trackResult.lastInsertRowid);
        }

        splitArtists(track.artist).forEach((artistName) => {
          const artistRow = getOrCreateArtist(artistName);
          if (artistRow) insertTrackArtist.run(trackResult.lastInsertRowid, artistRow.id);
        });
      });

      const upcUpdated = markUsed.run(albumTitle, null, albumArtist || null, productId, null, "UPC", albumUpc);
      if (!upcUpdated.changes) {
        insertUsedCode.run("UPC", albumUpc, albumTitle, null, albumArtist || null, productId, null);
      }

      return productId;
    });

    const productId = save();
    res.json({ success: true, product: getProductDetailById(productId) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

function getProductDetailById(id) {
  const product = db.prepare("SELECT * FROM content_id_products WHERE id = ?").get(id);
  if (!product) return null;
  product.tracks = db.prepare(`
    SELECT *
    FROM content_id_tracks
    WHERE product_id = ?
    ORDER BY track_number ASC, id ASC
  `).all(id);
  return product;
}

function listLabels(req, res) {
  const search = String(req.query.search || "").trim();
  const params = search ? [`%${search}%`, `%${search}%`] : [];
  const where = search ? "WHERE l.name LIKE ? OR l.display_name LIKE ?" : "";

  const labels = db.prepare(`
    SELECT
      l.*,
      COUNT(DISTINCT p.id) AS album_count,
      COUNT(DISTINCT t.id) AS song_count
    FROM content_id_labels l
    LEFT JOIN content_id_products p ON p.label_id = l.id OR lower(p.label) = lower(l.name)
    LEFT JOIN content_id_tracks t ON t.product_id = p.id
    ${where}
    GROUP BY l.id
    ORDER BY l.name COLLATE NOCASE ASC
  `).all(...params);

  res.json({ success: true, labels });
}

function createLabel(req, res) {
  const name = normalizeName(req.body.name);
  const displayName = normalizeName(req.body.display_name) || name;
  const notes = String(req.body.notes || "").trim();

  if (!name) return res.status(400).json({ success: false, message: "Label name is required" });

  try {
    const result = db.prepare(`
      INSERT INTO content_id_labels (name, display_name, notes)
      VALUES (?, ?, ?)
    `).run(name, displayName, notes || null);
    res.json({ success: true, label: db.prepare("SELECT * FROM content_id_labels WHERE id = ?").get(result.lastInsertRowid) });
  } catch {
    res.status(400).json({ success: false, message: "Label already exists" });
  }
}

function updateLabel(req, res) {
  const id = Number(req.params.id);
  const name = normalizeName(req.body.name);
  const displayName = normalizeName(req.body.display_name) || name;
  const notes = String(req.body.notes || "").trim();

  if (!name) return res.status(400).json({ success: false, message: "Label name is required" });

  const current = db.prepare("SELECT * FROM content_id_labels WHERE id = ?").get(id);
  if (!current) return res.status(404).json({ success: false, message: "Label not found" });

  try {
    db.prepare(`
      UPDATE content_id_labels
      SET name = ?, display_name = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, displayName, notes || null, id);
    res.json({ success: true, label: db.prepare("SELECT * FROM content_id_labels WHERE id = ?").get(id) });
  } catch {
    res.status(400).json({ success: false, message: "Label already exists" });
  }
}

function deleteLabel(req, res) {
  const id = Number(req.params.id);
  const label = db.prepare("SELECT * FROM content_id_labels WHERE id = ?").get(id);
  if (!label) return res.status(404).json({ success: false, message: "Label not found" });
  const used = db.prepare(`
    SELECT COUNT(*) AS count
    FROM content_id_products
    WHERE label_id = ? OR lower(label) = lower(?)
  `).get(id, label.name);

  if (used.count > 0) {
    return res.status(400).json({ success: false, message: "Label is used by products" });
  }

  db.prepare("DELETE FROM content_id_labels WHERE id = ?").run(id);
  res.json({ success: true });
}

function listArtists(req, res) {
  const search = String(req.query.search || "").trim();
  const params = search ? [`%${search}%`, `%${search}%`] : [];
  const where = search ? "WHERE a.name LIKE ? OR a.display_name LIKE ?" : "";

  const artists = db.prepare(`
    SELECT
      a.*,
      COUNT(DISTINCT ta.track_id) AS song_count,
      COUNT(DISTINCT t.product_id) AS album_count
    FROM content_id_artists a
    LEFT JOIN content_id_track_artists ta ON ta.artist_id = a.id
    LEFT JOIN content_id_tracks t ON t.id = ta.track_id
    ${where}
    GROUP BY a.id
    ORDER BY a.name COLLATE NOCASE ASC
  `).all(...params);

  res.json({ success: true, artists });
}

function createArtist(req, res) {
  const name = normalizeName(req.body.name);
  const displayName = normalizeName(req.body.display_name) || name;
  const notes = String(req.body.notes || "").trim();

  if (!name) return res.status(400).json({ success: false, message: "Artist name is required" });

  try {
    const result = db.prepare(`
      INSERT INTO content_id_artists (name, display_name, notes)
      VALUES (?, ?, ?)
    `).run(name, displayName, notes || null);
    res.json({ success: true, artist: db.prepare("SELECT * FROM content_id_artists WHERE id = ?").get(result.lastInsertRowid) });
  } catch {
    res.status(400).json({ success: false, message: "Artist already exists" });
  }
}

function updateArtist(req, res) {
  const id = Number(req.params.id);
  const name = normalizeName(req.body.name);
  const displayName = normalizeName(req.body.display_name) || name;
  const notes = String(req.body.notes || "").trim();

  if (!name) return res.status(400).json({ success: false, message: "Artist name is required" });

  const current = db.prepare("SELECT * FROM content_id_artists WHERE id = ?").get(id);
  if (!current) return res.status(404).json({ success: false, message: "Artist not found" });

  try {
    db.prepare(`
      UPDATE content_id_artists
      SET name = ?, display_name = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, displayName, notes || null, id);
    res.json({ success: true, artist: db.prepare("SELECT * FROM content_id_artists WHERE id = ?").get(id) });
  } catch {
    res.status(400).json({ success: false, message: "Artist already exists" });
  }
}

function deleteArtist(req, res) {
  const id = Number(req.params.id);
  const used = db.prepare("SELECT COUNT(*) AS count FROM content_id_track_artists WHERE artist_id = ?").get(id);

  if (used.count > 0) {
    return res.status(400).json({ success: false, message: "Artist is used by tracks" });
  }

  db.prepare("DELETE FROM content_id_artists WHERE id = ?").run(id);
  res.json({ success: true });
}

function listProducts(req, res) {
  const search = String(req.query.search || "").trim();
  const clauses = [];
  const params = [];

  if (search) {
    clauses.push("(album_title LIKE ? OR album_artist LIKE ? OR album_upc LIKE ? OR label LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const products = db.prepare(`
    SELECT *
    FROM content_id_products
    ${where}
    ORDER BY created_at DESC, id DESC
    LIMIT 300
  `).all(...params);

  res.json({ success: true, products });
}

function getProduct(req, res) {
  const product = getProductDetailById(Number(req.params.id));
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  res.json({ success: true, product });
}

function deleteProduct(req, res) {
  const id = Number(req.params.id);
  const product = db.prepare("SELECT * FROM content_id_products WHERE id = ?").get(id);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const remove = db.transaction(() => {
    db.prepare(`
      UPDATE content_id_codes
      SET status = 'unused',
          album_title = NULL,
          song_title = NULL,
          artist = NULL,
          product_id = NULL,
          track_id = NULL,
          used_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ?
    `).run(id);
    db.prepare("DELETE FROM content_id_products WHERE id = ?").run(id);
  });

  remove();
  res.json({ success: true });
}

module.exports = {
  addCodes,
  createArtist,
  createLabel,
  deleteCode,
  deleteArtist,
  deleteLabel,
  deleteProduct,
  getAvailableCodes,
  getCodeSummary,
  getProduct,
  listArtists,
  listCodes,
  listLabels,
  listProducts,
  saveProduct,
  updateArtist,
  updateLabel,
  updateCode,
  moneySafeNumber
};
