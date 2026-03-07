const express = require("express");
const router = express.Router();
const donhangController = require("../controllers/donhang");

// Định nghĩa các route
router.get("/getAll", donhangController.getAll);
router.get("/getById/:id", donhangController.getById);
router.post("/create", donhangController.insert);
router.put("/update/:id", donhangController.update);
router.delete("/delete/:id", donhangController.delete);

module.exports = router;