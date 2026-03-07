const pool = require("../config/database");

const danhgia = {}; // Using an object to hold methods

// Lấy tất cả danhgia
danhgia.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM danhgia");
  return rows;
};

// Lấy danhgia theo ID
danhgia.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM danhgia WHERE ID_DanhGia = ?", [id]);
  return rows[0];
};

// Thêm danhgia
danhgia.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO danhgia SET ?", [data]);
  return result.insertId;
};

// Cập nhật danhgia
danhgia.update = async (id, data) => {
  const [result] = await pool.query("UPDATE danhgia SET ? WHERE ID_DanhGia = ?", [data, id]);
  return result.affectedRows;
};

// Xóa danhgia
danhgia.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM danhgia WHERE ID_DanhGia = ?", [id]);
  return result.affectedRows;
};

module.exports = danhgia;
