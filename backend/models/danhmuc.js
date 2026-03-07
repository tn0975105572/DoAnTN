const pool = require("../config/database");

const danhmuc = {}; // Using an object to hold methods

// Lấy tất cả danhmuc
danhmuc.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM danhmuc");
  return rows;
};

// Lấy danhmuc theo ID
danhmuc.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM danhmuc WHERE ID_DanhMuc = ?", [id]);
  return rows[0];
};

// Thêm danhmuc
danhmuc.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO danhmuc SET ?", [data]);
  return result.insertId;
};

// Cập nhật danhmuc
danhmuc.update = async (id, data) => {
  const [result] = await pool.query("UPDATE danhmuc SET ? WHERE ID_DanhMuc = ?", [data, id]);
  return result.affectedRows;
};

// Xóa danhmuc
danhmuc.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM danhmuc WHERE ID_DanhMuc = ?", [id]);
  return result.affectedRows;
};

module.exports = danhmuc;
