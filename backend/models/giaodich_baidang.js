const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");

const OPEN_TRANSACTION_STATUSES = [
  "cho_nguoi_ban_xac_nhan",
  "nguoi_ban_da_chap_nhan",
  "cho_hen_gap",
  "cho_xac_nhan_hoan_tat",
];

const ACTIVE_ACCEPTED_STATUSES = [
  "nguoi_ban_da_chap_nhan",
  "cho_hen_gap",
  "cho_xac_nhan_hoan_tat",
];

const COMPLETION_CONFIRM_ACTIONS = new Set([
  "xac_nhan_hoan_tat",
  "hoan_tat_giao_dich",
]);

const BASE_SELECT = `
  SELECT
    gd.*,
    b.tieu_de,
    b.gia,
    b.vi_tri,
    b.trang_thai AS trang_thai_baidang,
    b.ID_NguoiDung AS ID_ChuBaiDang,
    seller.ho_ten AS ten_nguoi_ban,
    seller.anh_dai_dien AS anh_nguoi_ban,
    buyer.ho_ten AS ten_nguoi_mua,
    buyer.anh_dai_dien AS anh_nguoi_mua,
    preview.anh_bai_dang
  FROM giaodich_baidang gd
  LEFT JOIN baidang b ON gd.ID_BaiDang = b.ID_BaiDang
  LEFT JOIN nguoidung seller ON gd.ID_NguoiBan = seller.ID_NguoiDung
  LEFT JOIN nguoidung buyer ON gd.ID_NguoiMua = buyer.ID_NguoiDung
  LEFT JOIN (
    SELECT ID_BaiDang, MIN(LinkAnh) AS anh_bai_dang
    FROM baidang_anh
    GROUP BY ID_BaiDang
  ) preview ON gd.ID_BaiDang = preview.ID_BaiDang
`;

const parseJsonValue = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const getCompletionConfirmationState = (transaction) => {
  const history = parseJsonValue(transaction?.lich_su_json);
  const sellerId = String(transaction?.ID_NguoiBan || "");
  const buyerId = String(transaction?.ID_NguoiMua || "");
  const confirmedByUserIds = [];
  const notesByUserId = {};

  history.forEach((entry) => {
    if (!COMPLETION_CONFIRM_ACTIONS.has(entry?.hanh_dong)) return;
    const actorId = String(entry?.nguoi_thuc_hien || "");
    if (!actorId) return;

    if (!confirmedByUserIds.includes(actorId)) {
      confirmedByUserIds.push(actorId);
    }

    if (entry?.noi_dung && !notesByUserId[actorId]) {
      notesByUserId[actorId] = entry.noi_dung;
    }
  });

  if (transaction?.trang_thai === "hoan_tat") {
    [sellerId, buyerId].filter(Boolean).forEach((userId) => {
      if (!confirmedByUserIds.includes(userId)) {
        confirmedByUserIds.push(userId);
      }
    });
  }

  return {
    sellerConfirmed: Boolean(sellerId) && confirmedByUserIds.includes(sellerId),
    buyerConfirmed: Boolean(buyerId) && confirmedByUserIds.includes(buyerId),
    confirmedByUserIds,
    pendingUserIds: [sellerId, buyerId].filter(Boolean).filter((userId) => !confirmedByUserIds.includes(userId)),
    confirmationCount: confirmedByUserIds.length,
    notesByUserId,
  };
};

const normalizeTransaction = (row) => {
  if (!row) return null;

  const lichSu = parseJsonValue(row.lich_su_json);
  const normalizedRow = {
    ...row,
    lich_su_json: lichSu,
  };

  return {
    ...normalizedRow,
    completion_confirmation: getCompletionConfirmationState(normalizedRow),
  };
};

const giaodichBaiDang = {};

giaodichBaiDang.OPEN_TRANSACTION_STATUSES = OPEN_TRANSACTION_STATUSES;
giaodichBaiDang.ACTIVE_ACCEPTED_STATUSES = ACTIVE_ACCEPTED_STATUSES;

giaodichBaiDang.buildRequestKey = (postId, buyerId) => `${postId}:${buyerId}`;

giaodichBaiDang.buildHistoryEntry = ({
  hanh_dong,
  nguoi_thuc_hien,
  trang_thai,
  noi_dung = null,
  du_lieu = null,
}) => ({
  id: uuidv4(),
  hanh_dong,
  nguoi_thuc_hien,
  trang_thai,
  noi_dung,
  du_lieu,
  thoi_gian: new Date().toISOString(),
});

giaodichBaiDang.appendHistory = (currentHistory, newEntry) => {
  const history = parseJsonValue(currentHistory);
  return JSON.stringify([...history, newEntry]);
};

giaodichBaiDang.getCompletionConfirmationState = getCompletionConfirmationState;

