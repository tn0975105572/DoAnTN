const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const likebaidang = {}; 

// Lấy tất cả likebaidang
likebaidang.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM likebaidang");
  return rows;
};

// Lấy likebaidang theo ID
likebaidang.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM likebaidang WHERE ID_Like = ?", [id]);
  return rows[0] || null;
};

likebaidang.insert = async (data) => {
  const id = uuidv4(); // tạo ID mới
  const newData = { ID_Like: id, ...data };
  await pool.query("INSERT INTO likebaidang SET ?", [newData]);
  return id; // trả về ID_Like luôn
};

// Cập nhật likebaidang
likebaidang.update = async (id, data) => {
  const [result] = await pool.query("UPDATE likebaidang SET ? WHERE ID_Like = ?", [data, id]);
  return result.affectedRows;
};

// Xóa likebaidang
likebaidang.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM likebaidang WHERE ID_Like = ?", [id]);
  return result.affectedRows;
};

// Lấy thông tin người đã like bài đăng với thời gian like
likebaidang.getLikesByPostId = async (postId) => {
  const query = `
    SELECT 
      lb.ID_Like,
      lb.ID_BaiDang,
      lb.ID_NguoiDung,
      lb.thoi_gian_like,
      n.ho_ten as TenNguoiDung,
      n.anh_dai_dien,
      n.email,
      n.truong_hoc
    FROM likebaidang lb
    LEFT JOIN nguoidung n ON lb.ID_NguoiDung = n.ID_NguoiDung
    WHERE lb.ID_BaiDang = ?
    ORDER BY lb.thoi_gian_like DESC
  `;
  const [rows] = await pool.query(query, [postId]);
  return rows;
};

// Lấy số lượng like của bài đăng
likebaidang.getLikeCountByPostId = async (postId) => {
  const query = `
    SELECT COUNT(*) as SoLuongLike
    FROM likebaidang
    WHERE ID_BaiDang = ?
  `;
  const [rows] = await pool.query(query, [postId]);
  return rows[0].SoLuongLike;
};

// Lấy danh sách bài đăng mà người dùng đã like
likebaidang.getLikedPostsByUserId = async (userId, limit = 50, offset = 0) => {
  const query = `
    SELECT
      lb.ID_Like,
      lb.thoi_gian_like,
      b.*,
      n.ho_ten as TenNguoiDung,
      n.anh_dai_dien,
      n.email,
      lbd.ten as TenLoaiBaiDang,
      dm.ten as TenDanhMuc,
      (
        SELECT COUNT(*)
        FROM likebaidang all_likes
        WHERE all_likes.ID_BaiDang = b.ID_BaiDang
      ) as SoLuongLike,
      (
        SELECT COUNT(*)
        FROM binhluanbaidang bc
        WHERE bc.ID_BaiDang = b.ID_BaiDang
      ) as SoLuongBinhLuan,
      (
        SELECT GROUP_CONCAT(ba.LinkAnh SEPARATOR '|')
        FROM baidang_anh ba
        WHERE ba.ID_BaiDang = b.ID_BaiDang
      ) as DanhSachAnh
    FROM likebaidang lb
    INNER JOIN baidang b ON lb.ID_BaiDang = b.ID_BaiDang
    LEFT JOIN nguoidung n ON b.ID_NguoiDung = n.ID_NguoiDung
    LEFT JOIN loaibaidang lbd ON b.ID_LoaiBaiDang = lbd.ID_LoaiBaiDang
    LEFT JOIN danhmuc dm ON b.ID_DanhMuc = dm.ID_DanhMuc
    WHERE lb.ID_NguoiDung = ?
    ORDER BY lb.thoi_gian_like DESC
    LIMIT ? OFFSET ?
  `;
  const [rows] = await pool.query(query, [userId, Number(limit), Number(offset)]);
  return rows.map((row) => ({
    ...row,
    DanhSachAnh: row.DanhSachAnh ? row.DanhSachAnh.split('|') : [],
  }));
};

likebaidang.getLikedPostCountByUserId = async (userId) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as total FROM likebaidang WHERE ID_NguoiDung = ?",
    [userId]
  );
  return rows[0]?.total || 0;
};

// Kiểm tra người dùng đã like bài đăng chưa
likebaidang.checkUserLiked = async (postId, userId) => {
  const query = `
    SELECT ID_Like, thoi_gian_like
    FROM likebaidang
    WHERE ID_BaiDang = ? AND ID_NguoiDung = ?
  `;
  const [rows] = await pool.query(query, [postId, userId]);
  return rows[0] || null;
};

module.exports = likebaidang;
