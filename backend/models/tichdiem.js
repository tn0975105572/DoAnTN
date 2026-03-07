const pool = require("../config/database");

const tichdiem = {};

// Lấy tất cả giao dịch tích điểm
tichdiem.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM lich_su_tich_diem ORDER BY thoi_gian DESC");
  return rows;
};

// Lấy giao dịch tích điểm với phân trang
tichdiem.getAllPaginated = async (limit, offset, userId = null) => {
  let query = `
    SELECT 
      lst.*,
      n.ho_ten as ten_nguoi_dung,
      n.email
    FROM lich_su_tich_diem lst
    LEFT JOIN nguoidung n ON lst.ID_NguoiDung = n.ID_NguoiDung
  `;
  
  let countQuery = `
    SELECT COUNT(*) as total
    FROM lich_su_tich_diem lst
  `;
  
  let queryParams = [];
  
  if (userId) {
    query += " WHERE lst.ID_NguoiDung = ?";
    countQuery += " WHERE lst.ID_NguoiDung = ?";
    queryParams.push(userId);
  }
  
  query += " ORDER BY lst.thoi_gian DESC LIMIT ? OFFSET ?";
  queryParams.push(limit, offset);
  
  const [rows] = await pool.query(query, queryParams);
  const [countResult] = await pool.query(countQuery, userId ? [userId] : []);
  
  return {
    data: rows,
    total: countResult[0].total
  };
};

// Lấy giao dịch theo ID người dùng
tichdiem.getByUserId = async (userId) => {
  const query = `
    SELECT 
      lst.*,
      n.ho_ten as ten_nguoi_dung,
      n.email
    FROM lich_su_tich_diem lst
    LEFT JOIN nguoidung n ON lst.ID_NguoiDung = n.ID_NguoiDung
    WHERE lst.ID_NguoiDung = ?
    ORDER BY lst.thoi_gian DESC
  `;
  const [rows] = await pool.query(query, [userId]);
  return rows;
};

// Thêm giao dịch tích điểm
tichdiem.add = async (data) => {
  const query = `
    INSERT INTO lich_su_tich_diem 
    (ID_NguoiDung, thay_doi_diem, loai_giao_dich, mo_ta, ID_tham_chieu)
    VALUES (?, ?, ?, ?, ?)
  `;
  const [result] = await pool.query(query, [
    data.ID_NguoiDung,
    data.thay_doi_diem,
    data.loai_giao_dich,
    data.mo_ta,
    data.ID_tham_chieu
  ]);
  return result.insertId;
};

// Cập nhật điểm số người dùng
tichdiem.updateUserPoints = async (userId, pointChange) => {
  const query = `
    UPDATE nguoidung 
    SET diem_so = diem_so + ? 
    WHERE ID_NguoiDung = ?
  `;
  const [result] = await pool.query(query, [pointChange, userId]);
  return result.affectedRows;
};

// Lấy thống kê điểm số
tichdiem.getStats = async () => {
  const [rows] = await pool.query(`
    SELECT 
      COUNT(*) as total_transactions,
      SUM(thay_doi_diem) as total_points_changed,
      AVG(thay_doi_diem) as avg_points_per_transaction
    FROM lich_su_tich_diem
  `);
  return rows[0];
};

// Lấy top người dùng có điểm cao nhất
tichdiem.getTopUsers = async (limit = 10) => {
  const query = `
    SELECT 
      n.ID_NguoiDung,
      n.ho_ten,
      n.email,
      n.diem_so,
      COUNT(lst.ID_LichSu) as so_giao_dich
    FROM nguoidung n
    LEFT JOIN lich_su_tich_diem lst ON n.ID_NguoiDung = lst.ID_NguoiDung
    GROUP BY n.ID_NguoiDung
    ORDER BY n.diem_so DESC
    LIMIT ?
  `;
  const [rows] = await pool.query(query, [limit]);
  return rows;
};

module.exports = tichdiem;