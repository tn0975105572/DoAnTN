const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const quanHeBanBe = {};

quanHeBanBe.taoYeuCau = async (idNguoiGui, idNguoiNhan) => {
  const ID_QuanHe = uuidv4();
  const [result] = await pool.query(
    "INSERT INTO quanhebanbe (ID_QuanHe, ID_NguoiGui, ID_NguoiNhan, trang_thai) VALUES (?, ?, ?, 'dang_cho')",
    [ID_QuanHe, idNguoiGui, idNguoiNhan]
  );
  return result;
};

quanHeBanBe.layLoiMoiDangCho = async (idNguoiNhan) => {
  const query = `
    SELECT u.ID_NguoiDung, u.ho_ten, u.anh_dai_dien, u.truong_hoc, u.que_quan 
    FROM nguoidung u
    JOIN quanhebanbe q ON u.ID_NguoiDung = q.ID_NguoiGui
    WHERE q.ID_NguoiNhan = ? AND q.trang_thai = 'dang_cho'
    ORDER BY q.thoi_gian_tao DESC`;
  const [rows] = await pool.query(query, [idNguoiNhan]);
  return rows;
};

quanHeBanBe.layLoiMoiDaGui = async (idNguoiGui) => {
  const query = `
    SELECT u.ID_NguoiDung, u.ho_ten, u.anh_dai_dien, u.truong_hoc, u.que_quan 
    FROM nguoidung u
    JOIN quanhebanbe q ON u.ID_NguoiDung = q.ID_NguoiNhan
    WHERE q.ID_NguoiGui = ? AND q.trang_thai = 'dang_cho'
    ORDER BY q.thoi_gian_tao DESC`;
  const [rows] = await pool.query(query, [idNguoiGui]);
  return rows;
};

quanHeBanBe.xoaLoiMoiDaGui = async (idNguoiGui, idNguoiNhan) => {
  const [result] = await pool.query(
    "DELETE FROM quanhebanbe WHERE ID_NguoiGui = ? AND ID_NguoiNhan = ? AND trang_thai = 'dang_cho'",
    [idNguoiGui, idNguoiNhan]
  );
  return result.affectedRows;
};

quanHeBanBe.capNhatTrangThai = async (idNguoiGui, idNguoiNhan, trang_thai) => {
  const [result] = await pool.query(
    "UPDATE quanhebanbe SET trang_thai = ? WHERE ID_NguoiGui = ? AND ID_NguoiNhan = ? AND trang_thai = 'dang_cho'",
    [trang_thai, idNguoiGui, idNguoiNhan]
  );
  return result.affectedRows;
};

quanHeBanBe.xoaQuanHe = async (idNguoi1, idNguoi2) => {
  const [result] = await pool.query(
    "DELETE FROM quanhebanbe WHERE (ID_NguoiGui = ? AND ID_NguoiNhan = ?) OR (ID_NguoiGui = ? AND ID_NguoiNhan = ?)",
    [idNguoi1, idNguoi2, idNguoi2, idNguoi1]
  );
  return result.affectedRows;
};

quanHeBanBe.layQuanHe = async (idNguoi1, idNguoi2) => {
  const [rows] = await pool.query(
    "SELECT * FROM quanhebanbe WHERE (ID_NguoiGui = ? AND ID_NguoiNhan = ?) OR (ID_NguoiGui = ? AND ID_NguoiNhan = ?)",
    [idNguoi1, idNguoi2, idNguoi2, idNguoi1]
  );
  return rows[0];
};

quanHeBanBe.layDanhSachBanBe = async (userId) => {
  const query = `
    SELECT u.ID_NguoiDung, u.ho_ten, u.anh_dai_dien, u.truong_hoc, u.que_quan 
    FROM nguoidung u 
    WHERE u.ID_NguoiDung IN (
      SELECT ID_NguoiNhan FROM quanhebanbe WHERE ID_NguoiGui = ? AND trang_thai = 'da_dong_y' 
      UNION 
      SELECT ID_NguoiGui FROM quanhebanbe WHERE ID_NguoiNhan = ? AND trang_thai = 'da_dong_y'
    )`;
  const [rows] = await pool.query(query, [userId, userId]);
  return rows;
};

quanHeBanBe.demTongSoBan = async (userId) => {
  const query = `
    SELECT COUNT(*) AS TongSoBanBe FROM (
      SELECT ID_NguoiNhan FROM quanhebanbe WHERE ID_NguoiGui = ? AND trang_thai = 'da_dong_y' 
      UNION 
      SELECT ID_NguoiGui FROM quanhebanbe WHERE ID_NguoiNhan = ? AND trang_thai = 'da_dong_y'
    ) AS BangBanBe`;
  const [rows] = await pool.query(query, [userId, userId]);
  return rows[0].TongSoBanBe || 0;
};

quanHeBanBe.demBanChung = async (userId1, userId2) => {
  const query = `
    SELECT COUNT(Friends1.friend_id) AS SoBanChung 
    FROM 
      (SELECT ID_NguoiNhan AS friend_id FROM quanhebanbe WHERE ID_NguoiGui = ? AND trang_thai = 'da_dong_y' 
       UNION SELECT ID_NguoiGui AS friend_id FROM quanhebanbe WHERE ID_NguoiNhan = ? AND trang_thai = 'da_dong_y') AS Friends1 
    INNER JOIN 
      (SELECT ID_NguoiNhan AS friend_id FROM quanhebanbe WHERE ID_NguoiGui = ? AND trang_thai = 'da_dong_y' 
       UNION SELECT ID_NguoiGui AS friend_id FROM quanhebanbe WHERE ID_NguoiNhan = ? AND trang_thai = 'da_dong_y') AS Friends2 
    ON Friends1.friend_id = Friends2.friend_id`;
  const [rows] = await pool.query(query, [userId1, userId1, userId2, userId2]);
  return rows[0].SoBanChung || 0;
};

quanHeBanBe.goiYBanBe = async (userId, userQueQuan, userProvince, userTruongHoc) => {
  const query = `
    SELECT u.ID_NguoiDung, u.ho_ten, u.anh_dai_dien, u.que_quan, u.truong_hoc, 
           (CASE WHEN u.que_quan = ? THEN 50 ELSE 0 END + 
            CASE WHEN u.que_quan != ? AND u.que_quan LIKE CONCAT('%, ', ?) THEN 20 ELSE 0 END + 
            CASE WHEN u.truong_hoc = ? AND u.truong_hoc IS NOT NULL AND u.truong_hoc != '' THEN 15 ELSE 0 END) AS priority_score 
    FROM nguoidung u 
    WHERE u.ID_NguoiDung != ? 
      AND u.ID_NguoiDung NOT IN (SELECT ID_NguoiNhan FROM quanhebanbe WHERE ID_NguoiGui = ?) 
      AND u.ID_NguoiDung NOT IN (SELECT ID_NguoiGui FROM quanhebanbe WHERE ID_NguoiNhan = ?) 
    HAVING priority_score > 0 
    ORDER BY priority_score DESC, u.thoi_gian_tao DESC 
    LIMIT 20`;
  const params = [
    userQueQuan,
    userQueQuan, userProvince,
    userTruongHoc,
    userId,
    userId,
    userId
  ];
  const [rows] = await pool.query(query, params);
  return rows;
};

module.exports = quanHeBanBe;
