const express = require("express");
const router = express.Router();
const nguoidungtichdiemController = require("../controllers/nguoidungtichdiem");

// Định nghĩa các route
router.get("/getAll", nguoidungtichdiemController.getAll);
router.get("/getById/:id", nguoidungtichdiemController.getById);
router.get("/getByUserId/:userId", nguoidungtichdiemController.getByUserId);
router.get("/getByType/:loai", nguoidungtichdiemController.getByType);
router.get("/getStatsByUser/:userId", nguoidungtichdiemController.getStatsByUser);
router.post("/create", nguoidungtichdiemController.create);
router.put("/update/:id", nguoidungtichdiemController.update);
router.delete("/delete/:id", nguoidungtichdiemController.delete);

module.exports = router;







