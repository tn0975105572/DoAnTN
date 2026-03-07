const express = require("express");
const router = express.Router();
const loaibaidangController = require("../controllers/loaibaidang");

// Định nghĩa các route
router.get("/getAll", loaibaidangController.getAll);
router.get("/getById/:id", loaibaidangController.getById);
router.post("/create", loaibaidangController.insert);
router.put("/update/:id", loaibaidangController.update);
router.delete("/delete/:id", loaibaidangController.delete);

module.exports = router;