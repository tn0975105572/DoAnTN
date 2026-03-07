const likebaidang = require('../models/likebaidang');
const thongbao = require('../models/thongbao');
const { v4: uuidv4 } = require("uuid");
const pool = require("../config/database");

exports.getAll = async (req, res) => {
    try {
        const data = await likebaidang.getAll();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.getById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await likebaidang.getById(id);
       
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.insert = async (req, res) => {
  try {
    const newData = req.body;
    const userId = newData.ID_NguoiDung;
    const postId = newData.ID_BaiDang;

    // Kiểm tra đã like chưa
    const existingLike = await likebaidang.checkUserLiked(postId, userId);
    if (existingLike) {
      return res.status(400).json({ 
        message: "Bạn đã like bài đăng này rồi" 
      });
    }

    const newId = await likebaidang.insert(newData);

    // Thêm điểm cho người like
    try {
      await pool.query('CALL AddPointsToUser(?, ?, ?, ?, ?)', [
        userId,
        2, // +2 điểm khi like
        'like',
        'Like bài đăng',
        postId
      ]);
    } catch (pointError) {
      console.error('Error adding points for like:', pointError);
    }

    // Thêm điểm cho chủ bài đăng và tạo thông báo
    try {
      // Lấy thông tin chủ bài đăng
      const [postOwner] = await pool.query(
        'SELECT ID_NguoiDung FROM baidang WHERE ID_BaiDang = ?',
        [postId]
      );
      
      if (postOwner[0] && postOwner[0].ID_NguoiDung !== userId) {
        const postOwnerId = postOwner[0].ID_NguoiDung;
        
        // Thêm điểm
        await pool.query('CALL AddPointsToUser(?, ?, ?, ?, ?)', [
          postOwnerId,
          3, // +3 điểm khi nhận like
          'nhan_like',
          'Nhận like cho bài đăng',
          postId
        ]);

        // Tạo thông báo với Socket.IO
        try {
          await thongbao.createLikeNotification(postId, postOwnerId, userId, req.io);
        } catch (notifError) {
          console.error('Error creating like notification:', notifError);
        }
      }
    } catch (pointError) {
      console.error('Error adding points for received like:', pointError);
    }

    res.status(201).json({ 
      ID_Like: newId, 
      message: "Like thành công, đã nhận 2 điểm" 
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ", error });
  }
};

exports.update = async (req, res) => {
    try {
        const id = req.params.id;
        const updatedData = req.body;
        const affectedRows = await likebaidang.update(id, updatedData);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'likebaidang không tồn tại' });
        }
        res.json({ message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        const affectedRows = await likebaidang.delete(id);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'likebaidang không tồn tại' });
        }
        res.json({ message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

// Lấy thông tin người đã like bài đăng với thời gian like
exports.getLikesByPostId = async (req, res) => {
    try {
        const postId = req.params.postId;
        
        if (!postId) {
            return res.status(400).json({
                success: false,
                message: "ID bài đăng không được để trống"
            });
        }

        const likes = await likebaidang.getLikesByPostId(postId);
        const likeCount = await likebaidang.getLikeCountByPostId(postId);

        res.json({
            success: true,
            data: likes,
            total: likeCount,
            message: `Đã lấy thành công ${likes.length} người like bài đăng`
        });

    } catch (error) {
        console.error("Error getting post likes:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi máy chủ",
            error: error.message
        });
    }
};

// Lấy số lượng like của bài đăng
exports.getLikeCountByPostId = async (req, res) => {
    try {
        const postId = req.params.postId;
        
        if (!postId) {
            return res.status(400).json({
                success: false,
                message: "ID bài đăng không được để trống"
            });
        }

        const likeCount = await likebaidang.getLikeCountByPostId(postId);

        res.json({
            success: true,
            data: {
                ID_BaiDang: postId,
                SoLuongLike: likeCount
            },
            message: `Bài đăng có ${likeCount} lượt like`
        });

    } catch (error) {
        console.error("Error getting like count:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi máy chủ",
            error: error.message
        });
    }
};

// Kiểm tra người dùng đã like bài đăng chưa
exports.checkUserLiked = async (req, res) => {
    try {
        const { postId, userId } = req.params;
        
        if (!postId || !userId) {
            return res.status(400).json({
                success: false,
                message: "ID bài đăng và ID người dùng không được để trống"
            });
        }

        const likeInfo = await likebaidang.checkUserLiked(postId, userId);

        res.json({
            success: true,
            data: {
                hasLiked: !!likeInfo,
                likeInfo: likeInfo
            },
            message: likeInfo ? "Người dùng đã like bài đăng này" : "Người dùng chưa like bài đăng này"
        });

    } catch (error) {
        console.error("Error checking user like:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi máy chủ",
            error: error.message
        });
    }
};