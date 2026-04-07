const express = require("express");
const router = express.Router();
const nguoidungtichdiemController = require("../controllers/nguoidungtichdiem");
const authMiddleware = require("../middleware/baoVe");

// Định nghĩa các route
router.get("/getAll", authMiddleware.authenticateToken, nguoidungtichdiemController.getAll);
router.get("/getById/:id", authMiddleware.authenticateToken, nguoidungtichdiemController.getById);
router.get("/getByUserId/:userId", authMiddleware.authenticateToken, nguoidungtichdiemController.getByUserId);
router.get("/getByType/:loai", authMiddleware.authenticateToken, nguoidungtichdiemController.getByType);
router.get("/getStatsByUser/:userId", authMiddleware.authenticateToken, nguoidungtichdiemController.getStatsByUser);
router.post("/create", authMiddleware.authenticateToken, nguoidungtichdiemController.create);
router.put("/update/:id", authMiddleware.authenticateToken, nguoidungtichdiemController.update);
router.delete("/delete/:id", authMiddleware.authenticateToken, nguoidungtichdiemController.delete);

module.exports = router;







