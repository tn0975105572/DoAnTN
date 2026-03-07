const pool = require("../config/database");

const giohang = {}; // Using an object to hold methods

// Lấy tất cả giohang
giohang.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM giohang");
  return rows;
};

// Lấy giohang theo ID
giohang.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM giohang WHERE ID_GioHang = ?", [id]);
  return rows[0];
};

// Thêm giohang
giohang.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO giohang SET ?", [data]);
  return result.insertId;
};

// Cập nhật giohang
giohang.update = async (id, data) => {
  const [result] = await pool.query("UPDATE giohang SET ? WHERE ID_GioHang = ?", [data, id]);
  return result.affectedRows;
};

// Xóa giohang
giohang.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM giohang WHERE ID_GioHang = ?", [id]);
  return result.affectedRows;
};

module.exports = giohang;
