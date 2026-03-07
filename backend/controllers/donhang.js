const donhang = require('../models/donhang');

exports.getAll = async (req, res) => {
    try {
        const data = await donhang.getAll();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.getById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await donhang.getById(id);
        if (!data) {
            return res.status(404).json({ message: 'donhang không tồn tại' });
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.insert = async (req, res) => {
    try {
        const newData = req.body;
        const insertId = await donhang.insert(newData);
        res.status(201).json({ id: insertId, message: 'Thêm mới thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.update = async (req, res) => {
    try {
        const id = req.params.id;
        const updatedData = req.body;
        const affectedRows = await donhang.update(id, updatedData);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'donhang không tồn tại' });
        }
        res.json({ message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        const affectedRows = await donhang.delete(id);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'donhang không tồn tại' });
        }
        res.json({ message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};
