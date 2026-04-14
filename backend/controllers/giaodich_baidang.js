const pool = require("../config/database");
const giaodichBaiDang = require("../models/giaodich_baidang");
const thongbao = require("../models/thongbao");

const FINAL_POST_STATUSES = new Set(["da_ban", "da_trao_doi", "da_tang"]);
const getAuthenticatedUserId = (req) =>
  String(req.user?.id || req.user?.userId || "").trim();
const isAdminRequest = (req) => req.user?.Role === "admin";

const createNotification = async ({
  io,
  receiverId,
  senderId,
  type,
  content,
  link,
}) => {
  if (!receiverId || !senderId || receiverId === senderId) {
    return;
  }

  try {
    await thongbao.insert(
      {
        ID_NguoiDung: receiverId,
        ID_NguoiGui: senderId,
        loai: type,
        noi_dung: content,
        lien_ket: link,
        da_doc: 0,
      },
      io
    );
  } catch (error) {
    console.error("Khong the tao thong bao giao dich:", error.message);
  }
};

const emitDealRealtimeUpdate = ({
  io,
  action,
  transaction = null,
  postId = null,
  actorId = null,
  userIds = [],
  reason = null,
}) => {
  if (!io) return;

  const sellerId = transaction?.ID_NguoiBan || null;
  const buyerId = transaction?.ID_NguoiMua || null;
  const uniqueUserIds = [...new Set([sellerId, buyerId, ...userIds].filter(Boolean).map(String))];

  if (!uniqueUserIds.length) return;

  const payload = {
    action,
    actorId,
    postId: postId || transaction?.ID_BaiDang || null,
    transactionId: transaction?.ID_GiaoDich || null,
    status: transaction?.trang_thai || null,
    sellerId,
    buyerId,
    reason,
    happenedAt: new Date().toISOString(),
  };

  uniqueUserIds.forEach((userId) => {
    io.to(`user_${userId}`).emit("deal_transaction_updated", payload);
  });

  if (sellerId && buyerId) {
    io.to(`private_${[sellerId, buyerId].sort().join("_")}`).emit(
      "deal_transaction_updated",
      payload
    );
  }
};

const getCounterpartyId = (transaction, actorId) => {
  if (!transaction) return null;
  return transaction.ID_NguoiBan === actorId
    ? transaction.ID_NguoiMua
    : transaction.ID_NguoiBan;
};

const appendHistoryValue = (transaction, payload) =>
  giaodichBaiDang.appendHistory(
    transaction?.lich_su_json,
    giaodichBaiDang.buildHistoryEntry(payload)
  );

const getCompletionConfirmationState = (transaction) =>
  giaodichBaiDang.getCompletionConfirmationState(transaction);

const syncPostStatusWithTransactions = async ({
  connection,
  postId,
  preferredOpenStatus = null,
}) => {
  if (!connection || !postId) {
    return null;
  }

  const post = await giaodichBaiDang.findPostById(postId, connection, {
    forUpdate: true,
  });

  if (!post) {
    return null;
  }

  if (FINAL_POST_STATUSES.has(post.trang_thai)) {
    return post.trang_thai;
  }

  const activeAcceptedTransaction = await giaodichBaiDang.findAcceptedByPostId(
    postId,
    connection,
    { forUpdate: true }
  );

  let nextStatus = "dang_ban";

  if (activeAcceptedTransaction) {
    if (preferredOpenStatus === "dang_giao_dich") {
      nextStatus = "dang_giao_dich";
    } else {
      nextStatus =
        activeAcceptedTransaction.trang_thai === "nguoi_ban_da_chap_nhan"
          ? "dang_giu_cho"
          : "dang_giao_dich";
    }
  }

  if (post.trang_thai !== nextStatus) {
    await connection.query(
      "UPDATE baidang SET trang_thai = ?, thoi_gian_cap_nhat = NOW() WHERE ID_BaiDang = ?",
      [nextStatus, postId]
    );
  }

  return nextStatus;
};

const getCurrentTransactionForUpdate = async (transactionId, connection) => {
  const [rows] = await connection.query(
    `
      SELECT *
      FROM giaodich_baidang
      WHERE ID_GiaoDich = ?
      LIMIT 1
      FOR UPDATE
    `,
    [transactionId]
  );

  if (!rows[0]) {
    return null;
  }

  return giaodichBaiDang.getById(transactionId, connection);
};

