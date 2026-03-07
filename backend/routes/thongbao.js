const express = require("express");
const router = express.Router();
const thongbaoController = require("../controllers/thongbao");

// Định nghĩa các route
router.get("/getAll", thongbaoController.getAll);
router.get("/getById/:id", thongbaoController.getById);

// Routes mới cho thông báo
router.get("/user/:userId", thongbaoController.getByUserId);
router.get("/unread/:userId", thongbaoController.countUnread);
router.put("/mark-read/:id", thongbaoController.markAsRead);
router.put("/mark-all-read/:userId", thongbaoController.markAllAsRead);

router.post("/create", thongbaoController.insert);
router.put("/update/:id", thongbaoController.update);
router.delete("/delete/:id", thongbaoController.delete);

module.exports = router;