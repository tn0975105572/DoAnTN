const xacthuc = require("../models/xacthuc");
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Upload ảnh xác thực
exports.create = asyncHandler(async (req, res) => {
  const idNguoiDung = req.params.idNguoiDung;

  if (!req.files || !req.files["anh_khuon_mat"] || !req.files["anh_cmnd"]) {
    return res.status(400).json({
      success: false,
      message: "Thiếu ảnh khuôn mặt hoặc CMND",
    });
  }

  const anhKhuonMat = req.files["anh_khuon_mat"][0].filename;
  const anhCMND = req.files["anh_cmnd"][0].filename;

  const idXacThuc = await xacthuc.insert(idNguoiDung, anhKhuonMat, anhCMND);

  res.status(201).json({
    success: true,
    message: "Tạo yêu cầu xác thực thành công",
    idXacThuc,
  });
});

// Lấy tất cả bản ghi theo user
exports.getByUser = asyncHandler(async (req, res) => {
  const idNguoiDung = req.params.idNguoiDung;
  const rows = await xacthuc.getByUserId(idNguoiDung);

  res.status(200).json({
    success: true,
    data: rows,
  });
});

// Admin cập nhật trạng thái
exports.updateStatus = asyncHandler(async (req, res) => {
  const { idXacThuc } = req.params;
  const { trang_thai } = req.body;

  if (!["cho_duyet", "da_duyet", "tu_choi"].includes(trang_thai)) {
    return res.status(400).json({
      success: false,
      message: "Trạng thái không hợp lệ",
    });
  }

  const affected = await xacthuc.updateStatus(idXacThuc, trang_thai);

  if (affected === 0) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy bản ghi",
    });
  }

  res.status(200).json({
    success: true,
    message: "Cập nhật trạng thái thành công",
  });
});
