const express = require("express");
const router = express.Router();
const groupChatController = require("../controllers/group_chat");
const authMiddleware = require("../middleware/baoVe");

// =====================================================
// ROUTES CHO GROUP CHAT
// =====================================================

// Lấy tất cả group chat
router.get("/getAll", authMiddleware.authenticateToken, groupChatController.getAll);

// Lấy group chat theo ID
router.get("/getById/:id", authMiddleware.authenticateToken, groupChatController.getById);

// Lấy danh sách group của user
router.get("/user/:userId", authMiddleware.authenticateToken, groupChatController.getByUserId);

// Lấy thống kê group
router.get("/stats/:id", authMiddleware.authenticateToken, groupChatController.getStats);

// Tạo group chat mới
router.post("/create", authMiddleware.authenticateToken, groupChatController.create);

// Cập nhật group chat
router.put("/update/:id", authMiddleware.authenticateToken, groupChatController.update);

// Xóa group chat
router.delete("/delete/:id", authMiddleware.authenticateToken, groupChatController.delete);

// =====================================================
// ROUTES CHO THÀNH VIÊN GROUP
// =====================================================

// Lấy thành viên trong group
router.get("/:id/members", authMiddleware.authenticateToken, groupChatController.getMembers);

// Thêm thành viên vào group
router.post("/:groupId/add-member/:userId", authMiddleware.authenticateToken, groupChatController.addMember);

// Xóa thành viên khỏi group
router.delete("/:groupId/remove-member/:userId", authMiddleware.authenticateToken, groupChatController.removeMember);

// Cập nhật vai trò thành viên
router.put("/:groupId/member/:userId/role", authMiddleware.authenticateToken, groupChatController.updateMemberRole);

// Chuyển quyền admin
router.post("/transfer-admin", authMiddleware.authenticateToken, groupChatController.transferAdmin);

module.exports = router;
