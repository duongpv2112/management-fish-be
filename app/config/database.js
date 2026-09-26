// Chuỗi kết nối MongoDB từ biến môi trường (.env / Vercel).
// Có MONGODB_URI (vd. mongodb://localhost:27017/management-fish) thì dùng nguyên chuỗi đó,
// không thì dựng chuỗi Atlas từ USER_MONGODB/PWD_MONGODB như trước.
const buildDbURI = (env = process.env) => {
  if (env.MONGODB_URI) return env.MONGODB_URI;
  const user = encodeURIComponent(env.USER_MONGODB ?? "");
  const password = encodeURIComponent(env.PWD_MONGODB ?? "");
  return `mongodb+srv://${user}:${password}@cluster0.w4zp0gf.mongodb.net/management-fish?retryWrites=true&w=majority&appName=Cluster0`;
};

// Biến môi trường bắt buộc để server khởi động, tùy theo cách kết nối DB
const requiredEnvNames = (env = process.env) => [
  ...(env.MONGODB_URI ? [] : ["USER_MONGODB", "PWD_MONGODB"]),
  "JWT_SECRET",
  "APP_PASSWORD_HASH",
];

module.exports = { buildDbURI, requiredEnvNames };
