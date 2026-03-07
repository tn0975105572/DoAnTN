const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const SECRET_KEY = process.env.JWT_SECRET || "default_secret";

// In-memory storage for QR sessions (for demo/development)
// In production, consider using Redis or a database table
const qrSessions = new Map();

exports.generateSession = (req, res) => {
    const sessionId = uuidv4();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    qrSessions.set(sessionId, {
        status: 'pending',
        expiresAt,
        userId: null
    });

    res.json({
        success: true,
        sessionId,
        expiresAt
    });
};

exports.verifySession = async (req, res) => {
    const { sessionId } = req.body;
    const userId = req.user.id; // From socketAuth/middleware

    if (!sessionId) {
        return res.status(400).json({ success: false, message: 'Thiếu sessionId' });
    }

    const session = qrSessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ success: false, message: 'Phiên không tồn tại' });
    }

    if (Date.now() > session.expiresAt) {
        qrSessions.delete(sessionId);
        return res.status(410).json({ success: false, message: 'Phiên đã hết hạn' });
    }

    // Update session status
    session.status = 'authenticated';
    session.userId = userId;

    // Generate token for the web login
    const user = await pool.query('SELECT * FROM nguoidung WHERE ID_NguoiDung = ?', [userId]);
    const userData = user[0][0];

    const token = jwt.sign(
        { id: userData.ID_NguoiDung, email: userData.email, Role: userData.Role || "user" },
        SECRET_KEY,
        { expiresIn: "7d" }
    );

    session.token = token;
    session.userData = {
        ID_NguoiDung: userData.ID_NguoiDung,
        ho_ten: userData.ho_ten,
        email: userData.email,
        anh_dai_dien: userData.anh_dai_dien
    };

    // Emit socket event if io is available
    if (req.io) {
        req.io.to(sessionId).emit('qr-authenticated', {
            token: session.token,
            user: session.userData
        });
    }

    res.json({ success: true, message: 'Xác thực thành công' });
};

exports.checkStatus = (req, res) => {
    const { sessionId } = req.params;
    const session = qrSessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ success: false, message: 'Phiên không tồn tại' });
    }

    if (Date.now() > session.expiresAt) {
        qrSessions.delete(sessionId);
        return res.status(410).json({ success: false, message: 'Phiên đã hết hạn' });
    }

    if (session.status === 'authenticated') {
        const response = {
            success: true,
            status: 'authenticated',
            token: session.token,
            user: session.userData
        };
        // Option: clear session after successful retrieval
        // qrSessions.delete(sessionId); 
        return res.json(response);
    }

    res.json({ success: true, status: 'pending' });
};
