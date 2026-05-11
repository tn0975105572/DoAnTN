const donhang = require("../models/donhang");

const getAuthenticatedUserId = (req) =>
  String(req.user?.id || req.user?.userId || "").trim();

const isAdminRequest = (req) => req.user?.Role === "admin";

const canAccessOrder = (order, actorId, isAdmin) => {
  if (!order) return false;
  if (isAdmin) return true;
  return (
    String(order.ID_NguoiBan || "") === actorId ||
    String(order.ID_NguoiMua || "") === actorId
  );
};

exports.getAll = async (req, res) => {
  try {
    if (!isAdminRequest(req)) {
      return res.status(403).json({
        success: false,
        message: "Ban khong co quyen xem toan bo hoa don",
      });
    }

    const data = await donhang.getAllDetailed();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const actorId = getAuthenticatedUserId(req);
    const data = await donhang.getByIdDetailed(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Hoa don khong ton tai",
      });
    }

    if (!canAccessOrder(data, actorId, isAdminRequest(req))) {
      return res.status(403).json({
        success: false,
        message: "Ban khong co quyen xem hoa don nay",
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const actorId = getAuthenticatedUserId(req);

    if (!actorId) {
      return res.status(401).json({
        success: false,
        message: "Ban can dang nhap de xem hoa don",
      });
    }

    const data = await donhang.getByUserIdDetailed(actorId);
    res.json({ success: true, data });
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
    const actorId = getAuthenticatedUserId(req);
    const requestedUserId = String(req.params.userId || "").trim();
    const targetUserId =
      isAdminRequest(req) && requestedUserId ? requestedUserId : actorId;

    if (!targetUserId) {
      return res.status(401).json({
        success: false,
        message: "Ban can dang nhap de xem hoa don",
      });
    }

    const data = await donhang.getByUserIdDetailed(targetUserId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  }
};

exports.getByTransactionId = async (req, res) => {
  try {
    const actorId = getAuthenticatedUserId(req);
    const data = await donhang.getByTransactionId(req.params.transactionId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Hoa don chua duoc tao cho giao dich nay",
      });
    }

    if (!canAccessOrder(data, actorId, isAdminRequest(req))) {
      return res.status(403).json({
        success: false,
        message: "Ban khong co quyen xem hoa don nay",
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Loi may chu",
      error: error.message,
    });
  }
};
