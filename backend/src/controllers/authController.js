const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
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

function isStrongPassword(password = "") {
  return /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password)
    && String(password).length >= 8;
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateBase32Secret(length = 20) {
  const bytes = crypto.randomBytes(length);
  let bits = "";
  let output = "";

  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }

  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return output;
}

function base32ToBuffer(secret = "") {
  const clean = String(secret).replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = "";

  for (const char of clean) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) continue;
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

function generateTotp(secret, timeStep = Math.floor(Date.now() / 30000)) {
  const key = base32ToBuffer(secret);
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(timeStep / 0x100000000), 0);
  counter.writeUInt32BE(timeStep >>> 0, 4);

  const hmac = crypto.createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff)
  ) % 1000000;

  return String(code).padStart(6, "0");
}

function verifyTotp(secret, token) {
  const cleanToken = String(token || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const currentStep = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some((offset) => generateTotp(secret, currentStep + offset) === cleanToken);
}

function getSafeUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    status: user.status,
    two_factor_enabled: Number(user.two_factor_enabled || 0),
    created_at: user.created_at,
    updated_at: user.updated_at
  };
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
        SELECT id, full_name, email, role, status, two_factor_enabled, created_at, updated_at
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
    const { email, password, otp } = req.body;

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

    if (Number(user.two_factor_enabled || 0) === 1) {
      if (!otp) {
        return res.json({
          success: true,
          requires_2fa: true,
          message: "Two-factor authentication code is required"
        });
      }

      if (!verifyTotp(user.two_factor_secret, otp)) {
        return res.status(401).json({
          success: false,
          requires_2fa: true,
          message: "Invalid two-factor authentication code"
        });
      }
    }

    const safeUser = getSafeUser(user);

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

