const pool = require("../config/database");
const { v4: uuidv4 } = require('uuid');
const thongbao = require('../models/thongbao');

class ChatSocket {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> userId
    this.setupEvents();
  }

  setupEvents() {
    this.io.on('connection', (socket) => {

      // Người dùng đăng nhập
      socket.on('user_login', (data) => {
        this.handleUserLogin(socket, data);
      });

      // Người dùng đăng xuất
      socket.on('user_logout', () => {
        this.handleUserLogout(socket);
      });

      // Tham gia room chat
      socket.on('join_chat', (data) => {
        this.handleJoinChat(socket, data);
      });

      // Rời room chat
      socket.on('leave_chat', (data) => {
        this.handleLeaveChat(socket, data);
      });

      // Gửi tin nhắn
      socket.on('send_message', (data) => {
        this.handleSendMessage(socket, data);
      });

      // Đánh dấu tin nhắn đã đọc
      socket.on('mark_read', (data) => {
        this.handleMarkRead(socket, data);
      });

      // Typing indicator
      socket.on('typing_start', (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing_stop', (data) => {
        this.handleTypingStop(socket, data);
      });

      // Online/Offline status
      socket.on('update_status', (data) => {
        this.handleUpdateStatus(socket, data);
      });

      // Ngắt kết nối
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  // Xử lý đăng nhập
  async handleUserLogin(socket, data) {
    try {
      const { userId } = data;
      
      if (!userId) {
        socket.emit('error', { message: 'Thiếu userId' });
        return;
      }

      // Lưu mapping socket và user
      this.userSockets.set(userId, socket.id);
      this.socketUsers.set(socket.id, userId);

      // Join room của user
      socket.join(`user_${userId}`);

      // Auto-join các room chat của user
      await this.autoJoinUserChats(socket, userId);

      // Cập nhật trạng thái online
      await this.updateUserStatus(userId, 'online');

      // Thông báo cho bạn bè
      await this.notifyFriendsStatus(userId, 'online');

      socket.emit('login_success', { userId, socketId: socket.id });
      
    } catch (error) {
      console.error('Error in handleUserLogin:', error);
      socket.emit('error', { message: 'Lỗi đăng nhập socket' });
    }
  }

  // Xử lý đăng xuất
  async handleUserLogout(socket) {
    try {
      const userId = this.socketUsers.get(socket.id);
      
      if (userId) {
        // Cập nhật trạng thái offline
        await this.updateUserStatus(userId, 'offline');

        // Thông báo cho bạn bè
        await this.notifyFriendsStatus(userId, 'offline');

        // Xóa mapping
        this.userSockets.delete(userId);
        this.socketUsers.delete(socket.id);

      }
    } catch (error) {
      console.error('Error in handleUserLogout:', error);
    }
  }

  // Tự động join các room chat của user
  async autoJoinUserChats(socket, userId) {
    try {
      // Lấy danh sách các cuộc trò chuyện private (bạn bè)
      const [privateChats] = await pool.query(`
        SELECT DISTINCT 
          CASE 
            WHEN ID_NguoiGui = ? THEN ID_NguoiNhan 
            ELSE ID_NguoiGui 
          END as other_user_id
        FROM tinnhan 
        WHERE (ID_NguoiGui = ? OR ID_NguoiNhan = ?) 
          AND ID_GroupChat IS NULL
          AND ID_NguoiNhan IS NOT NULL
      `, [userId, userId, userId]);

      // Join các room private chat
      for (const chat of privateChats) {
        const roomName = `private_${[userId, chat.other_user_id].sort().join('_')}`;
        socket.join(roomName);
      }

      // Lấy danh sách các group chat
      const [groupChats] = await pool.query(`
        SELECT ID_GroupChat 
        FROM thanh_vien_group 
        WHERE ID_NguoiDung = ? AND trang_thai = 'active'
      `, [userId]);

      // Join các room group chat
      for (const chat of groupChats) {
        const roomName = `group_${chat.ID_GroupChat}`;
        socket.join(roomName);
      }

    } catch (error) {
      console.error('Error in autoJoinUserChats:', error);
    }
  }

  // Tham gia room chat
  async handleJoinChat(socket, data) {
    try {
      const { userId, chatType, chatId } = data; // chatType: 'private' hoặc 'group'
      
      if (!userId || !chatType || !chatId) {
        socket.emit('error', { message: 'Thiếu thông tin chat' });
        return;
      }

      // Kiểm tra quyền truy cập
      if (chatType === 'group') {
        const isMember = await this.checkGroupMember(chatId, userId);
        if (!isMember) {
          socket.emit('error', { message: 'Bạn không phải thành viên của group này' });
          return;
        }
      }

      // Join room chat
      let roomName;
      if (chatType === 'private') {
        // Đối với private chat, chatId là ID của người kia, cần tạo room name với cả 2 ID
        const currentUserId = socket.userId;
        roomName = `private_${[currentUserId, chatId].sort().join('_')}`;
      } else {
        roomName = `group_${chatId}`;
      }
      socket.join(roomName);

      socket.emit('join_success', { chatType, chatId });

    } catch (error) {
      console.error('Error in handleJoinChat:', error);
      socket.emit('error', { message: 'Lỗi tham gia chat' });
    }
  }

  // Rời room chat
  handleLeaveChat(socket, data) {
    try {
      const { chatType, chatId } = data;
      const roomName = chatType === 'private' ? `private_${chatId}` : `group_${chatId}`;
      
      socket.leave(roomName);
      
    } catch (error) {
      console.error('Error in handleLeaveChat:', error);
    }
  }

  // Gửi tin nhắn
  async handleSendMessage(socket, data) {
    try {
      const { 
        ID_NguoiGui, 
        ID_NguoiNhan, 
        ID_GroupChat, 
        noi_dung, 
        loai_tin_nhan = 'text',
        file_dinh_kem = null,
        tin_nhan_phu_thuoc = null
      } = data;

      // Validation
      if (!ID_NguoiGui) {
        socket.emit('error', { message: 'Thiếu thông tin người gửi' });
        return;
      }

      // Kiểm tra nếu không có nội dung và không có file đính kèm
      if (!noi_dung && !file_dinh_kem) {
        socket.emit('error', { message: 'Phải có nội dung tin nhắn hoặc file đính kèm' });
        return;
      }

      if (!ID_NguoiNhan && !ID_GroupChat) {
        socket.emit('error', { message: 'Phải có người nhận hoặc group chat' });
        return;
      }

      // Tạo tin nhắn mới
      const messageData = {
        ID_TinNhan: uuidv4(),
        ID_NguoiGui,
        ID_NguoiNhan,
        ID_GroupChat,
        noi_dung: noi_dung || '', // Đảm bảo noi_dung không null
        loai_tin_nhan: 'text', // Luôn là 'text' theo API docs
        file_dinh_kem,
        tin_nhan_phu_thuoc,
        trang_thai: 'da_gui',
        da_xoa_gui: 0,
        thoi_gian_gui: new Date()
      };

      // Lưu vào database
      await pool.query("INSERT INTO tinnhan SET ?", [messageData]);

      // 🔔 TẠO THÔNG BÁO CHO TIN NHẮN RIÊNG TƯ
      if (ID_NguoiNhan && !ID_GroupChat) {
        try {
          await thongbao.createMessageNotification(
            ID_NguoiNhan,  // người nhận
            ID_NguoiGui,   // người gửi
            this.io        // Socket.IO instance
          );
        } catch (notifError) {
          console.error('Lỗi tạo thông báo:', notifError.message);
        }
      }

      // Lấy thông tin đầy đủ của tin nhắn
      const [messageRows] = await pool.query(`
        SELECT 
          t.*,
          u.ho_ten as ten_nguoi_gui,
          u.anh_dai_dien as anh_nguoi_gui,
          g.ten_group
        FROM tinnhan t
        LEFT JOIN nguoidung u ON t.ID_NguoiGui = u.ID_NguoiDung
        LEFT JOIN group_chat g ON t.ID_GroupChat = g.ID_GroupChat
        WHERE t.ID_TinNhan = ?
      `, [messageData.ID_TinNhan]);

      const message = messageRows[0];

      // Gửi tin nhắn đến các room tương ứng
      if (ID_GroupChat) {
        // Group chat
        const roomName = `group_${ID_GroupChat}`;
        this.io.to(roomName).emit('new_message', {
          type: 'group',
          message,
          groupId: ID_GroupChat
        });

        // Gửi notification cho thành viên không online
        await this.notifyGroupMembers(ID_GroupChat, ID_NguoiGui, message);
      } else {
        // Private chat - sử dụng room name đã được sort
        const roomName = `private_${[ID_NguoiGui, ID_NguoiNhan].sort().join('_')}`;
        this.io.to(roomName).emit('new_message', {
          type: 'private',
          message,
          receiverId: ID_NguoiNhan,
          senderId: ID_NguoiGui
        });

        // Gửi notification cho người nhận
        await this.notifyUser(ID_NguoiNhan, {
          type: 'new_message',
          message,
          senderId: ID_NguoiGui
        });
      }

      // Xác nhận gửi thành công
      socket.emit('message_sent', { messageId: messageData.ID_TinNhan });

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      socket.emit('error', { message: 'Lỗi gửi tin nhắn' });
    }
  }

  // Đánh dấu đã đọc
  async handleMarkRead(socket, data) {
    try {
      const { userId, chatType, chatId } = data;

      if (chatType === 'private') {
        // Chat 1-1
        await pool.query(`
          UPDATE tinnhan 
          SET trang_thai = 'da_doc', thoi_gian_doc = CURRENT_TIMESTAMP
          WHERE ID_NguoiNhan = ? AND ID_NguoiGui = ? AND trang_thai != 'da_doc'
        `, [userId, chatId]);
      } else if (chatType === 'group') {
        // Group chat
        await pool.query(`
          UPDATE tinnhan 
          SET trang_thai = 'da_doc', thoi_gian_doc = CURRENT_TIMESTAMP
          WHERE ID_GroupChat = ? AND ID_NguoiNhan = ? AND trang_thai != 'da_doc'
        `, [chatId, userId]);
      }

      // Thông báo cho người gửi (nếu là chat 1-1)
      if (chatType === 'private') {
        const senderSocketId = this.userSockets.get(chatId);
        if (senderSocketId) {
          this.io.to(senderSocketId).emit('message_read', {
            receiverId: userId,
            chatId
          });
        }
      }

      socket.emit('mark_read_success', { chatType, chatId });

    } catch (error) {
      console.error('Error in handleMarkRead:', error);
      socket.emit('error', { message: 'Lỗi đánh dấu đã đọc' });
    }
  }

  // Typing indicator
  handleTypingStart(socket, data) {
    try {
      const { chatType, chatId, userId } = data;
      const roomName = chatType === 'private' ? `private_${chatId}` : `group_${chatId}`;
      
      socket.to(roomName).emit('typing_start', {
        userId,
        chatType,
        chatId
      });
    } catch (error) {
      console.error('Error in handleTypingStart:', error);
    }
  }

  handleTypingStop(socket, data) {
    try {
      const { chatType, chatId, userId } = data;
      const roomName = chatType === 'private' ? `private_${chatId}` : `group_${chatId}`;
      
      socket.to(roomName).emit('typing_stop', {
        userId,
        chatType,
        chatId
      });
    } catch (error) {
      console.error('Error in handleTypingStop:', error);
    }
  }

  // Cập nhật trạng thái
  async handleUpdateStatus(socket, data) {
    try {
      const userId = this.socketUsers.get(socket.id);
      if (!userId) return;

      const { status } = data; // online, away, busy, offline
      await this.updateUserStatus(userId, status);

      // Thông báo cho bạn bè
      await this.notifyFriendsStatus(userId, status);

      socket.emit('status_updated', { status });

    } catch (error) {
      console.error('Error in handleUpdateStatus:', error);
    }
  }

  // Ngắt kết nối
  async handleDisconnect(socket) {
    try {
      const userId = this.socketUsers.get(socket.id);
      
      if (userId) {
        // Cập nhật trạng thái offline
        await this.updateUserStatus(userId, 'offline');

        // Thông báo cho bạn bè
        await this.notifyFriendsStatus(userId, 'offline');

        // Xóa mapping
        this.userSockets.delete(userId);
        this.socketUsers.delete(socket.id);

      }
    } catch (error) {
      console.error('Error in handleDisconnect:', error);
    }
  }

  // Helper methods

  // Kiểm tra thành viên group
  async checkGroupMember(groupId, userId) {
    const [rows] = await pool.query(`
      SELECT 1 FROM thanh_vien_group 
      WHERE ID_GroupChat = ? AND ID_NguoiDung = ? AND trang_thai = 'active'
    `, [groupId, userId]);
    return rows.length > 0;
  }

  // Cập nhật trạng thái user
  async updateUserStatus(userId, status) {
    try {
      await pool.query(`
        INSERT INTO trang_thai_hoat_dong (ID_TrangThai, ID_NguoiDung, trang_thai, thoi_gian_hoat_dong_cuoi)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE 
        trang_thai = ?,
        thoi_gian_hoat_dong_cuoi = CURRENT_TIMESTAMP
      `, [uuidv4(), userId, status, status]);
    } catch (error) {
      // Nếu bảng không tồn tại, chỉ log warning và tiếp tục
      if (error.code === 'ER_NO_SUCH_TABLE' && error.sqlMessage.includes('trang_thai_hoat_dong')) {
        return;
      }
    }
  }

  // Thông báo trạng thái cho bạn bè
  async notifyFriendsStatus(userId, status) {
    try {
      // Lấy danh sách bạn bè
      const [friends] = await pool.query(`
        SELECT ID_NguoiGui AS friend_id FROM quanhebanbe WHERE ID_NguoiNhan = ? AND trang_thai = 'da_dong_y'
        UNION
        SELECT ID_NguoiNhan AS friend_id FROM quanhebanbe WHERE ID_NguoiGui = ? AND trang_thai = 'da_dong_y'
      `, [userId, userId]);

      // Gửi thông báo cho bạn bè đang online
      friends.forEach(friend => {
        const friendSocketId = this.userSockets.get(friend.friend_id);
        if (friendSocketId) {
          this.io.to(friendSocketId).emit('friend_status_change', {
            userId,
            status
          });
        }
      });
    } catch (error) {
      console.error('Error in notifyFriendsStatus:', error);
    }
  }

  // Thông báo cho user cụ thể
  async notifyUser(userId, notification) {
    try {
      const socketId = this.userSockets.get(userId);
      if (socketId) {
        this.io.to(socketId).emit('notification', notification);
      }
    } catch (error) {
      console.error('Error in notifyUser:', error);
    }
  }

  // Thông báo cho thành viên group
  async notifyGroupMembers(groupId, senderId, message) {
    try {
      // Lấy danh sách thành viên group
      const [members] = await pool.query(`
        SELECT ID_NguoiDung FROM thanh_vien_group 
        WHERE ID_GroupChat = ? AND ID_NguoiDung != ? AND trang_thai = 'active'
      `, [groupId, senderId]);

      // Gửi notification cho thành viên không online
      members.forEach(member => {
        const socketId = this.userSockets.get(member.ID_NguoiDung);
        if (!socketId) { // Chỉ gửi cho người không online
          this.notifyUser(member.ID_NguoiDung, {
            type: 'new_group_message',
            message,
            groupId,
            senderId
          });
        }
      });
    } catch (error) {
      console.error('Error in notifyGroupMembers:', error);
    }
  }

  // Lấy danh sách user online
  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }

  // Kiểm tra user có online không
  isUserOnline(userId) {
    return this.userSockets.has(userId);
  }
}

module.exports = ChatSocket;