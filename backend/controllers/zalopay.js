
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

zalopayController.createOrder = async (req, res) => {
    try {
        const { userId, amount, points, description, redirectBaseUrl } = req.body;

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

            // Kiểm tra xem giao dịch này đã được xử lý chưa (tránh cộng điểm 2 lần)
            const [existingRecord] = await pool.query(
                "SELECT ID_LichSu FROM lich_su_tich_diem WHERE mo_ta LIKE ?",
                [`%${app_trans_id}%`]
            );

            if (existingRecord.length === 0) {
                // Chưa xử lý, tiến hành cộng điểm
                const [user] = await pool.query("SELECT diem_so FROM nguoidung WHERE ID_NguoiDung = ?", [userId]);
                if (user.length > 0) {
                    const currentPoints = user[0].diem_so || 0;
                    const newPoints = currentPoints + pointsToAdd;
                    await pool.query("UPDATE nguoidung SET diem_so = ? WHERE ID_NguoiDung = ?", [newPoints, userId]);

                    // Lưu lịch sử với app_trans_id để có thể track được
                    await pool.query("INSERT INTO lich_su_tich_diem SET ?", [{
                        ID_NguoiDung: userId,
                        loai_giao_dich: 'tang_diem',
                        diem_thay_doi: pointsToAdd,
                        diem_truoc: currentPoints,
                        diem_sau: newPoints,
                        mo_ta: `Mua điểm qua ZaloPay (${app_trans_id}) - ${amount.toLocaleString('vi-VN')} VNĐ`,
                        thoi_gian_tao: new Date()
                    }]);

                    console.log(`✅ [Callback] Đã cộng ${pointsToAdd} điểm cho user ${userId} (app_trans_id: ${app_trans_id})`);
                }
            } else {
                console.log(`⚠️ [Callback] Giao dịch đã được xử lý trước đó: ${app_trans_id}`);
            }

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
    const userId = req.query.userId || req.body.userId;

    let postData = {
        app_id: config.app_id,
        app_trans_id: app_trans_id,
    }

    let data = postData.app_id + "|" + postData.app_trans_id + "|" + config.key1;
    postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    let postConfig = {
        method: 'post',
        url: config.query_endpoint,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: new URLSearchParams(postData).toString()
    };

    try {
        const result = await axios(postConfig);
        const zaloData = result.data;

        console.log("ZaloPay Order Status:", zaloData);

        // Nếu thanh toán thành công (return_code = 1), cộng điểm cho user
        if (zaloData.return_code === 1) {
            // Lấy thông tin order từ pendingOrders (vì ZaloPay query không trả về amount/points)
            const pendingOrder = pendingOrders.get(app_trans_id);

            console.log(`🔍 Looking up pending order: ${app_trans_id}`, pendingOrder);

            // Ưu tiên lấy từ pendingOrders, fallback sang userId từ request
            const orderUserId = pendingOrder?.userId || userId;
            const pointsToAdd = pendingOrder?.points || 1000; // Default 1000 if not found
            const amount = pendingOrder?.amount || 20000; // Default amount

            if (orderUserId) {
                // Kiểm tra xem giao dịch này đã được xử lý chưa (tránh cộng điểm 2 lần)
                const [existingRecord] = await pool.query(
                    "SELECT ID_LichSu FROM lich_su_tich_diem WHERE mo_ta LIKE ?",
                    [`%${app_trans_id}%`]
                );

                if (existingRecord.length === 0) {
                    // Chưa xử lý, tiến hành cộng điểm
                    const [user] = await pool.query("SELECT diem_so FROM nguoidung WHERE ID_NguoiDung = ?", [orderUserId]);
                    if (user.length > 0) {
                        const currentPoints = user[0].diem_so || 0;
                        const newPoints = currentPoints + pointsToAdd;
                        await pool.query("UPDATE nguoidung SET diem_so = ? WHERE ID_NguoiDung = ?", [newPoints, orderUserId]);

                        // Lưu lịch sử với format nhất quán với callback
                        await pool.query("INSERT INTO lich_su_tich_diem SET ?", [{
                            ID_NguoiDung: orderUserId,
                            loai_giao_dich: 'tang_diem',
                            diem_thay_doi: pointsToAdd,
                            diem_truoc: currentPoints,
                            diem_sau: newPoints,
                            mo_ta: `Mua điểm qua ZaloPay (${app_trans_id}) - ${amount.toLocaleString('vi-VN')} VNĐ`,
                            thoi_gian_tao: new Date()
                        }]);

                        // Xóa pending order sau khi xử lý
                        pendingOrders.delete(app_trans_id);

                        console.log(`✅ [CheckOrderStatus] Đã cộng ${pointsToAdd} điểm cho user ${orderUserId} (app_trans_id: ${app_trans_id})`);
                        return res.status(200).json({
                            ...zaloData,
                            points_added: pointsToAdd,
                            new_balance: newPoints
                        });
                    }
                } else {
                    console.log(`⚠️ [CheckOrderStatus] Giao dịch đã được xử lý trước đó: ${app_trans_id}`);
                    // Xóa pending order nếu còn
                    pendingOrders.delete(app_trans_id);
                    // Vẫn trả về thông tin điểm hiện tại cho user
                    const [user] = await pool.query("SELECT diem_so FROM nguoidung WHERE ID_NguoiDung = ?", [orderUserId]);
                    if (user.length > 0) {
                        return res.status(200).json({
                            ...zaloData,
                            points_added: 0,
                            new_balance: user[0].diem_so || 0,
                            message: "Giao dịch đã được xử lý trước đó"
                        });
                    }
                }
            } else {
                console.log(`⚠️ [CheckOrderStatus] Không tìm thấy userId cho order: ${app_trans_id}`);
            }
        }

        return res.status(200).json(zaloData);
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ message: error.message });
    }
}

module.exports = zalopayController;
