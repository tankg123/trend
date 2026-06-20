const express = require("express");
const router = express.Router();

const youtubeTrendController = require("../controllers/youtubeTrendController");
const { authMiddleware } = require("../middlewares/authMiddleware");

router.get("/keyword", authMiddleware, youtubeTrendController.getChannelsByKeyword);
router.post("/channels", authMiddleware, youtubeTrendController.getChannelsFromInputs);

module.exports = router;
