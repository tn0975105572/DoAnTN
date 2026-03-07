const pool = require("../config/database");

const baocao = {}; // Using an object to hold methods

// Lấy tất cả baocao
baocao.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM baocao");
  return rows;
};

// Lấy baocao theo ID
baocao.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM baocao WHERE ID_BaoCao = ?", [id]);
  return rows[0];
};

// Thêm baocao
baocao.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO baocao SET ?", [data]);
  return result.insertId;
};

// Cập nhật baocao
baocao.update = async (id, data) => {
  const [result] = await pool.query("UPDATE baocao SET ? WHERE ID_BaoCao = ?", [data, id]);
  return result.affectedRows;
};

// Xóa baocao
baocao.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM baocao WHERE ID_BaoCao = ?", [id]);
  return result.affectedRows;
};

module.exports = baocao;
