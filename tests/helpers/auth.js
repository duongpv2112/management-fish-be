// Thông tin đăng nhập chỉ dùng cho test (không phải mật khẩu thật)
const jwt = require("jsonwebtoken");

const TEST_PASSWORD = "mat-khau-test";
const TEST_JWT_SECRET = "test-secret-it-nhat-32-ky-tu-ngau-nhien-0123456789";

// Header Authorization hợp lệ để các test gọi API đã được bảo vệ
const authHeader = () => ({
  Authorization: `Bearer ${jwt.sign({ sub: "admin" }, TEST_JWT_SECRET, { expiresIn: "1h" })}`,
});

module.exports = { TEST_PASSWORD, TEST_JWT_SECRET, authHeader };
