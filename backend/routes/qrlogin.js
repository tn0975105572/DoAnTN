const express = require('express');
const router = express.Router();
const qrLoginController = require('../controllers/qrlogin');
const { socketAuth } = require('../socket/socketMiddleware');

// Endpoint to generate a new QR session ID
router.post('/generate', qrLoginController.generateSession);

// Endpoint for mobile app to verify/authorize a session
// We reuse socketAuth for verification if we want to ensure the mobile user is logged in
// However, since this is a REST endpoint, we should use the same logic as socketAuth
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const SECRET_KEY = process.env.JWT_SECRET || "default_secret";

const apiAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

router.post('/verify', apiAuth, qrLoginController.verifySession);

// Endpoint for polling status
router.get('/status/:sessionId', qrLoginController.checkStatus);

module.exports = router;
