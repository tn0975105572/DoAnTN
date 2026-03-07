const pool = require("../config/database");

const chitietdonhang = {}; // Using an object to hold methods

// Lấy tất cả chitietdonhang
chitietdonhang.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM chitietdonhang");
  return rows;
};

// Lấy chitietdonhang theo ID
chitietdonhang.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM chitietdonhang WHERE ID_ChiTietDonHang = ?", [id]);
  return rows[0];
};

// Thêm chitietdonhang
chitietdonhang.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO chitietdonhang SET ?", [data]);
  return result.insertId;
};

// Cập nhật chitietdonhang
chitietdonhang.update = async (id, data) => {
  const [result] = await pool.query("UPDATE chitietdonhang SET ? WHERE ID_ChiTietDonHang = ?", [data, id]);
  return result.affectedRows;
};

// Xóa chitietdonhang
chitietdonhang.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM chitietdonhang WHERE ID_ChiTietDonHang = ?", [id]);
  return result.affectedRows;
};

module.exports = chitietdonhang;
