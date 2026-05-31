
const axios = require('axios');
const CryptoJS = require('crypto-js');
const moment = require('moment');
const pool = require('../config/database');
require('dotenv').config();

const config = {
    app_id: process.env.ZALOPAY_APP_ID || "2554",
    key1: process.env.ZALOPAY_KEY1 || "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn",
    key2: process.env.ZALOPAY_KEY2 || "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf",
    endpoint: "https://sb-openapi.zalopay.vn/v2/create",
    query_endpoint: "https://sb-openapi.zalopay.vn/v2/query",
    // QUAN TRỌNG: URL này PHẢI là HTTPS public để ZaloPay gọi được callback
    // Ví dụ: https://your-server.com/api/zalopay/callback
    // Nếu đang phát triển local, dùng ngrok: https://xxxx.ngrok.io/api/zalopay/callback
    callback_url: process.env.ZALOPAY_CALLBACK_URL || null
};

// In-memory storage for pending orders (ZaloPay query API doesn't return amount/embed_data)
// In production, use Redis or database table
const pendingOrders = new Map();

const zalopayController = {};

const getAuthenticatedUserId = (req) =>
    String(req.user?.id || req.user?.userId || '');

const ensureZaloPayPendingOrdersTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS zalopay_pending_orders (
            app_trans_id VARCHAR(64) PRIMARY KEY,
            ID_NguoiDung VARCHAR(255) NOT NULL,
            amount INT NOT NULL,
            points INT NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'pending',
            points_added INT NOT NULL DEFAULT 0,
            new_balance INT NULL,
            processed_at DATETIME NULL,
            last_return_code INT NULL,
            last_return_message VARCHAR(255) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    const columns = [
        ["points_added", "ALTER TABLE zalopay_pending_orders ADD COLUMN points_added INT NOT NULL DEFAULT 0"],
        ["new_balance", "ALTER TABLE zalopay_pending_orders ADD COLUMN new_balance INT NULL"],
        ["processed_at", "ALTER TABLE zalopay_pending_orders ADD COLUMN processed_at DATETIME NULL"],
        ["last_return_code", "ALTER TABLE zalopay_pending_orders ADD COLUMN last_return_code INT NULL"],
        ["last_return_message", "ALTER TABLE zalopay_pending_orders ADD COLUMN last_return_message VARCHAR(255) NULL"],
    ];

    for (const [, alterSql] of columns) {
        try {
            await pool.query(alterSql);
        } catch (error) {
            if (error.code !== "ER_DUP_FIELDNAME") {
                throw error;
            }
        }
    }
};

const savePendingOrder = async (appTransId, orderInfo) => {
    await ensureZaloPayPendingOrdersTable();
    await pool.query(
        `INSERT INTO zalopay_pending_orders
            (app_trans_id, ID_NguoiDung, amount, points, status)
         VALUES (?, ?, ?, ?, 'pending')
         ON DUPLICATE KEY UPDATE
            ID_NguoiDung = VALUES(ID_NguoiDung),
            amount = VALUES(amount),
            points = VALUES(points),
            status = 'pending',
            updated_at = CURRENT_TIMESTAMP`,
        [appTransId, orderInfo.userId, orderInfo.amount, orderInfo.points]
    );
};

const getPendingOrder = async (appTransId) => {
    const memoryOrder = pendingOrders.get(appTransId);
    if (memoryOrder) return memoryOrder;

    await ensureZaloPayPendingOrdersTable();
    const [rows] = await pool.query(
        `SELECT ID_NguoiDung AS userId, amount, points
         FROM zalopay_pending_orders
         WHERE app_trans_id = ?`,
        [appTransId]
    );

    if (!rows.length) return null;

    return {
        userId: rows[0].userId,
        amount: Number(rows[0].amount || 0),
        points: Number(rows[0].points || 0),
    };
};

const getStoredOrder = async (appTransId) => {
    await ensureZaloPayPendingOrdersTable();
    const [rows] = await pool.query(
        "SELECT * FROM zalopay_pending_orders WHERE app_trans_id = ?",
        [appTransId]
    );
    return rows[0] || null;
};

const markPendingOrderStatus = async (appTransId, status) => {
    await ensureZaloPayPendingOrdersTable();
    await pool.query(
        "UPDATE zalopay_pending_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE app_trans_id = ?",
        [status, appTransId]
    );
};

