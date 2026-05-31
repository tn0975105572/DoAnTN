const baidangBoost = require("../models/baidang_boost");

const getAuthenticatedUserId = (req) =>
  String(req.user?.id || req.user?.userId || "").trim();

exports.getPackages = async (req, res) => {
  res.json({
    success: true,
    data: baidangBoost.BOOST_PACKAGES,
  });
};

exports.getActiveBoosts = async (req, res) => {
  try {
    const viewerId =
      getAuthenticatedUserId(req) || String(req.query.userId || "").trim();

    const data = await baidangBoost.getActiveBoostedPosts({
      limit: req.query.limit,
      categoryId: req.query.categoryId,
      viewerId,
    });

    res.json({
      success: true,
      data,
      total: data.length,
      strategy: {
        label: "personalized_boost_decay",
        categoryCap: 3,
        gravity: 1.6,
      },
    });
  } catch (error) {
    console.error("Error getting boosted posts:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách bài đang đẩy",
      error: error.message,
    });
  }
};

exports.purchaseBoost = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const postId = String(req.body?.postId || req.body?.ID_BaiDang || "").trim();
    const packageId = String(req.body?.packageId || "").trim();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập để mua gói đẩy bài",
      });
    }

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID bài đăng cần đẩy",
      });
    }

    const result = await baidangBoost.purchaseBoost({
      userId,
      postId,
      packageId,
    });

    res.status(201).json({
      success: true,
      message: "Mua gói đẩy bài thành công",
      data: result,
    });
  } catch (error) {
    console.error("Error purchasing post boost:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Không thể mua gói đẩy bài",
      currentPoints: error.currentPoints,
      requiredPoints: error.requiredPoints,
    });
  }
};
