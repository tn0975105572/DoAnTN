const express = require("express");
const router = express.Router();
const chitietdonhangController = require("../controllers/chitietdonhang");

// Định nghĩa các route
router.get("/getAll", chitietdonhangController.getAll);
router.get("/getById/:id", chitietdonhangController.getById);
router.post("/create", chitietdonhangController.insert);
router.put("/update/:id", chitietdonhangController.update);
router.delete("/delete/:id", chitietdonhangController.delete);

module.exports = router;