const express = require("express");
const router = express.Router();
const danhmucController = require("../controllers/danhmuc");

// Định nghĩa các route
router.get("/getAll", danhmucController.getAll);
router.get("/getById/:id", danhmucController.getById);
router.post("/create", danhmucController.insert);
router.put("/update/:id", danhmucController.update);
router.delete("/delete/:id", danhmucController.delete);

module.exports = router;