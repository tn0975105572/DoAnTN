const pool = require("../config/database");

const profile = {};

const normalizeLimit = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

profile.getUserBase = async (userId) => {
  const [rows] = await pool.query("SELECT * FROM nguoidung WHERE ID_NguoiDung = ? LIMIT 1", [userId]);
  return rows[0] || null;
};

profile.getLatestVerification = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT ID_XacThuc, trang_thai, thoi_gian_tao, thoi_gian_cap_nhat
      FROM xac_thuc_tai_khoan
      WHERE ID_NguoiDung = ?
      ORDER BY thoi_gian_cap_nhat DESC, thoi_gian_tao DESC
      LIMIT 1
    `,
    [userId],
  );

  return rows[0] || null;
};

profile.getFriendPreview = async (userId, limit = 6) => {
  const safeLimit = normalizeLimit(limit, 6);
  const [rows] = await pool.query(
    `
      SELECT
        u.ID_NguoiDung,
        u.ho_ten,
        u.anh_dai_dien,
        u.truong_hoc,
        u.que_quan,
        MAX(f.connected_at) AS connected_at
      FROM nguoidung u
      INNER JOIN (
        SELECT ID_NguoiNhan AS friend_id, thoi_gian_cap_nhat AS connected_at
        FROM quanhebanbe
        WHERE ID_NguoiGui = ? AND trang_thai = 'da_dong_y'
        UNION ALL
        SELECT ID_NguoiGui AS friend_id, thoi_gian_cap_nhat AS connected_at
        FROM quanhebanbe
        WHERE ID_NguoiNhan = ? AND trang_thai = 'da_dong_y'
      ) f ON f.friend_id = u.ID_NguoiDung
      GROUP BY u.ID_NguoiDung, u.ho_ten, u.anh_dai_dien, u.truong_hoc, u.que_quan
      ORDER BY connected_at DESC, u.ho_ten ASC
      LIMIT ?
    `,
    [userId, userId, safeLimit],
  );

  return rows;
};

profile.getFriendCount = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT COUNT(*) AS total_friends
      FROM (
        SELECT ID_NguoiNhan AS friend_id
        FROM quanhebanbe
        WHERE ID_NguoiGui = ? AND trang_thai = 'da_dong_y'
        UNION
        SELECT ID_NguoiGui AS friend_id
        FROM quanhebanbe
        WHERE ID_NguoiNhan = ? AND trang_thai = 'da_dong_y'
      ) f
    `,
    [userId, userId],
  );

  return rows[0]?.total_friends || 0;
};

profile.getFriendshipRecord = async (viewerId, targetUserId) => {
  if (!viewerId || !targetUserId || viewerId === targetUserId) {
    return null;
  }

  const [rows] = await pool.query(
    `
      SELECT *
      FROM quanhebanbe
      WHERE
        (ID_NguoiGui = ? AND ID_NguoiNhan = ?)
        OR
        (ID_NguoiGui = ? AND ID_NguoiNhan = ?)
      LIMIT 1
    `,
    [viewerId, targetUserId, targetUserId, viewerId],
  );

  return rows[0] || null;
};

profile.getMutualFriendCount = async (viewerId, targetUserId) => {
  if (!viewerId || !targetUserId || viewerId === targetUserId) {
    return 0;
  }

  const [rows] = await pool.query(
    `
      SELECT COUNT(*) AS mutual_friends
      FROM (
        SELECT friend_id
        FROM (
          SELECT ID_NguoiNhan AS friend_id
          FROM quanhebanbe
          WHERE ID_NguoiGui = ? AND trang_thai = 'da_dong_y'
          UNION
          SELECT ID_NguoiGui AS friend_id
          FROM quanhebanbe
          WHERE ID_NguoiNhan = ? AND trang_thai = 'da_dong_y'
        ) viewer_friends
      ) vf
      INNER JOIN (
        SELECT friend_id
        FROM (
          SELECT ID_NguoiNhan AS friend_id
          FROM quanhebanbe
          WHERE ID_NguoiGui = ? AND trang_thai = 'da_dong_y'
          UNION
          SELECT ID_NguoiGui AS friend_id
          FROM quanhebanbe
          WHERE ID_NguoiNhan = ? AND trang_thai = 'da_dong_y'
        ) target_friends
      ) tf ON tf.friend_id = vf.friend_id
    `,
    [viewerId, viewerId, targetUserId, targetUserId],
  );

  return rows[0]?.mutual_friends || 0;
};

