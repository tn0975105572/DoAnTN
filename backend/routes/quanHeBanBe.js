const express = require("express");
const router = express.Router();
const quanHeBanBeController = require("../controllers/quanHeBanBe");

router.post("/request", quanHeBanBeController.guiYeuCau);
router.put("/accept", quanHeBanBeController.chapNhanYeuCau);
router.delete("/unfriend", quanHeBanBeController.huyBanBe); 
router.delete("/cancel", quanHeBanBeController.huyLoiMoiDaGui);

router.get("/list/:id", quanHeBanBeController.layDanhSachBanBe);
router.get("/suggestions/:id", quanHeBanBeController.goiYBanBe);
router.get("/requests/:id", quanHeBanBeController.layLoiMoiDangCho);
router.get("/sent-requests/:id", quanHeBanBeController.layLoiMoiDaGui);

router.get("/stats/total/:id", quanHeBanBeController.demTongSoBan);
router.get("/stats/mutual/:userId1/:userId2", quanHeBanBeController.demBanChung);
router.get("/friends-count/:userId1/:userId2", quanHeBanBeController.demBanChung);

module.exports = router;
