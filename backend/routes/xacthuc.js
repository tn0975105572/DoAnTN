const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const xacthucController = require("../controllers/xacthuc");

// Đảm bảo thư mục uploads tồn tại
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Cấu hình multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// 🆕 API xác thực
router.post(
  "/:idNguoiDung",
  upload.fields([{ name: "anh_khuon_mat" }, { name: "anh_cmnd" }]),
  xacthucController.create
);

// Lấy danh sách bản ghi theo user
router.get("/user/:idNguoiDung", xacthucController.getByUser);

// Admin cập nhật trạng thái
router.put("/status/:idXacThuc", express.json(), xacthucController.updateStatus);

module.exports = router;
