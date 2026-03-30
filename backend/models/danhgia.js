const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

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
  const payload = { ...data };
  if (!payload.ID_DanhGia) {
    payload.ID_DanhGia = uuidv4();
  }

  await pool.query("INSERT INTO danhgia SET ?", [payload]);
  return payload.ID_DanhGia;
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

danhgia.getUserReviewByReviewer = async (reviewerId, targetUserId) => {
  const [rows] = await pool.query(
    `
      SELECT *
      FROM danhgia
      WHERE loai = 'nguoi_dung' AND ID_NguoiDanhGia = ? AND doi_tuong_id = ?
      LIMIT 1
    `,
    [reviewerId, targetUserId],
  );

  return rows[0] || null;
};

danhgia.upsertUserReview = async ({ reviewerId, targetUserId, rating, comment }) => {
  const existingReview = await danhgia.getUserReviewByReviewer(reviewerId, targetUserId);
  const payload = {
    ID_NguoiDanhGia: reviewerId,
    doi_tuong_id: targetUserId,
    loai: "nguoi_dung",
    diem_so: rating,
    binh_luan: comment || null,
  };

  if (existingReview) {
    await pool.query("UPDATE danhgia SET ? WHERE ID_DanhGia = ?", [payload, existingReview.ID_DanhGia]);
    return {
      id: existingReview.ID_DanhGia,
      mode: "updated",
    };
  }

  const id = await danhgia.insert(payload);
  return {
    id,
    mode: "created",
  };
};

module.exports = danhgia;
