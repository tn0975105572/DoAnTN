const pool = require("../config/database");

const lich_su_tich_diem = {};

// Lấy tất cả lịch sử tích điểm
lich_su_tich_diem.getAll = async () => {
  const [rows] = await pool.query(`
    SELECT lst.*, n.ho_ten
    FROM lich_su_tich_diem lst
    JOIN nguoidung n ON lst.ID_NguoiDung = n.ID_NguoiDung
    ORDER BY lst.thoi_gian_tao DESC
  `);
  return rows;
};

// Lấy lịch sử theo ID
lich_su_tich_diem.getById = async (id) => {
  const [rows] = await pool.query(`
    SELECT lst.*, n.ho_ten
    FROM lich_su_tich_diem lst
    JOIN nguoidung n ON lst.ID_NguoiDung = n.ID_NguoiDung
    WHERE lst.ID_LichSu = ?
  `, [id]);
  return rows[0];
};

// Lấy lịch sử theo người dùng
lich_su_tich_diem.getByUserId = async (userId, limit = 50, offset = 0) => {
  const [rows] = await pool.query(`
    SELECT * FROM lich_su_tich_diem 
    WHERE ID_NguoiDung = ?
    ORDER BY thoi_gian_tao DESC
    LIMIT ? OFFSET ?
  `, [userId, limit, offset]);
  return rows;
};

// Lấy lịch sử theo loại giao dịch
lich_su_tich_diem.getByTransactionType = async (loai) => {
  const [rows] = await pool.query(`
    SELECT lst.*, n.ho_ten
    FROM lich_su_tich_diem lst
    JOIN nguoidung n ON lst.ID_NguoiDung = n.ID_NguoiDung
    WHERE lst.loai_giao_dich = ?
    ORDER BY lst.thoi_gian_tao DESC
  `, [loai]);
  return rows;
};

// Lấy lịch sử theo khoảng thời gian
lich_su_tich_diem.getByDateRange = async (startDate, endDate) => {
  const [rows] = await pool.query(`
    SELECT lst.*, n.ho_ten
    FROM lich_su_tich_diem lst
    JOIN nguoidung n ON lst.ID_NguoiDung = n.ID_NguoiDung
    WHERE DATE(lst.thoi_gian_tao) BETWEEN ? AND ?
    ORDER BY lst.thoi_gian_tao DESC
  `, [startDate, endDate]);
  return rows;
};

// Thêm lịch sử tích điểm
lich_su_tich_diem.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO lich_su_tich_diem SET ?", [data]);
  return result.insertId;
};

// Cập nhật lịch sử
lich_su_tich_diem.update = async (id, data) => {
  const [result] = await pool.query("UPDATE lich_su_tich_diem SET ? WHERE ID_LichSu = ?", [data, id]);
  return result.affectedRows;
};

// Xóa lịch sử
lich_su_tich_diem.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM lich_su_tich_diem WHERE ID_LichSu = ?", [id]);
  return result.affectedRows;
};

// Thống kê điểm theo người dùng
lich_su_tich_diem.getUserStats = async (userId) => {
  const [rows] = await pool.query(`
    SELECT 
      loai_giao_dich,
      COUNT(*) as so_lan,
      SUM(diem_thay_doi) as tong_diem_thay_doi,
      AVG(diem_thay_doi) as trung_binh_diem
    FROM lich_su_tich_diem 
    WHERE ID_NguoiDung = ?
    GROUP BY loai_giao_dich
  `, [userId]);
  return rows;
};

// Lấy tổng điểm hiện tại của người dùng
lich_su_tich_diem.getCurrentPoints = async (userId) => {
  const [rows] = await pool.query(`
    SELECT diem_so FROM nguoidung WHERE ID_NguoiDung = ?
  `, [userId]);
  return rows[0]?.diem_so || 0;
};

// Thống kê tổng quan
lich_su_tich_diem.getOverallStats = async () => {
  const [rows] = await pool.query(`
    SELECT 
      loai_giao_dich,
      COUNT(*) as so_lan,
      SUM(diem_thay_doi) as tong_diem_thay_doi,
      COUNT(DISTINCT ID_NguoiDung) as so_nguoi_dung
    FROM lich_su_tich_diem 
    GROUP BY loai_giao_dich
  `);
  return rows;
};

module.exports = lich_su_tich_diem;







