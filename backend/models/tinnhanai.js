const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const tinnhanai = {}; // Using an object to hold methods
let ensureTablePromise = null;
const SEARCH_CANDIDATE_LIMIT = Math.min(
  300,
  Math.max(60, Number(process.env.SEARCH_CANDIDATE_LIMIT || 140) || 140)
);
const ACTIVE_SEARCH_STATUSES = (process.env.SEARCH_ACTIVE_STATUSES || "dang_ban")
  .split(",")
  .map((status) => status.trim())
  .filter(Boolean);
const SEARCH_STOPWORDS = new Set([
  "ai", "anh", "ban", "bao", "bai", "cai", "can", "chiec", "cho", "co",
  "cua", "duoc", "duoi", "gia", "gi", "giup", "goi", "goiy", "hay",
  "khong", "kiem", "la", "minh", "mot", "mua", "muon", "nao", "nay",
  "ngan", "nghin", "nhung", "post", "ra", "search", "toi", "tim",
  "tr", "tren", "trieu", "ve", "voi",
]);

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

const normalizeSearchText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();

const tokenizeSearchText = (value) => normalizeSearchText(value).match(/[a-z0-9]+/g) || [];

const termMatchesField = (fieldValue, term) => {
  const normalizedField = normalizeSearchText(fieldValue);
  const normalizedTerm = normalizeSearchText(term).trim();
  if (!normalizedField || !normalizedTerm) return false;

  const termTokens = tokenizeSearchText(normalizedTerm);
  if (!termTokens.length) return false;

  if (termTokens.length > 1) {
    return normalizedField.includes(termTokens.join(" ")) ||
      termTokens.every((token) => termMatchesField(normalizedField, token));
  }

  const token = termTokens[0];
  if (token.length <= 2) {
    return tokenizeSearchText(normalizedField).includes(token);
  }

  return normalizedField.includes(token);
};

const assertReadOnlySql = (sql) => {
  const normalized = String(sql || "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .trim();

  if (!/^select\b/i.test(normalized)) {
    throw new Error("Only SELECT SQL is allowed for AI post search.");
  }

  if (normalized.includes(";")) {
    throw new Error("Multiple SQL statements are blocked for AI post search.");
  }

  if (/\b(insert|update|delete|drop|alter|create|truncate|replace|merge|grant|revoke|call|load|outfile|lock|unlock)\b/i.test(normalized)) {
    throw new Error("Write keyword detected in AI post search SQL.");
  }
};

tinnhanai.readOnlyQuery = async (sql, params = []) => {
  assertReadOnlySql(sql);

  const connection = await pool.getConnection();
  try {
    await connection.query("START TRANSACTION READ ONLY");
    const [rows] = await connection.query(sql, params);
    await connection.query("COMMIT");
    return rows;
  } catch (error) {
    try {
      await connection.query("ROLLBACK");
    } catch {
      // Preserve the original query error.
    }
    throw error;
  } finally {
    connection.release();
  }
};

const uniqueTextValues = (values, maxItems = 14) => {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    const normalized = normalizeSearchText(text);
    if (!text || seen.has(normalized) || SEARCH_STOPWORDS.has(normalized)) continue;

    seen.add(normalized);
    output.push(text.slice(0, 90));
    if (output.length >= maxItems) break;
  }

  return output;
};

const scoreSearchResult = (row, query, terms, intent = {}) => {
  const normalizedQuery = normalizeSearchText(query);
  const haystack = {
    title: normalizeSearchText(row.tieu_de),
    description: normalizeSearchText(row.mo_ta),
    location: normalizeSearchText(row.vi_tri),
    category: normalizeSearchText(row.danh_muc),
    type: normalizeSearchText(row.loai_bai_dang),
  };
  let score = 0;

  for (const term of terms) {
    const normalizedTerm = normalizeSearchText(term);
    if (!normalizedTerm) continue;
    if (termMatchesField(haystack.title, normalizedTerm)) score += 34;
    if (termMatchesField(haystack.category, normalizedTerm)) score += 22;
    if (termMatchesField(haystack.type, normalizedTerm)) score += 16;
    if (termMatchesField(haystack.location, normalizedTerm)) score += 14;
    if (termMatchesField(haystack.description, normalizedTerm)) score += 9;
  }

  if (normalizedQuery && haystack.title.includes(normalizedQuery)) score += 45;
  if (intent.category && termMatchesField(haystack.category, intent.category)) score += 28;
  if (intent.location && termMatchesField(haystack.location, intent.location)) score += 30;
  if (row.trang_thai === "dang_ban") score += 8;

  return score;
};

