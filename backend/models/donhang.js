const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const donhang = {};

let schemaReadyPromise = null;
const SAFE_COLLATION_PATTERN = /^[a-zA-Z0-9_]+$/;

const BASE_SELECT = `
  SELECT
    dh.*,
    seller.ho_ten AS ten_nguoi_ban,
    seller.email AS email_nguoi_ban,
    seller.anh_dai_dien AS anh_nguoi_ban,
    buyer.ho_ten AS ten_nguoi_mua,
    buyer.email AS email_nguoi_mua,
    buyer.anh_dai_dien AS anh_nguoi_mua,
    b.vi_tri AS vi_tri_bai_dang,
    preview.anh_bai_dang
  FROM donhang dh
  LEFT JOIN nguoidung seller ON dh.ID_NguoiBan = seller.ID_NguoiDung
  LEFT JOIN nguoidung buyer ON dh.ID_NguoiMua = buyer.ID_NguoiDung
  LEFT JOIN baidang b ON dh.ID_BaiDang = b.ID_BaiDang
  LEFT JOIN (
    SELECT ID_BaiDang, MIN(LinkAnh) AS anh_bai_dang
    FROM baidang_anh
    GROUP BY ID_BaiDang
  ) preview ON dh.ID_BaiDang = preview.ID_BaiDang
`;

const resolveTargetCollation = async () => {
  const [tableRows] = await pool.query(`
    SELECT TABLE_COLLATION
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('nguoidung', 'baidang')
      AND TABLE_COLLATION IS NOT NULL
    ORDER BY FIELD(TABLE_NAME, 'nguoidung', 'baidang')
    LIMIT 1
  `);

  const preferredCollation = tableRows[0]?.TABLE_COLLATION;
  if (preferredCollation && SAFE_COLLATION_PATTERN.test(preferredCollation)) {
    return preferredCollation;
  }

  const [schemaRows] = await pool.query(`
    SELECT DEFAULT_COLLATION_NAME
    FROM information_schema.SCHEMATA
    WHERE SCHEMA_NAME = DATABASE()
    LIMIT 1
  `);

  const defaultCollation = schemaRows[0]?.DEFAULT_COLLATION_NAME;
  if (defaultCollation && SAFE_COLLATION_PATTERN.test(defaultCollation)) {
    return defaultCollation;
  }

  return "utf8mb4_unicode_ci";
};

const ensureSchema = async () => {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const targetCollation = await resolveTargetCollation();

      await pool.query(`
        CREATE TABLE IF NOT EXISTS donhang (
          ID_DonHang char(36) NOT NULL,
          ma_hoa_don varchar(40) NOT NULL,
          ID_GiaoDich char(36) NOT NULL,
          ID_BaiDang char(36) NOT NULL,
          ID_NguoiBan char(36) NOT NULL,
          ID_NguoiMua char(36) NOT NULL,
          tieu_de_bai_dang varchar(255) NOT NULL,
          gia_giao_dich decimal(15,2) DEFAULT NULL,
          dia_chi_hen_gap varchar(255) DEFAULT NULL,
          thoi_gian_hen_gap datetime DEFAULT NULL,
          ghi_chu_hen_gap text DEFAULT NULL,
          ghi_chu_nguoi_mua text DEFAULT NULL,
          trang_thai enum('hoan_tat','da_huy') DEFAULT 'hoan_tat',
          thoi_gian_hoan_tat datetime DEFAULT NULL,
          thoi_gian_tao timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          thoi_gian_cap_nhat timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (ID_DonHang),
          UNIQUE KEY uq_donhang_ma_hoa_don (ma_hoa_don),
          UNIQUE KEY uq_donhang_giaodich (ID_GiaoDich),
          KEY idx_donhang_baidang (ID_BaiDang),
          KEY idx_donhang_nguoiban (ID_NguoiBan),
          KEY idx_donhang_nguoimua (ID_NguoiMua),
          KEY idx_donhang_hoantat (thoi_gian_hoan_tat)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${targetCollation}
      `);

      const [rows] = await pool.query(`
        SELECT TABLE_COLLATION
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'donhang'
        LIMIT 1
      `);

      const currentCollation = rows[0]?.TABLE_COLLATION;
      if (
        currentCollation &&
        currentCollation !== targetCollation &&
        SAFE_COLLATION_PATTERN.test(currentCollation)
      ) {
        await pool.query(
          `ALTER TABLE donhang CONVERT TO CHARACTER SET utf8mb4 COLLATE ${targetCollation}`
        );
      }
    })()
      .catch((error) => {
        schemaReadyPromise = null;
        throw error;
      });
  }

  await schemaReadyPromise;
};

