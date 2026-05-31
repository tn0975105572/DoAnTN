require("dotenv").config({ path: require('path').join(__dirname, '.env') });
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const http = require('http');
const { Server } = require("socket.io");
const cron = require('node-cron');
const { execFile, spawnSync } = require('child_process');
const mysql = require('mysql2/promise');

const routes = require("./routes");
const qrLoginRoutes = require("./routes/qrlogin");
const errorHandler = require("./middleware/errorHandler");
const authMiddleware = require("./middleware/baoVe");
const baidangBoost = require("./models/baidang_boost");

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

const recommendationScriptPath = path.join(__dirname, 'recommend.py');
const hasPythonRecommendationDeps = (() => {
  try {
    const check = spawnSync('python', ['-c', 'import pandas, numpy, sklearn, sqlalchemy, mysql.connector'], {
      stdio: 'ignore',
    });
    return check.status === 0 && !check.error;
  } catch {
    return false;
  }
})();

let recommendationEngine = hasPythonRecommendationDeps ? 'python' : 'node-fallback';
let isRecommendationRunning = false;

async function runNodeRecommendationFallback() {
  const connection = await pool.getConnection();
  try {
    const [posts] = await connection.query(`
      SELECT
        b.ID_BaiDang,
        b.ID_NguoiDung,
        COALESCE(dm.ten, '') AS category_name,
        b.thoi_gian_tao,
        COALESCE(like_stats.like_count, 0) AS like_count,
        COALESCE(comment_stats.comment_count, 0) AS comment_count
      FROM baidang b
      LEFT JOIN danhmuc dm ON b.ID_DanhMuc = dm.ID_DanhMuc
      LEFT JOIN (
        SELECT ID_BaiDang, COUNT(*) AS like_count
        FROM likebaidang
        GROUP BY ID_BaiDang
      ) like_stats ON b.ID_BaiDang = like_stats.ID_BaiDang
      LEFT JOIN (
        SELECT ID_BaiDang, COUNT(*) AS comment_count
        FROM binhluanbaidang
        GROUP BY ID_BaiDang
      ) comment_stats ON b.ID_BaiDang = comment_stats.ID_BaiDang
      WHERE b.trang_thai = 'dang_ban'
    `);

    const [users] = await connection.query('SELECT ID_NguoiDung FROM nguoidung');
    const [interactionRows] = await connection.query(`
      SELECT interaction.ID_NguoiDung, COALESCE(dm.ten, '') AS category_name, COUNT(*) AS interaction_count
      FROM (
        SELECT ID_NguoiDung, ID_BaiDang FROM likebaidang
        UNION ALL
        SELECT ID_NguoiDung, ID_BaiDang FROM binhluanbaidang
      ) interaction
      INNER JOIN baidang b ON interaction.ID_BaiDang = b.ID_BaiDang
      LEFT JOIN danhmuc dm ON b.ID_DanhMuc = dm.ID_DanhMuc
      GROUP BY interaction.ID_NguoiDung, COALESCE(dm.ten, '')
    `);

    const interestMap = new Map();
    interactionRows.forEach((row) => {
      const userId = String(row.ID_NguoiDung || '');
      const category = String(row.category_name || '');
      const count = Number(row.interaction_count || 0);
      if (!userId || !category || count <= 0) return;

      if (!interestMap.has(userId)) {
        interestMap.set(userId, new Map());
      }

      const categoryMap = interestMap.get(userId);
      categoryMap.set(category, (categoryMap.get(category) || 0) + count);
    });

    const now = Date.now();
    const rowsToInsert = [];

    users.forEach((userRow) => {
      const userId = String(userRow.ID_NguoiDung || '');
      if (!userId) return;

      const categoryMap = interestMap.get(userId) || new Map();
      const topCategories = [...categoryMap.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3);

      const scoredPosts = posts
        .filter((post) => String(post.ID_NguoiDung || '') !== userId)
        .map((post) => {
          const createdAt = new Date(post.thoi_gian_tao).getTime();
          const ageDays = Number.isFinite(createdAt)
            ? Math.max(0, (now - createdAt) / 86400000)
            : 999;
          const popularityScore = Number(post.like_count || 0) * 4 + Number(post.comment_count || 0) * 2;
          const recencyScore = Math.max(0, 42 - ageDays * 2);
          const categoryIndex = topCategories.findIndex(([category]) => category === post.category_name);
          const categoryScore = categoryIndex >= 0 ? Math.max(0, 24 - categoryIndex * 6) + Number(categoryMap.get(post.category_name) || 0) : 0;

          return {
            postId: post.ID_BaiDang,
            score: popularityScore + recencyScore + categoryScore,
          };
        })
        .sort((left, right) => right.score - left.score)
        .slice(0, 15);

      scoredPosts.forEach((item) => {
        rowsToInsert.push([userId, item.postId, item.score]);
      });
    });

    await connection.beginTransaction();
    await connection.query('DELETE FROM goiy_baidang');

    if (rowsToInsert.length > 0) {
      const chunkSize = 1000;
      for (let index = 0; index < rowsToInsert.length; index += chunkSize) {
        const chunk = rowsToInsert.slice(index, index + chunkSize);
        await connection.query(
          'INSERT INTO goiy_baidang (ID_NguoiDung, ID_BaiDang, Score) VALUES ?',
          [chunk]
        );
      }
    }

    await connection.commit();
    return {
      engine: 'node-fallback',
      users: users.length,
      recommendations: rowsToInsert.length,
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignore rollback errors.
    }
    throw error;
  } finally {
    connection.release();
  }
}

