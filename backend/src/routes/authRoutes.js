const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const {
  authMiddleware,
  allowRoles
} = require("../middlewares/authMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerification);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

router.get("/me", authMiddleware, authController.me);
router.put("/profile", authMiddleware, authController.updateProfile);
router.put("/change-password", authMiddleware, authController.changePassword);
router.get("/2fa/status", authMiddleware, authController.twoFactorStatus);
router.post("/2fa/setup", authMiddleware, authController.setupTwoFactor);
router.post("/2fa/enable", authMiddleware, authController.enableTwoFactor);
router.post("/2fa/disable", authMiddleware, authController.disableTwoFactor);

router.get(
  "/users",
  authMiddleware,
  allowRoles("admin", "Account", "Account Claim Manager"),
  authController.getAllUsers
);

router.put(
  "/users/:id/role",
  authMiddleware,
  allowRoles("admin", "Account", "Account Claim Manager"),
  authController.updateUserRole
);

router.put(
  "/users/:id/status",
  authMiddleware,
  allowRoles("admin", "Account"),
  authController.updateUserStatus
);

router.put(
  "/users/:id/reset-password",
  authMiddleware,
  allowRoles("admin", "Account"),
  authController.resetUserPassword
);

router.put(
  "/users/:id/groups",
  authMiddleware,
  allowRoles("admin", "Account"),
  authController.updateUserGroups
);

router.put(
  "/users/:id/content-id-labels",
  authMiddleware,
  allowRoles("admin", "Account", "Account Claim Manager"),
  authController.updateUserContentIdLabels
);

router.delete(
  "/users/:id",
  authMiddleware,
  allowRoles("admin", "Account"),
  authController.deleteUser
);

module.exports = router;
