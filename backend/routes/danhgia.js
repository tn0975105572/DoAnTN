const express = require("express");
const router = express.Router();
const danhgiaController = require("../controllers/danhgia");

// Định nghĩa các route
router.get("/getAll", danhgiaController.getAll);
router.get("/getById/:id", danhgiaController.getById);
router.post("/create", danhgiaController.insert);
router.put("/update/:id", danhgiaController.update);
router.delete("/delete/:id", danhgiaController.delete);

module.exports = router;