const ensureWhenUsingPool = async () => {
  await ensureSchema();
};

const normalizeOrder = (row) => {
  if (!row) return null;
  return {
    ...row,
    gia_giao_dich:
      row.gia_giao_dich === null || row.gia_giao_dich === undefined
        ? null
        : Number(row.gia_giao_dich),
  };
};

const formatDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

donhang.ensureSchema = ensureSchema;

donhang.buildInvoiceCode = (transactionId, completedAt = new Date()) => {
  const shortId = String(transactionId || uuidv4())
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();
  return `HD-${formatDateKey(completedAt)}-${shortId}`;
};

donhang.getAllDetailed = async (connection = pool) => {
  await ensureWhenUsingPool(connection);
  const [rows] = await connection.query(
    `${BASE_SELECT}
     ORDER BY COALESCE(dh.thoi_gian_hoan_tat, dh.thoi_gian_tao) DESC`
  );
  return rows.map(normalizeOrder);
};

donhang.getByIdDetailed = async (id, connection = pool) => {
  await ensureWhenUsingPool(connection);
  const [rows] = await connection.query(
    `${BASE_SELECT}
     WHERE dh.ID_DonHang = ?
     LIMIT 1`,
    [id]
  );
  return normalizeOrder(rows[0]);
};

donhang.getByTransactionId = async (transactionId, connection = pool) => {
  await ensureWhenUsingPool(connection);
  const [rows] = await connection.query(
    `${BASE_SELECT}
     WHERE dh.ID_GiaoDich = ?
     LIMIT 1`,
    [transactionId]
  );
  return normalizeOrder(rows[0]);
};

donhang.getByUserIdDetailed = async (userId, connection = pool) => {
  await ensureWhenUsingPool(connection);
  const [rows] = await connection.query(
    `${BASE_SELECT}
     WHERE dh.ID_NguoiBan = ? OR dh.ID_NguoiMua = ?
     ORDER BY COALESCE(dh.thoi_gian_hoan_tat, dh.thoi_gian_tao) DESC`,
    [userId, userId]
  );
  return rows.map(normalizeOrder);
};

donhang.insert = async (data, connection = pool) => {
  await ensureWhenUsingPool(connection);
  const insertData = {
    ID_DonHang: data.ID_DonHang || uuidv4(),
    ...data,
  };

  await connection.query("INSERT INTO donhang SET ?", [insertData]);
  return insertData;
};

donhang.createFromTransaction = async (transaction, connection = pool) => {
  if (!transaction?.ID_GiaoDich) {
    throw new Error("Khong co giao dich de tao hoa don");
  }

  await ensureWhenUsingPool(connection);

  const existingOrder = await donhang.getByTransactionId(transaction.ID_GiaoDich, connection);
  if (existingOrder) {
    return existingOrder;
  }

  const completedAt = transaction.thoi_gian_hoan_tat || new Date();
  const insertData = await donhang.insert(
    {
      ma_hoa_don: donhang.buildInvoiceCode(transaction.ID_GiaoDich, completedAt),
      ID_GiaoDich: transaction.ID_GiaoDich,
      ID_BaiDang: transaction.ID_BaiDang,
      ID_NguoiBan: transaction.ID_NguoiBan,
      ID_NguoiMua: transaction.ID_NguoiMua,
      tieu_de_bai_dang: transaction.tieu_de || "Bai dang",
      gia_giao_dich:
        transaction.gia === null || transaction.gia === undefined
          ? null
          : Number(transaction.gia),
      dia_chi_hen_gap: transaction.dia_chi_hen_gap || null,
      thoi_gian_hen_gap: transaction.thoi_gian_hen_gap || null,
      ghi_chu_hen_gap: transaction.ghi_chu_hen_gap || null,
      ghi_chu_nguoi_mua: transaction.ghi_chu_nguoi_mua || null,
      trang_thai: "hoan_tat",
      thoi_gian_hoan_tat: completedAt,
    },
    connection
  );

  return {
    ...insertData,
    gia_giao_dich: insertData.gia_giao_dich,
  };
};

module.exports = donhang;
