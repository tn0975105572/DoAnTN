require("dotenv").config();
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET;

// Middleware kiểm tra token
const authenticateToken = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "Không có token, từ chối truy cập" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token không hợp lệ" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

// Middleware phân quyền theo Role
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.Role)) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
