const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const tinnhanai = {}; // Using an object to hold methods
let ensureTablePromise = null;

const buildLocationLikeTerms = (location) => {
  const terms = [location];
  const shortLocation = String(location || "").replace(/^(Quận|Huyện|Thành phố|TP|Phường|Xã|Đường)\s+/i, "").trim();

  if (shortLocation && !/^\d+$/.test(shortLocation)) {
    terms.push(shortLocation);
  }

  return [...new Set(terms)].map((term) => `%${term}%`);
};

tinnhanai.ensureTable = async () => {
  if (!ensureTablePromise) {
    ensureTablePromise = pool.query(`
      CREATE TABLE IF NOT EXISTS tinnhanai (
        ID_TinNhanAI char(36) NOT NULL,
        ID_NguoiDung char(36) NOT NULL,
        noi_dung_gui text NOT NULL,
        noi_dung_tra_loi text,
        thoi_gian_gui timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (ID_TinNhanAI),
        KEY ID_NguoiDung (ID_NguoiDung),
        CONSTRAINT tinnhanai_ibfk_1
          FOREIGN KEY (ID_NguoiDung)
          REFERENCES nguoidung (ID_NguoiDung)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `).catch(async (error) => {
      ensureTablePromise = null;

      if (String(error.message || "").includes("Unknown collation")) {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS tinnhanai (
            ID_TinNhanAI char(36) NOT NULL,
            ID_NguoiDung char(36) NOT NULL,
            noi_dung_gui text NOT NULL,
            noi_dung_tra_loi text,
            thoi_gian_gui timestamp NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (ID_TinNhanAI),
            KEY ID_NguoiDung (ID_NguoiDung),
            CONSTRAINT tinnhanai_ibfk_1
              FOREIGN KEY (ID_NguoiDung)
              REFERENCES nguoidung (ID_NguoiDung)
              ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        ensureTablePromise = Promise.resolve();
        return;
      }

      throw error;
    });
  }

  return ensureTablePromise;
};

// Lấy tất cả tinnhanai
tinnhanai.getAll = async () => {
  await tinnhanai.ensureTable();
  const [rows] = await pool.query("SELECT * FROM tinnhanai");
  return rows;
};

// Lấy tinnhanai theo ID
tinnhanai.getById = async (id) => {
  await tinnhanai.ensureTable();
  const [rows] = await pool.query("SELECT * FROM tinnhanai WHERE ID_TinNhanAI = ?", [id]);
  return rows[0];
};

// Thêm tinnhanai
tinnhanai.insert = async (data) => {
  await tinnhanai.ensureTable();
  const payload = {
    ...data,
    ID_TinNhanAI: data.ID_TinNhanAI || uuidv4(),
  };

  await pool.query("INSERT INTO tinnhanai SET ?", [payload]);
  return payload.ID_TinNhanAI;
};

// Cập nhật tinnhanai
tinnhanai.update = async (id, data) => {
  await tinnhanai.ensureTable();
  const [result] = await pool.query("UPDATE tinnhanai SET ? WHERE ID_TinNhanAI = ?", [data, id]);
  return result.affectedRows;
};

// Xóa tinnhanai
tinnhanai.delete = async (id) => {
  await tinnhanai.ensureTable();
  const [result] = await pool.query("DELETE FROM tinnhanai WHERE ID_TinNhanAI = ?", [id]);
  return result.affectedRows;
};

tinnhanai.getRecentByUserId = async (userId, limit = 6) => {
  await tinnhanai.ensureTable();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 12));
  const [rows] = await pool.query(
    `SELECT ID_TinNhanAI, noi_dung_gui, noi_dung_tra_loi, thoi_gian_gui
     FROM tinnhanai
     WHERE ID_NguoiDung = ?
     ORDER BY thoi_gian_gui DESC
     LIMIT ?`,
    [userId, safeLimit]
  );

  return rows.reverse();
};

tinnhanai.getLocationCatalog = async (limit = 700) => {
  const safeLimit = Math.max(50, Math.min(Number(limit) || 700, 1500));
  const [rows] = await pool.query(
    `SELECT TRIM(b.vi_tri) AS vi_tri, COUNT(*) AS total
     FROM baidang b
     WHERE b.trang_thai IN ('dang_ban', 'da_tang')
       AND b.vi_tri IS NOT NULL
       AND TRIM(b.vi_tri) <> ''
     GROUP BY TRIM(b.vi_tri)
     ORDER BY total DESC, vi_tri ASC
     LIMIT ?`,
    [safeLimit]
  );

  return rows;
};

