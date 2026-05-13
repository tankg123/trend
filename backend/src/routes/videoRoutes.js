const express = require("express");
const router = express.Router();

const videoController = require("../controllers/videoController");
const {
  authMiddleware,
  allowRoles
} = require("../middlewares/authMiddleware");

router.get(
  "/",
  authMiddleware,
  allowRoles("admin"),
  videoController.getAllVideos
);

router.post(
  "/sync",
  authMiddleware,
  allowRoles("admin"),
  videoController.syncVideos
);

module.exports = router;
