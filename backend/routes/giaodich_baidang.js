const express = require("express");
const router = express.Router();
const giaodichBaiDangController = require("../controllers/giaodich_baidang");
const authMiddleware = require("../middleware/baoVe");

router.get("/lookup", authMiddleware.authenticateToken, giaodichBaiDangController.lookup);
router.get("/getById/:id", authMiddleware.authenticateToken, giaodichBaiDangController.getById);
router.get("/post/:postId", authMiddleware.authenticateToken, giaodichBaiDangController.getByPostId);
router.get("/user/:userId", authMiddleware.authenticateToken, giaodichBaiDangController.getByUserId);

router.post("/request", authMiddleware.authenticateToken, giaodichBaiDangController.createRequest);
router.post("/:id/accept", authMiddleware.authenticateToken, giaodichBaiDangController.accept);
router.post("/:id/reject", authMiddleware.authenticateToken, giaodichBaiDangController.reject);
router.post("/:id/cancel", authMiddleware.authenticateToken, giaodichBaiDangController.cancel);
router.post("/:id/meeting", authMiddleware.authenticateToken, giaodichBaiDangController.setMeeting);
router.post("/:id/request-complete", authMiddleware.authenticateToken, giaodichBaiDangController.requestComplete);
router.post("/:id/complete", authMiddleware.authenticateToken, giaodichBaiDangController.complete);

module.exports = router;
