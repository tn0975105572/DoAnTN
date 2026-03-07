const pool = require("../config/database");

const baidang = {};

// Lấy tất cả baidang với thông tin liên quan
baidang.getAllWithDetails = async () => {
  const query = `
    SELECT 
      b.*,
      n.ho_ten as TenNguoiDung,
      n.anh_dai_dien,
      n.email,
      lb.ten as TenLoaiBaiDang,
      dm.ten as TenDanhMuc,
      COUNT(DISTINCT ba.ID) as SoLuongAnh,
      COUNT(DISTINCT lb_like.ID_BaiDang) as SoLuongLike,
      COUNT(DISTINCT bc.ID_BinhLuan) as SoLuongBinhLuan,
      GROUP_CONCAT(ba.LinkAnh ORDER BY ba.ID ASC SEPARATOR '|') as DanhSachAnh
    FROM baidang b
    LEFT JOIN nguoidung n ON b.ID_NguoiDung = n.ID_NguoiDung
    LEFT JOIN loaibaidang lb ON b.ID_LoaiBaiDang = lb.ID_LoaiBaiDang
    LEFT JOIN danhmuc dm ON b.ID_DanhMuc = dm.ID_DanhMuc
    LEFT JOIN baidang_anh ba ON b.ID_BaiDang = ba.ID_BaiDang
    LEFT JOIN likebaidang lb_like ON b.ID_BaiDang = lb_like.ID_BaiDang
    LEFT JOIN binhluanbaidang bc ON b.ID_BaiDang = bc.ID_BaiDang
    WHERE b.trang_thai = 'dang_ban'
    GROUP BY b.ID_BaiDang
    ORDER BY b.thoi_gian_tao DESC
  `;
  const [rows] = await pool.query(query);
  
  // Chuyển đổi chuỗi danh sách ảnh thành mảng và sử dụng trực tiếp URL CDN
  return rows.map(row => ({
    ...row,
    DanhSachAnh: row.DanhSachAnh ? row.DanhSachAnh.split('|') : []
  }));
};

