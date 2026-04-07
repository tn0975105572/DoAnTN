const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profile");
const authMiddleware = require("../middleware/baoVe");

router.get("/:userId", authMiddleware.optionalAuthenticateToken, profileController.getProfile);
router.post("/:userId/review", authMiddleware.authenticateToken, profileController.upsertReview);

module.exports = router;
