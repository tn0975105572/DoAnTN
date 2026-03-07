require("dotenv").config();
const jwt = require("jsonwebtoken");
const nguoidung = require("../models/nguoidung");
const fs = require("fs");
const path = require("path");

const SECRET_KEY = process.env.JWT_SECRET || "default_secret";
const EXPIRES = process.env.JWT_EXPIRES || "7d";
const authenticateToken = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({ message: "Không có token, từ chối truy cập" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token không hợp lệ" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.Role)) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    next();
  };
};

// Async handler với logging chi tiết
const asyncHandler =
  (fn) =>
    (req, res, next) =>
      Promise.resolve(fn(req, res, next)).catch((error) => {
        console.error('❌ Controller Error:', {
          controller: 'nguoidung',
          method: req.method,
          url: req.url,
          error: error.message,
          stack: error.stack
        });
        next(error);
      });

// 1️⃣ LOGIN (CÓ TOKEN)
exports.login = asyncHandler(async (req, res) => {
  try {
    const { email, mat_khau } = req.body || {};
    console.log(`🔑 Login attempt for email: ${email}`);

    if (!email || !mat_khau) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp email và mật khẩu.",
      });
    }

    const user = await nguoidung.getByEmail(email.trim());
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại.",
      });
    }

    const isMatch = mat_khau.trim() === user.mat_khau.trim();
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu không chính xác.",
      });
    }

    const { mat_khau: _, ...userWithoutPassword } = user;

    // 🔑 Sinh token
    const token = jwt.sign(
      { id: user.ID_NguoiDung, email: user.email, Role: user.Role || "user" },
      SECRET_KEY,
      { expiresIn: EXPIRES }
    );

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  }
});
exports.insert = asyncHandler(async (req, res) => {
  try {
    const newData = { ...(req.body || {}) };

    if (!newData.email || !newData.mat_khau || !newData.ho_ten) {
      return res.status(400).json({
        success: false,
        message: "Email, mật khẩu và họ tên là bắt buộc.",
      });
    }

    if (!newData.email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ.",
      });
    }

    const existingUser = await nguoidung.getByEmail(newData.email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email đã được sử dụng.",
      });
    }

    const result = await nguoidung.insert(newData);
    res.status(201).json({
      success: true,
      id: result.insertId,
      message: "Tạo người dùng thành công.",
    });
  } catch (error) {
    console.error('❌ Insert user error:', error);
    throw error;
  }
});

// UPDATE USER (KHÔNG CẦN TOKEN, CHỈ CẦN ID)
exports.update = asyncHandler(async (req, res) => {
  try {
    const updatedData = { ...(req.body || {}) };
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ID người dùng là bắt buộc."
      });
    }

    const currentUser = await nguoidung.getById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại.",
      });
    }

    // Xử lý mật khẩu
    if (updatedData.mat_khau_cu && updatedData.mat_khau) {
      const isOldPasswordValid = updatedData.mat_khau_cu.trim() === currentUser.mat_khau.trim();
      if (!isOldPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Mật khẩu cũ không chính xác.",
        });
      }
      delete updatedData.mat_khau_cu;
    } else {
      delete updatedData.mat_khau;
      delete updatedData.mat_khau_cu;
    }

    // Xử lý xóa hình ảnh cũ khi cập nhật avatar mới
    if (updatedData.anh_dai_dien && updatedData.anh_dai_dien !== currentUser.anh_dai_dien) {
      if (currentUser.anh_dai_dien &&
        currentUser.anh_dai_dien !== 'https://i.pravatar.cc/150' &&
        currentUser.anh_dai_dien.includes('/uploads/')) {
        try {
          const uploadsDir = path.join(__dirname, '../uploads');
          const oldImageFilename = path.basename(currentUser.anh_dai_dien);
          const oldImagePath = path.join(uploadsDir, oldImageFilename);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log(`✅ Đã xóa hình ảnh cũ: ${oldImageFilename}`);
          }
        } catch (fileError) {
          console.error('❌ Lỗi khi xóa hình ảnh cũ:', fileError);
        }
      }
    }

    const affectedRows = await nguoidung.update(userId, updatedData);
    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại hoặc không có gì thay đổi.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật thành công.",
      affectedRows,
    });
  } catch (error) {
    console.error('❌ Update user error:', error);
    throw error;
  }
});

// GET ALL USERS với phân trang
exports.getAll = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { data, total } = await nguoidung.getAllPaginated(limit, offset);

    const users = data.map(user => {
      const { mat_khau, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.status(200).json({
      success: true,
      count: users.length,
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    console.error('❌ Get all users error:', error);
    throw error;
  }
});

// GET USER BY ID (KHÔNG CẦN TOKEN)
exports.getById = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await nguoidung.getById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
    });
  }

  const { mat_khau, ...userWithoutPassword } = user;
  res.status(200).json({
    success: true,
    user: userWithoutPassword,
  });
});

