const express = require("express");
const router = express.Router();
const groupChatController = require("../controllers/group_chat");

// =====================================================
// ROUTES CHO GROUP CHAT
// =====================================================

// Lấy tất cả group chat
router.get("/getAll", groupChatController.getAll);

// Lấy group chat theo ID
router.get("/getById/:id", groupChatController.getById);

// Lấy danh sách group của user
router.get("/user/:userId", groupChatController.getByUserId);

// Lấy thống kê group
router.get("/stats/:id", groupChatController.getStats);

// Tạo group chat mới
router.post("/create", groupChatController.create);

// Cập nhật group chat
router.put("/update/:id", groupChatController.update);

// Xóa group chat
router.delete("/delete/:id", groupChatController.delete);

// =====================================================
// ROUTES CHO THÀNH VIÊN GROUP
// =====================================================

// Lấy thành viên trong group
router.get("/:id/members", groupChatController.getMembers);

// Thêm thành viên vào group
router.post("/:groupId/add-member/:userId", groupChatController.addMember);

// Xóa thành viên khỏi group
router.delete("/:groupId/remove-member/:userId", groupChatController.removeMember);

// Cập nhật vai trò thành viên
router.put("/:groupId/member/:userId/role", groupChatController.updateMemberRole);

// Chuyển quyền admin
router.post("/transfer-admin", groupChatController.transferAdmin);

module.exports = router;
