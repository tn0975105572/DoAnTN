const pool = require("../config/database");

const thanhtoan = {}; // Using an object to hold methods

// Lấy tất cả thanhtoan
thanhtoan.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM thanhtoan");
  return rows;
};

// Lấy thanhtoan theo ID
thanhtoan.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM thanhtoan WHERE ID_ThanhToan = ?", [id]);
  return rows[0];
};

// Thêm thanhtoan
thanhtoan.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO thanhtoan SET ?", [data]);
  return result.insertId;
};

// Cập nhật thanhtoan
thanhtoan.update = async (id, data) => {
  const [result] = await pool.query("UPDATE thanhtoan SET ? WHERE ID_ThanhToan = ?", [data, id]);
  return result.affectedRows;
};

// Xóa thanhtoan
thanhtoan.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM thanhtoan WHERE ID_ThanhToan = ?", [id]);
  return result.affectedRows;
};

module.exports = thanhtoan;