const updatePendingOrderQueryResult = async (appTransId, zaloData) => {
    await ensureZaloPayPendingOrdersTable();
    await pool.query(
        `UPDATE zalopay_pending_orders
         SET status = ?,
             last_return_code = ?,
             last_return_message = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE app_trans_id = ? AND status <> 'success'`,
        ["pending", Number(zaloData.return_code || 0), zaloData.return_message || zaloData.sub_return_message || null, appTransId]
    );
};

const markPendingOrderSuccess = async (appTransId, pointsAdded, newBalance) => {
    await ensureZaloPayPendingOrdersTable();
    await pool.query(
        `UPDATE zalopay_pending_orders
         SET status = 'success',
             points_added = ?,
             new_balance = ?,
             processed_at = COALESCE(processed_at, CURRENT_TIMESTAMP),
             last_return_code = 1,
             last_return_message = 'success',
             updated_at = CURRENT_TIMESTAMP
         WHERE app_trans_id = ?`,
        [pointsAdded, newBalance, appTransId]
    );
};

const queryZaloPayOrder = async (appTransId) => {
    const postData = {
        app_id: config.app_id,
        app_trans_id: appTransId,
    };

    const data = `${postData.app_id}|${postData.app_trans_id}|${config.key1}`;
    postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    const result = await axios({
        method: 'post',
        url: config.query_endpoint,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: new URLSearchParams(postData).toString()
    });

    return result.data;
};

const processSuccessfulOrder = async (appTransId, fallback = {}) => {
    const pendingOrder = await getPendingOrder(appTransId);
    const orderUserId = pendingOrder?.userId || fallback.userId;
    const pointsToAdd = Number(pendingOrder?.points || fallback.points || 0);
    const amount = Number(pendingOrder?.amount || fallback.amount || 0);

    if (!orderUserId || !pointsToAdd || !amount) {
        throw new Error("Không tìm thấy thông tin gói điểm của giao dịch này. Vui lòng tạo lại QR mới.");
    }

    const [existingRecord] = await pool.query(
        "SELECT ID_LichSu FROM lich_su_tich_diem WHERE mo_ta LIKE ?",
        [`%${appTransId}%`]
    );

    if (existingRecord.length > 0) {
        const [user] = await pool.query("SELECT diem_so FROM nguoidung WHERE ID_NguoiDung = ?", [orderUserId]);
        const currentBalance = user[0]?.diem_so || 0;
        pendingOrders.delete(appTransId);
        await markPendingOrderSuccess(appTransId, 0, currentBalance);

        return {
            pointsAdded: 0,
            newBalance: currentBalance,
            alreadyProcessed: true,
        };
    }

    const [user] = await pool.query("SELECT diem_so FROM nguoidung WHERE ID_NguoiDung = ?", [orderUserId]);
    if (user.length === 0) {
        throw new Error("Không tìm thấy người dùng để cộng điểm.");
    }

    const currentPoints = user[0].diem_so || 0;
    const newPoints = currentPoints + pointsToAdd;
    await pool.query("UPDATE nguoidung SET diem_so = ? WHERE ID_NguoiDung = ?", [newPoints, orderUserId]);
    await pool.query("INSERT INTO lich_su_tich_diem SET ?", [{
        ID_NguoiDung: orderUserId,
        loai_giao_dich: 'tang_diem',
        diem_thay_doi: pointsToAdd,
        diem_truoc: currentPoints,
        diem_sau: newPoints,
        mo_ta: `Mua điểm qua ZaloPay (${appTransId}) - ${amount.toLocaleString('vi-VN')} VNĐ`,
        thoi_gian_tao: new Date()
    }]);

    pendingOrders.delete(appTransId);
    await markPendingOrderSuccess(appTransId, pointsToAdd, newPoints);

    return {
        pointsAdded: pointsToAdd,
        newBalance: newPoints,
        alreadyProcessed: false,
    };
};

