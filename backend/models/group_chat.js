const pool = require("../config/database");
const { v4: uuidv4 } = require('uuid');

const groupChat = {};

// Lấy tất cả group chat
groupChat.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM group_chat ORDER BY thoi_gian_tao DESC");
  return rows;
};

// Lấy group chat theo ID
groupChat.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM group_chat WHERE ID_GroupChat = ?", [id]);
  return rows[0];
};

// Lấy danh sách group của user
groupChat.getByUserId = async (userId) => {
  const [rows] = await pool.query(`
    SELECT * FROM v_group_nguoi_dung 
    WHERE ID_NguoiDung = ?
    ORDER BY thoi_gian_tin_nhan_cuoi DESC
  `, [userId]);
  return rows;
};

// Tạo group chat mới
groupChat.create = async (data) => {
  // Tự động tạo ID nếu chưa có
  if (!data.ID_GroupChat) {
    data.ID_GroupChat = uuidv4();
  }
  
  // Set giá trị mặc định
  data.so_thanh_vien = data.so_thanh_vien || 1;
  data.trang_thai = data.trang_thai || 'hoat_dong';
  
  const [result] = await pool.query("INSERT INTO group_chat SET ?", [data]);
  return data.ID_GroupChat;
};

// Cập nhật group chat
groupChat.update = async (id, data) => {
  const [result] = await pool.query("UPDATE group_chat SET ? WHERE ID_GroupChat = ?", [data, id]);
  return result.affectedRows;
};

// Xóa group chat (soft delete)
groupChat.delete = async (id) => {
  const [result] = await pool.query("UPDATE group_chat SET trang_thai = 'xoa' WHERE ID_GroupChat = ?", [id]);
  return result.affectedRows;
};

// Lấy thành viên trong group
groupChat.getMembers = async (groupId) => {
  const [rows] = await pool.query(`
    SELECT 
      tv.ID_ThanhVien,
      tv.ID_GroupChat,
      tv.ID_NguoiDung,
      tv.vai_tro,
      tv.trang_thai,
      tv.thoi_gian_tham_gia,
      u.ho_ten,
      u.anh_dai_dien,
      u.email
    FROM thanh_vien_group tv
    LEFT JOIN nguoidung u ON tv.ID_NguoiDung = u.ID_NguoiDung
    WHERE tv.ID_GroupChat = ? AND tv.trang_thai = 'active'
    ORDER BY tv.thoi_gian_tham_gia ASC
  `, [groupId]);
  return rows;
};

// Thêm thành viên vào group
groupChat.addMember = async (groupId, userId, role = 'member') => {
  const memberId = uuidv4();
  const [result] = await pool.query(`
    INSERT INTO thanh_vien_group (ID_ThanhVien, ID_GroupChat, ID_NguoiDung, vai_tro)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
    trang_thai = 'active',
    vai_tro = VALUES(vai_tro)
  `, [memberId, groupId, userId, role]);
  return result.affectedRows;
};

// Xóa thành viên khỏi group
groupChat.removeMember = async (groupId, userId) => {
  const [result] = await pool.query(`
    UPDATE thanh_vien_group 
    SET trang_thai = 'left'
    WHERE ID_GroupChat = ? AND ID_NguoiDung = ?
  `, [groupId, userId]);
  return result.affectedRows;
};

// Kiểm tra user có phải admin của group không
groupChat.isAdmin = async (groupId, userId) => {
  const [rows] = await pool.query(`
    SELECT 1 FROM thanh_vien_group 
    WHERE ID_GroupChat = ? AND ID_NguoiDung = ? AND vai_tro = 'admin' AND trang_thai = 'active'
  `, [groupId, userId]);
  return rows.length > 0;
};

// Kiểm tra user có trong group không
groupChat.isMember = async (groupId, userId) => {
  const [rows] = await pool.query(`
    SELECT 1 FROM thanh_vien_group 
    WHERE ID_GroupChat = ? AND ID_NguoiDung = ? AND trang_thai = 'active'
  `, [groupId, userId]);
  return rows.length > 0;
};

// Cập nhật vai trò thành viên
groupChat.updateMemberRole = async (groupId, userId, newRole) => {
  const [result] = await pool.query(`
    UPDATE thanh_vien_group 
    SET vai_tro = ?
    WHERE ID_GroupChat = ? AND ID_NguoiDung = ? AND trang_thai = 'active'
  `, [newRole, groupId, userId]);
  return result.affectedRows;
};

// Lấy thống kê group
groupChat.getStats = async (groupId) => {
  const [rows] = await pool.query(`
    SELECT 
      g.ID_GroupChat,
      g.ten_group,
      g.so_thanh_vien,
      COUNT(t.ID_TinNhan) as total_messages,
      COUNT(CASE WHEN t.thoi_gian_gui >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as messages_this_week,
      COUNT(CASE WHEN t.thoi_gian_gui >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 END) as messages_today
    FROM group_chat g
    LEFT JOIN tinnhan t ON g.ID_GroupChat = t.ID_GroupChat
    WHERE g.ID_GroupChat = ?
    GROUP BY g.ID_GroupChat
  `, [groupId]);
  return rows[0];
};

module.exports = groupChat;
