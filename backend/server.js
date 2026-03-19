require("dotenv").config({ path: require('path').join(__dirname, '.env') });
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const http = require('http');
const { Server } = require("socket.io");
const cron = require('node-cron');
const { exec } = require('child_process');
const mysql = require('mysql2/promise');

const routes = require("./routes");
const qrLoginRoutes = require("./routes/qrlogin");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// Kiểm tra biến môi trường
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS:', process.env.DB_PASS);
console.log('DB_NAME:', process.env.DB_NAME);

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '12345678',
  database: process.env.DB_NAME || 'sv_cho',
  connectionLimit: 10,
  connectTimeout: 10000
});

// Test pool connection
pool.getConnection()
  .then(connection => {
    console.log('MySQL pool connected successfully');
    connection.release();
  })
  .catch(err => console.error('Error connecting to MySQL:', err));

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

const setupSwagger = (app) => { };

app.use(cors());
setupSwagger(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import ChatSocket và middleware
const ChatSocket = require('./socket/chatSocket');
const { socketAuth, socketRateLimit, socketLogger, updateOnlineStatus } = require('./socket/socketMiddleware');

// Cấu hình Socket.IO với middleware
io.use(socketAuth); // Xác thực JWT
io.use(socketRateLimit(100, 60000)); // Rate limiting: 100 events/phút
io.use(socketLogger); // Logging
io.use(updateOnlineStatus); // Cập nhật trạng thái online

// Khởi tạo ChatSocket
const chatSocket = new ChatSocket(io);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id, 'User:', socket.userId || 'Unknown');

  // Join room based on socket ID or a custom session ID for QR login
  socket.on('join-qr-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined QR session: ${sessionId}`);
  });

  // Lưu trữ socket instance để sử dụng trong API
  socket.userSocket = chatSocket;

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', socket.id, 'Reason:', reason, 'User:', socket.userId || 'Unknown');
  });

  // Xử lý lỗi
  socket.on('error', (error) => {
    console.error('Socket error:', error, 'Socket ID:', socket.id, 'User:', socket.userId || 'Unknown');
  });
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Cron job chạy Python script mỗi 10 phút
let isRecommendationRunning = false;
cron.schedule('*/1000000 */10 * * *', () => {
  if (isRecommendationRunning) {
    console.log('⏳ Script gợi ý đang chạy, bỏ qua cron job');
    return;
  }
  isRecommendationRunning = true;
  console.log('🚀 Bắt đầu script gợi ý');
  exec('python recommend.py', (error, stdout, stderr) => {
    isRecommendationRunning = false;
    if (error) {
      console.error(`❌ Lỗi khi chạy script gợi ý: ${error.message}`);
      io.emit('recommendation_status', { status: 'error', message: error.message });
      return;
    }
    if (stderr) {
      console.error(`❌ Stderr: ${stderr}`);
      io.emit('recommendation_status', { status: 'error', message: stderr });
      return;
    }
    console.log(`✅ Script gợi ý hoàn thành: ${stdout}`);
    io.emit('recommendation_status', { status: 'success', message: 'Gợi ý đã được cập nhật' });
  });
});

