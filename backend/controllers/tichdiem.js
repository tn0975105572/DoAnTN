const tichdiem = require("../models/tichdiem");

// Lấy tất cả giao dịch tích điểm với phân trang
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.query.userId || null;
    const offset = (page - 1) * limit;

    const { data, total } = await tichdiem.getAllPaginated(limit, offset, userId);

    res.json({
      success: true,
      data: data,
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error getting points history:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// Lấy giao dịch theo ID người dùng
exports.getByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const data = await tichdiem.getByUserId(userId);

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("Error getting user points history:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// Thêm điểm cho người dùng
exports.addPoints = async (req, res) => {
  try {
    const { userId, pointChange, transactionType, description, referenceId } = req.body;

    if (!userId || !pointChange || !transactionType) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
      });
    }

    // Thêm giao dịch vào lịch sử
    const transactionData = {
      ID_NguoiDung: userId,
      thay_doi_diem: pointChange,
      loai_giao_dich: transactionType,
      mo_ta: description || '',
      ID_tham_chieu: referenceId || null
    };

    await tichdiem.add(transactionData);

    // Cập nhật điểm số người dùng
    await tichdiem.updateUserPoints(userId, pointChange);

    res.json({
      success: true,
      message: "Thêm điểm thành công",
    });
  } catch (error) {
    console.error("Error adding points:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// Lấy thống kê điểm số
exports.getStats = async (req, res) => {
  try {
    const stats = await tichdiem.getStats();
    const topUsers = await tichdiem.getTopUsers(10);

    res.json({
      success: true,
      data: {
        stats,
        topUsers
      },
    });
  } catch (error) {
    console.error("Error getting points stats:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// Lấy top người dùng
exports.getTopUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topUsers = await tichdiem.getTopUsers(limit);

    res.json({
      success: true,
      data: topUsers,
    });
  } catch (error) {
    console.error("Error getting top users:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};