const express = require("express");
const router = express.Router();
const binhluanbaidangController = require("../controllers/binhluanbaidang");

router.get("/getAll", binhluanbaidangController.getAll);

router.get("/getById/:id", binhluanbaidangController.getById);
router.get("/getbyID_BaiDang/:id", binhluanbaidangController.getbyID_BaiDang);

router.get("/getCommentTreeByPost/:id", binhluanbaidangController.getCommentTreeByPost);

router.post("/create", binhluanbaidangController.insert);

router.put("/update/:id", binhluanbaidangController.update);

router.delete("/delete/:id", binhluanbaidangController.delete);

module.exports = router;