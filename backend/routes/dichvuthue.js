const express = require("express");
const router = express.Router();
const dichvuthueController = require("../controllers/dichvuthue");

// Định nghĩa các route
router.get("/getAll", dichvuthueController.getAll);
router.get("/getById/:id", dichvuthueController.getById);
router.post("/create", dichvuthueController.insert);
router.put("/update/:id", dichvuthueController.update);
router.delete("/delete/:id", dichvuthueController.delete);

module.exports = router;