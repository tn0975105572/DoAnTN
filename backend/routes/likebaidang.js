const express = require("express");
const router = express.Router();
const likebaidangController = require("../controllers/likebaidang");
const authMiddleware = require("../middleware/baoVe");

// Định nghĩa các route
router.get("/getAll", likebaidangController.getAll);
router.get("/getById/:id", likebaidangController.getById);
router.post("/create", authMiddleware.authenticateToken, likebaidangController.insert);
router.put("/update/:id", authMiddleware.authenticateToken, likebaidangController.update);
router.delete("/delete/:id", authMiddleware.authenticateToken, likebaidangController.delete);

// Routes mới cho like bài đăng
router.get("/getLikesByPostId/:postId", likebaidangController.getLikesByPostId);
router.get("/getLikeCountByPostId/:postId", likebaidangController.getLikeCountByPostId);
router.get("/checkUserLiked/:postId/:userId", authMiddleware.authenticateToken, likebaidangController.checkUserLiked);

module.exports = router;
