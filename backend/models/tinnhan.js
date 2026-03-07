const pool = require("../config/database");
const { v4: uuidv4 } = require('uuid');

const tinnhan = {}; // Using an object to hold methods

// Lấy tất cả tinnhan
tinnhan.getAll = async () => {
  const [rows] = await pool.query(`
    SELECT 
      t.ID_TinNhan,
      t.ID_GroupChat,
      t.ID_NguoiGui,
      t.ID_NguoiNhan,
      t.noi_dung,
      t.loai_tin_nhan,
      t.tin_nhan_phu_thuoc,
      t.trang_thai,
      t.da_xoa_gui,
      t.thoi_gian_gui,
      t.thoi_gian_doc,
      t.file_dinh_kem,
      u_gui.ho_ten AS ten_nguoi_gui,
      u_gui.anh_dai_dien AS anh_nguoi_gui,
      u_nhan.ho_ten AS ten_nguoi_nhan,
      u_nhan.anh_dai_dien AS anh_nguoi_nhan,
      g.ten_group,
      g.anh_dai_dien AS anh_group,
      t_reply.noi_dung AS noi_dung_reply,
      u_reply.ho_ten AS ten_nguoi_reply,
      CASE WHEN t.ID_GroupChat IS NOT NULL THEN 'group' ELSE 'private' END AS loai_chat
    FROM tinnhan t
    LEFT JOIN nguoidung u_gui ON t.ID_NguoiGui = u_gui.ID_NguoiDung
    LEFT JOIN nguoidung u_nhan ON t.ID_NguoiNhan = u_nhan.ID_NguoiDung
    LEFT JOIN group_chat g ON t.ID_GroupChat = g.ID_GroupChat
    LEFT JOIN tinnhan t_reply ON t.tin_nhan_phu_thuoc = t_reply.ID_TinNhan
    LEFT JOIN nguoidung u_reply ON t_reply.ID_NguoiGui = u_reply.ID_NguoiDung
    ORDER BY t.thoi_gian_gui DESC
  `);
  return rows;
};

// Lấy tinnhan theo ID
tinnhan.getById = async (id) => {
  const [rows] = await pool.query(`
    SELECT 
      t.ID_TinNhan,
      t.ID_GroupChat,
      t.ID_NguoiGui,
      t.ID_NguoiNhan,
      t.noi_dung,
      t.loai_tin_nhan,
      t.tin_nhan_phu_thuoc,
      t.trang_thai,
      t.da_xoa_gui,
      t.thoi_gian_gui,
      t.thoi_gian_doc,
      t.file_dinh_kem,
      u_gui.ho_ten AS ten_nguoi_gui,
      u_gui.anh_dai_dien AS anh_nguoi_gui,
      u_nhan.ho_ten AS ten_nguoi_nhan,
      u_nhan.anh_dai_dien AS anh_nguoi_nhan,
      g.ten_group,
      g.anh_dai_dien AS anh_group,
      t_reply.noi_dung AS noi_dung_reply,
      u_reply.ho_ten AS ten_nguoi_reply,
      CASE WHEN t.ID_GroupChat IS NOT NULL THEN 'group' ELSE 'private' END AS loai_chat
    FROM tinnhan t
    LEFT JOIN nguoidung u_gui ON t.ID_NguoiGui = u_gui.ID_NguoiDung
    LEFT JOIN nguoidung u_nhan ON t.ID_NguoiNhan = u_nhan.ID_NguoiDung
    LEFT JOIN group_chat g ON t.ID_GroupChat = g.ID_GroupChat
    LEFT JOIN tinnhan t_reply ON t.tin_nhan_phu_thuoc = t_reply.ID_TinNhan
    LEFT JOIN nguoidung u_reply ON t_reply.ID_NguoiGui = u_reply.ID_NguoiDung
    WHERE t.ID_TinNhan = ?
  `, [id]);
  return rows[0];
};

