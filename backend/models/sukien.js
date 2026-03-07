const pool = require("../config/database");

const sukien = {}; // Using an object to hold methods

// Lấy tất cả sukien
sukien.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM sukien");
  return rows;
};

// Lấy sukien theo ID
sukien.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM sukien WHERE ID_SuKien = ?", [id]);
  return rows[0];
};

// Thêm sukien
sukien.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO sukien SET ?", [data]);
  return result.insertId;
};

// Cập nhật sukien
sukien.update = async (id, data) => {
  const [result] = await pool.query("UPDATE sukien SET ? WHERE ID_SuKien = ?", [data, id]);
  return result.affectedRows;
};

// Xóa sukien
sukien.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM sukien WHERE ID_SuKien = ?", [id]);
  return result.affectedRows;
};

module.exports = sukien;
