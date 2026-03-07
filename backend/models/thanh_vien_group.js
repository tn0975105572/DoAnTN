const pool = require("../config/database");
const { v4: uuidv4 } = require('uuid');

const thanhVienGroup = {};

// Lấy tất cả thành viên group
thanhVienGroup.getAll = async () => {
  const [rows] = await pool.query(`
    SELECT 
      tv.*,
      u.ho_ten,
      u.anh_dai_dien,
      g.ten_group
    FROM thanh_vien_group tv
    LEFT JOIN nguoidung u ON tv.ID_NguoiDung = u.ID_NguoiDung
    LEFT JOIN group_chat g ON tv.ID_GroupChat = g.ID_GroupChat
    ORDER BY tv.thoi_gian_tham_gia DESC
  `);
  return rows;
};

// Lấy thành viên theo ID
thanhVienGroup.getById = async (id) => {
  const [rows] = await pool.query(`
    SELECT 
      tv.*,
      u.ho_ten,
      u.anh_dai_dien,
      g.ten_group
    FROM thanh_vien_group tv
    LEFT JOIN nguoidung u ON tv.ID_NguoiDung = u.ID_NguoiDung
    LEFT JOIN group_chat g ON tv.ID_GroupChat = g.ID_GroupChat
    WHERE tv.ID_ThanhVien = ?
  `, [id]);
  return rows[0];
};

// Lấy thành viên theo group
thanhVienGroup.getByGroupId = async (groupId) => {
  const [rows] = await pool.query(`
    SELECT 
      tv.*,
      u.ho_ten,
      u.anh_dai_dien,
      u.email
    FROM thanh_vien_group tv
    LEFT JOIN nguoidung u ON tv.ID_NguoiDung = u.ID_NguoiDung
    WHERE tv.ID_GroupChat = ? AND tv.trang_thai = 'active'
    ORDER BY 
      CASE tv.vai_tro 
        WHEN 'admin' THEN 1 
        WHEN 'member' THEN 2 
        ELSE 3 
      END,
      tv.thoi_gian_tham_gia ASC
  `, [groupId]);
  return rows;
};

// Lấy thành viên theo user
thanhVienGroup.getByUserId = async (userId) => {
  const [rows] = await pool.query(`
    SELECT 
      tv.*,
      g.ten_group,
      g.anh_dai_dien as anh_group,
      g.so_thanh_vien
    FROM thanh_vien_group tv
    LEFT JOIN group_chat g ON tv.ID_GroupChat = g.ID_GroupChat
    WHERE tv.ID_NguoiDung = ? AND tv.trang_thai = 'active'
    ORDER BY tv.thoi_gian_tham_gia DESC
  `, [userId]);
  return rows;
};

// Thêm thành viên mới
thanhVienGroup.insert = async (data) => {
  // Tự động tạo ID nếu chưa có
  if (!data.ID_ThanhVien) {
    data.ID_ThanhVien = uuidv4();
  }
  
  // Set giá trị mặc định
  data.vai_tro = data.vai_tro || 'member';
  data.trang_thai = data.trang_thai || 'active';
  
  const [result] = await pool.query("INSERT INTO thanh_vien_group SET ?", [data]);
  return data.ID_ThanhVien;
};

// Cập nhật thành viên
thanhVienGroup.update = async (id, data) => {
  const [result] = await pool.query("UPDATE thanh_vien_group SET ? WHERE ID_ThanhVien = ?", [data, id]);
  return result.affectedRows;
};

// Xóa thành viên (soft delete)
thanhVienGroup.delete = async (id) => {
  const [result] = await pool.query("UPDATE thanh_vien_group SET trang_thai = 'left' WHERE ID_ThanhVien = ?", [id]);
  return result.affectedRows;
};

// Rời khỏi group
thanhVienGroup.leaveGroup = async (groupId, userId) => {
  const [result] = await pool.query(`
    UPDATE thanh_vien_group 
    SET trang_thai = 'left', thoi_gian_roi = CURRENT_TIMESTAMP
    WHERE ID_GroupChat = ? AND ID_NguoiDung = ?
  `, [groupId, userId]);
  return result.affectedRows;
};

// Kiểm tra thành viên có tồn tại không
thanhVienGroup.exists = async (groupId, userId) => {
  const [rows] = await pool.query(`
    SELECT 1 FROM thanh_vien_group 
    WHERE ID_GroupChat = ? AND ID_NguoiDung = ? AND trang_thai = 'active'
  `, [groupId, userId]);
  return rows.length > 0;
};

// Đếm số thành viên trong group
thanhVienGroup.countMembers = async (groupId) => {
  const [rows] = await pool.query(`
    SELECT COUNT(*) as total_members
    FROM thanh_vien_group 
    WHERE ID_GroupChat = ? AND trang_thai = 'active'
  `, [groupId]);
  return rows[0].total_members;
};

// Lấy danh sách admin của group
thanhVienGroup.getAdmins = async (groupId) => {
  const [rows] = await pool.query(`
    SELECT 
      tv.*,
      u.ho_ten,
      u.anh_dai_dien,
      u.email
    FROM thanh_vien_group tv
    LEFT JOIN nguoidung u ON tv.ID_NguoiDung = u.ID_NguoiDung
    WHERE tv.ID_GroupChat = ? AND tv.vai_tro = 'admin' AND tv.trang_thai = 'active'
    ORDER BY tv.thoi_gian_tham_gia ASC
  `, [groupId]);
  return rows;
};

// Chuyển quyền admin
thanhVienGroup.transferAdmin = async (groupId, fromUserId, toUserId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Xóa quyền admin của user cũ
    await connection.query(`
      UPDATE thanh_vien_group 
      SET vai_tro = 'member'
      WHERE ID_GroupChat = ? AND ID_NguoiDung = ?
    `, [groupId, fromUserId]);
    
    // Cấp quyền admin cho user mới
    await connection.query(`
      UPDATE thanh_vien_group 
      SET vai_tro = 'admin'
      WHERE ID_GroupChat = ? AND ID_NguoiDung = ?
    `, [groupId, toUserId]);
    
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Lấy lịch sử tham gia group
thanhVienGroup.getJoinHistory = async (groupId) => {
  const [rows] = await pool.query(`
    SELECT 
      tv.*,
      u.ho_ten,
      u.anh_dai_dien
    FROM thanh_vien_group tv
    LEFT JOIN nguoidung u ON tv.ID_NguoiDung = u.ID_NguoiDung
    WHERE tv.ID_GroupChat = ?
    ORDER BY tv.thoi_gian_tham_gia DESC
  `, [groupId]);
  return rows;
};

module.exports = thanhVienGroup;
