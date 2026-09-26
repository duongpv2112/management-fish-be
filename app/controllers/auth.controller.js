const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const LogTracking = require("../models/logTracking");
const logTrackingService = require("../services/logTracking.service");

const TOKEN_EXPIRES_IN = "30d";
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_WINDOW_MS = 15 * 60 * 1000;

// Đếm số lần sai mật khẩu theo IP, trong bộ nhớ (Vercel serverless có thể reset, chấp nhận được)
const failedAttempts = new Map();

const resetLoginAttempts = () => failedAttempts.clear();

const getAttempt = (ip) => {
  const attempt = failedAttempts.get(ip);
  if (attempt && Date.now() - attempt.firstFailedAt > BLOCK_WINDOW_MS) {
    failedAttempts.delete(ip);
    return null;
  }
  return attempt ?? null;
};

const recordFailure = (ip) => {
  const attempt = getAttempt(ip) ?? { count: 0, firstFailedAt: Date.now() };
  attempt.count++;
  failedAttempts.set(ip, attempt);
};

// Chỉ ghi IP, không bao giờ ghi mật khẩu
const writeLoginLog = async (stepName, ip) => {
  let logTracking = new LogTracking({ fishTypeName: "", stepName, data: { ip } });
  _ = await logTrackingService.createLogTracking(logTracking);
};

const login = async (req, res) => {
  const ip = req.ip;

  if ((getAttempt(ip)?.count ?? 0) >= MAX_FAILED_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      data: null,
      message: "Bạn đã nhập sai quá nhiều lần, thử lại sau 15 phút.",
    });
  }

  const password = (req.body?.password ?? "").toString();
  const isValid =
    password !== "" && (await bcrypt.compare(password, process.env.APP_PASSWORD_HASH ?? ""));

  if (!isValid) {
    recordFailure(ip);
    await writeLoginLog("Đăng nhập thất bại", ip);
    return res.status(401).json({ success: false, data: null, message: "Mật khẩu không đúng!" });
  }

  failedAttempts.delete(ip);
  const token = jwt.sign({ sub: "admin" }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
  const expiresAt = new Date(jwt.decode(token).exp * 1000).toISOString();
  await writeLoginLog("Đăng nhập thành công", ip);
  res.json({ success: true, data: { token, expiresAt }, message: "Đăng nhập thành công!" });
};

module.exports = {
  login,
  resetLoginAttempts,
};