const isShortSearchTerm = (term) => {
  const tokens = tokenizeSearchText(term);
  return tokens.length === 1 && tokens[0].length <= 2;
};

const buildShortTermLikeClause = (columnSql) =>
  `CONCAT(' ', COALESCE(${columnSql}, ''), ' ') LIKE ?`;

const pushTermSearchClause = (clauses, params, term) => {
  if (isShortSearchTerm(term)) {
    const like = `% ${normalizeSearchText(term)} %`;
    clauses.push(`(
      ${buildShortTermLikeClause("b.tieu_de")} OR
      ${buildShortTermLikeClause("b.mo_ta")} OR
      ${buildShortTermLikeClause("b.vi_tri")} OR
      ${buildShortTermLikeClause("dm.ten")} OR
      ${buildShortTermLikeClause("lb.ten")}
    )`);
    params.push(like, like, like, like, like);
    return;
  }

  clauses.push("(b.tieu_de LIKE ? OR b.mo_ta LIKE ? OR b.vi_tri LIKE ? OR dm.ten LIKE ? OR lb.ten LIKE ?)");
  const like = `%${term}%`;
  params.push(like, like, like, like, like);
};

const productTextMatchesTerm = (row, term) => {
  const productText = [
    row.tieu_de,
    row.danh_muc,
    row.loai_bai_dang,
  ].join(" ");

  return termMatchesField(productText, term);
};

const productTextMatchesIntent = (row, productTerms) => {
  const intentTokens = [
    ...new Set(productTerms.flatMap((term) => tokenizeSearchText(term))),
  ].filter((token) => token && !SEARCH_STOPWORDS.has(token));

  if (!intentTokens.length) return true;

  const productText = [
    row.tieu_de,
    row.danh_muc,
    row.loai_bai_dang,
  ].join(" ");

  return intentTokens.every((token) => termMatchesField(productText, token)) ||
    productTerms.some((term) => productTextMatchesTerm(row, term));
};

const extractQueryProductTerms = (query, maxItems = 8) => {
  const seen = new Set();
  const terms = [];

  for (const token of tokenizeSearchText(query)) {
    if (
      seen.has(token) ||
      SEARCH_STOPWORDS.has(token) ||
      /^\d+$/.test(token) ||
      token.length < 2
    ) {
      continue;
    }

    seen.add(token);
    terms.push(token);
    if (terms.length >= maxItems) break;
  }

  return terms;
};

