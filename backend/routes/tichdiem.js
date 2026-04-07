const express = require("express");
const router = express.Router();
const tichdiemController = require("../controllers/tichdiem");
const authMiddleware = require("../middleware/baoVe");

// Lấy tất cả giao dịch tích điểm với phân trang
router.get("/getAll", authMiddleware.authenticateToken, tichdiemController.getAll);

// Lấy giao dịch theo ID người dùng
router.get("/getByUserId/:userId", authMiddleware.authenticateToken, tichdiemController.getByUserId);

// Thêm điểm cho người dùng
router.post("/addPoints", authMiddleware.authenticateToken, tichdiemController.addPoints);

// Lấy thống kê điểm số
router.get("/stats", authMiddleware.authenticateToken, tichdiemController.getStats);

// Lấy top người dùng
router.get("/topUsers", authMiddleware.authenticateToken, tichdiemController.getTopUsers);

module.exports = router;
