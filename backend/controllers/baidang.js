const baidang = require("../models/baidang");
const baidang_anh = require("../models/baidang_anh");
const { v4: uuidv4 } = require("uuid");
const pool = require("../config/database");

// Lấy tất cả bài đăng với thông tin liên quan
exports.getAllWithDetails = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || 'all';
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const { data, total } = await baidang.getAllWithDetailsPaginated(limit, offset, status, search);

    res.json({
      success: true,
      data: data,
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error getting posts with details:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// Lấy bài đăng theo ID với thông tin chi tiết
exports.getByIdWithDetails = async (req, res) => {
  try {
    const id = req.params.id;
    const post = await baidang.getByIdWithDetails(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Bài đăng không tồn tại",
      });
    }

    // Lấy bình luận
    const comments = await baidang.getCommentsByPostId(id);
    post.comments = comments;

    // Lấy danh sách like
    const likes = await baidang.getLikesByPostId(id);
    post.likes = likes;

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Error getting post details:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// Lấy bài đăng theo danh mục
exports.getByCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const data = await baidang.getByCategory(categoryId);

    res.json({
      success: true,
      data: data,
      total: data.length,
    });
  } catch (error) {
    console.error("Error getting posts by category:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// Lấy bài đăng theo loại
exports.getByType = async (req, res) => {
  try {
    const typeId = req.params.typeId;
    const data = await baidang.getByType(typeId);

    res.json({
      success: true,
      data: data,
      total: data.length,
    });
  } catch (error) {
    console.error("Error getting posts by type:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// Tìm kiếm bài đăng
exports.search = async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập từ khóa tìm kiếm",
      });
    }

    const data = await baidang.search(keyword);

    res.json({
      success: true,
      data: data,
      total: data.length,
      keyword: keyword,
    });
  } catch (error) {
    console.error("Error searching posts:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// Lấy bài đăng của người dùng
exports.getByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const data = await baidang.getByUserId(userId);

    // Format dữ liệu để phù hợp với frontend
    const formattedData = data.map((post) => ({
      ...post,
      anh_dai_dien: post.anh_dai_dien || post.AnhDaiDien,
    }));

    res.json({
      success: true,
      data: formattedData,
      total: formattedData.length,
    });
  } catch (error) {
    console.error("Error getting user posts:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};

// Các method cũ (giữ nguyên)
exports.getAll = async (req, res) => {
  try {
    const data = await baidang.getAll();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await baidang.getById(id);
    if (!data) {
      return res.status(404).json({ message: "baidang không tồn tại" });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error });
  }
};

exports.insert = async (req, res) => {
  try {
    const newData = req.body;
    const userId = newData.ID_NguoiDung;
    let connection;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID_NguoiDung"
      });
    }

    // Generate UUID for ID_BaiDang if not provided
    if (!newData.ID_BaiDang) {
      newData.ID_BaiDang = uuidv4();
    }

    // Convert datetime strings to MySQL format if they exist
    if (newData.thoi_gian_tao) {
      newData.thoi_gian_tao = new Date(newData.thoi_gian_tao)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    }
    if (newData.thoi_gian_cap_nhat) {
      newData.thoi_gian_cap_nhat = new Date(newData.thoi_gian_cap_nhat)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    }

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Khóa hàng điểm số để tránh race
      const [userPoints] = await connection.query(
        'SELECT diem_so FROM nguoidung WHERE ID_NguoiDung = ? FOR UPDATE',
        [userId]
      );

      const currentPoints = userPoints[0]?.diem_so;
      if (currentPoints === undefined) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng"
        });
      }

      if (currentPoints < 20) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Không đủ điểm để đăng bài (cần ít nhất 20 điểm)",
          currentPoints,
          requiredPoints: 20
        });
      }

      await connection.query("INSERT INTO baidang SET ?", [newData]);

      await connection.query('CALL AddPointsToUser(?, ?, ?, ?, ?)', [
        userId,
        -20, // Trừ 20 điểm
        'dang_bai',
        'Đăng bài mới',
        newData.ID_BaiDang
      ]);

      await connection.commit();

      res.status(201).json({
        success: true,
        ID_BaiDang: newData.ID_BaiDang,
        message: "Đăng bài thành công, đã trừ 20 điểm",
      });
    } catch (txnError) {
      if (connection) {
        await connection.rollback();
      }
      console.error("Error creating post transaction:", txnError);
      res.status(500).json({ message: "Lỗi máy chủ", error: txnError.message });
    } finally {
      if (connection) connection.release();
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body;

    // Convert datetime strings to MySQL format if they exist
    if (updatedData.thoi_gian_tao) {
      updatedData.thoi_gian_tao = new Date(updatedData.thoi_gian_tao)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    }
    if (updatedData.thoi_gian_cap_nhat) {
      updatedData.thoi_gian_cap_nhat = new Date(updatedData.thoi_gian_cap_nhat)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
    }

    const affectedRows = await baidang.update(id, updatedData);
    if (affectedRows === 0) {
      return res.status(404).json({ message: "baidang không tồn tại" });
    }
    res.json({ message: "Cập nhật thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const affectedRows = await baidang.delete(id);
    if (affectedRows === 0) {
      return res.status(404).json({ message: "baidang không tồn tại" });
    }
    res.json({ message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error });
  }
};

// Xóa tất cả bài đăng và ảnh của người dùng theo ID
exports.deleteAllByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ID người dùng không được để trống"
      });
    }

    // Lấy danh sách ID bài đăng của người dùng trước khi xóa
    const postIds = await baidang.getPostIdsByUserId(userId);
    
    if (postIds.length === 0) {
      return res.json({
        success: true,
        message: "Người dùng không có bài đăng nào để xóa",
        deletedPosts: 0,
        deletedImages: 0
      });
    }

    // Xóa tất cả ảnh của các bài đăng
    const deletedImages = await baidang_anh.deleteByPostIds(postIds);
    
    // Xóa tất cả bài đăng của người dùng
    const deletedPosts = await baidang.deleteAllByUserId(userId);

    res.json({
      success: true,
      message: `Đã xóa thành công ${deletedPosts} bài đăng và ${deletedImages} ảnh của người dùng`,
      deletedPosts: deletedPosts,
      deletedImages: deletedImages
    });

  } catch (error) {
    console.error("Error deleting user posts:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message
    });
  }
};