// Lấy baidang với phân trang và filter
baidang.getAllWithDetailsPaginated = async (limit, offset, status = 'all', search = '') => {
  let whereConditions = [];
  let queryParams = [];
  
  // Filter theo status
  if (status && status !== 'all') {
    whereConditions.push('b.trang_thai = ?');
    queryParams.push(status);
  }
  
  // Filter theo search
  if (search) {
    whereConditions.push('(b.tieu_de LIKE ? OR b.mo_ta LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`);
  }
  
  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
  
  const query = `
    SELECT 
      b.*,
      n.ho_ten as TenNguoiDung,
      n.anh_dai_dien,
      n.email,
      lb.ten as TenLoaiBaiDang,
      dm.ten as TenDanhMuc,
      COUNT(DISTINCT ba.ID) as SoLuongAnh,
      COUNT(DISTINCT lb_like.ID_BaiDang) as SoLuongLike,
      COUNT(DISTINCT bc.ID_BinhLuan) as SoLuongBinhLuan,
      GROUP_CONCAT(ba.LinkAnh ORDER BY ba.ID ASC SEPARATOR '|') as DanhSachAnh
    FROM baidang b
    LEFT JOIN nguoidung n ON b.ID_NguoiDung = n.ID_NguoiDung
    LEFT JOIN loaibaidang lb ON b.ID_LoaiBaiDang = lb.ID_LoaiBaiDang
    LEFT JOIN danhmuc dm ON b.ID_DanhMuc = dm.ID_DanhMuc
    LEFT JOIN baidang_anh ba ON b.ID_BaiDang = ba.ID_BaiDang
    LEFT JOIN likebaidang lb_like ON b.ID_BaiDang = lb_like.ID_BaiDang
    LEFT JOIN binhluanbaidang bc ON b.ID_BaiDang = bc.ID_BaiDang
    ${whereClause}
    GROUP BY b.ID_BaiDang
    ORDER BY b.thoi_gian_tao DESC
    LIMIT ? OFFSET ?
  `;
  
  queryParams.push(limit, offset);
  const [rows] = await pool.query(query, queryParams);
  
  const countQuery = `
    SELECT COUNT(DISTINCT b.ID_BaiDang) as total
    FROM baidang b
    ${whereClause}
  `;
  const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
  
  return {
    data: rows.map(row => ({
      ...row,
      DanhSachAnh: row.DanhSachAnh ? row.DanhSachAnh.split('|') : []
    })),
    total: countResult[0].total
  };
};

// Lấy baidang theo ID với thông tin liên quan
baidang.getByIdWithDetails = async (id) => {
  const query = `
    SELECT 
      b.*,
      n.ho_ten as TenNguoiDung,
      n.anh_dai_dien,
      n.email,
      lb.ten as TenLoaiBaiDang,
      dm.ten as TenDanhMuc,
      COUNT(DISTINCT lb_like.ID_BaiDang) as SoLuongLike,
      COUNT(DISTINCT bc.ID_BinhLuan) as SoLuongBinhLuan,
      GROUP_CONCAT(ba.LinkAnh ORDER BY ba.ID ASC SEPARATOR '|') as DanhSachAnh
    FROM baidang b
    LEFT JOIN nguoidung n ON b.ID_NguoiDung = n.ID_NguoiDung
    LEFT JOIN loaibaidang lb ON b.ID_LoaiBaiDang = lb.ID_LoaiBaiDang
    LEFT JOIN danhmuc dm ON b.ID_DanhMuc = dm.ID_DanhMuc
    LEFT JOIN likebaidang lb_like ON b.ID_BaiDang = lb_like.ID_BaiDang
    LEFT JOIN binhluanbaidang bc ON b.ID_BaiDang = bc.ID_BaiDang
    LEFT JOIN baidang_anh ba ON b.ID_BaiDang = ba.ID_BaiDang
    WHERE b.ID_BaiDang = ? AND b.trang_thai = 'dang_ban'
    GROUP BY b.ID_BaiDang
  `;
  const [rows] = await pool.query(query, [id]);
  if (rows[0]) {
    rows[0].DanhSachAnh = rows[0].DanhSachAnh ? rows[0].DanhSachAnh.split('|') : [];
  }
  return rows[0];
};

// Lấy hình ảnh của bài đăng
baidang.getImagesByPostId = async (postId) => {
  const query = `
    SELECT ID, LinkAnh
    FROM baidang_anh
    WHERE ID_BaiDang = ?
    ORDER BY ID ASC
  `;
  const [rows] = await pool.query(query, [postId]);
  return rows;
};

// Lấy bình luận của bài đăng với thông tin người dùng
baidang.getCommentsByPostId = async (postId) => {
  const query = `
    SELECT 
      bc.*,
      n.ho_ten as TenNguoiDung,
      n.anh_dai_dien
    FROM binhluanbaidang bc
    LEFT JOIN nguoidung n ON bc.ID_NguoiDung = n.ID_NguoiDung
    WHERE bc.ID_BaiDang = ?
    ORDER BY bc.thoi_gian_binh_luan ASC
  `;
  const [rows] = await pool.query(query, [postId]);
  return rows;
};

// Lấy danh sách người đã like bài đăng
baidang.getLikesByPostId = async (postId) => {
  const query = `
    SELECT 
      lb.*,
      n.ho_ten as TenNguoiDung,
      n.anh_dai_dien
    FROM likebaidang lb
    LEFT JOIN nguoidung n ON lb.ID_NguoiDung = n.ID_NguoiDung
    WHERE lb.ID_BaiDang = ?
    ORDER BY lb.thoi_gian_like DESC
  `;
  const [rows] = await pool.query(query, [postId]);
  return rows;
};

// Lấy bài đăng theo danh mục
baidang.getByCategory = async (categoryId) => {
  const query = `
    SELECT 
      b.*,
      n.ho_ten as TenNguoiDung,
      n.anh_dai_dien,
      lb.ten as TenLoaiBaiDang,
      dm.ten as TenDanhMuc,
      COUNT(ba.ID) as SoLuongAnh,
      COUNT(lb_like.ID_BaiDang) as SoLuongLike,
      COUNT(bc.ID_BinhLuan) as SoLuongBinhLuan
    FROM baidang b
    LEFT JOIN nguoidung n ON b.ID_NguoiDung = n.ID_NguoiDung
    LEFT JOIN loaibaidang lb ON b.ID_LoaiBaiDang = lb.ID_LoaiBaiDang
    LEFT JOIN danhmuc dm ON b.ID_DanhMuc = dm.ID_DanhMuc
    LEFT JOIN baidang_anh ba ON b.ID_BaiDang = ba.ID_BaiDang
    LEFT JOIN likebaidang lb_like ON b.ID_BaiDang = lb_like.ID_BaiDang
    LEFT JOIN binhluanbaidang bc ON b.ID_BaiDang = bc.ID_BaiDang
    WHERE b.ID_DanhMuc = ? AND b.trang_thai = 'dang_ban'
    GROUP BY b.ID_BaiDang
    ORDER BY b.thoi_gian_tao DESC
  `;
  const [rows] = await pool.query(query, [categoryId]);
  return rows;
};

// Lấy bài đăng theo loại
baidang.getByType = async (typeId) => {
  const query = `
    SELECT 
      b.*,
      n.ho_ten as TenNguoiDung,
      n.anh_dai_dien,
      lb.ten as TenLoaiBaiDang,
      dm.ten as TenDanhMuc,
      COUNT(ba.ID) as SoLuongAnh,
      COUNT(lb_like.ID_BaiDang) as SoLuongLike,
      COUNT(bc.ID_BinhLuan) as SoLuongBinhLuan
    FROM baidang b
    LEFT JOIN nguoidung n ON b.ID_NguoiDung = n.ID_NguoiDung
    LEFT JOIN loaibaidang lb ON b.ID_LoaiBaiDang = lb.ID_LoaiBaiDang
    LEFT JOIN danhmuc dm ON b.ID_DanhMuc = dm.ID_DanhMuc
    LEFT JOIN baidang_anh ba ON b.ID_BaiDang = ba.ID_BaiDang
    LEFT JOIN likebaidang lb_like ON b.ID_BaiDang = lb_like.ID_BaiDang
    LEFT JOIN binhluanbaidang bc ON b.ID_BaiDang = bc.ID_BaiDang
    WHERE b.ID_LoaiBaiDang = ? AND b.trang_thai = 'dang_ban'
    GROUP BY b.ID_BaiDang
    ORDER BY b.thoi_gian_tao DESC
  `;
  const [rows] = await pool.query(query, [typeId]);
  return rows;
};

// Tìm kiếm bài đăng
baidang.search = async (keyword) => {
  const query = `
    SELECT 
      b.*,
      n.ho_ten as TenNguoiDung,
      n.anh_dai_dien,
      lb.ten as TenLoaiBaiDang,
      dm.ten as TenDanhMuc,
      COUNT(ba.ID) as SoLuongAnh,
      COUNT(lb_like.ID_BaiDang) as SoLuongLike,
      COUNT(bc.ID_BinhLuan) as SoLuongBinhLuan
    FROM baidang b
    LEFT JOIN nguoidung n ON b.ID_NguoiDung = n.ID_NguoiDung
    LEFT JOIN loaibaidang lb ON b.ID_LoaiBaiDang = lb.ID_LoaiBaiDang
    LEFT JOIN danhmuc dm ON b.ID_DanhMuc = dm.ID_DanhMuc
    LEFT JOIN baidang_anh ba ON b.ID_BaiDang = ba.ID_BaiDang
    LEFT JOIN likebaidang lb_like ON b.ID_BaiDang = lb_like.ID_BaiDang
    LEFT JOIN binhluanbaidang bc ON b.ID_BaiDang = bc.ID_BaiDang
    WHERE (b.tieu_de LIKE ? OR b.mo_ta LIKE ?) AND b.trang_thai = 'dang_ban'
    GROUP BY b.ID_BaiDang
    ORDER BY b.thoi_gian_tao DESC
  `;
  const searchTerm = `%${keyword}%`;
  const [rows] = await pool.query(query, [searchTerm, searchTerm]);
  return rows;
};

// Lấy bài đăng của người dùng
baidang.getByUserId = async (userId) => {
  const query = `
    SELECT 
      b.*,
      n.ho_ten as TenNguoiDung,
      n.anh_dai_dien,
      n.email,
      n.truong_hoc,
      lb.ten as TenLoaiBaiDang,
      dm.ten as TenDanhMuc,
      COUNT(DISTINCT ba.ID) as SoLuongAnh,
      COUNT(DISTINCT lb_like.ID_BaiDang) as SoLuongLike,
      COUNT(DISTINCT bc.ID_BinhLuan) as SoLuongBinhLuan,
      GROUP_CONCAT(ba.LinkAnh ORDER BY ba.ID ASC SEPARATOR '|') as DanhSachAnh
    FROM baidang b
    LEFT JOIN nguoidung n ON b.ID_NguoiDung = n.ID_NguoiDung
    LEFT JOIN loaibaidang lb ON b.ID_LoaiBaiDang = lb.ID_LoaiBaiDang
    LEFT JOIN danhmuc dm ON b.ID_DanhMuc = dm.ID_DanhMuc
    LEFT JOIN baidang_anh ba ON b.ID_BaiDang = ba.ID_BaiDang
    LEFT JOIN likebaidang lb_like ON b.ID_BaiDang = lb_like.ID_BaiDang
    LEFT JOIN binhluanbaidang bc ON b.ID_BaiDang = bc.ID_BaiDang
    WHERE b.ID_NguoiDung = ? AND b.trang_thai = 'dang_ban'
    GROUP BY b.ID_BaiDang
    ORDER BY b.thoi_gian_tao DESC
  `;
  const [rows] = await pool.query(query, [userId]);
  
  // Chuyển đổi chuỗi danh sách ảnh thành mảng và sử dụng trực tiếp URL CDN
  return rows.map(row => ({
    ...row,
    DanhSachAnh: row.DanhSachAnh ? row.DanhSachAnh.split('|') : []
  }));
};

// Các method cũ (giữ nguyên)
baidang.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM baidang");
  return rows;
};

baidang.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM baidang WHERE ID_BaiDang = ?", [id]);
  return rows[0];
};

baidang.insert = async (data) => {
  const [result] = await pool.query("INSERT INTO baidang SET ?", [data]);
  return result.insertId;
};

baidang.update = async (id, data) => {
  const [result] = await pool.query("UPDATE baidang SET ? WHERE ID_BaiDang= ?", [data, id]);
  return result.affectedRows;
};

baidang.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM baidang WHERE ID_BaiDang = ?", [id]);
  return result.affectedRows;
};

// Xóa tất cả bài đăng của người dùng theo ID
baidang.deleteAllByUserId = async (userId) => {
  const [result] = await pool.query("DELETE FROM baidang WHERE ID_NguoiDung = ?", [userId]);
  return result.affectedRows;
};

// Lấy danh sách ID bài đăng của người dùng
baidang.getPostIdsByUserId = async (userId) => {
  const [rows] = await pool.query("SELECT ID_BaiDang FROM baidang WHERE ID_NguoiDung = ?", [userId]);
  return rows.map(row => row.ID_BaiDang);
};

module.exports = baidang;