const pool = require("../config/database");
const { v4: uuidv4 } = require('uuid');

const thongbao = {}; // Using an object to hold methods

// Lấy tất cả thongbao
thongbao.getAll = async () => {
  const [rows] = await pool.query("SELECT * FROM thongbao ORDER BY thoi_gian_tao DESC");
  return rows;
};

// Lấy thongbao theo ID
thongbao.getById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM thongbao WHERE ID_ThongBao = ?", [id]);
  return rows[0];
};

// Lấy thông báo theo user ID
thongbao.getByUserId = async (userId, limit = 50) => {
  const [rows] = await pool.query(
    `SELECT tb.*, 
     nd.ho_ten as nguoi_gui_ten,
     nd.anh_dai_dien as nguoi_gui_avatar
     FROM thongbao tb
     LEFT JOIN nguoidung nd ON tb.ID_NguoiGui = nd.ID_NguoiDung
     WHERE tb.ID_NguoiDung = ?
     ORDER BY tb.thoi_gian_tao DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows;
};

// Đếm thông báo chưa đọc
thongbao.countUnread = async (userId) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as unread_count FROM thongbao WHERE ID_NguoiDung = ? AND da_doc = 0",
    [userId]
  );
  return rows[0].unread_count;
};

// Đánh dấu đã đọc một thông báo
thongbao.markAsRead = async (id) => {
  const [result] = await pool.query(
    "UPDATE thongbao SET da_doc = 1 WHERE ID_ThongBao = ?",
    [id]
  );
  return result.affectedRows;
};

// Đánh dấu tất cả thông báo đã đọc
thongbao.markAllAsRead = async (userId) => {
  const [result] = await pool.query(
    "UPDATE thongbao SET da_doc = 1 WHERE ID_NguoiDung = ? AND da_doc = 0",
    [userId]
  );
  return result.affectedRows;
};

// Thêm thongbao
thongbao.insert = async (data, io = null) => {
  const id = uuidv4();
  const insertData = {
    ID_ThongBao: id,
    ...data,
  };
  await pool.query("INSERT INTO thongbao SET ?", [insertData]);
  
  // 🔔 Emit socket event cho người nhận để load ngay
  if (io && data.ID_NguoiDung) {
    io.emit(`notification_${data.ID_NguoiDung}`, {
      type: 'new_notification',
      notification_id: id,
      message: 'Bạn có thông báo mới'
    });
  }
  
  return id;
};

// Tạo thông báo cho like bài đăng
thongbao.createLikeNotification = async (postId, postOwnerId, likerId, io = null) => {
  const [post] = await pool.query("SELECT tieu_de FROM baidang WHERE ID_BaiDang = ?", [postId]);
  const [liker] = await pool.query("SELECT ho_ten FROM nguoidung WHERE ID_NguoiDung = ?", [likerId]);
  
  if (!post[0] || !liker[0] || postOwnerId === likerId) return null;
  
  const notificationData = {
    ID_NguoiDung: postOwnerId,
    ID_NguoiGui: likerId,
    loai: 'phan_hoi_bai_dang',
    noi_dung: `${liker[0].ho_ten} đã thích bài đăng của bạn`,
    lien_ket: `/post/${postId}`,
    da_doc: 0,
  };
  
  return await thongbao.insert(notificationData, io);
};

// Tạo thông báo cho bình luận bài đăng
thongbao.createCommentNotification = async (postId, postOwnerId, commenterId, io = null) => {
  const [post] = await pool.query("SELECT tieu_de FROM baidang WHERE ID_BaiDang = ?", [postId]);
  const [commenter] = await pool.query("SELECT ho_ten FROM nguoidung WHERE ID_NguoiDung = ?", [commenterId]);
  
  if (!post[0] || !commenter[0] || postOwnerId === commenterId) return null;
  
  const notificationData = {
    ID_NguoiDung: postOwnerId,
    ID_NguoiGui: commenterId,
    loai: 'phan_hoi_bai_dang',
    noi_dung: `${commenter[0].ho_ten} đã bình luận bài đăng của bạn`,
    lien_ket: `/post/${postId}`,
    da_doc: 0,
  };
  
  return await thongbao.insert(notificationData, io);
};

// Tạo thông báo cho tin nhắn mới
thongbao.createMessageNotification = async (receiverId, senderId, io = null) => {
  const [sender] = await pool.query("SELECT ho_ten FROM nguoidung WHERE ID_NguoiDung = ?", [senderId]);
  
  if (!sender[0]) return null;
  
  const notificationData = {
    ID_NguoiDung: receiverId,
    ID_NguoiGui: senderId,
    loai: 'tin_nhan',
    noi_dung: `${sender[0].ho_ten} đã gửi tin nhắn cho bạn`,
    lien_ket: `/chat/${senderId}`,
    da_doc: 0,
  };
  
  return await thongbao.insert(notificationData, io);
};

// Cập nhật thongbao
thongbao.update = async (id, data) => {
  const [result] = await pool.query("UPDATE thongbao SET ? WHERE ID_ThongBao = ?", [data, id]);
  return result.affectedRows;
};

// Xóa thongbao
thongbao.delete = async (id) => {
  const [result] = await pool.query("DELETE FROM thongbao WHERE ID_ThongBao = ?", [id]);
  return result.affectedRows;
};

module.exports = thongbao;