tinnhanai.searchRelevantPosts = async ({ keywords = [], phrases = [], locationTerms = [], maxPrice = null, limit = 8 } = {}) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 8, 12));
  const safeKeywords = [...new Set(keywords.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 8);
  const safePhrases = [...new Set(phrases.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 5);
  const safeLocationTerms = [...new Set(locationTerms.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 3);
  const whereParts = ["b.trang_thai IN ('dang_ban', 'da_tang')"];
  const whereParams = [];
  const scoreParts = [];
  const scoreParams = [];
  const hasSearchTerms = safePhrases.length > 0 || safeKeywords.length > 0 || safeLocationTerms.length > 0;

  if (!hasSearchTerms && !(Number.isFinite(maxPrice) && maxPrice > 0)) {
    return [];
  }

  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    whereParts.push("b.gia IS NOT NULL AND b.gia <= ?");
    whereParams.push(maxPrice);
  }

  if (safeLocationTerms.length > 0) {
    const locationWhereParts = [];

    safeLocationTerms.forEach((location) => {
      const terms = buildLocationLikeTerms(location);
      const termWhereParts = [];

      terms.forEach((term) => {
        termWhereParts.push("b.vi_tri LIKE ?");
        whereParams.push(term);

        scoreParts.push("(CASE WHEN b.vi_tri LIKE ? THEN 34 ELSE 0 END)");
        scoreParams.push(term);
      });

      locationWhereParts.push(`(${termWhereParts.join(" OR ")})`);
    });

    whereParts.push(`(${locationWhereParts.join(" OR ")})`);
  }

  if (safePhrases.length > 0) {
    const phraseWhereParts = [];

    safePhrases.forEach((phrase) => {
      const term = `%${phrase}%`;
      phraseWhereParts.push("(b.tieu_de LIKE ? OR b.mo_ta LIKE ? OR dm.ten LIKE ? OR lb.ten LIKE ?)");
      whereParams.push(term, term, term, term);

      scoreParts.push(`
        (CASE WHEN b.tieu_de LIKE ? THEN 36 ELSE 0 END) +
        (CASE WHEN dm.ten LIKE ? THEN 22 ELSE 0 END) +
        (CASE WHEN lb.ten LIKE ? THEN 18 ELSE 0 END) +
        (CASE WHEN b.mo_ta LIKE ? THEN 12 ELSE 0 END)
      `);
      scoreParams.push(term, term, term, term);
    });

    whereParts.push(`(${phraseWhereParts.join(" OR ")})`);
  } else if (safeKeywords.length > 0) {
    const keywordWhereParts = [];

    safeKeywords.forEach((keyword) => {
      const term = `%${keyword}%`;
      keywordWhereParts.push("(b.tieu_de LIKE ? OR b.mo_ta LIKE ? OR b.vi_tri LIKE ? OR dm.ten LIKE ? OR lb.ten LIKE ?)");
      whereParams.push(term, term, term, term, term);

      scoreParts.push(`
        (CASE WHEN b.tieu_de LIKE ? THEN 8 ELSE 0 END) +
        (CASE WHEN dm.ten LIKE ? THEN 5 ELSE 0 END) +
        (CASE WHEN lb.ten LIKE ? THEN 4 ELSE 0 END) +
        (CASE WHEN b.mo_ta LIKE ? THEN 3 ELSE 0 END) +
        (CASE WHEN b.vi_tri LIKE ? THEN 2 ELSE 0 END)
      `);
      scoreParams.push(term, term, term, term, term);
    });

    whereParts.push(`(${keywordWhereParts.join(" OR ")})`);
  }

  if (safePhrases.length > 0 && safeKeywords.length > 0) {
    safeKeywords.forEach((keyword) => {
      const term = `%${keyword}%`;
      scoreParts.push(`
        (CASE WHEN b.tieu_de LIKE ? THEN 5 ELSE 0 END) +
        (CASE WHEN dm.ten LIKE ? THEN 3 ELSE 0 END) +
        (CASE WHEN lb.ten LIKE ? THEN 3 ELSE 0 END) +
        (CASE WHEN b.mo_ta LIKE ? THEN 2 ELSE 0 END) +
        (CASE WHEN b.vi_tri LIKE ? THEN 1 ELSE 0 END)
      `);
      scoreParams.push(term, term, term, term, term);
    });
  }

  const scoreSql = scoreParts.length > 0 ? scoreParts.join(" + ") : "0";

  const [rows] = await pool.query(
    `SELECT
        b.ID_BaiDang,
        b.ID_NguoiDung,
        b.tieu_de,
        b.mo_ta,
        b.gia,
        b.vi_tri,
        b.trang_thai,
        b.thoi_gian_tao,
        n.ho_ten AS TenNguoiDung,
        n.anh_dai_dien,
        lb.ten AS TenLoaiBaiDang,
        dm.ten AS TenDanhMuc,
        COUNT(DISTINCT like_stats.ID_NguoiDung) AS SoLuongLike,
        COUNT(DISTINCT comment_stats.ID_BinhLuan) AS SoLuongBinhLuan,
        GROUP_CONCAT(DISTINCT ba.LinkAnh SEPARATOR '|') AS DanhSachAnh,
        (${scoreSql}) AS relevance_score
      FROM baidang b
      LEFT JOIN nguoidung n ON b.ID_NguoiDung = n.ID_NguoiDung
      LEFT JOIN loaibaidang lb ON b.ID_LoaiBaiDang = lb.ID_LoaiBaiDang
      LEFT JOIN danhmuc dm ON b.ID_DanhMuc = dm.ID_DanhMuc
      LEFT JOIN baidang_anh ba ON b.ID_BaiDang = ba.ID_BaiDang
      LEFT JOIN likebaidang like_stats ON b.ID_BaiDang = like_stats.ID_BaiDang
      LEFT JOIN binhluanbaidang comment_stats ON b.ID_BaiDang = comment_stats.ID_BaiDang
      WHERE ${whereParts.join(" AND ")}
      GROUP BY b.ID_BaiDang
      ORDER BY relevance_score DESC, b.thoi_gian_tao DESC
      LIMIT ?`,
    [...scoreParams, ...whereParams, safeLimit]
  );

  return rows.map((row) => ({
    ...row,
    DanhSachAnh: row.DanhSachAnh ? row.DanhSachAnh.split("|") : [],
  }));
};

module.exports = tinnhanai;
