const express = require("express");
const router = express.Router();
const giohangController = require("../controllers/giohang");

// Định nghĩa các route
router.get("/getAll", giohangController.getAll);
router.get("/getById/:id", giohangController.getById);
router.post("/create", giohangController.insert);
router.put("/update/:id", giohangController.update);
router.delete("/delete/:id", giohangController.delete);

module.exports = router;