const nguoidungtichdiem = require('../models/nguoidungtichdiem');
const { v4: uuidv4 } = require('uuid');

exports.getAll = async (req, res) => {
    try {
        const data = await nguoidungtichdiem.getAll();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await nguoidungtichdiem.getById(id);
        if (!data) {
            return res.status(404).json({ message: 'Giao dịch không tồn tại' });
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.getByUserId = async (req, res) => {
    try {
        const userId = req.params.userId;
        const data = await nguoidungtichdiem.getByUserId(userId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.getByType = async (req, res) => {
    try {
        const { loai } = req.params;
        const data = await nguoidungtichdiem.getByType(loai);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newData = {
            ID_NguoiDungTichDiem: uuidv4(),
            ...req.body
        };
        const insertId = await nguoidungtichdiem.insert(newData);
        res.status(201).json({ id: insertId, message: 'Thêm mới thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const id = req.params.id;
        const updatedData = req.body;
        const affectedRows = await nguoidungtichdiem.update(id, updatedData);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Giao dịch không tồn tại' });
        }
        res.json({ message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        const affectedRows = await nguoidungtichdiem.delete(id);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Giao dịch không tồn tại' });
        }
        res.json({ message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};

exports.getStatsByUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        const data = await nguoidungtichdiem.getStatsByUser(userId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
};







