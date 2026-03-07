const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const tinnhanController = require("../controllers/tinnhan");

// Cấu hình upload cho tin nhắn
const uploadDir = path.join(__dirname, "../uploads/messages");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `msg-${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

// =====================================================
// ROUTES CHO TIN NHẮN
// =====================================================

// Lấy tất cả tin nhắn
router.get("/getAll", tinnhanController.getAll);

// Lấy tin nhắn theo ID
router.get("/getById/:id", tinnhanController.getById);

// Lấy tin nhắn giữa 2 người (chat 1-1)
router.get("/private/:user1Id/:user2Id", tinnhanController.getPrivateMessages);

// Lấy tin nhắn trong group
router.get("/group/:groupId/:userId", tinnhanController.getGroupMessages);

// Lấy danh sách cuộc trò chuyện của user
router.get("/conversations/:userId", tinnhanController.getConversations);

// Đếm tin nhắn chưa đọc
router.get("/unread/:userId", tinnhanController.countUnread);

// Gửi tin nhắn mới
router.post("/send", tinnhanController.sendMessage);

// Cập nhật tin nhắn (edit)
router.put("/update/:id", tinnhanController.updateMessage);

// Xóa tin nhắn (soft delete cho người gửi)
router.delete("/delete/:id", tinnhanController.deleteMessage);

// Đánh dấu tin nhắn đã đọc (chat 1-1)
router.post("/mark-read", tinnhanController.markAsRead);

// Đánh dấu tin nhắn group đã đọc
router.post("/mark-group-read", tinnhanController.markGroupAsRead);

// Upload file cho tin nhắn (chỉ trả về tên file)
router.post("/upload", upload.single("file"), tinnhanController.uploadFile);

// Upload file và gửi tin nhắn cùng lúc
router.post("/upload-and-send", upload.single("file"), tinnhanController.uploadAndSendMessage);

// Xóa cuộc trò chuyện (xóa tất cả tin nhắn giữa 2 người)
router.delete("/delete-conversation/:userId/:otherUserId", tinnhanController.deleteConversation);

module.exports = router;