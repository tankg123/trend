const { releaseClaims, searchClaims } = require("../services/claimService");

async function searchVideoClaims(req, res) {
  try {
    const result = await searchClaims({
      accountIds: req.body.accountIds,
      videoInput: req.body.videoInput,
      user: req.user
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function releaseVideoClaims(req, res) {
  try {
    const result = await releaseClaims({ releases: req.body.releases, user: req.user });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  releaseVideoClaims,
  searchVideoClaims
};
