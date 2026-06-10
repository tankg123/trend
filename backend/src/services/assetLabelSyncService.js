const axios = require("axios");
const db = require("../config/database");
const { getFreshAccessTokenForAccount, listAccounts } = require("./claimService");

const CONTENT_ID_API_BASE = "https://youtubepartner.googleapis.com/youtube/partner/v1";
const MAX_PAGES_PER_CMS = 100;

function normalizeLabelName(label) {
  if (typeof label === "string") return label.trim();

  return String(
    label?.labelName ||
    label?.name ||
    label?.id ||
    label?.assetLabel ||
    label?.value ||
    ""
  ).trim();
}

function getLabelNotes(label, cmsName) {
  const description = String(label?.description || label?.notes || "").trim();
  const source = `Synced from CMS: ${cmsName}`;
  return description ? `${source}. ${description}` : source;
}

function upsertContentIdLabel(name, notes) {
  const cleanName = String(name || "").trim().replace(/\s+/g, " ");
  if (!cleanName) return "skipped";

  const existing = db.prepare("SELECT * FROM content_id_labels WHERE lower(name) = lower(?)").get(cleanName);
  if (existing) {
    db.prepare(`
      UPDATE content_id_labels
      SET display_name = COALESCE(NULLIF(display_name, ''), ?),
          notes = COALESCE(NULLIF(notes, ''), ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanName, notes || null, existing.id);
    return "updated";
  }

  db.prepare(`
    INSERT INTO content_id_labels (name, display_name, notes)
    VALUES (?, ?, ?)
  `).run(cleanName, cleanName, notes || null);
  return "created";
}

async function listCmsAssetLabels(accountId) {
  const { accessToken, account } = await getFreshAccessTokenForAccount(accountId);
  const labels = [];
  let pageToken = null;
  let page = 0;

  do {
    const response = await axios.get(`${CONTENT_ID_API_BASE}/assetLabels`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        onBehalfOfContentOwner: account.cms_id,
        maxResults: 50,
        pageToken: pageToken || undefined
      },
      timeout: 30000
    });

    labels.push(...(response.data.items || response.data.assetLabels || []));
    pageToken = response.data.nextPageToken || null;
    page += 1;
  } while (pageToken && page < MAX_PAGES_PER_CMS);

  return { account, labels };
}

async function syncAssetLabelsFromCms() {
  const accounts = listAccounts();
  if (!accounts.length) {
    throw new Error("No connected CMS network found. Please authorize CMS in Settings > Network first.");
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const cmsResults = [];

  for (const account of accounts) {
    try {
      const result = await listCmsAssetLabels(account.id);
      let accountCreated = 0;
      let accountUpdated = 0;
      let accountSkipped = 0;

      result.labels.forEach((label) => {
        const name = normalizeLabelName(label);
        const status = upsertContentIdLabel(name, getLabelNotes(label, result.account.cms_name));
        if (status === "created") accountCreated += 1;
        if (status === "updated") accountUpdated += 1;
        if (status === "skipped") accountSkipped += 1;
      });

      created += accountCreated;
      updated += accountUpdated;
      skipped += accountSkipped;
      cmsResults.push({
        ok: true,
        cmsName: result.account.cms_name,
        labels: result.labels.length,
        created: accountCreated,
        updated: accountUpdated,
        skipped: accountSkipped
      });
    } catch (error) {
      cmsResults.push({
        ok: false,
        cmsName: account.cms_name,
        labels: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        message: error.response?.data?.error?.message || error.message
      });
    }
  }

  return {
    created,
    updated,
    skipped,
    total: created + updated,
    cmsResults
  };
}

module.exports = {
  syncAssetLabelsFromCms
};
