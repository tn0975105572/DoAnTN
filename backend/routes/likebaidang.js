const express = require("express");
const router = express.Router();
const likebaidangController = require("../controllers/likebaidang");

// Định nghĩa các route
router.get("/getAll", likebaidangController.getAll);
router.get("/getById/:id", likebaidangController.getById);
router.post("/create", likebaidangController.insert);
router.put("/update/:id", likebaidangController.update);
router.delete("/delete/:id", likebaidangController.delete);

// Routes mới cho like bài đăng
router.get("/getLikesByPostId/:postId", likebaidangController.getLikesByPostId);
router.get("/getLikeCountByPostId/:postId", likebaidangController.getLikeCountByPostId);
router.get("/checkUserLiked/:postId/:userId", likebaidangController.checkUserLiked);

module.exports = router;