exports.getById = async (req, res) => {
  try {
    const actorId = getAuthenticatedUserId(req);
    const data = await giaodichBaiDang.getById(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Giao dich khong ton tai",
      });
    }

    if (
      !isAdminRequest(req) &&
      actorId &&
      String(data.ID_NguoiBan) !== actorId &&
      String(data.ID_NguoiMua) !== actorId
    ) {
      return res.status(403).json({
        success: false,
        message: "Ban khong co quyen xem giao dich nay",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  }
};

exports.getByPostId = async (req, res) => {
  try {
    const actorId = getAuthenticatedUserId(req);
    const rawData = await giaodichBaiDang.getByPostId(req.params.postId);
    const data = isAdminRequest(req)
      ? rawData
      : rawData.filter(
          (item) =>
            String(item.ID_NguoiBan) === actorId ||
            String(item.ID_NguoiMua) === actorId
        );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  }
};

exports.getByUserId = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = String(req.params.userId || "").trim();
    const userId =
      isAdminRequest(req) && requestedUserId
        ? requestedUserId
        : authenticatedUserId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Ban can dang nhap de xem giao dich",
      });
    }

    const data = await giaodichBaiDang.getByUserId(userId);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  }
};

exports.lookup = async (req, res) => {
  try {
    const { postId } = req.query;
    const authenticatedUserId = getAuthenticatedUserId(req);
    const buyerId =
      isAdminRequest(req) && req.query.buyerId
        ? String(req.query.buyerId)
        : authenticatedUserId;

    if (!postId || !buyerId) {
      return res.status(400).json({
        success: false,
        message: "Thieu postId hoac buyerId",
      });
    }

    const data = await giaodichBaiDang.lookupByPostAndBuyer(postId, buyerId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  }
};

exports.createRequest = async (req, res) => {
  const {
    ID_BaiDang,
    ghi_chu_nguoi_mua = null,
    ID_TinNhanKhoiTao = null,
  } = req.body;
  const ID_NguoiMua = getAuthenticatedUserId(req);

  if (!ID_BaiDang || !ID_NguoiMua) {
    return res.status(400).json({
      success: false,
      message: "Thieu ID_BaiDang hoac phien dang nhap nguoi mua",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const post = await giaodichBaiDang.findPostById(ID_BaiDang, connection, {
      forUpdate: true,
    });

    if (!post) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Bai dang khong ton tai",
      });
    }

    if (post.ID_NguoiBan === ID_NguoiMua) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Ban khong the tao giao dich voi bai dang cua chinh minh",
      });
    }

    if (FINAL_POST_STATUSES.has(post.trang_thai)) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Bai dang da ket thuc, khong the tao giao dich moi",
      });
    }

    const acceptedTransaction = await giaodichBaiDang.findAcceptedByPostId(
      ID_BaiDang,
      connection,
      { forUpdate: true }
    );

    if (post.trang_thai === "dang_giu_cho" || post.trang_thai === "dang_giao_dich") {
      const syncedStatus = await syncPostStatusWithTransactions({
        connection,
        postId: ID_BaiDang,
      });
      post.trang_thai = syncedStatus || post.trang_thai;

      if (
        acceptedTransaction &&
        (syncedStatus === "dang_giu_cho" || syncedStatus === "dang_giao_dich")
      ) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: "Bai dang dang duoc giu cho hoac dang giao dich",
          data: {
            transactionId: acceptedTransaction.ID_GiaoDich,
            transactionStatus: acceptedTransaction.trang_thai,
            buyerId: acceptedTransaction.ID_NguoiMua,
          },
        });
      }
    }

    const buyer = await giaodichBaiDang.findUserById(ID_NguoiMua, connection);
    if (!buyer) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Nguoi mua khong ton tai",
      });
    }

    const requestKey = giaodichBaiDang.buildRequestKey(ID_BaiDang, ID_NguoiMua);
    const existingOpenRequest = await giaodichBaiDang.findOpenRequestByKey(
      requestKey,
      connection,
      { forUpdate: true }
    );

    if (existingOpenRequest) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Ban da co mot yeu cau mua hang dang mo voi bai dang nay",
        data: existingOpenRequest,
      });
    }

    if (acceptedTransaction) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Bai dang nay da duoc chap nhan giao dich voi nguoi mua khac",
      });
    }

    const insertData = {
      ID_BaiDang,
      ID_NguoiBan: post.ID_NguoiBan,
      ID_NguoiMua,
      ID_TinNhanKhoiTao,
      ghi_chu_nguoi_mua,
      trang_thai: "cho_nguoi_ban_xac_nhan",
      ma_khoa_yeu_cau_mo: requestKey,
      ma_khoa_baidang_active: null,
      lich_su_json: JSON.stringify([
        giaodichBaiDang.buildHistoryEntry({
          hanh_dong: "tao_yeu_cau_mua",
          nguoi_thuc_hien: ID_NguoiMua,
          trang_thai: "cho_nguoi_ban_xac_nhan",
          noi_dung: ghi_chu_nguoi_mua,
          du_lieu: {
            ID_BaiDang,
            ID_TinNhanKhoiTao,
          },
        }),
      ]),
    };

    const transactionId = await giaodichBaiDang.insert(insertData, connection);

    await connection.commit();

    const createdTransaction = await giaodichBaiDang.getById(transactionId);

    await createNotification({
      io: req.io,
      receiverId: post.ID_NguoiBan,
      senderId: ID_NguoiMua,
      type: "yeu_cau_mua_hang",
      content: `${buyer.ho_ten} da gui yeu cau mua bai dang "${post.tieu_de}"`,
      link: `/messages?postId=${ID_BaiDang}&transactionId=${transactionId}`,
    });

    emitDealRealtimeUpdate({
      io: req.io,
      action: "request_created",
      transaction: createdTransaction,
      actorId: ID_NguoiMua,
    });

    res.status(201).json({
      success: true,
      data: createdTransaction,
      message: "Tao yeu cau mua hang thanh cong",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.accept = async (req, res) => {
  const transactionId = req.params.id;
  const actorId = getAuthenticatedUserId(req);

  if (!actorId) {
    return res.status(401).json({
      success: false,
      message: "Ban can dang nhap de chap nhan giao dich",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const transaction = await getCurrentTransactionForUpdate(transactionId, connection);

    if (!transaction) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Giao dich khong ton tai",
      });
    }

    if (transaction.ID_NguoiBan !== actorId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Chi nguoi ban moi co quyen chap nhan giao dich",
      });
    }

    if (transaction.trang_thai !== "cho_nguoi_ban_xac_nhan") {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Giao dich khong o trang thai co the chap nhan",
      });
    }

    const post = await giaodichBaiDang.findPostById(transaction.ID_BaiDang, connection, {
      forUpdate: true,
    });

    if (!post) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Bai dang khong ton tai",
      });
    }

    if (FINAL_POST_STATUSES.has(post.trang_thai)) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Bai dang da ket thuc, khong the chap nhan giao dich",
      });
    }

    const anotherAccepted = await giaodichBaiDang.findAcceptedByPostId(
      transaction.ID_BaiDang,
      connection,
      {
        excludeId: transaction.ID_GiaoDich,
        forUpdate: true,
      }
    );

    if (anotherAccepted) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Bai dang da co giao dich khac duoc chap nhan",
      });
    }

    await giaodichBaiDang.update(
      transaction.ID_GiaoDich,
      {
        trang_thai: "nguoi_ban_da_chap_nhan",
        ma_khoa_baidang_active: transaction.ID_BaiDang,
        thoi_gian_nguoi_ban_xac_nhan: new Date(),
        lich_su_json: appendHistoryValue(transaction, {
          hanh_dong: "nguoi_ban_chap_nhan",
          nguoi_thuc_hien: actorId,
          trang_thai: "nguoi_ban_da_chap_nhan",
          noi_dung: "Nguoi ban da chap nhan yeu cau mua hang",
        }),
      },
      connection
    );

    await connection.query(
      "UPDATE baidang SET trang_thai = ? WHERE ID_BaiDang = ?",
      ["dang_giu_cho", transaction.ID_BaiDang]
    );

    const pendingTransactions = await giaodichBaiDang.getPendingRequestsByPostId(
      transaction.ID_BaiDang,
      connection,
      {
        excludeId: transaction.ID_GiaoDich,
        forUpdate: true,
      }
    );

    const cancelledBuyerIds = [];

    for (const pending of pendingTransactions) {
      cancelledBuyerIds.push(pending.ID_NguoiMua);
      await giaodichBaiDang.update(
        pending.ID_GiaoDich,
        {
          trang_thai: "he_thong_da_huy",
          ly_do_huy: "Bai dang da duoc giu cho nguoi mua khac",
          ma_khoa_yeu_cau_mo: null,
          ma_khoa_baidang_active: null,
          thoi_gian_huy: new Date(),
          lich_su_json: appendHistoryValue(pending, {
            hanh_dong: "he_thong_huy",
            nguoi_thuc_hien: actorId,
            trang_thai: "he_thong_da_huy",
            noi_dung: "He thong dong cac yeu cau khac vi bai dang da duoc chap nhan",
          }),
        },
        connection
      );
    }

    await connection.commit();

    const updatedTransaction = await giaodichBaiDang.getById(transaction.ID_GiaoDich);

    await createNotification({
      io: req.io,
      receiverId: transaction.ID_NguoiMua,
      senderId: actorId,
      type: "cap_nhat_giao_dich",
      content: `Nguoi ban da chap nhan yeu cau mua bai dang "${transaction.tieu_de}"`,
      link: `/messages?postId=${transaction.ID_BaiDang}&transactionId=${transaction.ID_GiaoDich}`,
    });

    for (const buyerId of cancelledBuyerIds) {
      await createNotification({
        io: req.io,
        receiverId: buyerId,
        senderId: actorId,
        type: "cap_nhat_giao_dich",
        content: `Yeu cau mua bai dang "${transaction.tieu_de}" da dong vi nguoi ban da chap nhan nguoi mua khac`,
        link: `/messages?postId=${transaction.ID_BaiDang}`,
      });
    }

    emitDealRealtimeUpdate({
      io: req.io,
      action: "request_accepted",
      transaction: updatedTransaction,
      actorId,
      userIds: cancelledBuyerIds,
    });

    res.json({
      success: true,
      data: updatedTransaction,
      message: "Chap nhan giao dich thanh cong",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.reject = async (req, res) => {
  const transactionId = req.params.id;
  const actorId = getAuthenticatedUserId(req);
  const { lyDo = null } = req.body;

  if (!actorId) {
    return res.status(401).json({
      success: false,
      message: "Ban can dang nhap de tu choi giao dich",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const transaction = await getCurrentTransactionForUpdate(transactionId, connection);

    if (!transaction) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Giao dich khong ton tai",
      });
    }

    if (transaction.ID_NguoiBan !== actorId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Chi nguoi ban moi co quyen tu choi giao dich",
      });
    }

    if (transaction.trang_thai !== "cho_nguoi_ban_xac_nhan") {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Giao dich khong o trang thai co the tu choi",
      });
    }

    await giaodichBaiDang.update(
      transaction.ID_GiaoDich,
      {
        trang_thai: "nguoi_ban_da_tu_choi",
        ly_do_huy: lyDo,
        ma_khoa_yeu_cau_mo: null,
        ma_khoa_baidang_active: null,
        thoi_gian_huy: new Date(),
        lich_su_json: appendHistoryValue(transaction, {
          hanh_dong: "nguoi_ban_tu_choi",
          nguoi_thuc_hien: actorId,
          trang_thai: "nguoi_ban_da_tu_choi",
          noi_dung: lyDo || "Nguoi ban da tu choi yeu cau mua hang",
        }),
      },
      connection
    );

    await syncPostStatusWithTransactions({
      connection,
      postId: transaction.ID_BaiDang,
    });

    await connection.commit();

    const updatedTransaction = await giaodichBaiDang.getById(transaction.ID_GiaoDich);

    await createNotification({
      io: req.io,
      receiverId: transaction.ID_NguoiMua,
      senderId: actorId,
      type: "cap_nhat_giao_dich",
      content: `Nguoi ban da tu choi yeu cau mua bai dang "${transaction.tieu_de}"`,
      link: `/messages?postId=${transaction.ID_BaiDang}&transactionId=${transaction.ID_GiaoDich}`,
    });

    emitDealRealtimeUpdate({
      io: req.io,
      action: "request_rejected",
      transaction: updatedTransaction,
      actorId,
      reason: lyDo,
    });

    res.json({
      success: true,
      data: updatedTransaction,
      message: "Tu choi giao dich thanh cong",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.cancel = async (req, res) => {
  const transactionId = req.params.id;
  const actorId = getAuthenticatedUserId(req);
  const { lyDo = null } = req.body;

  if (!actorId) {
    return res.status(401).json({
      success: false,
      message: "Ban can dang nhap de huy giao dich",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const transaction = await getCurrentTransactionForUpdate(transactionId, connection);

    if (!transaction) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Giao dich khong ton tai",
      });
    }

    const isBuyer = transaction.ID_NguoiMua === actorId;
    const isSeller = transaction.ID_NguoiBan === actorId;

    if (!isBuyer && !isSeller) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Ban khong nam trong giao dich nay",
      });
    }

    if (
      [
        "hoan_tat",
        "nguoi_mua_da_huy",
        "nguoi_ban_da_tu_choi",
        "he_thong_da_huy",
        "het_han",
      ].includes(transaction.trang_thai)
    ) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Giao dich da ket thuc, khong the huy",
      });
    }

    const nextStatus = isBuyer ? "nguoi_mua_da_huy" : "he_thong_da_huy";
    const cancelReason =
      lyDo || (isBuyer ? "Nguoi mua da huy giao dich" : "Nguoi ban da huy giao dich");

    await giaodichBaiDang.update(
      transaction.ID_GiaoDich,
      {
        trang_thai: nextStatus,
        ly_do_huy: cancelReason,
        ma_khoa_yeu_cau_mo: null,
        ma_khoa_baidang_active: null,
        thoi_gian_huy: new Date(),
        lich_su_json: appendHistoryValue(transaction, {
          hanh_dong: isBuyer ? "nguoi_mua_huy" : "he_thong_huy",
          nguoi_thuc_hien: actorId,
          trang_thai: nextStatus,
          noi_dung: cancelReason,
        }),
      },
      connection
    );

    await syncPostStatusWithTransactions({
      connection,
      postId: transaction.ID_BaiDang,
    });

    await connection.commit();

    const updatedTransaction = await giaodichBaiDang.getById(transaction.ID_GiaoDich);
    const receiverId = getCounterpartyId(transaction, actorId);

    await createNotification({
      io: req.io,
      receiverId,
      senderId: actorId,
      type: "cap_nhat_giao_dich",
      content: `${isBuyer ? "Nguoi mua" : "Nguoi ban"} da huy giao dich cua bai dang "${transaction.tieu_de}"`,
      link: `/messages?postId=${transaction.ID_BaiDang}&transactionId=${transaction.ID_GiaoDich}`,
    });

    emitDealRealtimeUpdate({
      io: req.io,
      action: "request_cancelled",
      transaction: updatedTransaction,
      actorId,
      reason: cancelReason,
    });

    res.json({
      success: true,
      data: updatedTransaction,
      message: "Huy giao dich thanh cong",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.setMeeting = async (req, res) => {
  const transactionId = req.params.id;
  const actorId = getAuthenticatedUserId(req);
  const {
    dia_chi_hen_gap,
    vi_do_hen_gap = null,
    kinh_do_hen_gap = null,
    ghi_chu_hen_gap = null,
    thoi_gian_hen_gap = null,
  } = req.body;

  if (!actorId || !dia_chi_hen_gap || !thoi_gian_hen_gap) {
    return res.status(400).json({
      success: false,
      message: "Thieu phien dang nhap, dia_chi_hen_gap hoac thoi_gian_hen_gap",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const transaction = await getCurrentTransactionForUpdate(transactionId, connection);

    if (!transaction) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Giao dich khong ton tai",
      });
    }

    if (transaction.ID_NguoiMua !== actorId && transaction.ID_NguoiBan !== actorId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Ban khong nam trong giao dich nay",
      });
    }

    if (
      ![
        "nguoi_ban_da_chap_nhan",
        "cho_hen_gap",
        "cho_xac_nhan_hoan_tat",
      ].includes(transaction.trang_thai)
    ) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Chi co the cap nhat diem hen sau khi giao dich duoc chap nhan",
      });
    }

    await giaodichBaiDang.update(
      transaction.ID_GiaoDich,
      {
        trang_thai: "cho_hen_gap",
        dia_chi_hen_gap,
        vi_do_hen_gap,
        kinh_do_hen_gap,
        ghi_chu_hen_gap,
        thoi_gian_hen_gap,
        ID_NguoiTaoHen: actorId,
        lich_su_json: appendHistoryValue(transaction, {
          hanh_dong: "cap_nhat_diem_hen",
          nguoi_thuc_hien: actorId,
          trang_thai: "cho_hen_gap",
          noi_dung: dia_chi_hen_gap,
          du_lieu: {
            vi_do_hen_gap,
            kinh_do_hen_gap,
            ghi_chu_hen_gap,
            thoi_gian_hen_gap,
          },
        }),
      },
      connection
    );

    await connection.query(
      "UPDATE baidang SET trang_thai = ? WHERE ID_BaiDang = ?",
      ["dang_giao_dich", transaction.ID_BaiDang]
    );

    await connection.commit();

    const updatedTransaction = await giaodichBaiDang.getById(transaction.ID_GiaoDich);
    const receiverId = getCounterpartyId(transaction, actorId);

    await createNotification({
      io: req.io,
      receiverId,
      senderId: actorId,
      type: "cap_nhat_giao_dich",
      content: `Da cap nhat diem hen cho bai dang "${transaction.tieu_de}"`,
      link: `/messages?postId=${transaction.ID_BaiDang}&transactionId=${transaction.ID_GiaoDich}`,
    });

    emitDealRealtimeUpdate({
      io: req.io,
      action: "meeting_updated",
      transaction: updatedTransaction,
      actorId,
    });

    res.json({
      success: true,
      data: updatedTransaction,
      message: "Cap nhat diem hen thanh cong",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.requestComplete = async (req, res) => {
  const transactionId = req.params.id;
  const actorId = getAuthenticatedUserId(req);
  const { note = null } = req.body;

  if (!actorId) {
    return res.status(401).json({
      success: false,
      message: "Ban can dang nhap de cap nhat giao dich",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const transaction = await getCurrentTransactionForUpdate(transactionId, connection);

    if (!transaction) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Giao dich khong ton tai",
      });
    }

    if (transaction.ID_NguoiMua !== actorId && transaction.ID_NguoiBan !== actorId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Ban khong nam trong giao dich nay",
      });
    }

    if (
      ![
        "nguoi_ban_da_chap_nhan",
        "cho_hen_gap",
        "cho_xac_nhan_hoan_tat",
      ].includes(transaction.trang_thai)
    ) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Trang thai giao dich hien tai khong the yeu cau hoan tat",
      });
    }

    if (!transaction.dia_chi_hen_gap || !transaction.thoi_gian_hen_gap) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message:
          "Can chot diem hen va thoi gian truoc khi xac nhan hoan tat giao dich",
      });
    }

    const completionState = getCompletionConfirmationState(transaction);
    if (completionState.confirmedByUserIds.includes(String(actorId))) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Ban da xac nhan hoan tat giao dich truoc do",
      });
    }

    const receiverId = getCounterpartyId(transaction, actorId);
    const actorRoleLabel =
      String(transaction.ID_NguoiBan) === String(actorId)
        ? "Nguoi ban"
        : "Nguoi mua";
    const historyAfterConfirmation = appendHistoryValue(transaction, {
      hanh_dong: "xac_nhan_hoan_tat",
      nguoi_thuc_hien: actorId,
      trang_thai: "cho_xac_nhan_hoan_tat",
      noi_dung: note || `${actorRoleLabel} da xac nhan hoan tat giao dich`,
    });

    const shouldComplete =
      String(transaction.ID_NguoiBan || "")
        && String(transaction.ID_NguoiMua || "")
        && [transaction.ID_NguoiBan, transaction.ID_NguoiMua]
          .map((userId) => String(userId))
          .every((userId) =>
            completionState.confirmedByUserIds.includes(userId) || userId === String(actorId)
          );

    if (!shouldComplete) {
      await giaodichBaiDang.update(
        transaction.ID_GiaoDich,
        {
          trang_thai: "cho_xac_nhan_hoan_tat",
          lich_su_json: historyAfterConfirmation,
        },
        connection
      );

      await connection.query(
        "UPDATE baidang SET trang_thai = ? WHERE ID_BaiDang = ?",
        ["dang_giao_dich", transaction.ID_BaiDang]
      );

      await connection.commit();

      const updatedTransaction = await giaodichBaiDang.getById(transaction.ID_GiaoDich);

      await createNotification({
        io: req.io,
        receiverId,
        senderId: actorId,
        type: "cap_nhat_giao_dich",
        content: `${actorRoleLabel} da xac nhan giao dich cua bai dang "${transaction.tieu_de}". Cho ban xac nhan de hoan tat.`,
        link: `/messages?postId=${transaction.ID_BaiDang}&transactionId=${transaction.ID_GiaoDich}`,
      });

      emitDealRealtimeUpdate({
        io: req.io,
        action: "completion_confirmed",
        transaction: updatedTransaction,
        actorId,
        reason: note,
      });

      return res.json({
        success: true,
        data: updatedTransaction,
        message: "Da ghi nhan xac nhan cua ban. Dang cho ben con lai xac nhan.",
      });
    }

    const completionHistory = giaodichBaiDang.appendHistory(
      historyAfterConfirmation,
      giaodichBaiDang.buildHistoryEntry({
        hanh_dong: "hoan_tat_giao_dich",
        nguoi_thuc_hien: actorId,
        trang_thai: "hoan_tat",
        noi_dung: note || "Ca hai ben da xac nhan hoan tat giao dich",
      })
    );

    await giaodichBaiDang.update(
      transaction.ID_GiaoDich,
      {
        trang_thai: "hoan_tat",
        ma_khoa_yeu_cau_mo: null,
        ma_khoa_baidang_active: null,
        thoi_gian_hoan_tat: new Date(),
        lich_su_json: completionHistory,
      },
      connection
    );

    await connection.query(
      "UPDATE baidang SET trang_thai = ? WHERE ID_BaiDang = ?",
      ["da_ban", transaction.ID_BaiDang]
    );

    const pendingTransactions = await giaodichBaiDang.getPendingRequestsByPostId(
      transaction.ID_BaiDang,
      connection,
      {
        excludeId: transaction.ID_GiaoDich,
        forUpdate: true,
      }
    );

    const cancelledBuyerIds = [];

    for (const pending of pendingTransactions) {
      cancelledBuyerIds.push(pending.ID_NguoiMua);
      await giaodichBaiDang.update(
        pending.ID_GiaoDich,
        {
          trang_thai: "he_thong_da_huy",
          ly_do_huy: "Bai dang da duoc danh dau da ban",
          ma_khoa_yeu_cau_mo: null,
          ma_khoa_baidang_active: null,
          thoi_gian_huy: new Date(),
          lich_su_json: appendHistoryValue(pending, {
            hanh_dong: "he_thong_huy",
            nguoi_thuc_hien: actorId,
            trang_thai: "he_thong_da_huy",
            noi_dung: "Giao dich duoc dong do bai dang da hoan tat voi nguoi mua khac",
          }),
        },
        connection
      );
    }

    await connection.commit();

    const updatedTransaction = await giaodichBaiDang.getById(transaction.ID_GiaoDich);

    await createNotification({
      io: req.io,
      receiverId,
      senderId: actorId,
      type: "cap_nhat_giao_dich",
      content: `Ca hai ben da xac nhan hoan tat giao dich cua bai dang "${transaction.tieu_de}"`,
      link: `/messages?postId=${transaction.ID_BaiDang}&transactionId=${transaction.ID_GiaoDich}`,
    });

    emitDealRealtimeUpdate({
      io: req.io,
      action: "deal_completed",
      transaction: updatedTransaction,
      actorId,
      reason: note,
      userIds: cancelledBuyerIds,
    });

    return res.json({
      success: true,
      data: updatedTransaction,
      message: "Ca hai ben da xac nhan. Giao dich da hoan tat.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.complete = async (req, res) => {
  return exports.requestComplete(req, res);
};