exports.updateProfile = (req, res) => {
  try {
    const data = req.body || {};
    const fullName = String(data.full_name || "").trim();
    const email = String(data.email || "").trim().toLowerCase();

    if (!fullName || !email) {
      return res.status(400).json({ success: false, message: "Full name and email are required" });
    }

    const current = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!current) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const duplicated = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, req.user.id);
    if (duplicated) {
      return res.status(409).json({ success: false, message: "Email is already used by another account" });
    }

    db.prepare(`
      UPDATE users
      SET full_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(fullName, email, req.user.id);

    const user = db.prepare(`
      SELECT id, full_name, email, role, status, two_factor_enabled, created_at, updated_at
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    const token = createToken(user);

    res.json({
      success: true,
      message: "Profile updated",
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not update profile", error: error.message });
  }
};

exports.twoFactorStatus = (req, res) => {
  const user = db.prepare("SELECT two_factor_enabled FROM users WHERE id = ?").get(req.user.id);
  res.json({
    success: true,
    enabled: Number(user?.two_factor_enabled || 0) === 1
  });
};

exports.setupTwoFactor = (req, res) => {
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const secret = generateBase32Secret();
    db.prepare(`
      UPDATE users
      SET two_factor_secret = ?, two_factor_enabled = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(secret, req.user.id);

    const issuer = encodeURIComponent("ANS Network");
    const label = encodeURIComponent(`ANS Network:${user.email}`);
    const otpauth_url = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    const qr_url = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(otpauth_url)}`;

    res.json({
      success: true,
      secret,
      otpauth_url,
      qr_url
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not setup 2FA", error: error.message });
  }
};

exports.enableTwoFactor = (req, res) => {
  try {
    const code = String(req.body?.code || "");
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!user.two_factor_secret) return res.status(400).json({ success: false, message: "Please setup 2FA first" });

    if (!verifyTotp(user.two_factor_secret, code)) {
      return res.status(400).json({ success: false, message: "Invalid authenticator code" });
    }

    db.prepare(`
      UPDATE users
      SET two_factor_enabled = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id);

    const updatedUser = db.prepare(`
      SELECT id, full_name, email, role, status, two_factor_enabled, created_at, updated_at
      FROM users
      WHERE id = ?
    `).get(req.user.id);
    const token = createToken(updatedUser);

    res.json({ success: true, message: "2FA enabled", token, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not enable 2FA", error: error.message });
  }
};

exports.disableTwoFactor = (req, res) => {
  try {
    const password = String(req.body?.password || "");
    const code = String(req.body?.code || "");
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ success: false, message: "Password is not correct" });
    }

    if (Number(user.two_factor_enabled || 0) === 1 && !verifyTotp(user.two_factor_secret, code)) {
      return res.status(400).json({ success: false, message: "Invalid authenticator code" });
    }

    db.prepare(`
      UPDATE users
      SET two_factor_enabled = 0, two_factor_secret = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id);

    const updatedUser = db.prepare(`
      SELECT id, full_name, email, role, status, two_factor_enabled, created_at, updated_at
      FROM users
      WHERE id = ?
    `).get(req.user.id);
    const token = createToken(updatedUser);

    res.json({ success: true, message: "2FA disabled", token, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not disable 2FA", error: error.message });
  }
};

exports.changePassword = (req, res) => {
  try {
    const currentPassword = String(req.body?.current_password || "");
    const newPassword = String(req.body?.new_password || "");
    const confirmPassword = String(req.body?.confirm_password || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "Current password, new password, and confirmation are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "New password confirmation does not match" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
      });
    }

    const current = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!current) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!bcrypt.compareSync(currentPassword, current.password)) {
      return res.status(400).json({ success: false, message: "Current password is not correct" });
    }

    db.prepare("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(bcrypt.hashSync(newPassword, 10), req.user.id);

    res.json({ success: true, message: "Password changed" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not change password", error: error.message });
  }
};

exports.getAllUsers = (req, res) => {
  try {
    const users = db.prepare(`
      SELECT
        u.id, u.full_name, u.email, u.role, u.status, u.two_factor_enabled, u.created_at, u.updated_at,
        COALESCE(
          json_group_array(
            CASE
              WHEN g.id IS NULL THEN NULL
              ELSE json_object('id', g.id, 'group_name', g.group_name, 'partner_name', p.partner_name)
            END
          ),
          '[]'
        ) AS assigned_groups
      FROM users u
      LEFT JOIN user_group_permissions ugp ON ugp.user_id = u.id
      LEFT JOIN channel_groups g ON g.id = ugp.group_id
      LEFT JOIN partners p ON p.id = g.partner_id
      GROUP BY u.id
      ORDER BY u.id DESC
    `).all().map((item) => ({
      ...item,
      assigned_groups: parseJsonArray(item.assigned_groups).filter(Boolean)
    }));

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

    const allowedRoles = ["admin", "Report Manager", "Channel Management", "Partner", "user"];

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

    if (role !== "Partner") {
      db.prepare("DELETE FROM user_group_permissions WHERE user_id = ?").run(id);
    }

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

exports.updateUserGroups = (req, res) => {
  try {
    const { id } = req.params;
    const groupIds = Array.isArray(req.body?.group_ids)
      ? req.body.group_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : [];

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (String(user.role || "").trim().toLowerCase() !== "partner") {
      return res.status(400).json({ success: false, message: "Only Partner role can be assigned groups" });
    }

    const uniqueGroupIds = [...new Set(groupIds)];
    const validGroups = uniqueGroupIds.length
      ? db.prepare(`SELECT id FROM channel_groups WHERE id IN (${uniqueGroupIds.map(() => "?").join(",")})`).all(...uniqueGroupIds).map((row) => row.id)
      : [];

    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM user_group_permissions WHERE user_id = ?").run(id);
      const stmt = db.prepare("INSERT OR IGNORE INTO user_group_permissions (user_id, group_id) VALUES (?, ?)");
      validGroups.forEach((groupId) => stmt.run(id, groupId));
    });

    transaction();

    res.json({
      success: true,
      message: "Partner groups updated",
      data: { group_ids: validGroups }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not update partner groups", error: error.message });
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

    db.prepare("DELETE FROM user_group_permissions WHERE user_id = ?").run(id);

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