const startOrderStatusPolling = (appTransId) => {
    const startedAt = Date.now();
    const maxDurationMs = 3 * 60 * 1000;

    const timer = setInterval(async () => {
        if (Date.now() - startedAt > maxDurationMs) {
            clearInterval(timer);
            return;
        }

        try {
            const storedOrder = await getStoredOrder(appTransId);
            if (!storedOrder || storedOrder.status === 'success' || storedOrder.status === 'failed') {
                clearInterval(timer);
                return;
            }

            const zaloData = await queryZaloPayOrder(appTransId);
            console.log("ZaloPay Auto Poll Status:", appTransId, zaloData);

            if (zaloData.return_code === 1) {
                const processed = await processSuccessfulOrder(appTransId);
                console.log(`✅ [AutoPoll] Đã xử lý ${appTransId}: +${processed.pointsAdded}, balance=${processed.newBalance}`);
                clearInterval(timer);
                return;
            }

            await updatePendingOrderQueryResult(appTransId, zaloData);
        } catch (error) {
            console.error(`❌ [AutoPoll] Lỗi kiểm tra ZaloPay ${appTransId}:`, error.message);
        }
    }, 2500);
};

zalopayController.createOrder = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { amount, points, description, redirectBaseUrl } = req.body;

        if (!userId || !amount) {
            return res.status(400).json({ return_code: 0, return_message: "Thiếu thông tin bắt buộc" });
        }

        const items = []; // Just use empty array
        const transID = Math.floor(Math.random() * 1000000);

        // Ensure amount is integer
        const finalAmount = parseInt(amount);

        // Calculate points if not provided
        const finalPoints = points ? parseInt(points) : Math.floor(finalAmount / 20);

        // Create app_trans_id first
        const app_trans_id = `${moment().format('YYMMDD')}_${transID}`;

        const webRedirectUrl = redirectBaseUrl
            ? `${redirectBaseUrl}${redirectBaseUrl.includes('?') ? '&' : '?'}zalopay_return=1&app_trans_id=${app_trans_id}`
            : null;

        // Deep link URL to redirect back to app after payment
        // Include points in embed_data so callback can use it
        const embed_data = {
            redirecturl: webRedirectUrl || `OLODO://payment-result?app_trans_id=${app_trans_id}`,
            points: finalPoints,
        };

        const order = {
            app_id: config.app_id,
            app_trans_id: app_trans_id,
            app_user: userId.toString() || "demo",
            app_time: Date.now(),
            item: JSON.stringify(items),
            embed_data: JSON.stringify(embed_data),
            amount: finalAmount,
            description: description || `Thanh toan don hang #${transID}`,
            bank_code: "zalopayapp",
            // Nếu có callback_url trong config thì dùng, nếu không thì dùng fallback sandbox
            // ⚠️ Để callback hoạt động, PHẢI set ZALOPAY_CALLBACK_URL trong .env
            callback_url: config.callback_url || "https://docs.zalopay.vn/result"
        };

        // Correct MAC String Construction
        const data = config.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
        order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

        console.log("---------------- ZALOPAY DEBUG ----------------");
        console.log("MAC Data String:", data);
        console.log("Generated MAC:", order.mac);
        console.log("Order Data:", order);
        console.log("-----------------------------------------------");

        // Sending via Query Params (Official Node.js Sample Style)
        const result = await axios.post(config.endpoint, null, { params: order });

        console.log("ZaloPay Response:", result.data);

        // Check if ZaloPay returned an error
        if (result.data.return_code !== 1) {
            // Try to return info for debugging
            return res.json({
                ...result.data,
                debug_mac_input: data,
                debug_mac_output: order.mac
            });
        }

        // Include app_trans_id in response for frontend to poll status
        // Store order info for later status check (ZaloPay query doesn't return amount/embed_data)
        pendingOrders.set(order.app_trans_id, {
            userId: userId,
            amount: finalAmount,
            points: finalPoints,
            createdAt: Date.now()
        });
        await savePendingOrder(order.app_trans_id, {
            userId,
            amount: finalAmount,
            points: finalPoints,
        });
        startOrderStatusPolling(order.app_trans_id);

        console.log(`📦 Stored pending order: ${order.app_trans_id}`, pendingOrders.get(order.app_trans_id));

        res.json({
            ...result.data,
            app_trans_id: order.app_trans_id
        });
    } catch (error) {
        console.error("Lỗi tạo đơn hàng ZaloPay:", error);
        res.status(500).json({ return_code: 0, return_message: "Lỗi nội bộ server" });
    }
};

