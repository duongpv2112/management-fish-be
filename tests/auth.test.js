const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const LogTracking = require("../app/models/logTracking");
const { assertRequiredEnv } = require("../app/config/env");
const { resetLoginAttempts } = require("../app/controllers/auth.controller");
const { TEST_PASSWORD, TEST_JWT_SECRET, authHeader } = require("./helpers/auth");

const login = (password) => request(app).post("/api/auth/login").send({ password });

beforeEach(() => {
  resetLoginAttempts();
});

test("không có token → 401", async () => {
  const res = await request(app).get("/api/fish-types/getFishTypes");
  expect(res.status).toBe(401);
  expect(res.body).toEqual({ success: false, data: null, message: "Vui lòng đăng nhập lại!" });
});

test("token sai → 401", async () => {
  const res = await request(app)
    .get("/api/fish-types/getFishTypes")
    .set("Authorization", "Bearer khong-hop-le");
  expect(res.status).toBe(401);
});

test("token hết hạn → 401", async () => {
  const expired = jwt.sign({ sub: "admin" }, TEST_JWT_SECRET, { expiresIn: -1 });
  const res = await request(app)
    .get("/api/fish-types/getFishTypes")
    .set("Authorization", `Bearer ${expired}`);
  expect(res.status).toBe(401);
});

test("đăng nhập đúng → nhận token 30 ngày, dùng token gọi được API", async () => {
  const res = await login(TEST_PASSWORD);
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Đăng nhập thành công!");
  const { token, expiresAt } = res.body.data;
  const days = (Date.parse(expiresAt) - Date.now()) / 86400000;
  expect(days).toBeGreaterThan(29.9);
  expect(days).toBeLessThanOrEqual(30);

  const api = await request(app).get("/api/fish-types/getFishTypes").set("Authorization", `Bearer ${token}`);
  expect(api.status).toBe(200);
  expect(api.body.success).toBe(true);
});

test("sai mật khẩu → 401 'Mật khẩu không đúng!'", async () => {
  const res = await login("sai");
  expect(res.status).toBe(401);
  expect(res.body).toMatchObject({ success: false, message: "Mật khẩu không đúng!" });
});

test("sai quá 5 lần → lần thứ 6 bị chặn 429", async () => {
  for (let i = 0; i < 5; i++) {
    expect((await login("sai")).status).toBe(401);
  }
  const blocked = await login(TEST_PASSWORD);
  expect(blocked.status).toBe(429);
  expect(blocked.body.message).toBe("Bạn đã nhập sai quá nhiều lần, thử lại sau 15 phút.");
});

test("ghi nhật ký đăng nhập, không ghi mật khẩu", async () => {
  await login(TEST_PASSWORD);
  await login("sai-mat-khau");
  const logs = await LogTracking.find({ stepName: /^Đăng nhập/ });
  expect(logs.map((log) => log.stepName).sort()).toEqual(["Đăng nhập thành công", "Đăng nhập thất bại"]);
  const text = JSON.stringify(logs);
  expect(text).not.toContain(TEST_PASSWORD);
  expect(text).not.toContain("sai-mat-khau");
  expect(logs[0].data.ip).toBeTruthy();
});

test("OPTIONS (preflight) không cần token", async () => {
  const res = await request(app)
    .options("/api/fish-types/getFishTypes")
    .set("Origin", "http://localhost:3001")
    .set("Access-Control-Request-Method", "GET");
  expect(res.status).toBeLessThan(300);
});

test("helper authHeader dùng được", async () => {
  const res = await request(app).get("/api/fish-types/getFishTypes").set(authHeader());
  expect(res.status).toBe(200);
});

describe("CORS", () => {
  test.each(["https://duongpv2112.github.io", "http://localhost:3001"])("cho phép %s", async (origin) => {
    const res = await request(app).get("/api/fish-types/getFishTypes").set(authHeader()).set("Origin", origin);
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
  });

  test("origin lạ không nhận header Access-Control-Allow-Origin", async () => {
    const res = await request(app)
      .get("/api/fish-types/getFishTypes")
      .set(authHeader())
      .set("Origin", "https://evil.example.com");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("assertRequiredEnv", () => {
  test("thiếu biến → throw liệt kê tên biến", () => {
    delete process.env.__TEST_A;
    delete process.env.__TEST_B;
    expect(() => assertRequiredEnv(["__TEST_A", "__TEST_B"])).toThrow(
      "Thiếu biến môi trường: __TEST_A, __TEST_B"
    );
  });

  test("đủ biến → không throw", () => {
    process.env.__TEST_A = "x";
    expect(() => assertRequiredEnv(["__TEST_A"])).not.toThrow();
    delete process.env.__TEST_A;
  });
});
