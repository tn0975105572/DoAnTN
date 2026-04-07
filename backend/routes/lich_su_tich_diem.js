const express = require("express");
const router = express.Router();
const lich_su_tich_diemController = require("../controllers/lich_su_tich_diem");
const authMiddleware = require("../middleware/baoVe");

// Định nghĩa các route
router.get("/getAll", authMiddleware.authenticateToken, lich_su_tich_diemController.getAll);
router.get("/getById/:id", authMiddleware.authenticateToken, lich_su_tich_diemController.getById);
router.get("/getByUserId/:userId", authMiddleware.authenticateToken, lich_su_tich_diemController.getByUserId);
router.get("/getByTransactionType/:loai", authMiddleware.authenticateToken, lich_su_tich_diemController.getByTransactionType);
router.get("/getByDateRange", authMiddleware.authenticateToken, lich_su_tich_diemController.getByDateRange);
router.get("/getUserStats/:userId", authMiddleware.authenticateToken, lich_su_tich_diemController.getUserStats);
router.get("/getCurrentPoints/:userId", authMiddleware.authenticateToken, lich_su_tich_diemController.getCurrentPoints);
router.get("/getOverallStats", authMiddleware.authenticateToken, lich_su_tich_diemController.getOverallStats);
router.post("/create", authMiddleware.authenticateToken, lich_su_tich_diemController.create);
router.post("/addPoints", authMiddleware.authenticateToken, lich_su_tich_diemController.addPoints);
router.put("/update/:id", authMiddleware.authenticateToken, lich_su_tich_diemController.update);
router.delete("/delete/:id", authMiddleware.authenticateToken, lich_su_tich_diemController.delete);

module.exports = router;







