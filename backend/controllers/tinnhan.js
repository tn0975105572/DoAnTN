const tinnhan = require('../models/tinnhan');
const thongbao = require('../models/thongbao');

// Lấy tất cả tin nhắn
exports.getAll = async (req, res) => {
    try {
        const data = await tinnhan.getAll();
        res.json({
            success: true,
            data: data,
            message: 'Lấy danh sách tin nhắn thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Lấy tin nhắn theo ID
exports.getById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await tinnhan.getById(id);
        if (!data) {
            return res.status(404).json({ 
                success: false,
                message: 'Tin nhắn không tồn tại' 
            });
        }
        res.json({
            success: true,
            data: data,
            message: 'Lấy tin nhắn thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Lấy tin nhắn giữa 2 người (chat 1-1)
exports.getPrivateMessages = async (req, res) => {
    try {
        const { user1Id, user2Id } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const data = await tinnhan.getPrivateMessages(user1Id, user2Id, parseInt(limit), parseInt(offset));
        
        res.json({
            success: true,
            data: data,
            message: 'Lấy tin nhắn riêng tư thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Lấy tin nhắn trong group
exports.getGroupMessages = async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const data = await tinnhan.getGroupMessages(groupId, userId, parseInt(limit), parseInt(offset));
        
        res.json({
            success: true,
            data: data,
            message: 'Lấy tin nhắn group thành công'
        });
    } catch (error) {
        if (error.message === 'NOT_MEMBER') {
            return res.status(403).json({ 
                success: false,
                message: 'Bạn không phải thành viên của group này' 
            });
        }
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Gửi tin nhắn mới (với Socket.io)
exports.sendMessage = async (req, res) => {
    try {
        const messageData = {
            ID_NguoiGui: req.body.ID_NguoiGui,
            ID_NguoiNhan: req.body.ID_NguoiNhan || null,
            ID_GroupChat: req.body.ID_GroupChat || null,
            noi_dung: req.body.noi_dung || '', // Đảm bảo noi_dung không null
            loai_tin_nhan: 'text', // Luôn là 'text' theo API docs
            tin_nhan_phu_thuoc: req.body.tin_nhan_phu_thuoc || null,
            file_dinh_kem: req.body.file_dinh_kem || null
        };
        
        // Validation
        if (!messageData.ID_NguoiGui) {
            return res.status(400).json({ 
                success: false,
                message: 'Thiếu thông tin người gửi' 
            });
        }

        // Kiểm tra nếu không có nội dung và không có file đính kèm
        if (!messageData.noi_dung && !messageData.file_dinh_kem) {
            return res.status(400).json({ 
                success: false,
                message: 'Phải có nội dung tin nhắn hoặc file đính kèm' 
            });
        }
        
        if (!messageData.ID_NguoiNhan && !messageData.ID_GroupChat) {
            return res.status(400).json({ 
                success: false,
                message: 'Phải có người nhận hoặc group chat' 
            });
        }
        
       
        
        const messageId = await tinnhan.insert(messageData);
        const fullMessage = await tinnhan.getById(messageId);
        
        // 🔔 Tạo thông báo cho tin nhắn riêng tư
        if (messageData.ID_NguoiNhan && !messageData.ID_GroupChat) {
            try {
                await thongbao.createMessageNotification(
                    messageData.ID_NguoiNhan,
                    messageData.ID_NguoiGui,
                    req.io
                );
            } catch (notifError) {
                console.error('Lỗi tạo thông báo:', notifError.message);
            }
        }
        
        // Gửi tin nhắn qua Socket.io
        if (req.io) {
            if (messageData.ID_GroupChat) {
                // Group chat
                const roomName = `group_${messageData.ID_GroupChat}`;
                req.io.to(roomName).emit('new_message', {
                    type: 'group',
                    message: fullMessage,
                    groupId: messageData.ID_GroupChat
                });
            } else {
                // Private chat
                const roomName = `private_${[messageData.ID_NguoiGui, messageData.ID_NguoiNhan].sort().join('_')}`;
                req.io.to(roomName).emit('new_message', {
                    type: 'private',
                    message: fullMessage,
                    receiverId: messageData.ID_NguoiNhan,
                    senderId: messageData.ID_NguoiGui
                });
            }
        }
        
        res.status(201).json({ 
            success: true,
            data: { messageId, message: fullMessage },
            message: 'Gửi tin nhắn thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Cập nhật tin nhắn (edit)
exports.updateMessage = async (req, res) => {
    try {
        const id = req.params.id;
        const updateData = {
            noi_dung: req.body.noi_dung
        };
        
        // Chỉ cho phép người gửi edit tin nhắn của mình
        const message = await tinnhan.getById(id);
        if (!message) {
            return res.status(404).json({ 
                success: false,
                message: 'Tin nhắn không tồn tại' 
            });
        }
        
        if (message.ID_NguoiGui !== req.body.userId) {
            return res.status(403).json({ 
                success: false,
                message: 'Bạn không có quyền chỉnh sửa tin nhắn này' 
            });
        }
        
        const affectedRows = await tinnhan.update(id, updateData);
        if (affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Cập nhật thất bại' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Cập nhật tin nhắn thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Xóa tin nhắn (soft delete cho người gửi)
exports.deleteMessage = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.body.userId;
        
        const affectedRows = await tinnhan.deleteForSender(id, userId);
        if (affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Tin nhắn không tồn tại hoặc bạn không có quyền xóa' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Xóa tin nhắn thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Đánh dấu tin nhắn đã đọc (chat 1-1) với Socket.io
exports.markAsRead = async (req, res) => {
    try {
        const { userId, senderId } = req.body;
        
        const affectedRows = await tinnhan.markAsRead(userId, senderId);
        
        // Gửi thông báo đã đọc qua Socket.io
        if (req.io) {
            const senderSocketId = req.io.sockets.adapter.rooms.get(`user_${senderId}`);
            if (senderSocketId) {
                req.io.to(`user_${senderId}`).emit('message_read', {
                    receiverId: userId,
                    senderId: senderId,
                    markedCount: affectedRows
                });
            }
        }
        
        res.json({ 
            success: true,
            data: { markedCount: affectedRows },
            message: 'Đánh dấu đã đọc thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Đánh dấu tin nhắn group đã đọc
exports.markGroupAsRead = async (req, res) => {
    try {
        const { userId, groupId } = req.body;
        
        const affectedRows = await tinnhan.markGroupAsRead(userId, groupId);
        
        res.json({ 
            success: true,
            data: { markedCount: affectedRows },
            message: 'Đánh dấu đã đọc thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Đếm tin nhắn chưa đọc
exports.countUnread = async (req, res) => {
    try {
        const userId = req.params.userId;
        const data = await tinnhan.countUnread(userId);
        
        res.json({
            success: true,
            data: data,
            message: 'Lấy số tin nhắn chưa đọc thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Upload file cho tin nhắn
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: 'Không có file nào được tải lên' 
            });
        }
        
        // Chỉ trả về tên file, không trả về URL đầy đủ
        res.json({ 
            success: true,
            filename: req.file.filename,
            message: 'Upload file thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Upload file và gửi tin nhắn cùng lúc
exports.uploadAndSendMessage = async (req, res) => {
    try {
        const messageData = {
            ID_NguoiGui: req.body.ID_NguoiGui,
            ID_NguoiNhan: req.body.ID_NguoiNhan || null,
            ID_GroupChat: req.body.ID_GroupChat || null,
            noi_dung: req.body.noi_dung || '', // Đảm bảo noi_dung không null
            loai_tin_nhan: 'text', // Luôn là 'text' theo API docs
            tin_nhan_phu_thuoc: req.body.tin_nhan_phu_thuoc || null,
            file_dinh_kem: req.file ? req.file.filename : null
        };
        
        // Validation
        if (!messageData.ID_NguoiGui) {
            return res.status(400).json({ 
                success: false,
                message: 'Thiếu thông tin người gửi' 
            });
        }
        
        if (!messageData.ID_NguoiNhan && !messageData.ID_GroupChat) {
            return res.status(400).json({ 
                success: false,
                message: 'Phải có người nhận hoặc group chat' 
            });
        }
        
        if (!req.file && !messageData.noi_dung) {
            return res.status(400).json({ 
                success: false,
                message: 'Phải có nội dung tin nhắn hoặc file đính kèm' 
            });
        }
        
        const messageId = await tinnhan.insert(messageData);
        
        // Lấy thông tin đầy đủ của tin nhắn để gửi qua socket
        const fullMessage = await tinnhan.getById(messageId);
        
        // 🔔 Tạo thông báo cho tin nhắn riêng tư (không tạo cho group chat)
        if (messageData.ID_NguoiNhan && !messageData.ID_GroupChat) {
            try {
                await thongbao.createMessageNotification(
                    messageData.ID_NguoiNhan, // người nhận
                    messageData.ID_NguoiGui,  // người gửi
                    req.io                     // Socket.IO
                );
                console.log('✅ Thông báo tin nhắn (file) đã được tạo cho user:', messageData.ID_NguoiNhan);
            } catch (notifError) {
                console.error('❌ Lỗi tạo thông báo tin nhắn:', notifError);
                // Không fail request nếu thông báo lỗi
            }
        }
        
        // Gửi tin nhắn qua Socket.io
        if (req.io) {
            if (messageData.ID_GroupChat) {
                // Group chat
                const roomName = `group_${messageData.ID_GroupChat}`;
                req.io.to(roomName).emit('new_message', {
                    type: 'group',
                    message: fullMessage,
                    groupId: messageData.ID_GroupChat
                });
            } else {
                // Private chat
                const roomName = `private_${[messageData.ID_NguoiGui, messageData.ID_NguoiNhan].sort().join('_')}`;
                req.io.to(roomName).emit('new_message', {
                    type: 'private',
                    message: fullMessage,
                    receiverId: messageData.ID_NguoiNhan,
                    senderId: messageData.ID_NguoiGui
                });
            }
        }
        
        res.status(201).json({ 
            success: true,
            data: { messageId, message: fullMessage },
            message: 'Upload file và gửi tin nhắn thành công' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Lấy danh sách cuộc trò chuyện
exports.getConversations = async (req, res) => {
    try {
        const userId = req.params.userId;
        const data = await tinnhan.getConversations(userId);
        
        res.json({
            success: true,
            data: data,
            message: 'Lấy danh sách cuộc trò chuyện thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

// Xóa cuộc trò chuyện (xóa tất cả tin nhắn giữa 2 người)
exports.deleteConversation = async (req, res) => {
    try {
        const { userId, otherUserId } = req.params;
        
        if (!userId || !otherUserId) {
            return res.status(400).json({ 
                success: false,
                message: 'Thiếu thông tin userId hoặc otherUserId' 
            });
        }
        
        const affectedRows = await tinnhan.deleteConversation(userId, otherUserId);
        
        res.json({
            success: true,
            data: { deletedCount: affectedRows },
            message: 'Xóa cuộc trò chuyện thành công'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};
