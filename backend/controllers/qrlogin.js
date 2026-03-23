const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const SECRET_KEY = process.env.JWT_SECRET || "default_secret";

// In-memory storage for QR sessions (for demo/development)
// In production, consider using Redis or a database table
const qrSessions = new Map();
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STATUS_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const STATUS_RATE_LIMIT_MAX = 30; // max 30 checks / minute / session

// Định kỳ dọn dẹp session hết hạn
setInterval(() => {
    const now = Date.now();
    for (const [id, session] of qrSessions.entries()) {
        if (session.expiresAt <= now) {
            qrSessions.delete(id);
        }
    }
}, 60 * 1000);

exports.generateSession = (req, res) => {
    const sessionId = uuidv4();
    const expiresAt = Date.now() + SESSION_TTL_MS;

    qrSessions.set(sessionId, {
        status: 'pending',
        expiresAt,
        userId: null,
        originIp: req.ip,
        tokenRetrieved: false,
        rateLimitWindowStart: Date.now(),
        rateLimitCount: 0
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
    session.authenticatedIp = req.ip;

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

// Kiểm tra rate limit cho /status
function checkStatusRateLimit(session) {
    const now = Date.now();
    if (now - session.rateLimitWindowStart > STATUS_RATE_LIMIT_WINDOW) {
        session.rateLimitWindowStart = now;
        session.rateLimitCount = 0;
    }
    session.rateLimitCount += 1;
    return session.rateLimitCount <= STATUS_RATE_LIMIT_MAX;
}

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

    // Ràng buộc IP: chỉ client tạo QR mới được kiểm tra
    if (session.originIp && session.originIp !== req.ip) {
        return res.status(403).json({ success: false, message: 'IP không khớp phiên' });
    }

    // Rate limit để tránh brute force
    if (!checkStatusRateLimit(session)) {
        return res.status(429).json({ success: false, message: 'Quá nhiều yêu cầu, thử lại sau' });
    }

    if (session.status === 'authenticated') {
        if (session.tokenRetrieved) {
            qrSessions.delete(sessionId);
            return res.status(410).json({ success: false, message: 'Phiên đã được dùng' });
        }
        session.tokenRetrieved = true;
        const response = {
            success: true,
            status: 'authenticated',
            token: session.token,
            user: session.userData
        };
        // Xóa ngay sau khi phát token
        qrSessions.delete(sessionId);
        return res.json(response);
    }

    res.json({ success: true, status: 'pending' });
};
