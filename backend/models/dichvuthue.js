const pool = require("../config/database");

const dichvuthue = {}; // Using an object to hold methods

// Lấy tất cả dichvuthue
dichvuthue.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM dichvuthue");
  return rows;
};

// Lấy dichvuthue theo ID
dichvuthue.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM dichvuthue WHERE ID_DichVuThue = ?", [id]);
  return rows[0];
};

// Thêm dichvuthue
dichvuthue.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO dichvuthue SET ?", [data]);
  return result.insertId;
};

// Cập nhật dichvuthue
dichvuthue.update = async (id, data) => {
  const [result] = await pool.query("UPDATE dichvuthue SET ? WHERE ID_DichVuThue = ?", [data, id]);
  return result.affectedRows;
};

// Xóa dichvuthue
dichvuthue.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM dichvuthue WHERE ID_DichVuThue = ?", [id]);
  return result.affectedRows;
};

module.exports = dichvuthue;
