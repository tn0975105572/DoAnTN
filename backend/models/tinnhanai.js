const pool = require("../config/database");

const tinnhanai = {}; // Using an object to hold methods

// Lấy tất cả tinnhanai
tinnhanai.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM tinnhanai");
  return rows;
};

// Lấy tinnhanai theo ID
tinnhanai.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM tinnhanai WHERE ID_TinNhanAI = ?", [id]);
  return rows[0];
};

// Thêm tinnhanai
tinnhanai.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO tinnhanai SET ?", [data]);
  return result.insertId;
};

// Cập nhật tinnhanai
tinnhanai.update = async (id, data) => {
  const [result] = await pool.query("UPDATE tinnhanai SET ? WHERE ID_TinNhanAI = ?", [data, id]);
  return result.affectedRows;
};

// Xóa tinnhanai
tinnhanai.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM tinnhanai WHERE ID_TinNhanAI = ?", [id]);
  return result.affectedRows;
};

module.exports = tinnhanai;
