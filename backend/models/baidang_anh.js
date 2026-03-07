const pool = require("../config/database");

const baidang_anh = {}; // Using an object to hold methods

// Lấy tất cả baidang_anh
baidang_anh.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM baidang_anh");
  return rows;
};

// Lấy baidang_anh theo ID
baidang_anh.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM baidang_anh WHERE ID_BaiDang = ?", [id]);
  return rows;
};

// Thêm baidang_anh
baidang_anh.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO baidang_anh SET ?", [data]);
  return result.insertId;
};

// Cập nhật baidang_anh
baidang_anh.update = async (id, data) => {
  const [result] = await pool.query("UPDATE baidang_anh SET ? WHERE ID = ?", [data, id]);
  return result.affectedRows;
};

// Xóa baidang_anh
baidang_anh.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM baidang_anh WHERE ID = ?", [id]);
  return result.affectedRows;
};

// Xóa tất cả ảnh của bài đăng theo ID bài đăng
baidang_anh.deleteByPostId = async (postId) => {
  const [result] = await pool.query("DELETE FROM baidang_anh WHERE ID_BaiDang = ?", [postId]);
  return result.affectedRows;
};

// Xóa tất cả ảnh của người dùng theo danh sách ID bài đăng
baidang_anh.deleteByPostIds = async (postIds) => {
  if (postIds.length === 0) return 0;
  const placeholders = postIds.map(() => '?').join(',');
  const [result] = await pool.query(`DELETE FROM baidang_anh WHERE ID_BaiDang IN (${placeholders})`, postIds);
  return result.affectedRows;
};

module.exports = baidang_anh;
