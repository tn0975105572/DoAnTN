const express = require("express");
const router = express.Router();
const thongbaoController = require("../controllers/thongbao");
const authMiddleware = require("../middleware/baoVe");

// Định nghĩa các route
router.get("/getAll", thongbaoController.getAll);
router.get("/getById/:id", authMiddleware.authenticateToken, thongbaoController.getById);

// Routes mới cho thông báo
router.get("/user/:userId", authMiddleware.authenticateToken, thongbaoController.getByUserId);
router.get("/unread/:userId", authMiddleware.authenticateToken, thongbaoController.countUnread);
router.put("/mark-read/:id", authMiddleware.authenticateToken, thongbaoController.markAsRead);
router.put("/mark-all-read/:userId", authMiddleware.authenticateToken, thongbaoController.markAllAsRead);

router.post("/create", authMiddleware.authenticateToken, thongbaoController.insert);
router.put("/update/:id", authMiddleware.authenticateToken, thongbaoController.update);
router.delete("/delete/:id", authMiddleware.authenticateToken, thongbaoController.delete);

module.exports = router;