// API kiểm tra trạng thái gợi ý
app.get('/api/recommendation-status', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS record_count FROM goiy_baidang'
    );
    res.json({
      isRunning: isRecommendationRunning,
      hasRecords: rows[0].record_count > 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// API lấy gợi ý bài đăng cho người dùng
app.get('/api/recommendations/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    // 1. Lấy danh sách bạn bè trước để dùng chung
    const [friends] = await pool.query(
      `SELECT ID_NguoiGui AS friend_id FROM quanhebanbe WHERE ID_NguoiNhan = ? AND trang_thai = 'da_dong_y'
       UNION
       SELECT ID_NguoiNhan AS friend_id FROM quanhebanbe WHERE ID_NguoiGui = ? AND trang_thai = 'da_dong_y'`,
      [userId, userId]
    );
    const friendIds = friends.map(f => f.friend_id);

    // 2. Lấy tối đa 5 bài viết MỚI NHẤT của bạn bè
    let friendPosts = [];
    if (friendIds.length > 0) {
      const [friendPostsResult] = await pool.query(
        `SELECT ID_BaiDang 
         FROM baidang 
         WHERE ID_NguoiDung IN (?) AND trang_thai = 'dang_ban'
         ORDER BY thoi_gian_tao DESC LIMIT 5`,
        [friendIds]
      );
      friendPosts = friendPostsResult.map(row => ({
        ID_BaiDang: row.ID_BaiDang,
        Score: 100, // Đặt điểm cao để ưu tiên (nhưng thực tế sẽ dùng thứ tự mảng)
        isFriendPost: true
      }));
    }

    // 3. Lấy gợi ý từ hệ thống AI (người lạ/quan tâm)
    const [aiRows] = await pool.query(
      'SELECT ID_BaiDang, Score FROM goiy_baidang WHERE ID_NguoiDung = ? AND Score > 0 ORDER BY Score DESC LIMIT 15',
      [userId]
    );

    const aiPosts = aiRows.map(row => ({
      ID_BaiDang: row.ID_BaiDang,
      Score: row.Score,
      isFriendPost: false
    }));

    // 4. Kết hợp: Bạn bè mới đăng lên đầu -> Sau đó đến AI gợi ý
    // Dùng Map để loại bỏ trùng lặp (nếu bạn bè cũng nằm trong danh sách AI gợi ý)
    const combinedMap = new Map();

    // Thêm bài bạn bè trước
    friendPosts.forEach(post => combinedMap.set(post.ID_BaiDang, post));

    // Thêm bài AI (nếu chưa có trong map)
    aiPosts.forEach(post => {
      if (!combinedMap.has(post.ID_BaiDang)) {
        combinedMap.set(post.ID_BaiDang, post);
      }
    });

    let finalRecommendationList = Array.from(combinedMap.values());

    // 5. Nếu tổng cộng vẫn ít bài quá (dưới 10 bài), lấy thêm bài ngẫu nhiên để lấp đầy
    if (finalRecommendationList.length < 10) {
      const existingIds = finalRecommendationList.map(p => p.ID_BaiDang);
      const [randomRows] = await pool.query(
        `SELECT ID_BaiDang FROM baidang 
         WHERE trang_thai = 'dang_ban' ${existingIds.length > 0 ? 'AND ID_BaiDang NOT IN (?)' : ''}
         ORDER BY RAND() LIMIT 10`,
        existingIds.length > 0 ? [existingIds] : []
      );

      randomRows.forEach(row => {
        finalRecommendationList.push({
          ID_BaiDang: row.ID_BaiDang,
          Score: 0,
          isFriendPost: false
        });
      });
    }

    // 6. Kiểm tra tương tác (Like/Comment) cho danh sách cuối cùng
    const finalPostIds = finalRecommendationList.map(post => post.ID_BaiDang);
    if (finalPostIds.length === 0) return res.json([]);

    const [likes] = await pool.query(
      `SELECT ID_BaiDang FROM likebaidang WHERE ID_NguoiDung = ? AND ID_BaiDang IN (?)`,
      [userId, finalPostIds]
    );
    const [comments] = await pool.query(
      `SELECT ID_BaiDang FROM binhluanbaidang WHERE ID_NguoiDung = ? AND ID_BaiDang IN (?)`,
      [userId, finalPostIds]
    );

    const likedPosts = new Set(likes.map(l => l.ID_BaiDang));
    const commentedPosts = new Set(comments.map(c => c.ID_BaiDang));

    const result = finalRecommendationList.map(post => ({
      ...post,
      hasLiked: likedPosts.has(post.ID_BaiDang),
      hasCommented: commentedPosts.has(post.ID_BaiDang)
    }));

    res.json(result);
  } catch (err) {
    console.error('Lỗi API Gợi ý:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/upload", upload.single("avatar"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Không có file nào được tải lên."
      });
    }

    // Kiểm tra loại file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      // Xóa file nếu không đúng định dạng
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Chỉ cho phép tải lên file hình ảnh (JPG, PNG, GIF)."
      });
    }

    // Kiểm tra kích thước file (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "File quá lớn. Kích thước tối đa là 5MB."
      });
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    console.log("✅ File đã được tải lên thành công:", fileUrl);

    res.json({
      success: true,
      imageUrl: fileUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error("❌ Lỗi khi upload file:", error);
    res.status(500).json({
      success: false,
      error: "Lỗi server khi tải lên file."
    });
  }
});

// API xóa hình ảnh
app.delete("/api/upload/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(uploadDir, filename);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        error: "File không tồn tại."
      });
    }

    fs.unlinkSync(imagePath);
    console.log("✅ Đã xóa file:", filename);

    res.json({
      success: true,
      message: "Xóa file thành công."
    });
  } catch (error) {
    console.error("❌ Lỗi khi xóa file:", error);
    res.status(500).json({
      success: false,
      error: "Lỗi server khi xóa file."
    });
  }
});

app.use("/api/qrlogin", qrLoginRoutes);
app.use("/api", routes);
app.use((req, res, next) => {
  res.status(404).json({ message: "Route không tồn tại" });
});
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server đang chạy trên http://localhost:${PORT}`);
});