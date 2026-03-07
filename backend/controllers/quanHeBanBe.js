const quanHeBanBe = require("../models/quanHeBanBe");
const NguoiDung = require("../models/nguoidung");
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

exports.guiYeuCau = asyncHandler(async (req, res) => {
  const { idNguoiGui, idNguoiNhan } = req.body;

  if (!idNguoiGui || !idNguoiNhan) {
    return res.status(400).json({ success: false, message: "Thiếu ID người gửi hoặc người nhận." });
  }

  if (idNguoiGui === idNguoiNhan) {
    return res.status(400).json({ success: false, message: "Bạn không thể tự kết bạn với chính mình." });
  }

  const existing = await quanHeBanBe.layQuanHe(idNguoiGui, idNguoiNhan);
  if (existing) {
    return res.status(409).json({ success: false, message: "Đã tồn tại mối quan hệ hoặc lời mời." });
  }

  await quanHeBanBe.taoYeuCau(idNguoiGui, idNguoiNhan);

  req.io.to(idNguoiNhan).emit('new_friend_request', {
    message: `Bạn có lời mời kết bạn mới!`,
    from: idNguoiGui
  });
  // ---------------

  res.status(201).json({ success: true, message: "Đã gửi lời mời kết bạn." });
});

exports.chapNhanYeuCau = asyncHandler(async (req, res) => {
  const { idNguoiNhan, idNguoiGui } = req.body;

  if (!idNguoiGui || !idNguoiNhan) {
    return res.status(400).json({ success: false, message: "Thiếu ID người gửi hoặc người nhận." });
  }

  const affectedRows = await quanHeBanBe.capNhatTrangThai(idNguoiGui, idNguoiNhan, 'da_dong_y');

  if (affectedRows === 0) {
    return res.status(404).json({ success: false, message: "Không tìm thấy lời mời." });
  }

  // --- REAL-TIME ---
  // Báo cho người gửi rằng yêu cầu đã được chấp nhận
  req.io.to(idNguoiGui).emit('relationship_updated', {
    message: `Một người dùng đã chấp nhận lời mời của bạn.`,
    partnerId: idNguoiNhan
  });
  // ---------------

  res.status(200).json({ success: true, message: "Kết bạn thành công." });
});

exports.tuChoiHoacChan = asyncHandler(async (req, res) => {
  const { idNguoiThucHien, idBiChan } = req.body;

  if (!idNguoiThucHien || !idBiChan) {
    return res.status(400).json({ success: false, message: "Thiếu ID người thực hiện hoặc người bị chặn." });
  }

  const moiMoi = await quanHeBanBe.layQuanHe(idBiChan, idNguoiThucHien);

  let updated = false;
  if (moiMoi && moiMoi.ID_NguoiGui === idBiChan && moiMoi.trang_thai === 'dang_cho') {
    await quanHeBanBe.capNhatTrangThai(idBiChan, idNguoiThucHien, 'da_chan');
    updated = true;
  } else {
    const quanHeHienTai = await quanHeBanBe.layQuanHe(idNguoiThucHien, idBiChan);
    if (quanHeHienTai) {
      await quanHeBanBe.capNhatTrangThai(idNguoiThucHien, idBiChan, 'da_chan');
      updated = true;
    } else {
      return res.status(501).json({ success: false, message: "Logic chặn (tạo mới) chưa được hỗ trợ." });
    }
  }

  if (updated) {
    req.io.to(idBiChan).emit('relationship_updated', {
      message: `Quan hệ của bạn với một người dùng đã thay đổi.`,
      partnerId: idNguoiThucHien
    });
    // ---------------
  }

  res.status(200).json({ success: true, message: "Đã chặn người dùng." });
});

