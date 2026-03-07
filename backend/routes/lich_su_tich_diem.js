const express = require("express");
const router = express.Router();
const lich_su_tich_diemController = require("../controllers/lich_su_tich_diem");

// Định nghĩa các route
router.get("/getAll", lich_su_tich_diemController.getAll);
router.get("/getById/:id", lich_su_tich_diemController.getById);
router.get("/getByUserId/:userId", lich_su_tich_diemController.getByUserId);
router.get("/getByTransactionType/:loai", lich_su_tich_diemController.getByTransactionType);
router.get("/getByDateRange", lich_su_tich_diemController.getByDateRange);
router.get("/getUserStats/:userId", lich_su_tich_diemController.getUserStats);
router.get("/getCurrentPoints/:userId", lich_su_tich_diemController.getCurrentPoints);
router.get("/getOverallStats", lich_su_tich_diemController.getOverallStats);
router.post("/create", lich_su_tich_diemController.create);
router.post("/addPoints", lich_su_tich_diemController.addPoints);
router.put("/update/:id", lich_su_tich_diemController.update);
router.delete("/delete/:id", lich_su_tich_diemController.delete);

module.exports = router;