profile.getListingStats = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT
        COUNT(*) AS total_listings,
        COALESCE(SUM(CASE WHEN trang_thai IN ('dang_ban', 'dang_giu_cho', 'dang_giao_dich') THEN 1 ELSE 0 END), 0) AS active_listings,
        COALESCE(SUM(CASE WHEN trang_thai = 'dang_giu_cho' THEN 1 ELSE 0 END), 0) AS reserved_listings,
        COALESCE(SUM(CASE WHEN trang_thai = 'dang_giao_dich' THEN 1 ELSE 0 END), 0) AS in_transaction_listings,
        COALESCE(SUM(CASE WHEN trang_thai = 'da_ban' THEN 1 ELSE 0 END), 0) AS sold_listings,
        COALESCE(SUM(CASE WHEN trang_thai = 'da_trao_doi' THEN 1 ELSE 0 END), 0) AS exchanged_listings,
        COALESCE(SUM(CASE WHEN trang_thai = 'da_tang' THEN 1 ELSE 0 END), 0) AS gifted_listings
      FROM baidang
      WHERE ID_NguoiDung = ?
    `,
    [userId],
  );

  return rows[0] || null;
};

profile.getEngagementStats = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT
        COALESCE(SUM(post_like_count), 0) AS total_likes_received,
        COALESCE(SUM(post_comment_count), 0) AS total_comments_received
      FROM (
        SELECT
          b.ID_BaiDang,
          (
            SELECT COUNT(*)
            FROM likebaidang l
            WHERE l.ID_BaiDang = b.ID_BaiDang
          ) AS post_like_count,
          (
            SELECT COUNT(*)
            FROM binhluanbaidang c
            WHERE c.ID_BaiDang = b.ID_BaiDang
          ) AS post_comment_count
        FROM baidang b
        WHERE b.ID_NguoiDung = ?
      ) post_stats
    `,
    [userId],
  );

  return rows[0] || null;
};

profile.getListings = async (userId, limit = 24) => {
  const safeLimit = normalizeLimit(limit, 24);
  const [rows] = await pool.query(
    `
      SELECT
        b.ID_BaiDang,
        b.ID_NguoiDung,
        b.ID_LoaiBaiDang,
        b.ID_DanhMuc,
        b.tieu_de,
        b.mo_ta,
        b.gia,
        b.vi_tri,
        b.trang_thai,
        b.thoi_gian_tao,
        b.thoi_gian_cap_nhat,
        lb.ten AS ten_loai_bai_dang,
        dm.ten AS ten_danh_muc,
        (
          SELECT COUNT(*)
          FROM likebaidang l
          WHERE l.ID_BaiDang = b.ID_BaiDang
        ) AS so_luot_thich,
        (
          SELECT COUNT(*)
          FROM binhluanbaidang c
          WHERE c.ID_BaiDang = b.ID_BaiDang
        ) AS so_binh_luan,
        (
          SELECT GROUP_CONCAT(ba.LinkAnh ORDER BY ba.ID ASC SEPARATOR '|')
          FROM baidang_anh ba
          WHERE ba.ID_BaiDang = b.ID_BaiDang
        ) AS danh_sach_anh
      FROM baidang b
      LEFT JOIN loaibaidang lb ON lb.ID_LoaiBaiDang = b.ID_LoaiBaiDang
      LEFT JOIN danhmuc dm ON dm.ID_DanhMuc = b.ID_DanhMuc
      WHERE b.ID_NguoiDung = ?
      ORDER BY b.thoi_gian_cap_nhat DESC, b.thoi_gian_tao DESC
      LIMIT ?
    `,
    [userId, safeLimit],
  );

  return rows;
};

