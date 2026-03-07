const binhluanbaidang = require('../models/binhluanbaidang');
const thongbao = require('../models/thongbao');
const { v4: uuidv4 } = require('uuid'); // Dùng để tạo ID duy nhất
const pool = require("../config/database");

// Lấy tất cả
exports.getAll = async (req, res) => {
    try {
        const data = await binhluanbaidang.getAll();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};
exports.getbyID_BaiDang = async (req, res) => {
    try {
        const data = await binhluanbaidang.getbyID_BaiDang(req.params.id);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

// Lấy một bình luận theo ID
exports.getById = async (req, res) => {
    try {
        const data = await binhluanbaidang.getById(req.params.id);
        if (!data) {
            return res.status(404).json({ message: 'Bình luận không tồn tại' });
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.getCommentTreeByPost = async (req, res) => {
    try {
        const flatComments = await binhluanbaidang.getCommentTreeByPostId(req.params.id);
        // Trả về mảng rỗng nếu chưa có bình luận (không phải 404)
        if (!flatComments || flatComments.length === 0) {
            return res.json([]);
        }

        const commentsMap = {};
        const rootComments = [];
        flatComments.forEach(c => { c.children = []; commentsMap[c.ID_BinhLuan] = c; });
        flatComments.forEach(c => {
            if (c.ID_BinhLuanCha && commentsMap[c.ID_BinhLuanCha]) {
                commentsMap[c.ID_BinhLuanCha].children.push(c);
            } else {
                rootComments.push(c);
            }
        });

        res.json(rootComments);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

// Tạo bình luận mới
exports.insert = async (req, res) => {
    try {
        const newId = uuidv4();
        const newData = { ID_BinhLuan: newId, ...req.body };
        const userId = newData.ID_NguoiDung;
        const postId = newData.ID_BaiDang;

        await binhluanbaidang.insert(newData);

        // Thêm điểm cho người bình luận
        try {
            await pool.query('CALL AddPointsToUser(?, ?, ?, ?, ?)', [
                userId,
                5, // +5 điểm khi bình luận
                'binh_luan',
                'Bình luận bài đăng',
                postId
            ]);
        } catch (pointError) {
            console.error('Error adding points for comment:', pointError);
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
                    10, // +10 điểm khi nhận bình luận
                    'nhan_binh_luan',
                    'Nhận bình luận cho bài đăng',
                    postId
                ]);

                // Tạo thông báo với Socket.IO
                try {
                    await thongbao.createCommentNotification(postId, postOwnerId, userId, req.io);
                } catch (notifError) {
                    console.error('Error creating comment notification:', notifError);
                }
            }
        } catch (pointError) {
            console.error('Error adding points for received comment:', pointError);
        }

        res.status(201).json({
            id: newId,
            message: 'Bình luận thành công, đã nhận 5 điểm'
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

// Cập nhật bình luận
exports.update = async (req, res) => {
    try {
        const affectedRows = await binhluanbaidang.update(req.params.id, req.body);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Bình luận không tồn tại' });
        }
        res.json({ message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

// Xóa bình luận
exports.delete = async (req, res) => {
    try {
        const affectedRows = await binhluanbaidang.delete(req.params.id);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Bình luận không tồn tại' });
        }
        res.json({ message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};