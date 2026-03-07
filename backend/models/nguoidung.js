const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const nguoidung = {};

// Tìm user theo email
nguoidung.getByEmail = async (email) => {
  const [rows] = await pool.query("SELECT * FROM nguoidung WHERE email = ?", [email]);
  return rows[0];
};

// Lấy tất cả user
nguoidung.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM nguoidung");
  return rows;
};

// Lấy user với phân trang
nguoidung.getAllPaginated = async (limit, offset) => {
  const [rows] = await pool.query("SELECT * FROM nguoidung ORDER BY thoi_gian_tao DESC LIMIT ? OFFSET ?", [limit, offset]);
  const [countResult] = await pool.query("SELECT COUNT(*) as total FROM nguoidung");
  return {
    data: rows,
    total: countResult[0].total
  };
};

// Lấy user theo ID
nguoidung.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM nguoidung WHERE ID_NguoiDung = ?", [id]);
  return rows[0];
};

nguoidung.insert = async (data) => {
  data.ID_NguoiDung = uuidv4(); // 👈 sinh UUID
  const [result] = await pool.query("INSERT INTO nguoidung SET ?", [data]);
  return { insertId: data.ID_NguoiDung, ...result };
};


// Cập nhật user
nguoidung.update = async (id, data) => {
  const [result] = await pool.query("UPDATE nguoidung SET ? WHERE ID_NguoiDung = ?", [data, id]);
  return result.affectedRows;
};

// Xóa user
nguoidung.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM nguoidung WHERE ID_NguoiDung = ?", [id]);
  return result.affectedRows;
};
nguoidung.timKiem = async (tuKhoa, idNguoiDungHienTai) => {
  const searchQuery = `%${tuKhoa}%`;
  const query = `SELECT ID_NguoiDung, ho_ten, email, anh_dai_dien, que_quan, truong_hoc 
    FROM nguoidung 
    WHERE (ho_ten LIKE ? OR email LIKE ?) 
    AND ID_NguoiDung != ?`;
  const [rows] = await pool.query(query, [searchQuery, searchQuery, idNguoiDungHienTai]);
  return rows;
};

// ==================== VIP ====================

// Kích hoạt VIP cho user (set la_vip=1 và ngày hết hạn)
nguoidung.setVIP = async (id, ngayHetHan) => {
  const [result] = await pool.query(
    "UPDATE nguoidung SET la_vip = 1, ngay_het_han_vip = ? WHERE ID_NguoiDung = ?",
    [ngayHetHan, id]
  );
  return result.affectedRows;
};

// Hủy VIP cho user
nguoidung.removeVIP = async (id) => {
  const [result] = await pool.query(
    "UPDATE nguoidung SET la_vip = 0, ngay_het_han_vip = NULL WHERE ID_NguoiDung = ?",
    [id]
  );
  return result.affectedRows;
};

// Kiểm tra trạng thái VIP của user (còn hạn hay không)
nguoidung.checkVIP = async (id) => {
  const [rows] = await pool.query(
    "SELECT la_vip, ngay_het_han_vip FROM nguoidung WHERE ID_NguoiDung = ?",
    [id]
  );
  if (!rows[0]) return null;
  const { la_vip, ngay_het_han_vip } = rows[0];
  const isActive = la_vip === 1 && ngay_het_han_vip && new Date(ngay_het_han_vip) > new Date();
  return { la_vip, ngay_het_han_vip, is_active: isActive ? 1 : 0 };
};

// Lấy danh sách tất cả VIP còn hạn
nguoidung.getAllVIP = async () => {
  const [rows] = await pool.query(
    `SELECT ID_NguoiDung, ho_ten, email, anh_dai_dien, la_vip, ngay_het_han_vip
     FROM nguoidung
     WHERE la_vip = 1 AND ngay_het_han_vip > NOW()
     ORDER BY ngay_het_han_vip ASC`
  );
  return rows;
};

// Tự động hủy VIP đã hết hạn (dùng cho cron job)
nguoidung.expireVIP = async () => {
  const [result] = await pool.query(
    "UPDATE nguoidung SET la_vip = 0 WHERE la_vip = 1 AND ngay_het_han_vip IS NOT NULL AND ngay_het_han_vip <= NOW()"
  );
  return result.affectedRows;
};

module.exports = nguoidung;