profile.getAllListings = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT
        b.ID_BaiDang,
        b.ID_NguoiDung,
        b.ID_LoaiBaiDang,
        b.ID_DanhMuc,
        b.tieu_de,
        b.mo_ta,
        b.gia,
        b.vi_tri,
        b.trang_thai,
        b.thoi_gian_tao,
        b.thoi_gian_cap_nhat,
        lb.ten AS ten_loai_bai_dang,
        dm.ten AS ten_danh_muc,
        (
          SELECT COUNT(*)
          FROM likebaidang l
          WHERE l.ID_BaiDang = b.ID_BaiDang
        ) AS so_luot_thich,
        (
          SELECT COUNT(*)
          FROM binhluanbaidang c
          WHERE c.ID_BaiDang = b.ID_BaiDang
        ) AS so_binh_luan,
        (
          SELECT GROUP_CONCAT(ba.LinkAnh ORDER BY ba.ID ASC SEPARATOR '|')
          FROM baidang_anh ba
          WHERE ba.ID_BaiDang = b.ID_BaiDang
        ) AS danh_sach_anh
      FROM baidang b
      LEFT JOIN loaibaidang lb ON lb.ID_LoaiBaiDang = b.ID_LoaiBaiDang
      LEFT JOIN danhmuc dm ON dm.ID_DanhMuc = b.ID_DanhMuc
      WHERE b.ID_NguoiDung = ?
      ORDER BY b.thoi_gian_cap_nhat DESC, b.thoi_gian_tao DESC
    `,
    [userId],
  );

  return rows;
};

profile.getReviewSummary = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT
        COUNT(*) AS total_reviews,
        ROUND(AVG(diem_so), 1) AS average_rating
      FROM danhgia
      WHERE loai = 'nguoi_dung' AND doi_tuong_id = ?
    `,
    [userId],
  );

  return rows[0] || null;
};

