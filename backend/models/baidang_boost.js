const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const BOOST_PACKAGES = [
  {
    id: "boost_1d",
    name: "Đẩy 1 ngày",
    points: 50,
    hours: 24,
    boostScore: 120,
    description: "Phù hợp để kéo bài lên khu vực xu hướng trong ngày.",
  },
  {
    id: "boost_3d",
    name: "Đẩy 3 ngày",
    points: 120,
    hours: 72,
    boostScore: 175,
    description: "Tối ưu cho bài có giá trị cao hoặc cần bán nhanh.",
  },
  {
    id: "boost_7d",
    name: "Đẩy 7 ngày",
    points: 250,
    hours: 168,
    boostScore: 240,
    description: "Hiển thị bền hơn nhưng vẫn giảm độ nóng theo thời gian.",
  },
];

const CATEGORY_CAP = 3;
const DEFAULT_GRAVITY = 1.6;

let pointHistoryColumnsPromise = null;

const createHttpError = (status, message, extra = {}) =>
  Object.assign(new Error(message), { status, ...extra });

const getPackageById = (packageId) =>
  BOOST_PACKAGES.find((item) => item.id === packageId) || BOOST_PACKAGES[0];

async function ensureBoostTable(queryable = pool) {
  await queryable.query(`
    CREATE TABLE IF NOT EXISTS baidang_boost (
      ID_Boost CHAR(36) NOT NULL,
      ID_BaiDang CHAR(36) NOT NULL,
      ID_NguoiDung CHAR(36) NOT NULL,
      goi VARCHAR(32) NOT NULL,
      ten_goi VARCHAR(100) NOT NULL,
      diem_da_tru INT NOT NULL,
      so_gio INT NOT NULL,
      boost_score DECIMAL(10,2) NOT NULL,
      trang_thai ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
      bat_dau_luc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ket_thuc_luc DATETIME NOT NULL,
      thoi_gian_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      thoi_gian_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (ID_Boost),
      KEY idx_boost_post_active (ID_BaiDang, trang_thai, ket_thuc_luc),
      KEY idx_boost_user_created (ID_NguoiDung, thoi_gian_tao),
      KEY idx_boost_active_until (trang_thai, ket_thuc_luc)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await queryable.query(`
    ALTER TABLE baidang_boost
    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `);
}

async function getPointHistoryColumns(connection) {
  if (!pointHistoryColumnsPromise) {
    pointHistoryColumnsPromise = connection
      .query("SHOW COLUMNS FROM lich_su_tich_diem")
      .then(([rows]) => new Set(rows.map((row) => row.Field)));
  }

  return pointHistoryColumnsPromise;
}

async function insertPointHistory(connection, data) {
  const columns = await getPointHistoryColumns(connection);

  if (columns.has("diem_thay_doi")) {
    await connection.query("INSERT INTO lich_su_tich_diem SET ?", [
      {
        ID_LichSu: uuidv4(),
        ID_NguoiDung: data.userId,
        loai_giao_dich: "tru_diem",
        diem_thay_doi: data.pointChange,
        diem_truoc: data.pointsBefore,
        diem_sau: data.pointsAfter,
        mo_ta: data.description,
        ID_ThamChieu: data.referenceId,
        thoi_gian_tao: new Date(),
      },
    ]);
    return;
  }

  await connection.query("INSERT INTO lich_su_tich_diem SET ?", [
    {
      ID_NguoiDung: data.userId,
      loai_giao_dich: "tru_diem",
      thay_doi_diem: data.pointChange,
      mo_ta: data.description,
      ID_tham_chieu: data.referenceId,
    },
  ]);
}

async function getPreferredCategoryIds(userId) {
  if (!userId) return [];

  const [rows] = await pool.query(
    `
      SELECT b.ID_DanhMuc, COUNT(*) AS weight
      FROM (
        SELECT ID_BaiDang FROM likebaidang WHERE ID_NguoiDung = ?
        UNION ALL
        SELECT ID_BaiDang FROM binhluanbaidang WHERE ID_NguoiDung = ?
      ) interaction
      INNER JOIN baidang b ON b.ID_BaiDang = interaction.ID_BaiDang
      WHERE b.ID_DanhMuc IS NOT NULL
      GROUP BY b.ID_DanhMuc
      ORDER BY weight DESC
      LIMIT 5
    `,
    [userId, userId]
  );

  return rows.map((row) => row.ID_DanhMuc).filter(Boolean);
}

function applyCategoryCap(rows, limit) {
  const countsByCategory = new Map();
  const capped = [];

  for (const row of rows) {
    const categoryKey = row.ID_DanhMuc || "uncategorized";
    const currentCount = countsByCategory.get(categoryKey) || 0;

    if (currentCount >= CATEGORY_CAP) continue;

    countsByCategory.set(categoryKey, currentCount + 1);
    capped.push({
      ...row,
      DanhSachAnh: row.DanhSachAnh ? String(row.DanhSachAnh).split("|") : [],
      isBoosted: true,
    });

    if (capped.length >= limit) break;
  }

  return capped;
}

async function getActiveBoostedPosts(options = {}) {
  await ensureBoostTable();

  const limit = Math.min(Math.max(Number(options.limit) || 8, 1), 20);
  const hardLimit = Math.max(limit * 4, 20);
  const categoryId = String(options.categoryId || "").trim();
  const viewerId = String(options.viewerId || "").trim();
  const preferredCategoryIds = await getPreferredCategoryIds(viewerId);

  const where = [
    "bb.trang_thai = 'active'",
    "bb.ket_thuc_luc > NOW()",
    "b.trang_thai = 'dang_ban'",
  ];
  const whereParams = [];

  if (categoryId) {
    where.push("b.ID_DanhMuc = ?");
    whereParams.push(categoryId);
  }

  const personalScoreSql = preferredCategoryIds.length
    ? `CASE WHEN b.ID_DanhMuc IN (${preferredCategoryIds.map(() => "?").join(",")}) THEN 35 ELSE 0 END`
    : "0";

  const sql = `
    SELECT
      b.*,
      n.ho_ten AS TenNguoiDung,
      n.anh_dai_dien,
      n.email,
      lb.ten AS TenLoaiBaiDang,
      dm.ten AS TenDanhMuc,
      COALESCE(image_stats.SoLuongAnh, 0) AS SoLuongAnh,
      COALESCE(like_stats.like_count, 0) AS SoLuongLike,
      COALESCE(comment_stats.comment_count, 0) AS SoLuongBinhLuan,
      image_stats.DanhSachAnh,
      bb.ID_Boost,
      bb.goi AS boost_package_id,
      bb.ten_goi AS boost_package_name,
      bb.diem_da_tru AS boost_points_spent,
      bb.boost_score,
      bb.bat_dau_luc AS boost_started_at,
      bb.ket_thuc_luc AS boost_ends_at,
      GREATEST(TIMESTAMPDIFF(HOUR, bb.bat_dau_luc, NOW()), 0) AS boost_age_hours,
      (
        (bb.boost_score + COALESCE(like_stats.like_count, 0) * 4 + COALESCE(comment_stats.comment_count, 0) * 2 + ${personalScoreSql})
        / POW(GREATEST(TIMESTAMPDIFF(HOUR, bb.bat_dau_luc, NOW()), 0) + 2, ?)
      ) AS display_score
    FROM baidang_boost bb
    INNER JOIN (
      SELECT ID_BaiDang, MAX(bat_dau_luc) AS latest_started_at
      FROM baidang_boost
      WHERE trang_thai = 'active' AND ket_thuc_luc > NOW()
      GROUP BY ID_BaiDang
    ) latest ON latest.ID_BaiDang = bb.ID_BaiDang AND latest.latest_started_at = bb.bat_dau_luc
    INNER JOIN baidang b ON b.ID_BaiDang = bb.ID_BaiDang
    LEFT JOIN nguoidung n ON b.ID_NguoiDung = n.ID_NguoiDung
    LEFT JOIN loaibaidang lb ON b.ID_LoaiBaiDang = lb.ID_LoaiBaiDang
    LEFT JOIN danhmuc dm ON b.ID_DanhMuc = dm.ID_DanhMuc
    LEFT JOIN (
      SELECT ID_BaiDang, COUNT(*) AS SoLuongAnh, GROUP_CONCAT(LinkAnh SEPARATOR '|') AS DanhSachAnh
      FROM baidang_anh
      GROUP BY ID_BaiDang
    ) image_stats ON image_stats.ID_BaiDang = b.ID_BaiDang
    LEFT JOIN (
      SELECT ID_BaiDang, COUNT(*) AS like_count
      FROM likebaidang
      GROUP BY ID_BaiDang
    ) like_stats ON like_stats.ID_BaiDang = b.ID_BaiDang
    LEFT JOIN (
      SELECT ID_BaiDang, COUNT(*) AS comment_count
      FROM binhluanbaidang
      GROUP BY ID_BaiDang
    ) comment_stats ON comment_stats.ID_BaiDang = b.ID_BaiDang
    WHERE ${where.join(" AND ")}
    ORDER BY display_score DESC, bb.bat_dau_luc DESC
    LIMIT ?
  `;

  const params = [
    ...preferredCategoryIds,
    DEFAULT_GRAVITY,
    ...whereParams,
    hardLimit,
  ];

  const [rows] = await pool.query(sql, params);
  return applyCategoryCap(rows, limit);
}

async function purchaseBoost({ userId, postId, packageId }) {
  await ensureBoostTable();

  const selectedPackage = getPackageById(packageId);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [posts] = await connection.query(
      "SELECT ID_BaiDang, ID_NguoiDung, trang_thai, tieu_de FROM baidang WHERE ID_BaiDang = ? FOR UPDATE",
      [postId]
    );
    const post = posts[0];

    if (!post) {
      throw createHttpError(404, "Bài đăng không tồn tại");
    }

    if (String(post.ID_NguoiDung) !== String(userId)) {
      throw createHttpError(403, "Bạn chỉ có thể đẩy bài đăng của chính mình");
    }

    if (String(post.trang_thai || "").trim() !== "dang_ban") {
      throw createHttpError(409, "Chỉ có thể đẩy bài đang bán");
    }

    const [users] = await connection.query(
      "SELECT diem_so FROM nguoidung WHERE ID_NguoiDung = ? FOR UPDATE",
      [userId]
    );
    const currentPoints = Number(users[0]?.diem_so || 0);

    if (!users.length) {
      throw createHttpError(404, "Không tìm thấy người dùng");
    }

    if (currentPoints < selectedPackage.points) {
      throw createHttpError(400, "Không đủ điểm để mua gói đẩy bài", {
        currentPoints,
        requiredPoints: selectedPackage.points,
      });
    }

    const boostId = uuidv4();
    const nextPoints = currentPoints - selectedPackage.points;

    await connection.query(
      `
        INSERT INTO baidang_boost
          (ID_Boost, ID_BaiDang, ID_NguoiDung, goi, ten_goi, diem_da_tru, so_gio, boost_score, bat_dau_luc, ket_thuc_luc)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? HOUR))
      `,
      [
        boostId,
        postId,
        userId,
        selectedPackage.id,
        selectedPackage.name,
        selectedPackage.points,
        selectedPackage.hours,
        selectedPackage.boostScore,
        selectedPackage.hours,
      ]
    );

    await connection.query(
      "UPDATE nguoidung SET diem_so = ? WHERE ID_NguoiDung = ?",
      [nextPoints, userId]
    );

    await insertPointHistory(connection, {
      userId,
      pointChange: -selectedPackage.points,
      pointsBefore: currentPoints,
      pointsAfter: nextPoints,
      description: `Mua gói đẩy bài "${selectedPackage.name}" cho bài "${post.tieu_de}"`,
      referenceId: boostId,
    });

    await connection.commit();

    return {
      ID_Boost: boostId,
      ID_BaiDang: postId,
      package: selectedPackage,
      currentPoints: nextPoints,
      boostEndsAt: new Date(Date.now() + selectedPackage.hours * 60 * 60 * 1000),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  BOOST_PACKAGES,
  ensureBoostTable,
  getActiveBoostedPosts,
  purchaseBoost,
};