// Lấy tin nhắn giữa 2 người (chat 1-1)
tinnhan.getPrivateMessages = async (user1Id, user2Id, limit = 50, offset = 0) => {
  const [rows] = await pool.query(`
    SELECT 
      t.ID_TinNhan,
      t.ID_GroupChat,
      t.ID_NguoiGui,
      t.ID_NguoiNhan,
      t.noi_dung,
      t.loai_tin_nhan,
      t.tin_nhan_phu_thuoc,
      t.trang_thai,
      t.da_xoa_gui,
      t.thoi_gian_gui,
      t.thoi_gian_doc,
      t.file_dinh_kem,
      u_gui.ho_ten AS ten_nguoi_gui,
      u_gui.anh_dai_dien AS anh_nguoi_gui,
      u_nhan.ho_ten AS ten_nguoi_nhan,
      u_nhan.anh_dai_dien AS anh_nguoi_nhan,
      g.ten_group,
      g.anh_dai_dien AS anh_group,
      t_reply.noi_dung AS noi_dung_reply,
      u_reply.ho_ten AS ten_nguoi_reply,
      CASE WHEN t.ID_GroupChat IS NOT NULL THEN 'group' ELSE 'private' END AS loai_chat
    FROM tinnhan t
    LEFT JOIN nguoidung u_gui ON t.ID_NguoiGui = u_gui.ID_NguoiDung
    LEFT JOIN nguoidung u_nhan ON t.ID_NguoiNhan = u_nhan.ID_NguoiDung
    LEFT JOIN group_chat g ON t.ID_GroupChat = g.ID_GroupChat
    LEFT JOIN tinnhan t_reply ON t.tin_nhan_phu_thuoc = t_reply.ID_TinNhan
    LEFT JOIN nguoidung u_reply ON t_reply.ID_NguoiGui = u_reply.ID_NguoiDung
    WHERE t.ID_GroupChat IS NULL
    AND (
      (t.ID_NguoiGui = ? AND t.ID_NguoiNhan = ?) OR
      (t.ID_NguoiGui = ? AND t.ID_NguoiNhan = ?)
    )
    AND t.da_xoa_gui = 0
    ORDER BY t.thoi_gian_gui DESC
    LIMIT ? OFFSET ?
  `, [user1Id, user2Id, user2Id, user1Id, limit, offset]);
  return rows;
};

// Lấy tin nhắn trong group
tinnhan.getGroupMessages = async (groupId, userId, limit = 50, offset = 0) => {
  // Kiểm tra user có trong group không
  const [memberCheck] = await pool.query(`
    SELECT 1 FROM thanh_vien_group 
    WHERE ID_GroupChat = ? AND ID_NguoiDung = ? AND trang_thai = 'active'
  `, [groupId, userId]);
  
  if (memberCheck.length === 0) {
    throw new Error('NOT_MEMBER');
  }
  
  const [rows] = await pool.query(`
    SELECT 
      t.ID_TinNhan,
      t.ID_GroupChat,
      t.ID_NguoiGui,
      t.ID_NguoiNhan,
      t.noi_dung,
      t.loai_tin_nhan,
      t.tin_nhan_phu_thuoc,
      t.trang_thai,
      t.da_xoa_gui,
      t.thoi_gian_gui,
      t.thoi_gian_doc,
      t.file_dinh_kem,
      u_gui.ho_ten AS ten_nguoi_gui,
      u_gui.anh_dai_dien AS anh_nguoi_gui,
      u_nhan.ho_ten AS ten_nguoi_nhan,
      u_nhan.anh_dai_dien AS anh_nguoi_nhan,
      g.ten_group,
      g.anh_dai_dien AS anh_group,
      t_reply.noi_dung AS noi_dung_reply,
      u_reply.ho_ten AS ten_nguoi_reply,
      CASE WHEN t.ID_GroupChat IS NOT NULL THEN 'group' ELSE 'private' END AS loai_chat
    FROM tinnhan t
    LEFT JOIN nguoidung u_gui ON t.ID_NguoiGui = u_gui.ID_NguoiDung
    LEFT JOIN nguoidung u_nhan ON t.ID_NguoiNhan = u_nhan.ID_NguoiDung
    LEFT JOIN group_chat g ON t.ID_GroupChat = g.ID_GroupChat
    LEFT JOIN tinnhan t_reply ON t.tin_nhan_phu_thuoc = t_reply.ID_TinNhan
    LEFT JOIN nguoidung u_reply ON t_reply.ID_NguoiGui = u_reply.ID_NguoiDung
    WHERE t.ID_GroupChat = ?
    AND t.da_xoa_gui = 0
    ORDER BY t.thoi_gian_gui DESC
    LIMIT ? OFFSET ?
  `, [groupId, limit, offset]);
  return rows;
};

