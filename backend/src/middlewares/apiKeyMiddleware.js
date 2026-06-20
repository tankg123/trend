function apiKeyMiddleware(req, res, next) {
  const expectedKey = process.env.BACKEND_API_KEY;

  if (!expectedKey) {
    return res.status(500).json({
      success: false,
      message: "Backend API key is not configured"
    });
  }

  const providedKey = req.get("x-api-key");

  if (!providedKey || providedKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      message: "Invalid or missing API key"
    });
  }

  next();
}

module.exports = apiKeyMiddleware;
