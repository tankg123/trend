const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

require("./config/database");

const authRoutes = require("./routes/authRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const translateRoutes = require("./routes/translateRoutes");
const youtubeTrendRoutes = require("./routes/youtubeTrendRoutes");
const apiKeyMiddleware = require("./middlewares/apiKeyMiddleware");

const app = express();

const PORT = process.env.PORT || 4015;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5185";

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5185", "http://192.168.1.179:5185"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ANS Network API is running"
  });
});

app.use("/api", apiKeyMiddleware);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    time: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/youtube-trend", youtubeTrendRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found"
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