// Thêm tinnhan mới
tinnhan.insert = async (data) => {
  // Tự động tạo ID nếu chưa có
  if (!data.ID_TinNhan) {
    data.ID_TinNhan = uuidv4();
  }
  
  // Set giá trị mặc định
  data.trang_thai = data.trang_thai || 'da_gui';
  data.loai_tin_nhan = data.loai_tin_nhan || 'text';
  data.da_xoa_gui = data.da_xoa_gui || 0;
  
  const [result] = await pool.query("INSERT INTO tinnhan SET ?", [data]);
  return data.ID_TinNhan;
};

// Cập nhật tinnhan
tinnhan.update = async (id, data) => {
  const [result] = await pool.query("UPDATE tinnhan SET ? WHERE ID_TinNhan = ?", [data, id]);
  return result.affectedRows;
};

// Xóa tinnhan (soft delete cho người gửi)
tinnhan.deleteForSender = async (id, userId) => {
  const [result] = await pool.query(`
    UPDATE tinnhan SET da_xoa_gui = 1 
    WHERE ID_TinNhan = ? AND ID_NguoiGui = ?
  `, [id, userId]);
  return result.affectedRows;
};

// Xóa hoàn toàn tinnhan (chỉ admin)
tinnhan.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM tinnhan WHERE ID_TinNhan = ?", [id]);
  return result.affectedRows;
};

// Đánh dấu tin nhắn đã đọc (chat 1-1)
tinnhan.markAsRead = async (userId, senderId) => {
  const [result] = await pool.query(`
    UPDATE tinnhan 
    SET trang_thai = 'da_doc', thoi_gian_doc = CURRENT_TIMESTAMP
    WHERE ID_NguoiNhan = ? AND ID_NguoiGui = ? AND ID_GroupChat IS NULL AND trang_thai != 'da_doc'
  `, [userId, senderId]);
  return result.affectedRows;
};

// Đánh dấu tin nhắn group đã đọc
tinnhan.markGroupAsRead = async (userId, groupId) => {
  const [result] = await pool.query(`
    UPDATE tinnhan 
    SET trang_thai = 'da_doc', thoi_gian_doc = CURRENT_TIMESTAMP
    WHERE ID_GroupChat = ? AND ID_NguoiNhan = ? AND trang_thai != 'da_doc'
  `, [groupId, userId]);
  return result.affectedRows;
};

// Đếm tin nhắn chưa đọc
tinnhan.countUnread = async (userId) => {
  const [rows] = await pool.query(`
    SELECT 
      COUNT(CASE WHEN t.ID_GroupChat IS NULL THEN 1 END) as unread_private,
      COUNT(CASE WHEN t.ID_GroupChat IS NOT NULL THEN 1 END) as unread_group,
      COUNT(*) as total_unread
    FROM tinnhan t
    WHERE t.ID_NguoiNhan = ? AND t.trang_thai != 'da_doc' AND t.da_xoa_gui = 0
  `, [userId]);
  return rows[0];
};

