const thongbao = require('../models/thongbao');

exports.getAll = async (req, res) => {
    try {
        const data = await thongbao.getAll();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await thongbao.getById(id);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
        }
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};

// Lấy thông báo theo user ID
exports.getByUserId = async (req, res) => {
    try {
        const userId = req.params.userId;
        const limit = req.query.limit || 50;
        const data = await thongbao.getByUserId(userId, parseInt(limit));
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};

// Đếm thông báo chưa đọc
exports.countUnread = async (req, res) => {
    try {
        const userId = req.params.userId;
        const count = await thongbao.countUnread(userId);
        res.json({ success: true, unread_count: count });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};

// Đánh dấu đã đọc một thông báo
exports.markAsRead = async (req, res) => {
    try {
        const id = req.params.id;
        const affectedRows = await thongbao.markAsRead(id);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
        }
        res.json({ success: true, message: 'Đã đánh dấu đọc' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};

// Đánh dấu tất cả thông báo đã đọc
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.params.userId;
        const affectedRows = await thongbao.markAllAsRead(userId);
        res.json({ success: true, message: 'Đã đánh dấu tất cả đọc', count: affectedRows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.insert = async (req, res) => {
    try {
        const newData = req.body;
        const insertId = await thongbao.insert(newData);
        res.status(201).json({ success: true, id: insertId, message: 'Thêm mới thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const id = req.params.id;
        const updatedData = req.body;
        const affectedRows = await thongbao.update(id, updatedData);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
        }
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        const affectedRows = await thongbao.delete(id);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
        }
        res.json({ success: true, message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};