exports.huyBanBe = asyncHandler(async (req, res) => {
  const { idNguoiGui, idNguoiNhan } = req.body; // Sửa param để khớp với FE

  if (!idNguoiGui || !idNguoiNhan) {
    return res.status(400).json({ success: false, message: "Thiếu ID người gửi hoặc người nhận." });
  }

  const affectedRows = await quanHeBanBe.xoaQuanHe(idNguoiGui, idNguoiNhan);

  if (affectedRows === 0) {
    return res.status(404).json({ success: false, message: "Không tìm thấy mối quan hệ." });
  }

  // --- REAL-TIME ---
  // Báo cho cả hai người dùng về sự thay đổi (client sẽ tự quyết định ai là partner)
  req.io.to(idNguoiGui).emit('relationship_updated', {
    message: `Quan hệ của bạn với một người dùng đã thay đổi.`,
    partnerId: idNguoiNhan
  });
  req.io.to(idNguoiNhan).emit('relationship_updated', {
    message: `Quan hệ của bạn với một người dùng đã thay đổi.`,
    partnerId: idNguoiGui
  });
  // ---------------

  res.status(200).json({ success: true, message: "Đã hủy/từ chối thành công." });
});

exports.huyLoiMoiDaGui = asyncHandler(async (req, res) => {
  const { idNguoiGui, idNguoiNhan } = req.body;

  if (!idNguoiGui || !idNguoiNhan) {
    return res.status(400).json({ success: false, message: "Thiếu ID người gửi hoặc người nhận." });
  }

  const affectedRows = await quanHeBanBe.xoaLoiMoiDaGui(idNguoiGui, idNguoiNhan);

  if (affectedRows === 0) {
    return res.status(200).json({ success: true, message: "Không có lời mời nào để hủy." });
  }

  // --- REAL-TIME ---
  // Báo cho người nhận rằng lời mời đã bị hủy
  req.io.to(idNguoiNhan).emit('relationship_updated', {
    message: `Một lời mời kết bạn đã được hủy.`,
    partnerId: idNguoiGui
  });
  // ---------------

  res.status(200).json({ success: true, message: "Đã hủy lời mời." });
});


exports.layDanhSachBanBe = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  if (!userId) {
    return res.status(400).json({ success: false, message: "Thiếu ID người dùng." });
  }

  const friends = await quanHeBanBe.layDanhSachBanBe(userId);
  res.status(200).json({ success: true, count: friends.length, data: friends });
});

exports.demTongSoBan = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  if (!userId) {
    return res.status(400).json({ success: false, message: "Thiếu ID người dùng." });
  }

  const total = await quanHeBanBe.demTongSoBan(userId);
  res.status(200).json({ success: true, userId, totalFriends: total });
});

exports.demBanChung = asyncHandler(async (req, res) => {
  const { userId1, userId2 } = req.params;
  if (!userId1 || !userId2) {
    return res.status(400).json({ success: false, message: "Thiếu ID của 2 người dùng." });
  }
  const total = await quanHeBanBe.demBanChung(userId1, userId2);
  res.status(200).json({ success: true, users: [userId1, userId2], mutualFriendsCount: total });
});

exports.goiYBanBe = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  if (!userId) {
    return res.status(400).json({ success: false, message: "Thiếu ID người dùng." });
  }

  const currentUser = await NguoiDung.getById(userId);
  if (!currentUser) {
    return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
  }

  const userQueQuan = currentUser.que_quan || "";
  const userTruongHoc = currentUser.truong_hoc || "";

  const queQuanParts = userQueQuan.split(', ');
  const userProvince = queQuanParts.length > 0 ? queQuanParts[queQuanParts.length - 1] : "";

  const suggestions = await quanHeBanBe.goiYBanBe(
    userId,
    userQueQuan,
    userProvince,
    userTruongHoc
  );

  res.status(200).json({ success: true, count: suggestions.length, data: suggestions });
});

exports.layLoiMoiDangCho = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  if (!userId) {
    return res.status(400).json({ success: false, message: "Thiếu ID người dùng." });
  }
  const requests = await quanHeBanBe.layLoiMoiDangCho(userId);
  res.status(200).json({ success: true, count: requests.length, data: requests });
});

exports.layLoiMoiDaGui = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  if (!userId) {
    return res.status(400).json({ success: false, message: "Thiếu ID người dùng." });
  }
  const sentRequests = await quanHeBanBe.layLoiMoiDaGui(userId);
  res.status(200).json({ success: true, count: sentRequests.length, data: sentRequests });
});