function runPythonRecommendationJob() {
  return new Promise((resolve, reject) => {
    execFile('python', [recommendationScriptPath], { cwd: __dirname, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const combinedError = new Error(error.message || 'Python recommendation job failed');
        combinedError.stdout = stdout;
        combinedError.stderr = stderr;
        reject(combinedError);
        return;
      }

      if (stderr && stderr.trim()) {
        const combinedError = new Error(stderr.trim());
        combinedError.stdout = stdout;
        combinedError.stderr = stderr;
        reject(combinedError);
        return;
      }

      resolve({ engine: 'python', stdout });
    });
  });
}

async function runRecommendationRefresh() {
  if (isRecommendationRunning) {
    console.log('⏳ Script gợi ý đang chạy, bỏ qua cron job');
    return;
  }

  isRecommendationRunning = true;
  console.log('🚀 Bắt đầu script gợi ý');

  try {
    if (recommendationEngine === 'python') {
      const result = await runPythonRecommendationJob();
      console.log('✅ Script gợi ý hoàn thành bằng Python');
      io.emit('recommendation_status', {
        status: 'success',
        message: 'Gợi ý đã được cập nhật',
        engine: result.engine,
      });
      return;
    }

    const result = await runNodeRecommendationFallback();
    console.log(`✅ Script gợi ý hoàn thành bằng Node fallback: ${result.recommendations} bản ghi`);
    io.emit('recommendation_status', {
      status: 'success',
      message: 'Gợi ý đã được cập nhật',
      engine: result.engine,
    });
  } catch (error) {
    if (recommendationEngine === 'python') {
      console.error(`❌ Lỗi khi chạy script gợi ý Python: ${error.message}`);
      console.log('⚠️ Chuyển sang Node fallback để tránh lỗi lặp lại');
      recommendationEngine = 'node-fallback';

      try {
        const fallbackResult = await runNodeRecommendationFallback();
        console.log(`✅ Script gợi ý hoàn thành bằng Node fallback: ${fallbackResult.recommendations} bản ghi`);
        io.emit('recommendation_status', {
          status: 'warning',
          message: 'Gợi ý đã được cập nhật bằng fallback',
          engine: fallbackResult.engine,
        });
        return;
      } catch (fallbackError) {
        console.error(`❌ Fallback gợi ý cũng thất bại: ${fallbackError.message}`);
        io.emit('recommendation_status', { status: 'error', message: fallbackError.message, engine: 'node-fallback' });
      }
    } else {
      console.error(`❌ Lỗi khi chạy Node fallback gợi ý: ${error.message}`);
      io.emit('recommendation_status', { status: 'error', message: error.message, engine: 'node-fallback' });
    }
  } finally {
    isRecommendationRunning = false;
  }
}

