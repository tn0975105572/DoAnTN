const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const likebaidang = {}; 

// Lấy tất cả likebaidang
likebaidang.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM likebaidang");
  return rows;
};

// Lấy likebaidang theo ID
likebaidang.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM likebaidang WHERE ID_BaiDang = ?", [id]);
  return rows;
};

likebaidang.insert = async (data) => {
  const id = uuidv4(); // tạo ID mới
  const newData = { ID_Like: id, ...data };
  await pool.query("INSERT INTO likebaidang SET ?", [newData]);
  return id; // trả về ID_Like luôn
};

// Cập nhật likebaidang
likebaidang.update = async (id, data) => {
  const [result] = await pool.query("UPDATE likebaidang SET ? WHERE ID_Like = ?", [data, id]);
  return result.affectedRows;
};

// Xóa likebaidang
likebaidang.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM likebaidang WHERE ID_Like = ?", [id]);
  return result.affectedRows;
};

// Lấy thông tin người đã like bài đăng với thời gian like
likebaidang.getLikesByPostId = async (postId) => {
  const query = `
    SELECT 
      lb.ID_Like,
      lb.ID_BaiDang,
      lb.ID_NguoiDung,
      lb.thoi_gian_like,
      n.ho_ten as TenNguoiDung,
      n.anh_dai_dien,
      n.email,
      n.truong_hoc
    FROM likebaidang lb
    LEFT JOIN nguoidung n ON lb.ID_NguoiDung = n.ID_NguoiDung
    WHERE lb.ID_BaiDang = ?
    ORDER BY lb.thoi_gian_like DESC
  `;
  const [rows] = await pool.query(query, [postId]);
  return rows;
};

// Lấy số lượng like của bài đăng
likebaidang.getLikeCountByPostId = async (postId) => {
  const query = `
    SELECT COUNT(*) as SoLuongLike
    FROM likebaidang
    WHERE ID_BaiDang = ?
  `;
  const [rows] = await pool.query(query, [postId]);
  return rows[0].SoLuongLike;
};

// Kiểm tra người dùng đã like bài đăng chưa
likebaidang.checkUserLiked = async (postId, userId) => {
  const query = `
    SELECT ID_Like, thoi_gian_like
    FROM likebaidang
    WHERE ID_BaiDang = ? AND ID_NguoiDung = ?
  `;
  const [rows] = await pool.query(query, [postId, userId]);
  return rows[0] || null;
};

module.exports = likebaidang;