exports.delete = asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng là bắt buộc.'
      });
    }

    const user = await nguoidung.getById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại.',
      });
    }

    if (user.anh_dai_dien && user.anh_dai_dien !== 'https://i.pravatar.cc/150' && user.anh_dai_dien.includes('/uploads/')) {
      try {
        const uploadsDir = path.join(__dirname, '../uploads');
        const imageFilename = path.basename(user.anh_dai_dien);
        const imagePath = path.join(uploadsDir, imageFilename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log(`✅ Đã xóa file hình ảnh: ${imageFilename}`);
        }
      } catch (fileError) {
        console.error('❌ Lỗi khi xóa file hình ảnh:', fileError);
      }
    }

    const affectedRows = await nguoidung.delete(userId);
    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không thể xóa. Người dùng không tồn tại.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Xóa tài khoản thành công!',
    });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    throw error;
  }
});

// VERIFY PASSWORD (KHÔNG CẦN TOKEN)
exports.verifyPassword = asyncHandler(async (req, res) => {
  const { mat_khau } = req.body;
  const userId = req.params.id;

  if (!mat_khau) {
    return res.status(400).json({
      success: false,
      valid: false,
      message: 'Mật khẩu là bắt buộc.',
    });
  }

  const user = await nguoidung.getById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      valid: false,
      message: 'Người dùng không tồn tại.',
    });
  }

  const isValid = mat_khau.trim() === user.mat_khau.trim();
  res.status(200).json({
    success: true,
    valid: isValid,
    message: isValid ? 'Mật khẩu chính xác' : 'Mật khẩu không chính xác',
  });
});

// SEARCH USERS (Không thay đổi)
exports.timKiem = asyncHandler(async (req, res) => {
  const { tuKhoa, idNguoiDungHienTai } = req.query;
  if (!tuKhoa) {
    return res.status(400).json({ success: false, message: "Thiếu từ khóa tìm kiếm." });
  }
  if (!idNguoiDungHienTai) {
    return res.status(400).json({ success: false, message: "Thiếu ID người dùng hiện tại." });
  }
  const users = await nguoidung.timKiem(tuKhoa, idNguoiDungHienTai);
  res.status(200).json({ success: true, count: users.length, data: users });
});

// ==================== VIP APIs ====================

// POST /vip/set/:id  — Kích hoạt VIP, body: { ngay_het_han_vip: "2026-12-31T23:59:59" }
exports.setVIP = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { ngay_het_han_vip } = req.body;

  if (!ngay_het_han_vip) {
    return res.status(400).json({ success: false, message: "Vui lòng cung cấp ngày hết hạn VIP." });
  }

  const ngayHetHan = new Date(ngay_het_han_vip);
  if (isNaN(ngayHetHan.getTime()) || ngayHetHan <= new Date()) {
    return res.status(400).json({ success: false, message: "Ngày hết hạn VIP không hợp lệ hoặc đã qua." });
  }

  const user = await nguoidung.getById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "Người dùng không tồn tại." });
  }

  const affectedRows = await nguoidung.setVIP(userId, ngayHetHan);
  res.status(200).json({
    success: true,
    message: "Kích hoạt VIP thành công.",
    ngay_het_han_vip: ngayHetHan,
    affectedRows
  });
});

// DELETE /vip/remove/:id  — Hủy VIP
exports.removeVIP = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await nguoidung.getById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "Người dùng không tồn tại." });
  }

  if (!user.la_vip) {
    return res.status(400).json({ success: false, message: "Người dùng chưa có VIP." });
  }

  const affectedRows = await nguoidung.removeVIP(userId);
  res.status(200).json({ success: true, message: "Đã hủy VIP thành công.", affectedRows });
});

// GET /vip/check/:id  — Kiểm tra trạng thái VIP
exports.checkVIP = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const vipInfo = await nguoidung.checkVIP(userId);
  if (!vipInfo) {
    return res.status(404).json({ success: false, message: "Người dùng không tồn tại." });
  }

  res.status(200).json({
    success: true,
    data: {
      la_vip: vipInfo.la_vip,
      ngay_het_han_vip: vipInfo.ngay_het_han_vip,
      is_active: vipInfo.is_active,
      message: vipInfo.is_active ? "VIP đang hoạt động." : "VIP không hoạt động hoặc đã hết hạn."
    }
  });
});

// GET /vip/all  — Danh sách tất cả user VIP còn hạn
exports.getAllVIP = asyncHandler(async (req, res) => {
  const users = await nguoidung.getAllVIP();
  res.status(200).json({ success: true, count: users.length, data: users });
});

// ✅ EXPORT TẤT CẢ METHODS
module.exports = {
  login: exports.login,
  insert: exports.insert,
  update: exports.update,
  getAll: exports.getAll,
  getById: exports.getById,
  delete: exports.delete,
  verifyPassword: exports.verifyPassword,
  timKiem: exports.timKiem,
  // VIP
  setVIP: exports.setVIP,
  removeVIP: exports.removeVIP,
  checkVIP: exports.checkVIP,
  getAllVIP: exports.getAllVIP
};