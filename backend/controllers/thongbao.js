const thongbao = require('../models/thongbao');

const getAuthenticatedUserId = (req) =>
    String(req.user?.id || req.user?.userId || '');

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
        const userId = getAuthenticatedUserId(req);
        const data = await thongbao.getById(id);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
        }
        if (String(data.ID_NguoiDung) !== userId) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem thông báo này' });
        }
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};

// Lấy thông báo theo user ID
exports.getByUserId = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const rawLimit = req.query.limit;
        const limit = Number.isNaN(parseInt(rawLimit, 10)) ? 50 : parseInt(rawLimit, 10);
        const data = await thongbao.getByUserId(userId, limit);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};

// Đếm thông báo chưa đọc
exports.countUnread = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
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
        const userId = getAuthenticatedUserId(req);
        const notification = await thongbao.getById(id);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
        }
        if (String(notification.ID_NguoiDung) !== userId) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền cập nhật thông báo này' });
        }
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
        const userId = getAuthenticatedUserId(req);
        const affectedRows = await thongbao.markAllAsRead(userId);
        res.json({ success: true, message: 'Đã đánh dấu tất cả đọc', count: affectedRows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.insert = async (req, res) => {
    try {
        const newData = req.body;
        const insertId = await thongbao.insert(newData, req.io);
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
        const userId = getAuthenticatedUserId(req);
        const notification = await thongbao.getById(id);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
        }
        if (String(notification.ID_NguoiDung) !== userId) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa thông báo này' });
        }
        const affectedRows = await thongbao.delete(id);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
        }
        res.json({ success: true, message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};
