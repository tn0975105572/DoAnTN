const express = require("express");
const router = express.Router();
const tichdiemController = require("../controllers/tichdiem");

// Lấy tất cả giao dịch tích điểm với phân trang
router.get("/getAll", tichdiemController.getAll);

// Lấy giao dịch theo ID người dùng
router.get("/getByUserId/:userId", tichdiemController.getByUserId);

// Thêm điểm cho người dùng
router.post("/addPoints", tichdiemController.addPoints);

// Lấy thống kê điểm số
router.get("/stats", tichdiemController.getStats);

// Lấy top người dùng
router.get("/topUsers", tichdiemController.getTopUsers);

module.exports = router;