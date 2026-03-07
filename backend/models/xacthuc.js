const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const xacthuc = {};

// Thêm bản ghi xác thực mới
xacthuc.insert = async (idNguoiDung, anhKhuonMat, anhCMND) => {
  const idXacThuc = uuidv4();
  await pool.query(
    "INSERT INTO xac_thuc_tai_khoan (ID_XacThuc, ID_NguoiDung, anh_khuon_mat, anh_cmnd) VALUES (?, ?, ?, ?)",
    [idXacThuc, idNguoiDung, anhKhuonMat, anhCMND]
  );
  return idXacThuc;
};

// Lấy bản ghi theo ID người dùng
xacthuc.getByUserId = async (idNguoiDung) => {
  const [rows] = await pool.query(
    "SELECT * FROM xac_thuc_tai_khoan WHERE ID_NguoiDung = ? ORDER BY thoi_gian_tao DESC",
    [idNguoiDung]
  );
  return rows;
};

// Cập nhật trạng thái duyệt
xacthuc.updateStatus = async (idXacThuc, trang_thai) => {
  const [result] = await pool.query(
    "UPDATE xac_thuc_tai_khoan SET trang_thai = ? WHERE ID_XacThuc = ?",
    [trang_thai, idXacThuc]
  );
  return result.affectedRows;
};

module.exports = xacthuc;
