const jwt = require("jsonwebtoken");

// Các đường dẫn không cần đăng nhập
const PUBLIC_PATHS = ["/api/auth/login"];

// Chặn mọi API khi thiếu hoặc sai token (một tài khoản dùng chung của gia đình)
const requireAuth = (req, res, next) => {
  if (req.method === "OPTIONS" || PUBLIC_PATHS.includes(req.path)) return next();

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  try {
    if (!token) throw new Error("Thiếu token");
    jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      data: null,
      message: "Vui lòng đăng nhập lại!",
    });
  }
};

module.exports = requireAuth;
