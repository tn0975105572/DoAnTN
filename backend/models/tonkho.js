const pool = require("../config/database");

const tonkho = {}; // Using an object to hold methods

// Lấy tất cả tonkho
tonkho.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM tonkho");
  return rows;
};

// Lấy tonkho theo ID
tonkho.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM tonkho WHERE ID_TonKho = ?", [id]);
  return rows[0];
};

// Thêm tonkho
tonkho.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO tonkho SET ?", [data]);
  return result.insertId;
};

// Cập nhật tonkho
tonkho.update = async (id, data) => {
  const [result] = await pool.query("UPDATE tonkho SET ? WHERE ID_TonKho = ?", [data, id]);
  return result.affectedRows;
};

// Xóa tonkho
tonkho.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM tonkho WHERE ID_TonKho = ?", [id]);
  return result.affectedRows;
};

module.exports = tonkho;
