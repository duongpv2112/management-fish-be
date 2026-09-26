const request = require("supertest");
const app = require("../app");
const { authHeader } = require("./helpers/auth");
const WeighSession = require("../app/models/weighSession");
const LogTracking = require("../app/models/logTracking");
const weighSessionService = require("../app/services/weighSession.service");

const base = "/api/weigh-sessions";

test("tạo phiên mới với tên mặc định theo ngày, trạng thái mở", async () => {
  const res = await request(app).post(`${base}/createWeighSessions`).set(authHeader()).send({ buyerName: "Anh Tuấn" });
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Tạo phiên cân thành công!");
  expect(res.body.data.status).toBe("open");
  expect(res.body.data.buyerName).toBe("Anh Tuấn");
  expect(res.body.data.sessionName).toMatch(/^Phiên \d{2}\/\d{2}\/\d{4}$/);
  expect(await LogTracking.countDocuments({ stepName: /^Tạo phiên/ })).toBe(1);
});

test("tạo phiên khi đã có phiên mở → đóng phiên cũ, chỉ còn 1 phiên mở", async () => {
  const first = await request(app).post(`${base}/createWeighSessions`).set(authHeader()).send({ sessionName: "Sáng" });
  const second = await request(app).post(`${base}/createWeighSessions`).set(authHeader()).send({ sessionName: "Chiều" });
  expect(second.body.data.sessionName).toBe("Chiều");

  const old = await WeighSession.findById(first.body.data._id);
  expect(old.status).toBe("closed");
  expect(old.closedAt).toBeInstanceOf(Date);
  expect(await WeighSession.countDocuments({ status: "open" })).toBe(1);
  expect(await LogTracking.countDocuments({ stepName: /^Đóng phiên/ })).toBe(1);
});

test("getOrCreateOpenSession gọi song song chỉ tạo 1 phiên", async () => {
  const [a, b] = await Promise.all([
    weighSessionService.getOrCreateOpenSession(),
    weighSessionService.getOrCreateOpenSession(),
  ]);
  expect(a._id).toBe(b._id);
  expect(await WeighSession.countDocuments()).toBe(1);
});

test("getOrCreateOpenSession trả phiên đang mở nếu có", async () => {
  const created = await WeighSession.create({ sessionName: "Đang mở" });
  const session = await weighSessionService.getOrCreateOpenSession();
  expect(session._id).toBe(created._id);
});

test("hai lần bấm Phiên mới cùng lúc → chỉ còn 1 phiên mở", async () => {
  await Promise.all([
    request(app).post(`${base}/createWeighSessions`).set(authHeader()).send({}),
    request(app).post(`${base}/createWeighSessions`).set(authHeader()).send({}),
  ]);
  expect(await WeighSession.countDocuments({ status: "open" })).toBe(1);
});

test("lấy phiên đang mở; không có thì data null", async () => {
  let res = await request(app).get(`${base}/getOpenWeighSession`).set(authHeader());
  expect(res.body.success).toBe(true);
  expect(res.body.data).toBeNull();

  const created = await WeighSession.create({ sessionName: "Đang mở" });
  res = await request(app).get(`${base}/getOpenWeighSession`).set(authHeader());
  expect(res.body.data._id).toBe(created._id);
});

test("danh sách phiên mới nhất trước", async () => {
  await WeighSession.create({ sessionName: "Cũ", status: "closed" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  await WeighSession.create({ sessionName: "Mới" });
  const res = await request(app).get(`${base}/getWeighSessions`).set(authHeader());
  expect(res.body.data.map((s) => s.sessionName)).toEqual(["Mới", "Cũ"]);
});

test("kết thúc phiên", async () => {
  const created = await WeighSession.create({ sessionName: "Đang mở" });
  const res = await request(app).put(`${base}/closeWeighSessions/${created._id}`).set(authHeader());
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Kết thúc phiên cân thành công!");
  expect(res.body.data.status).toBe("closed");
  expect(await LogTracking.countDocuments({ stepName: /^Đóng phiên/ })).toBe(1);

  const again = await request(app).put(`${base}/closeWeighSessions/${created._id}`).set(authHeader());
  expect(again.body.success).toBe(false);
  expect(again.body.message).toBe("Phiên cân đã kết thúc!");
});

test("kết thúc phiên không tồn tại", async () => {
  const res = await request(app).put(`${base}/closeWeighSessions/khong-co`).set(authHeader());
  expect(res.body.message).toBe("Không tìm thấy phiên cân!");
});

test("cập nhật giá (thay toàn bộ mảng), phiên đã đóng vẫn sửa được giá", async () => {
  const session = await WeighSession.create({
    sessionName: "Đã đóng",
    status: "closed",
    prices: [{ fishType: "f0", unitPrice: 1000 }],
  });
  const res = await request(app)
    .put(`${base}/updateSessionPrices/${session._id}`)
    .set(authHeader())
    .send({ prices: [{ fishType: "f1", unitPrice: 45000 }, { fishType: "f2", unitPrice: 0 }] });
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Cập nhật giá phiên thành công!");
  const saved = await WeighSession.findById(session._id);
  expect(saved.prices.map((p) => [p.fishType, p.unitPrice])).toEqual([
    ["f1", 45000],
    ["f2", 0],
  ]);
  expect(await LogTracking.countDocuments({ stepName: /^Cập nhật giá phiên/ })).toBe(1);
});

test.each([-1, "abc"])("đơn giá %j không hợp lệ", async (unitPrice) => {
  const session = await WeighSession.create({ sessionName: "Đang mở" });
  const res = await request(app)
    .put(`${base}/updateSessionPrices/${session._id}`)
    .set(authHeader())
    .send({ prices: [{ fishType: "f1", unitPrice }] });
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Đơn giá không hợp lệ!");
});

test("đơn giá rỗng/null nghĩa là bỏ giá của loại cá đó", async () => {
  const session = await WeighSession.create({ sessionName: "Đang mở" });
  await request(app)
    .put(`${base}/updateSessionPrices/${session._id}`)
    .set(authHeader())
    .send({ prices: [{ fishType: "f1", unitPrice: null }, { fishType: "f2", unitPrice: 30000 }] });
  const saved = await WeighSession.findById(session._id);
  expect(saved.prices.map((p) => p.fishType)).toEqual(["f2"]);
});
