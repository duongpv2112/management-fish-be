/**
 * Dừng hẳn nếu thiếu biến môi trường bắt buộc, thay vì chạy mà không có bảo vệ
 * @param {string[]} names
 */
const assertRequiredEnv = (names) => {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Thiếu biến môi trường: ${missing.join(", ")}`);
  }
};

module.exports = { assertRequiredEnv };
