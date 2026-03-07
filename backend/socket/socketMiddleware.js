const jwt = require('jsonwebtoken');
const pool = require("../config/database");

// Middleware xác thực cho Socket.io
const socketAuth = async (socket, next) => {
  try {
    // Lấy token từ nhiều nguồn khác nhau
    let token = socket.handshake.auth.token;
    
    // Nếu không có trong auth, thử lấy từ query
    if (!token) {
      token = socket.handshake.query.token;
    }
    
    // Nếu không có trong query, thử lấy từ headers
    if (!token) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Validate token format (JWT có 3 phần được phân cách bởi dấu chấm)
    if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
      return next(new Error('Authentication error: Invalid token format'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Lấy userId từ token (có thể là 'id' hoặc 'userId')
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      return next(new Error('Authentication error: No userId in token'));
    }
    
    // Kiểm tra user có tồn tại không
    const [rows] = await pool.query(
      'SELECT ID_NguoiDung, ho_ten, email FROM nguoidung WHERE ID_NguoiDung = ?',
      [userId]
    );

    if (rows.length === 0) {
      return next(new Error('Authentication error: User not found'));
    }

    // Lưu thông tin user vào socket
    socket.userId = userId;
    socket.userInfo = rows[0];
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new Error('Authentication error: Invalid JWT token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new Error('Authentication error: Token expired'));
    } else {
      next(new Error('Authentication error: Token verification failed'));
    }
  }
};

// Middleware kiểm tra quyền truy cập room
const checkRoomAccess = async (socket, roomType, roomId, next) => {
  try {
    const userId = socket.userId;
    
    if (roomType === 'private') {
      // Kiểm tra chat 1-1: user phải là một trong hai người
      if (roomId !== userId && !roomId.includes(userId)) {
        return next(new Error('Access denied: Not authorized for this private chat'));
      }
    } else if (roomType === 'group') {
      // Kiểm tra group chat: user phải là thành viên
      const [rows] = await pool.query(`
        SELECT 1 FROM thanh_vien_group 
        WHERE ID_GroupChat = ? AND ID_NguoiDung = ? AND trang_thai = 'active'
      `, [roomId, userId]);
      
      if (rows.length === 0) {
        return next(new Error('Access denied: Not a member of this group'));
      }
    }
    
    next();
  } catch (error) {
    next(new Error('Access denied: Error checking room access'));
  }
};

// Rate limiting cho socket events
const socketRateLimit = (maxEvents = 100, windowMs = 60000) => {
  const events = new Map();
  
  return (socket, next) => {
    const now = Date.now();
    const key = socket.id;
    
    if (!events.has(key)) {
      events.set(key, { count: 0, resetTime: now + windowMs });
    }
    
    const userEvents = events.get(key);
    
    // Reset counter nếu hết thời gian window
    if (now > userEvents.resetTime) {
      userEvents.count = 0;
      userEvents.resetTime = now + windowMs;
    }
    
    // Kiểm tra rate limit
    if (userEvents.count >= maxEvents) {
      return next(new Error('Rate limit exceeded'));
    }
    
    userEvents.count++;
    next();
  };
};

// Middleware logging cho socket events
const socketLogger = (socket, next) => {
  next();
};

// Middleware kiểm tra online status
const updateOnlineStatus = async (socket, next) => {
  try {
    const userId = socket.userId;
    
    // Cập nhật trạng thái online
    await pool.query(`
      INSERT INTO trang_thai_hoat_dong (ID_TrangThai, ID_NguoiDung, trang_thai, thoi_gian_hoat_dong_cuoi)
      VALUES (?, ?, 'online', CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE 
      trang_thai = 'online',
      thoi_gian_hoat_dong_cuoi = CURRENT_TIMESTAMP
    `, [require('uuid').v4(), userId]);
    
    next();
  } catch (error) {
    // Nếu bảng không tồn tại, chỉ log warning và tiếp tục
    if (error.code === 'ER_NO_SUCH_TABLE' && error.sqlMessage.includes('trang_thai_hoat_dong')) {
      next();
      return;
    }
    next();
  }
};

module.exports = {
  socketAuth,
  checkRoomAccess,
  socketRateLimit,
  socketLogger,
  updateOnlineStatus
};