// Lấy danh sách cuộc trò chuyện của user
tinnhan.getConversations = async (userId) => {
  // Lấy tin nhắn gần nhất cho mỗi cuộc trò chuyện
  const [rows] = await pool.query(`
    SELECT 
      t.ID_TinNhan,
      t.ID_GroupChat,
      t.ID_NguoiGui,
      t.ID_NguoiNhan,
      t.noi_dung as last_message,
      t.thoi_gian_gui as last_message_time,
      t.trang_thai,
      u_gui.ho_ten as ten_nguoi_gui,
      u_gui.anh_dai_dien as anh_nguoi_gui,
      u_nhan.ho_ten as ten_nguoi_nhan,
      u_nhan.anh_dai_dien as anh_nguoi_nhan,
      g.ten_group,
      g.anh_dai_dien as anh_group,
      CASE WHEN t.ID_GroupChat IS NOT NULL THEN 'group' ELSE 'private' END as conversation_type
    FROM tinnhan t
    LEFT JOIN nguoidung u_gui ON t.ID_NguoiGui = u_gui.ID_NguoiDung
    LEFT JOIN nguoidung u_nhan ON t.ID_NguoiNhan = u_nhan.ID_NguoiDung
    LEFT JOIN group_chat g ON t.ID_GroupChat = g.ID_GroupChat
    WHERE (t.ID_NguoiGui = ? OR t.ID_NguoiNhan = ?)
    AND t.da_xoa_gui = 0
    ORDER BY t.thoi_gian_gui DESC
  `, [userId, userId]);
  
  // Xử lý dữ liệu để nhóm theo cuộc trò chuyện
  const conversations = new Map();
  
  for (const message of rows) {
    let conversationId, conversationName, conversationAvatar;
    
    if (message.ID_GroupChat) {
      // Group chat
      conversationId = message.ID_GroupChat;
      conversationName = message.ten_group;
      conversationAvatar = message.anh_group;
    } else {
      // Private chat
      conversationId = message.ID_NguoiGui === userId ? message.ID_NguoiNhan : message.ID_NguoiGui;
      conversationName = message.ID_NguoiGui === userId ? message.ten_nguoi_nhan : message.ten_nguoi_gui;
      conversationAvatar = message.ID_NguoiGui === userId ? message.anh_nguoi_nhan : message.anh_nguoi_gui;
    }
    
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, {
        conversation_id: conversationId,
        conversation_type: message.conversation_type,
        conversation_name: conversationName,
        conversation_avatar: conversationAvatar,
        last_message: message.last_message,
        last_message_time: message.last_message_time,
        unread_count: 0
      });
    }
  }
  
  // Đếm tin nhắn chưa đọc cho mỗi cuộc trò chuyện
  for (const [conversationId, conversation] of conversations) {
    const [unreadResult] = await pool.query(`
      SELECT COUNT(*) as unread_count
      FROM tinnhan t
      WHERE t.ID_NguoiNhan = ? 
      AND t.da_xoa_gui = 0 
      AND t.trang_thai != 'da_doc'
      AND (
        (t.ID_GroupChat IS NOT NULL AND t.ID_GroupChat = ?) OR
        (t.ID_GroupChat IS NULL AND (
          (t.ID_NguoiGui = ? AND t.ID_NguoiNhan = ?) OR
          (t.ID_NguoiGui = ? AND t.ID_NguoiNhan = ?)
        ))
      )
    `, [userId, conversationId, conversationId, userId, userId, conversationId]);
    
    conversation.unread_count = unreadResult[0].unread_count;
  }
  
  return Array.from(conversations.values()).sort((a, b) => 
    new Date(b.last_message_time) - new Date(a.last_message_time)
  );
};

// Xóa cuộc trò chuyện (xóa tất cả tin nhắn giữa 2 người)
tinnhan.deleteConversation = async (userId, otherUserId) => {
  const [result] = await pool.query(`
    DELETE FROM tinnhan 
    WHERE ID_GroupChat IS NULL 
    AND (
      (ID_NguoiGui = ? AND ID_NguoiNhan = ?) OR
      (ID_NguoiGui = ? AND ID_NguoiNhan = ?)
    )
  `, [userId, otherUserId, otherUserId, userId]);
  return result.affectedRows;
};

module.exports = tinnhan;
