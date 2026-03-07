const pool = require("../config/database");

const loaibaidang = {}; // Using an object to hold methods

// Lấy tất cả loaibaidang
loaibaidang.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM loaibaidang");
  return rows;
};

// Lấy loaibaidang theo ID
loaibaidang.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM loaibaidang WHERE ID_LoaiBaiDang = ?", [id]);
  return rows[0];
};

// Thêm loaibaidang
loaibaidang.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO loaibaidang SET ?", [data]);
  return result.insertId;
};

// Cập nhật loaibaidang
loaibaidang.update = async (id, data) => {
  const [result] = await pool.query("UPDATE loaibaidang SET ? WHERE ID_LoaiBaiDang = ?", [data, id]);
  return result.affectedRows;
};

// Xóa loaibaidang
loaibaidang.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM loaibaidang WHERE ID_LoaiBaiDang = ?", [id]);
  return result.affectedRows;
};

module.exports = loaibaidang;
