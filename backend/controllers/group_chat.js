const groupChat = require('../models/group_chat');
const thanhVienGroup = require('../models/thanh_vien_group');

// Lấy tất cả group chat
exports.getAll = async (req, res) => {
    try {
        const data = await groupChat.getAll();
        res.json({
            success: true,
            data: data,
            message: 'Lấy danh sách group chat thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Lấy group chat theo ID
exports.getById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await groupChat.getById(id);
        if (!data) {
            return res.status(404).json({ 
                success: false,
                message: 'Group chat không tồn tại' 
            });
        }
        res.json({
            success: true,
            data: data,
            message: 'Lấy group chat thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Lấy danh sách group của user
exports.getByUserId = async (req, res) => {
    try {
        const userId = req.params.userId;
        const data = await groupChat.getByUserId(userId);
        
        res.json({
            success: true,
            data: data,
            message: 'Lấy danh sách group của user thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Tạo group chat mới
exports.create = async (req, res) => {
    try {
        const groupData = {
            ten_group: req.body.ten_group,
            mo_ta: req.body.mo_ta || null,
            anh_dai_dien: req.body.anh_dai_dien || null,
            ID_NguoiTao: req.body.ID_NguoiTao
        };
        
        // Validation
        if (!groupData.ten_group || !groupData.ID_NguoiTao) {
            return res.status(400).json({ 
                success: false,
                message: 'Thiếu thông tin bắt buộc' 
            });
        }
        
        const groupId = await groupChat.create(groupData);
        
        // Thêm người tạo làm admin
        await thanhVienGroup.insert({
            ID_GroupChat: groupId,
            ID_NguoiDung: groupData.ID_NguoiTao,
            vai_tro: 'admin'
        });
        
        res.status(201).json({ 
            success: true,
            data: { groupId },
            message: 'Tạo group chat thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Cập nhật group chat
exports.update = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.body.userId;
        const updateData = {
            ten_group: req.body.ten_group,
            mo_ta: req.body.mo_ta,
            anh_dai_dien: req.body.anh_dai_dien
        };
        
        // Kiểm tra quyền admin
        const isAdmin = await groupChat.isAdmin(id, userId);
        if (!isAdmin) {
            return res.status(403).json({ 
                success: false,
                message: 'Bạn không có quyền chỉnh sửa group này' 
            });
        }
        
        const affectedRows = await groupChat.update(id, updateData);
        if (affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Group chat không tồn tại' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Cập nhật group chat thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Xóa group chat
exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.body.userId;
        
        // Kiểm tra quyền admin
        const isAdmin = await groupChat.isAdmin(id, userId);
        if (!isAdmin) {
            return res.status(403).json({ 
                success: false,
                message: 'Bạn không có quyền xóa group này' 
            });
        }
        
        const affectedRows = await groupChat.delete(id);
        if (affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Group chat không tồn tại' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Xóa group chat thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Lấy thành viên trong group
exports.getMembers = async (req, res) => {
    try {
        const groupId = req.params.id;
        const data = await groupChat.getMembers(groupId);
        
        res.json({
            success: true,
            data: data,
            message: 'Lấy danh sách thành viên thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Thêm thành viên vào group
exports.addMember = async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const { addedBy } = req.body;
        
        // Kiểm tra quyền thêm thành viên (chỉ admin)
        const isAdmin = await groupChat.isAdmin(groupId, addedBy);
        if (!isAdmin) {
            return res.status(403).json({ 
                success: false,
                message: 'Bạn không có quyền thêm thành viên' 
            });
        }
        
        // Kiểm tra user đã trong group chưa
        const isMember = await groupChat.isMember(groupId, userId);
        if (isMember) {
            return res.status(400).json({ 
                success: false,
                message: 'Người dùng đã là thành viên của group' 
            });
        }
        
        const affectedRows = await groupChat.addMember(groupId, userId, 'member');
        
        res.json({ 
            success: true,
            data: { affectedRows },
            message: 'Thêm thành viên thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Xóa thành viên khỏi group
exports.removeMember = async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const { removedBy } = req.body;
        
        // Kiểm tra quyền xóa thành viên (admin hoặc tự xóa)
        const isAdmin = await groupChat.isAdmin(groupId, removedBy);
        const isSelf = removedBy === userId;
        
        if (!isAdmin && !isSelf) {
            return res.status(403).json({ 
                success: false,
                message: 'Bạn không có quyền xóa thành viên này' 
            });
        }
        
        // Không cho phép admin tự xóa mình nếu chỉ có 1 admin
        if (isSelf && isAdmin) {
            const admins = await thanhVienGroup.getAdmins(groupId);
            if (admins.length <= 1) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Không thể rời group vì bạn là admin duy nhất' 
                });
            }
        }
        
        const affectedRows = await groupChat.removeMember(groupId, userId);
        
        res.json({ 
            success: true,
            data: { affectedRows },
            message: 'Xóa thành viên thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Cập nhật vai trò thành viên
exports.updateMemberRole = async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const { newRole, updatedBy } = req.body;
        
        // Kiểm tra quyền admin
        const isAdmin = await groupChat.isAdmin(groupId, updatedBy);
        if (!isAdmin) {
            return res.status(403).json({ 
                success: false,
                message: 'Bạn không có quyền cập nhật vai trò' 
            });
        }
        
        // Không cho phép thay đổi vai trò của chính mình
        if (updatedBy === userId) {
            return res.status(400).json({ 
                success: false,
                message: 'Không thể thay đổi vai trò của chính mình' 
            });
        }
        
        const affectedRows = await groupChat.updateMemberRole(groupId, userId, newRole);
        
        res.json({ 
            success: true,
            data: { affectedRows },
            message: 'Cập nhật vai trò thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Chuyển quyền admin
exports.transferAdmin = async (req, res) => {
    try {
        const { groupId, newAdminId } = req.body;
        const currentAdminId = req.body.currentAdminId;
        
        // Kiểm tra quyền admin hiện tại
        const isAdmin = await groupChat.isAdmin(groupId, currentAdminId);
        if (!isAdmin) {
            return res.status(403).json({ 
                success: false,
                message: 'Bạn không có quyền chuyển admin' 
            });
        }
        
        // Kiểm tra new admin có trong group không
        const isMember = await groupChat.isMember(groupId, newAdminId);
        if (!isMember) {
            return res.status(400).json({ 
                success: false,
                message: 'Người dùng không phải thành viên của group' 
            });
        }
        
        const success = await thanhVienGroup.transferAdmin(groupId, currentAdminId, newAdminId);
        
        res.json({ 
            success: true,
            message: 'Chuyển quyền admin thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Lấy thống kê group
exports.getStats = async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.query.userId;
        
        // Kiểm tra user có trong group không
        const isMember = await groupChat.isMember(groupId, userId);
        if (!isMember) {
            return res.status(403).json({ 
                success: false,
                message: 'Bạn không phải thành viên của group này' 
            });
        }
        
        const data = await groupChat.getStats(groupId);
        
        res.json({
            success: true,
            data: data,
            message: 'Lấy thống kê group thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};
