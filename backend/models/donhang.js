const pool = require("../config/database");

const donhang = {}; // Using an object to hold methods

// Lấy tất cả donhang
donhang.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM donhang");
  return rows;
};

// Lấy donhang theo ID
donhang.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM donhang WHERE ID_DonHang = ?", [id]);
  return rows[0];
};

// Thêm donhang
donhang.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO donhang SET ?", [data]);
  return result.insertId;
};

// Cập nhật donhang
donhang.update = async (id, data) => {
  const [result] = await pool.query("UPDATE donhang SET ? WHERE ID_DonHang = ?", [data, id]);
  return result.affectedRows;
};

// Xóa donhang
donhang.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM donhang WHERE ID_DonHang = ?", [id]);
  return result.affectedRows;
};

module.exports = donhang;