tinnhanai.searchRelevantPosts = async ({ query = "", intent = {}, limit = 8 } = {}) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 8, 20));
  const safeIntent = intent && typeof intent === "object" ? intent : {};
  const queryProductTerms = extractQueryProductTerms(query);
  const productTerms = uniqueTextValues([
    ...(Array.isArray(safeIntent.keywords) ? safeIntent.keywords : []),
    ...(Array.isArray(safeIntent.requiredTerms) ? safeIntent.requiredTerms : []),
    safeIntent.category,
    safeIntent.postType,
    ...queryProductTerms,
  ]);
  const terms = uniqueTextValues([
    ...productTerms,
    safeIntent.location,
  ]);
  const requiredTerms = uniqueTextValues(Array.isArray(safeIntent.requiredTerms) ? safeIntent.requiredTerms : [], 8);
  const excludeTerms = uniqueTextValues(Array.isArray(safeIntent.excludeTerms) ? safeIntent.excludeTerms : [], 8);
  const minPrice = Number(safeIntent.minPrice);
  const maxPrice = Number(safeIntent.maxPrice);
  const hasMinPrice = Number.isFinite(minPrice) && minPrice > 0;
  const hasMaxPrice = Number.isFinite(maxPrice) && maxPrice > 0;

  if (!terms.length && !hasMinPrice && !hasMaxPrice) {
    return [];
  }

  const where = [];
  const params = [];

  if (ACTIVE_SEARCH_STATUSES.length > 0) {
    where.push(`b.trang_thai IN (${ACTIVE_SEARCH_STATUSES.map(() => "?").join(", ")})`);
    params.push(...ACTIVE_SEARCH_STATUSES);
  }

  if (terms.length > 0) {
    const termClauses = [];
    for (const term of terms) {
      pushTermSearchClause(termClauses, params, term);
    }
    where.push(`(${termClauses.join(" OR ")})`);
  }

  for (const requiredTerm of requiredTerms) {
    const requiredClauses = [];
    pushTermSearchClause(requiredClauses, params, requiredTerm);
    where.push(`(${requiredClauses.join(" OR ")})`);
  }

  for (const excludedTerm of excludeTerms) {
    where.push("(b.tieu_de NOT LIKE ? AND COALESCE(b.mo_ta, '') NOT LIKE ? AND COALESCE(dm.ten, '') NOT LIKE ?)");
    const like = `%${excludedTerm}%`;
    params.push(like, like, like);
  }

  if (hasMaxPrice) {
    where.push("(b.gia IS NULL OR b.gia <= ?)");
    params.push(maxPrice);
  }

  if (hasMinPrice) {
    where.push("(b.gia IS NULL OR b.gia >= ?)");
    params.push(minPrice);
  }

  params.push(Math.max(safeLimit * 15, SEARCH_CANDIDATE_LIMIT));

  const rows = await tinnhanai.readOnlyQuery(
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
        dm.ten AS danh_muc,
        lb.ten AS loai_bai_dang,
        (
          SELECT a.LinkAnh
          FROM baidang_anh a
          WHERE a.ID_BaiDang = b.ID_BaiDang
          LIMIT 1
        ) AS image_url,
        COUNT(DISTINCT like_stats.ID_NguoiDung) AS SoLuongLike,
        COUNT(DISTINCT comment_stats.ID_BinhLuan) AS SoLuongBinhLuan
      FROM baidang b
      LEFT JOIN nguoidung n ON b.ID_NguoiDung = n.ID_NguoiDung
      LEFT JOIN danhmuc dm ON b.ID_DanhMuc = dm.ID_DanhMuc
      LEFT JOIN loaibaidang lb ON b.ID_LoaiBaiDang = lb.ID_LoaiBaiDang
      LEFT JOIN likebaidang like_stats ON b.ID_BaiDang = like_stats.ID_BaiDang
      LEFT JOIN binhluanbaidang comment_stats ON b.ID_BaiDang = comment_stats.ID_BaiDang
      WHERE ${where.length ? where.join(" AND ") : "1 = 1"}
      GROUP BY b.ID_BaiDang
      ORDER BY b.thoi_gian_tao DESC
      LIMIT ?`,
    params
  );

  const scoredRows = rows
    .map((row) => ({
      ...row,
      TenDanhMuc: row.danh_muc || "",
      TenLoaiBaiDang: row.loai_bai_dang || "",
      DanhSachAnh: row.image_url ? [row.image_url] : [],
      relevance_score: scoreSearchResult(row, query, terms, safeIntent),
    }))
    .filter((row) => {
      if (!productTerms.length) return row.relevance_score > 0 || hasMinPrice || hasMaxPrice;
      if (queryProductTerms.length > 1 && !queryProductTerms.every((term) => productTextMatchesTerm(row, term))) {
        return false;
      }

      return productTextMatchesIntent(row, productTerms);
    });

  if (safeIntent.sort === "price_asc") {
    scoredRows.sort((left, right) => (Number(left.gia) || Number.MAX_SAFE_INTEGER) - (Number(right.gia) || Number.MAX_SAFE_INTEGER));
  } else if (safeIntent.sort === "price_desc") {
    scoredRows.sort((left, right) => (Number(right.gia) || -1) - (Number(left.gia) || -1));
  } else if (safeIntent.sort === "newest") {
    scoredRows.sort((left, right) => new Date(right.thoi_gian_tao || 0) - new Date(left.thoi_gian_tao || 0));
  } else {
    scoredRows.sort((left, right) => right.relevance_score - left.relevance_score);
  }

  return scoredRows.slice(0, safeLimit);
};

module.exports = tinnhanai;
