const express = require("express");
const {
  addCodes,
  createArtist,
  createLabel,
  deleteCode,
  deleteArtist,
  deleteLabel,
  deleteProduct,
  getAvailableCodes,
  getCodeSummary,
  getProduct,
  listArtists,
  listCodes,
  listLabels,
  listProducts,
  saveProduct,
  updateArtist,
  updateLabel,
  updateCode
} = require("../controllers/contentIdController");
const { authMiddleware, allowRoles } = require("../middlewares/authMiddleware");

const router = express.Router();
const CONTENT_ID_ROLES = ["admin", "Report Manager", "Channel Management"];

router.use(authMiddleware);

router.get("/codes/summary", allowRoles(...CONTENT_ID_ROLES), getCodeSummary);
router.get("/codes/available", allowRoles(...CONTENT_ID_ROLES), getAvailableCodes);
router.get("/codes", allowRoles(...CONTENT_ID_ROLES), listCodes);
router.post("/codes", allowRoles("admin"), addCodes);
router.put("/codes/:id", allowRoles("admin"), updateCode);
router.delete("/codes/:id", allowRoles("admin"), deleteCode);

router.get("/labels", allowRoles(...CONTENT_ID_ROLES), listLabels);
router.post("/labels", allowRoles("admin"), createLabel);
router.put("/labels/:id", allowRoles("admin"), updateLabel);
router.delete("/labels/:id", allowRoles("admin"), deleteLabel);

router.get("/artists", allowRoles(...CONTENT_ID_ROLES), listArtists);
router.post("/artists", allowRoles("admin"), createArtist);
router.put("/artists/:id", allowRoles("admin"), updateArtist);
router.delete("/artists/:id", allowRoles("admin"), deleteArtist);

router.get("/products", allowRoles(...CONTENT_ID_ROLES), listProducts);
router.post("/products", allowRoles(...CONTENT_ID_ROLES), saveProduct);
router.get("/products/:id", allowRoles(...CONTENT_ID_ROLES), getProduct);
router.delete("/products/:id", allowRoles("admin"), deleteProduct);

module.exports = router;
