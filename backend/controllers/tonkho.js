const tonkho = require('../models/tonkho');

exports.getAll = async (req, res) => {
    try {
        const data = await tonkho.getAll();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.getById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await tonkho.getById(id);
        if (!data) {
            return res.status(404).json({ message: 'tonkho không tồn tại' });
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.getByPostId = async (req, res) => {
    try {
        const postId = req.params.postId;
        const data = await tonkho.getByPostId(postId);
        res.json({
            success: true,
            data,
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.insert = async (req, res) => {
    try {
        const newData = req.body;
        const insertId = await tonkho.insert(newData);
        res.status(201).json({ id: insertId, message: 'Thêm mới thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.update = async (req, res) => {
    try {
        const id = req.params.id;
        const updatedData = req.body;
        const affectedRows = await tonkho.update(id, updatedData);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'tonkho không tồn tại' });
        }
        res.json({ message: 'Cập nhật thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.upsertByPostId = async (req, res) => {
    try {
        const { postId } = req.params;
        const parsedQuantity = Number.parseInt(req.body?.so_luong_con_lai, 10);

        if (!postId) {
            return res.status(400).json({ message: 'Thiếu ID bài đăng' });
        }

        if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) {
            return res.status(400).json({ message: 'Số lượng tồn kho phải là số nguyên không âm' });
        }

        const record = await tonkho.upsertByPostId(postId, parsedQuantity);
        res.json({
            success: true,
            message: 'Cập nhật tồn kho thành công',
            data: record,
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        const affectedRows = await tonkho.delete(id);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'tonkho không tồn tại' });
        }
        res.json({ message: 'Xóa thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};
