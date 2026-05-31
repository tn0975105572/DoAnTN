const express = require("express");
const router = express.Router();
const baidangBoostController = require("../controllers/baidang_boost");
const authMiddleware = require("../middleware/baoVe");

router.get("/packages", baidangBoostController.getPackages);
router.get(
  "/active",
  authMiddleware.optionalAuthenticateToken,
  baidangBoostController.getActiveBoosts
);
router.post(
  "/purchase",
  authMiddleware.authenticateToken,
  baidangBoostController.purchaseBoost
);

module.exports = router;
