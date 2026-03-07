const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const nguoidungController = require("../controllers/nguoidung");
const authMiddleware = require("../middleware/baoVe");
// 🆗 LOGIN
router.post("/login", nguoidungController.login);

// 🆗 CRUD OPERATIONS
router.get("/getAll", nguoidungController.getAll);        // Admin only
router.get("/get/:id", nguoidungController.getById);      // Get user by ID
router.post("/create", nguoidungController.insert);       // Create new user
router.put("/update/:id", /* authMiddleware.authenticateToken, */ nguoidungController.update);    // Update user

router.delete("/delete/:id", nguoidungController.delete);

router.post("/verify-password/:id", nguoidungController.verifyPassword);
router.get("/search", nguoidungController.timKiem);

// ==================== VIP ====================
router.get("/vip/all", nguoidungController.getAllVIP);           // Danh sách VIP còn hạn
router.get("/vip/check/:id", nguoidungController.checkVIP);     // Kiểm tra VIP của user
router.post("/vip/set/:id", nguoidungController.setVIP);        // Kích hoạt VIP
router.delete("/vip/remove/:id", nguoidungController.removeVIP); // Hủy VIP

module.exports = router;