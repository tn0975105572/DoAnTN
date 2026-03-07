const pool = require("../config/database");

const nguoidungtichdiem = {};

// Lấy tất cả giao dịch tích điểm của người dùng
nguoidungtichdiem.getAll = async () => {
  const [rows] = await pool.query(`
    SELECT ntd.*, t.ten_hang_muc, t.mo_ta, n.ho_ten
    FROM nguoidungtichdiem ntd
    JOIN tichdiem t ON ntd.ID_TichDiem = t.ID_TichDiem
    JOIN nguoidung n ON ntd.ID_NguoiDung = n.ID_NguoiDung
    ORDER BY ntd.thoi_gian_su_dung DESC
  `);
  return rows;
};

// Lấy giao dịch theo ID
nguoidungtichdiem.getById = async (id) => {
  const [rows] = await pool.query(`
    SELECT ntd.*, t.ten_hang_muc, t.mo_ta, n.ho_ten
    FROM nguoidungtichdiem ntd
    JOIN tichdiem t ON ntd.ID_TichDiem = t.ID_TichDiem
    JOIN nguoidung n ON ntd.ID_NguoiDung = n.ID_NguoiDung
    WHERE ntd.ID_NguoiDungTichDiem = ?
  `, [id]);
  return rows[0];
};

// Lấy giao dịch theo người dùng
nguoidungtichdiem.getByUserId = async (userId) => {
  const [rows] = await pool.query(`
    SELECT ntd.*, t.ten_hang_muc, t.mo_ta, t.loai
    FROM nguoidungtichdiem ntd
    JOIN tichdiem t ON ntd.ID_TichDiem = t.ID_TichDiem
    WHERE ntd.ID_NguoiDung = ?
    ORDER BY ntd.thoi_gian_su_dung DESC
  `, [userId]);
  return rows;
};

// Lấy giao dịch theo loại
nguoidungtichdiem.getByType = async (loai) => {
  const [rows] = await pool.query(`
    SELECT ntd.*, t.ten_hang_muc, t.mo_ta, n.ho_ten
    FROM nguoidungtichdiem ntd
    JOIN tichdiem t ON ntd.ID_TichDiem = t.ID_TichDiem
    JOIN nguoidung n ON ntd.ID_NguoiDung = n.ID_NguoiDung
    WHERE ntd.loai_giao_dich = ?
    ORDER BY ntd.thoi_gian_su_dung DESC
  `, [loai]);
  return rows;
};

// Thêm giao dịch tích điểm
nguoidungtichdiem.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO nguoidungtichdiem SET ?", [data]);
  return result.insertId;
};

// Cập nhật giao dịch
nguoidungtichdiem.update = async (id, data) => {
  const [result] = await pool.query("UPDATE nguoidungtichdiem SET ? WHERE ID_NguoiDungTichDiem = ?", [data, id]);
  return result.affectedRows;
};

// Xóa giao dịch
nguoidungtichdiem.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM nguoidungtichdiem WHERE ID_NguoiDungTichDiem = ?", [id]);
  return result.affectedRows;
};

// Thống kê giao dịch theo người dùng
nguoidungtichdiem.getStatsByUser = async (userId) => {
  const [rows] = await pool.query(`
    SELECT 
      loai_giao_dich,
      COUNT(*) as so_lan,
      SUM(diem_sau_khi_su_dung - diem_truoc_khi_su_dung) as tong_diem_thay_doi
    FROM nguoidungtichdiem 
    WHERE ID_NguoiDung = ?
    GROUP BY loai_giao_dich
  `, [userId]);
  return rows;
};

module.exports = nguoidungtichdiem;








