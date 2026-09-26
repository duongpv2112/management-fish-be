const request = require("supertest");
const app = require("../app");
const { authHeader } = require("./helpers/auth");
const FishType = require("../app/models/fishType");
const FishWeight = require("../app/models/fishWeight");
const WeighSession = require("../app/models/weighSession");
const LogTracking = require("../app/models/logTracking");
const weighSessionService = require("../app/services/weighSession.service");

const api = (method, url) => request(app)[method](url).set(authHeader());

test("phiên mới mặc định VND", async () => {
  const res = await api("post", "/api/weigh-sessions/createWeighSessions").send({});
  expect(res.body.data.currency).toBe("VND");
});

test("phiên mới lấy loại tiền của phiên gần nhất; có thể chỉ định khi tạo", async () => {
  await WeighSession.create({ sessionName: "Cũ", status: "closed", currency: "USD" });
  const inherit = await api("post", "/api/weigh-sessions/createWeighSessions").send({});
  expect(inherit.body.data.currency).toBe("USD");

  const explicit = await api("post", "/api/weigh-sessions/createWeighSessions").send({ currency: "VND" });
  expect(explicit.body.data.currency).toBe("VND");

  const bad = await api("post", "/api/weigh-sessions/createWeighSessions").send({ currency: "JPY" });
  expect(bad.body).toMatchObject({ success: false, message: "Loại tiền không hợp lệ!" });
});

test("getOrCreateOpenSession cũng lấy loại tiền của phiên gần nhất", async () => {
  await WeighSession.create({ sessionName: "Cũ", status: "closed", currency: "USD" });
  const session = await weighSessionService.getOrCreateOpenSession();
  expect(session.currency).toBe("USD");
});

test("đổi loại tiền: xóa bảng giá cũ, ghi nhật ký; phiên đã đóng vẫn đổi được", async () => {
  const fish = await FishType.create({ fishName: "Cá trắm" });
  const session = await WeighSession.create({
    sessionName: "P",
    status: "closed",
    prices: [{ fishType: fish._id, unitPrice: 45000 }],
  });

  const res = await api("put", `/api/weigh-sessions/updateSessionCurrency/${session._id}`).send({ currency: "USD" });
  expect(res.body.success).toBe(true);
  expect(res.body.data.currency).toBe("USD");
  expect(res.body.data.prices).toEqual([]);
  expect(await LogTracking.countDocuments({ stepName: /Đổi loại tiền phiên: 'P' sang USD thành công/ })).toBe(1);
});

test("đổi sang đúng loại tiền đang dùng thì giữ nguyên bảng giá", async () => {
  const fish = await FishType.create({ fishName: "Cá trắm" });
  const session = await WeighSession.create({ sessionName: "P", prices: [{ fishType: fish._id, unitPrice: 45000 }] });
  const res = await api("put", `/api/weigh-sessions/updateSessionCurrency/${session._id}`).send({ currency: "VND" });
  expect(res.body.success).toBe(true);
  expect(res.body.data.prices).toHaveLength(1);
});

test("đổi loại tiền không hợp lệ / phiên không tồn tại", async () => {
  const session = await WeighSession.create({ sessionName: "P" });
  const bad = await api("put", `/api/weigh-sessions/updateSessionCurrency/${session._id}`).send({ currency: "abc" });
  expect(bad.body).toMatchObject({ success: false, message: "Loại tiền không hợp lệ!" });
  const missing = await api("put", "/api/weigh-sessions/updateSessionCurrency/khong-co").send({ currency: "USD" });
  expect(missing.body).toMatchObject({ success: false, message: "Không tìm thấy phiên cân!" });
});

test("đơn giá làm tròn theo loại tiền: VND số nguyên, USD 2 chữ số thập phân", async () => {
  const fish = await FishType.create({ fishName: "Cá trắm" });
  const vnd = await WeighSession.create({ sessionName: "V", status: "closed" });
  const usd = await WeighSession.create({ sessionName: "U", currency: "USD" });

  const r1 = await api("put", `/api/weigh-sessions/updateSessionPrices/${vnd._id}`).send({
    prices: [{ fishType: fish._id, unitPrice: 45000.6 }],
  });
  expect(r1.body.data.prices[0].unitPrice).toBe(45001);

  const r2 = await api("put", `/api/weigh-sessions/updateSessionPrices/${usd._id}`).send({
    prices: [{ fishType: fish._id, unitPrice: 1.255 }],
  });
  expect(r2.body.data.prices[0].unitPrice).toBeCloseTo(1.26, 2);
});

test("tổng hợp USD: thành tiền làm tròn đến cent, trả kèm currency", async () => {
  const fish = await FishType.create({ fishName: "Cá trắm" });
  const session = await WeighSession.create({
    sessionName: "U",
    currency: "USD",
    prices: [{ fishType: fish._id, unitPrice: 1.75 }],
  });
  for (const net of [10.3, 5.13]) {
    await FishWeight.create({ fishType: fish._id, fishWeight: net + 1, basketWeightSnapshot: 1, netWeight: net, session: session._id });
  }

  const res = await api("get", `/api/weigh-sessions/getSessionSummary/${session._id}`);
  expect(res.body.data.session.currency).toBe("USD");
  // 15.43 × 1.75 = 27.0025 → 27
  expect(res.body.data.lines[0].amount).toBe(27);
  expect(res.body.data.totalAmount).toBe(27);
});

test("tổng hợp VND vẫn trả currency VND cho phiên cũ không có trường currency", async () => {
  await WeighSession.collection.insertOne({ _id: "cu", sessionName: "Cũ", status: "closed", prices: [], isDelete: false });
  const res = await api("get", "/api/weigh-sessions/getSessionSummary/cu");
  expect(res.body.data.session.currency).toBe("VND");
});
