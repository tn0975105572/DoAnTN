const express = require("express");
const router = express.Router();
const binhluanbaidangController = require("../controllers/binhluanbaidang");
const authMiddleware = require("../middleware/baoVe");

router.get("/getAll", binhluanbaidangController.getAll);

router.get("/getById/:id", binhluanbaidangController.getById);
router.get("/getbyID_BaiDang/:id", binhluanbaidangController.getbyID_BaiDang);

router.get("/getCommentTreeByPost/:id", binhluanbaidangController.getCommentTreeByPost);
router.get("/getCommentCountByPost/:id", binhluanbaidangController.getCommentCountByPost);

router.post("/create", authMiddleware.authenticateToken, binhluanbaidangController.insert);

router.put("/update/:id", authMiddleware.authenticateToken, binhluanbaidangController.update);

router.delete("/delete/:id", authMiddleware.authenticateToken, binhluanbaidangController.delete);

module.exports = router;
