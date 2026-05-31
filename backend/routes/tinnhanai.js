const express = require("express");
const router = express.Router();
const tinnhanaiController = require("../controllers/tinnhanai");
const authMiddleware = require("../middleware/baoVe");

// Định nghĩa các route
router.post("/chat", authMiddleware.authenticateToken, tinnhanaiController.chat);
router.get("/search", authMiddleware.authenticateToken, tinnhanaiController.search);
router.get("/getAll", tinnhanaiController.getAll);
router.get("/getById/:id", tinnhanaiController.getById);
router.post("/create", tinnhanaiController.insert);
router.put("/update/:id", tinnhanaiController.update);
router.delete("/delete/:id", tinnhanaiController.delete);

module.exports = router;
