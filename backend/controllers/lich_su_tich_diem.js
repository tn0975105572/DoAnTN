const lich_su_tich_diem = require('../models/lich_su_tich_diem');
const { v4: uuidv4 } = require('uuid');

exports.getAll = async (req, res) => {
    try {
        const data = await lich_su_tich_diem.getAll();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await lich_su_tich_diem.getById(id);
        if (!data) {
            return res.status(404).json({ message: 'Lịch sử không tồn tại' });
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.getByUserId = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { limit = 50, offset = 0 } = req.query;
        const data = await lich_su_tich_diem.getByUserId(userId, parseInt(limit), parseInt(offset));
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.getByTransactionType = async (req, res) => {
    try {
        const { loai } = req.params;
        const data = await lich_su_tich_diem.getByTransactionType(loai);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.getByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Thiếu thông tin ngày bắt đầu và kết thúc' });
        }
        const data = await lich_su_tich_diem.getByDateRange(startDate, endDate);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newData = {
            ID_LichSu: uuidv4(),
            ...req.body
        };
        const insertId = await lich_su_tich_diem.insert(newData);
        res.status(201).json({ id: insertId, message: 'Thêm mới thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const id = req.params.id;
        const updatedData = req.body;
        const affectedRows = await lich_su_tich_diem.update(id, updatedData);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Lịch sử không tồn tại' });
        }
        res.json({ message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        const affectedRows = await lich_su_tich_diem.delete(id);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Lịch sử không tồn tại' });
        }
        res.json({ message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.getUserStats = async (req, res) => {
    try {
        const userId = req.params.userId;
        const data = await lich_su_tich_diem.getUserStats(userId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.getCurrentPoints = async (req, res) => {
    try {
        const userId = req.params.userId;
        const currentPoints = await lich_su_tich_diem.getCurrentPoints(userId);
        res.json({ currentPoints });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.getOverallStats = async (req, res) => {
    try {
        const data = await lich_su_tich_diem.getOverallStats();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

// API để thêm điểm cho người dùng (sử dụng stored procedure)
exports.addPoints = async (req, res) => {
    try {
        const { userId, pointChange, transactionType, description, referenceId } = req.body;
        
        if (!userId || pointChange === undefined || !transactionType) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
        }

        const pool = require('../config/database');
        const [result] = await pool.query('CALL AddPointsToUser(?, ?, ?, ?, ?)', [
            userId, 
            pointChange, 
            transactionType, 
            description || '', 
            referenceId || null
        ]);
        
        res.json({ 
            message: 'Thêm điểm thành công', 
            newPoints: result[0][0].new_points 
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};







