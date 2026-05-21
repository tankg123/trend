const jwt = require("jsonwebtoken");
const db = require("../config/database");

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = db
      .prepare(`
        SELECT id, full_name, email, role, status, two_factor_enabled, created_at, updated_at
        FROM users
        WHERE id = ?
      `)
      .get(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản không tồn tại"
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa"
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn"
    });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập"
      });
    }

    const userRole = String(req.user.role || "").trim().toLowerCase();
    const allowedRoles = roles.map((role) => String(role || "").trim().toLowerCase());
    const superAdminRoles = ["supper admin", "super admin"];

    if (userRole === "admin" || superAdminRoles.includes(userRole)) {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện hành động này"
      });
    }

    next();
  };
}

module.exports = {
  authMiddleware,
  allowRoles
};
