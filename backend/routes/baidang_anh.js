const express = require("express");
const router = express.Router();
const baidang_anhController = require("../controllers/baidang_anh");

// Định nghĩa các route
router.get("/getAll", baidang_anhController.getAll);
router.get("/getById/:id", baidang_anhController.getById);
router.post("/create", baidang_anhController.insert);
router.put("/update/:id", baidang_anhController.update);
router.delete("/delete/:id", baidang_anhController.delete);

module.exports = router;