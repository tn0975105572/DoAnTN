const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin");
const authMiddleware = require("../middleware/baoVe");

router.get("/dashboard/:userId", authMiddleware.authenticateToken, adminController.getDashboard);

module.exports = router;