zalopayController.callback = async (req, res) => {
    let result = {};

    console.log("=============== ZALOPAY CALLBACK RECEIVED ===============");
    console.log("Request Body:", JSON.stringify(req.body, null, 2));
    console.log("=========================================================");

    try {
        let dataStr = req.body.data;
        let reqMac = req.body.mac;

        let mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
        console.log("MAC from ZaloPay:", reqMac);
        console.log("MAC calculated:", mac);

        // Kiểm tra callback hợp lệ (từ ZaloPay server)
        if (reqMac !== mac) {
            // Callback không hợp lệ
            result.return_code = -1;
            result.return_message = "mac not equal";
        } else {
            // Thanh toán thành công
            // Merchant xử lý dataStr ở đây
            let dataJson = JSON.parse(dataStr, config.key2);
            console.log("update order's status = success where app_trans_id =", dataJson['app_trans_id']);

            // XỬ LÝ CỘNG ĐIỂM CHO USER
            // dataJson bao gồm: { app_id, app_trans_id, app_time, app_user, amount, embed_data, item, zp_trans_id, server_time }

            const userId = dataJson.app_user;
            const amount = dataJson.amount; // Số tiền thanh toán
            const app_trans_id = dataJson.app_trans_id;

            let pointsToAdd = Math.floor(amount / 20);

            // Nếu muốn chính xác hơn, nên pass `points` vào `embed_data` lúc tạo order.
            // Nhưng callback dataStr của ZaloPay chứa embed_data, nên ta có thể parse lại.
            try {
                const embedDataObj = JSON.parse(dataJson.embed_data);
                if (embedDataObj.points) {
                    pointsToAdd = parseInt(embedDataObj.points);
                }
            } catch (e) {
                console.log("Error parsing embed_data, using default calculation:", e);
            }

            const processed = await processSuccessfulOrder(app_trans_id, {
                userId,
                amount,
                points: pointsToAdd,
            });
            console.log(`✅ [Callback] Đã xử lý ${app_trans_id}: +${processed.pointsAdded}, balance=${processed.newBalance}`);

            result.return_code = 1;
            result.return_message = "success";
        }
    } catch (ex) {
        result.return_code = 0; // ZaloPay server sẽ callback lại (tối đa 3 lần)
        result.return_message = ex.message;
    }

    // Thông báo kết quả cho ZaloPay server
    res.json(result);
};

zalopayController.checkOrderStatus = async (req, res) => {
    const { app_trans_id } = req.params;
    const userId = getAuthenticatedUserId(req);

    try {
        const storedOrder = await getStoredOrder(app_trans_id);
        if (storedOrder?.status === 'success') {
            return res.status(200).json({
                return_code: 1,
                return_message: storedOrder.points_added > 0 ? "success" : "Giao dịch đã được xử lý trước đó",
                points_added: Number(storedOrder.points_added || 0),
                new_balance: Number(storedOrder.new_balance || 0),
            });
        }

        const zaloData = await queryZaloPayOrder(app_trans_id);

        console.log("ZaloPay Order Status:", zaloData);

        // Nếu thanh toán thành công (return_code = 1), cộng điểm cho user
        if (zaloData.return_code === 1) {
            const processed = await processSuccessfulOrder(app_trans_id, { userId });
            console.log(`✅ [CheckOrderStatus] Đã xử lý ${app_trans_id}: +${processed.pointsAdded}, balance=${processed.newBalance}`);
            return res.status(200).json({
                ...zaloData,
                points_added: processed.pointsAdded,
                new_balance: processed.newBalance,
                message: processed.alreadyProcessed ? "Giao dịch đã được xử lý trước đó" : undefined,
            });
        }

        await updatePendingOrderQueryResult(app_trans_id, zaloData);
        if (zaloData.return_code === 3) {
            return res.status(200).json({
                ...zaloData,
                raw_return_code: zaloData.return_code,
                return_code: 2,
                return_message: zaloData.return_message || "ZaloPay chưa xác nhận giao dịch, hệ thống sẽ tiếp tục kiểm tra.",
            });
        }

        return res.status(200).json(zaloData);
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ message: error.message });
    }
}

module.exports = zalopayController;