giaodichBaiDang.getById = async (id, connection = pool) => {
  const [rows] = await connection.query(
    `${BASE_SELECT} WHERE gd.ID_GiaoDich = ? LIMIT 1`,
    [id]
  );
  return normalizeTransaction(rows[0]);
};

giaodichBaiDang.getByPostId = async (postId, connection = pool) => {
  const [rows] = await connection.query(
    `${BASE_SELECT} WHERE gd.ID_BaiDang = ? ORDER BY gd.thoi_gian_tao DESC`,
    [postId]
  );
  return rows.map(normalizeTransaction);
};

giaodichBaiDang.getByUserId = async (userId, connection = pool) => {
  const [rows] = await connection.query(
    `${BASE_SELECT}
     WHERE gd.ID_NguoiBan = ? OR gd.ID_NguoiMua = ?
     ORDER BY gd.thoi_gian_tao DESC`,
    [userId, userId]
  );
  return rows.map(normalizeTransaction);
};

giaodichBaiDang.lookupByPostAndBuyer = async (postId, buyerId, connection = pool) => {
  const [rows] = await connection.query(
    `${BASE_SELECT}
     WHERE gd.ID_BaiDang = ? AND gd.ID_NguoiMua = ?
     ORDER BY gd.thoi_gian_tao DESC
     LIMIT 1`,
    [postId, buyerId]
  );
  return normalizeTransaction(rows[0]);
};

giaodichBaiDang.findPostById = async (
  postId,
  connection = pool,
  { forUpdate = false } = {}
) => {
  const [rows] = await connection.query(
    `
      SELECT
        b.ID_BaiDang,
        b.ID_NguoiDung AS ID_NguoiBan,
        b.tieu_de,
        b.trang_thai,
        b.gia,
        b.vi_tri
      FROM baidang b
      WHERE b.ID_BaiDang = ?
      ${forUpdate ? "FOR UPDATE" : ""}
    `,
    [postId]
  );

  return rows[0] || null;
};

giaodichBaiDang.findUserById = async (userId, connection = pool) => {
  const [rows] = await connection.query(
    "SELECT ID_NguoiDung, ho_ten FROM nguoidung WHERE ID_NguoiDung = ? LIMIT 1",
    [userId]
  );

  return rows[0] || null;
};

giaodichBaiDang.findOpenRequestByKey = async (
  requestKey,
  connection = pool,
  { forUpdate = false } = {}
) => {
  const [rows] = await connection.query(
    `
      SELECT *
      FROM giaodich_baidang
      WHERE ma_khoa_yeu_cau_mo = ?
      LIMIT 1
      ${forUpdate ? "FOR UPDATE" : ""}
    `,
    [requestKey]
  );

  return normalizeTransaction(rows[0]);
};

giaodichBaiDang.findAcceptedByPostId = async (
  postId,
  connection = pool,
  { excludeId = null, forUpdate = false } = {}
) => {
  const params = [postId];
  let query = `
    SELECT *
    FROM giaodich_baidang
    WHERE ID_BaiDang = ?
      AND trang_thai IN (${ACTIVE_ACCEPTED_STATUSES.map(() => "?").join(", ")})
  `;

  params.push(...ACTIVE_ACCEPTED_STATUSES);

  if (excludeId) {
    query += " AND ID_GiaoDich <> ?";
    params.push(excludeId);
  }

  query += " LIMIT 1";

  if (forUpdate) {
    query += " FOR UPDATE";
  }

  const [rows] = await connection.query(query, params);
  return normalizeTransaction(rows[0]);
};

giaodichBaiDang.getPendingRequestsByPostId = async (
  postId,
  connection = pool,
  { excludeId = null, forUpdate = false } = {}
) => {
  const params = [postId, "cho_nguoi_ban_xac_nhan"];
  let query = `
    SELECT *
    FROM giaodich_baidang
    WHERE ID_BaiDang = ?
      AND trang_thai = ?
  `;

  if (excludeId) {
    query += " AND ID_GiaoDich <> ?";
    params.push(excludeId);
  }

  query += " ORDER BY thoi_gian_tao ASC";

  if (forUpdate) {
    query += " FOR UPDATE";
  }

  const [rows] = await connection.query(query, params);
  return rows.map(normalizeTransaction);
};

giaodichBaiDang.insert = async (data, connection = pool) => {
  const insertData = {
    ID_GiaoDich: data.ID_GiaoDich || uuidv4(),
    ...data,
  };

  await connection.query("INSERT INTO giaodich_baidang SET ?", [insertData]);
  return insertData.ID_GiaoDich;
};

giaodichBaiDang.update = async (id, data, connection = pool) => {
  const [result] = await connection.query(
    "UPDATE giaodich_baidang SET ? WHERE ID_GiaoDich = ?",
    [data, id]
  );
  return result.affectedRows;
};

module.exports = giaodichBaiDang;
