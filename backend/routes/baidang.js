const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const baidangController = require("../controllers/baidang");

// Cấu hình multer cho upload nhiều ảnh
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload file ảnh (JPEG, JPG, PNG, GIF)'));
    }
  }
});

// Routes mới với thông tin liên quan
router.get("/getAllWithDetails", baidangController.getAllWithDetails);
router.get("/getByIdWithDetails/:id", baidangController.getByIdWithDetails);
router.get("/getByCategory/:categoryId", baidangController.getByCategory);
router.get("/getByType/:typeId", baidangController.getByType);
router.get("/search", baidangController.search);
router.get("/getByUserId/:userId", baidangController.getByUserId);

// Routes cũ (giữ nguyên)
router.get("/getAll", baidangController.getAll);
router.get("/getById/:id", baidangController.getById);
router.post("/create", baidangController.insert);
router.put("/update/:id", baidangController.update);
router.delete("/delete/:id", baidangController.delete);

// Route mới: Xóa tất cả bài đăng và ảnh của người dùng
router.delete("/deleteAllByUserId/:userId", baidangController.deleteAllByUserId);



module.exports = router;