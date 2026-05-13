const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

exports.register = (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự"
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const existed = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(cleanEmail);

    if (existed) {
      return res.status(409).json({
        success: false,
        message: "Email này đã được đăng ký"
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db.prepare(`
      INSERT INTO users (full_name, email, password, role, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      String(full_name).trim(),
      cleanEmail,
      hashedPassword,
      "user",
      "active"
    );

    const user = db
      .prepare(`
        SELECT id, full_name, email, role, status, created_at, updated_at
        FROM users
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    const token = createToken(user);

    res.json({
      success: true,
      message: "Đăng ký thành công",
      token,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi đăng ký tài khoản",
      error: error.message
    });
  }
};

exports.login = (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu"
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(cleanEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng"
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa"
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng"
      });
    }

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    const token = createToken(safeUser);

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      token,
      user: safeUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi đăng nhập",
      error: error.message
    });
  }
};

exports.me = (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};

exports.getAllUsers = (req, res) => {
  try {
    const users = db
      .prepare(`
        SELECT id, full_name, email, role, status, created_at, updated_at
        FROM users
        ORDER BY id DESC
      `)
      .all();

    res.json({
      success: true,
      total: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách user",
      error: error.message
    });
  }
};

exports.updateUserRole = (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ["admin", "Report Manager", "Channel Management", "user"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role không hợp lệ"
      });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user"
      });
    }

    db.prepare(`
      UPDATE users
      SET role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(role, id);

    res.json({
      success: true,
      message: "Đã cập nhật quyền user"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi cập nhật quyền user",
      error: error.message
    });
  }
};

exports.updateUserStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = ["active", "blocked"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status không hợp lệ"
      });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user"
      });
    }

    if (Number(req.user.id) === Number(id) && status === "blocked") {
      return res.status(400).json({
        success: false,
        message: "Bạn không thể tự khóa tài khoản của mình"
      });
    }

    db.prepare(`
      UPDATE users
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id);

    res.json({
      success: true,
      message: "Đã cập nhật trạng thái user"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi cập nhật trạng thái user",
      error: error.message
    });
  }
};

exports.deleteUser = (req, res) => {
  try {
    const { id } = req.params;

    if (Number(req.user.id) === Number(id)) {
      return res.status(400).json({
        success: false,
        message: "Bạn không thể tự xóa tài khoản của mình"
      });
    }

    const result = db
      .prepare("DELETE FROM users WHERE id = ?")
      .run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user"
      });
    }

    res.json({
      success: true,
      message: "Đã xóa user"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi xóa user",
      error: error.message
    });
  }
};