// Cron job cập nhật gợi ý mỗi 5 phút, tự rơi về fallback nếu Python deps thiếu
cron.schedule('*/5 * * * *', () => {
  void runRecommendationRefresh();
});

if (!hasPythonRecommendationDeps) {
  console.log('⚠️ Python recommendation dependencies chưa sẵn sàng, dùng Node fallback');
}

setTimeout(() => {
  void runRecommendationRefresh();
}, 1500);

// API kiểm tra trạng thái gợi ý
app.get('/api/recommendation-status', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS record_count FROM goiy_baidang'
    );
    res.json({
      isRunning: isRecommendationRunning,
      hasRecords: rows[0].record_count > 0,
      engine: recommendationEngine,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// API lấy gợi ý bài đăng cho người dùng
app.get('/api/recommendations/:userId', authMiddleware.authenticateToken, async (req, res) => {
  const requestedUserId = String(req.params.userId || '').trim();
  const authenticatedUserId = String(req.user?.id || req.user?.userId || '').trim();
  const userId = req.user?.Role === 'admin' && requestedUserId
    ? requestedUserId
    : authenticatedUserId;

  if (!userId) {
    return res.status(401).json({ error: 'Ban can dang nhap de lay goi y bai dang' });
  }

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

    // 4. Lấy bài boost theo quota. Bài trả tiền chỉ được vào một vài slot,
    // vẫn xếp theo cá nhân hóa + suy giảm thời gian trong baidang_boost.
    const sponsoredSlotIndexes = [2, 6, 11];
    const sponsoredLimit = sponsoredSlotIndexes.length;
    let boostedPosts = [];
    try {
      const boostedRows = await baidangBoost.getActiveBoostedPosts({
        viewerId: userId,
        limit: sponsoredLimit * 2,
      });

      boostedPosts = boostedRows
        .filter((post) => String(post.ID_NguoiDung || '') !== userId)
        .map((post) => ({
          ID_BaiDang: post.ID_BaiDang,
          Score: Number(post.display_score || post.boost_score || 0),
          isFriendPost: false,
          isBoosted: true,
          boostPackageId: post.boost_package_id,
          boostEndsAt: post.boost_ends_at,
        }))
        .slice(0, sponsoredLimit);
    } catch (boostError) {
      console.error('Lỗi lấy bài boost cho feed gợi ý:', boostError.message);
      boostedPosts = [];
    }

    // 5. Kết hợp: bạn bè + AI organic là lõi, boost chỉ chen vào slot có giới hạn.
    const organicMap = new Map();
    friendPosts.forEach(post => organicMap.set(post.ID_BaiDang, post));
    aiPosts.forEach(post => {
      if (!organicMap.has(post.ID_BaiDang)) {
        organicMap.set(post.ID_BaiDang, post);
      }
    });

    const organicList = Array.from(organicMap.values());
    const finalRecommendationList = [];
    const usedPostIds = new Set();
    let organicCursor = 0;
    let boostCursor = 0;

    while (finalRecommendationList.length < 15 && (organicCursor < organicList.length || boostCursor < boostedPosts.length)) {
      const nextIndex = finalRecommendationList.length;
      const shouldUseBoost = sponsoredSlotIndexes.includes(nextIndex) && boostCursor < boostedPosts.length;
      let candidate = null;

      if (shouldUseBoost) {
        candidate = boostedPosts[boostCursor++];
      } else if (organicCursor < organicList.length) {
        candidate = organicList[organicCursor++];
      } else {
        candidate = boostedPosts[boostCursor++];
      }

      if (!candidate) continue;
      if (usedPostIds.has(candidate.ID_BaiDang)) continue;

      usedPostIds.add(candidate.ID_BaiDang);
      finalRecommendationList.push(candidate);
    }

    // 6. Nếu tổng cộng vẫn ít bài quá (dưới 10 bài), lấy thêm bài ngẫu nhiên để lấp đầy
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
          isFriendPost: false,
          isBoosted: false
        });
      });
    }

    // 7. Kiểm tra tương tác (Like/Comment) cho danh sách cuối cùng
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
