const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profile");

router.get("/:userId", profileController.getProfile);
router.post("/:userId/review", profileController.upsertReview);

module.exports = router;