profile.getReviewDistribution = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT diem_so, COUNT(*) AS total
      FROM danhgia
      WHERE loai = 'nguoi_dung' AND doi_tuong_id = ?
      GROUP BY diem_so
      ORDER BY diem_so DESC
    `,
    [userId],
  );

  return rows;
};

profile.getReviewItems = async (userId, limit = 8) => {
  const safeLimit = normalizeLimit(limit, 8);
  const [rows] = await pool.query(
    `
      SELECT
        d.ID_DanhGia,
        d.ID_NguoiDanhGia,
        d.diem_so,
        d.binh_luan,
        d.thoi_gian_tao,
        reviewer.ho_ten AS reviewer_name,
        reviewer.anh_dai_dien AS reviewer_avatar,
        reviewer.truong_hoc AS reviewer_school
      FROM danhgia d
      INNER JOIN nguoidung reviewer ON reviewer.ID_NguoiDung = d.ID_NguoiDanhGia
      WHERE d.loai = 'nguoi_dung' AND d.doi_tuong_id = ?
      ORDER BY d.thoi_gian_tao DESC
      LIMIT ?
    `,
    [userId, safeLimit],
  );

  return rows;
};

profile.getViewerReview = async (viewerId, userId) => {
  if (!viewerId || !userId || viewerId === userId) {
    return null;
  }

  const [rows] = await pool.query(
    `
      SELECT ID_DanhGia, diem_so, binh_luan, thoi_gian_tao
      FROM danhgia
      WHERE loai = 'nguoi_dung' AND doi_tuong_id = ? AND ID_NguoiDanhGia = ?
      LIMIT 1
    `,
    [userId, viewerId],
  );

  return rows[0] || null;
};

profile.getRecentPostActivities = async (userId, limit = 5) => {
  const safeLimit = normalizeLimit(limit, 5);
  const [rows] = await pool.query(
    `
      SELECT ID_BaiDang, tieu_de, trang_thai, thoi_gian_tao
      FROM baidang
      WHERE ID_NguoiDung = ?
      ORDER BY thoi_gian_tao DESC
      LIMIT ?
    `,
    [userId, safeLimit],
  );

  return rows;
};

profile.getRecentCommentActivities = async (userId, limit = 5) => {
  const safeLimit = normalizeLimit(limit, 5);
  const [rows] = await pool.query(
    `
      SELECT
        c.ID_BinhLuan,
        c.ID_BaiDang,
        c.noi_dung,
        c.thoi_gian_binh_luan,
        b.tieu_de AS post_title,
        commenter.ID_NguoiDung AS commenter_id,
        commenter.ho_ten AS commenter_name
      FROM binhluanbaidang c
      INNER JOIN baidang b ON b.ID_BaiDang = c.ID_BaiDang
      INNER JOIN nguoidung commenter ON commenter.ID_NguoiDung = c.ID_NguoiDung
      WHERE b.ID_NguoiDung = ? AND c.ID_NguoiDung <> ?
      ORDER BY c.thoi_gian_binh_luan DESC
      LIMIT ?
    `,
    [userId, userId, safeLimit],
  );

  return rows;
};

profile.getRecentReviewActivities = async (userId, limit = 5) => {
  const safeLimit = normalizeLimit(limit, 5);
  const [rows] = await pool.query(
    `
      SELECT
        d.ID_DanhGia,
        d.diem_so,
        d.binh_luan,
        d.thoi_gian_tao,
        reviewer.ID_NguoiDung AS reviewer_id,
        reviewer.ho_ten AS reviewer_name
      FROM danhgia d
      INNER JOIN nguoidung reviewer ON reviewer.ID_NguoiDung = d.ID_NguoiDanhGia
      WHERE d.loai = 'nguoi_dung' AND d.doi_tuong_id = ?
      ORDER BY d.thoi_gian_tao DESC
      LIMIT ?
    `,
    [userId, safeLimit],
  );

  return rows;
};

profile.getRecentPointActivities = async (userId, limit = 5) => {
  const safeLimit = normalizeLimit(limit, 5);
  const [rows] = await pool.query(
    `
      SELECT
        ntd.ID_NguoiDungTichDiem,
        ntd.loai_giao_dich,
        ntd.diem_truoc_khi_su_dung,
        ntd.diem_sau_khi_su_dung,
        ntd.thoi_gian_su_dung,
        t.ten_hang_muc,
        t.mo_ta
      FROM nguoidungtichdiem ntd
      LEFT JOIN tichdiem t ON t.ID_TichDiem = ntd.ID_TichDiem
      WHERE ntd.ID_NguoiDung = ?
      ORDER BY ntd.thoi_gian_su_dung DESC
      LIMIT ?
    `,
    [userId, safeLimit],
  );

  return rows;
};

profile.getRecentFriendActivities = async (userId, limit = 5) => {
  const safeLimit = normalizeLimit(limit, 5);
  const [rows] = await pool.query(
    `
      SELECT
        q.ID_QuanHe,
        q.ID_NguoiGui,
        q.ID_NguoiNhan,
        q.thoi_gian_cap_nhat,
        partner.ID_NguoiDung AS partner_id,
        partner.ho_ten AS partner_name
      FROM quanhebanbe q
      INNER JOIN nguoidung partner
        ON partner.ID_NguoiDung = CASE
          WHEN q.ID_NguoiGui = ? THEN q.ID_NguoiNhan
          ELSE q.ID_NguoiGui
        END
      WHERE (q.ID_NguoiGui = ? OR q.ID_NguoiNhan = ?) AND q.trang_thai = 'da_dong_y'
      ORDER BY q.thoi_gian_cap_nhat DESC
      LIMIT ?
    `,
    [userId, userId, userId, safeLimit],
  );

  return rows;
};

module.exports = profile;
