const express = require("express");
const router = express.Router();

const translateController = require("../controllers/translateController");
const { authMiddleware } = require("../middlewares/authMiddleware");

router.post("/text", authMiddleware, translateController.translateText);
router.post("/image", authMiddleware, translateController.translateImage);

module.exports = router;
