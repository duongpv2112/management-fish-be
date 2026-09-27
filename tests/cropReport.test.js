const request = require("supertest");
const app = require("../app");
const { authHeader } = require("./helpers/auth");
const Pond = require("../app/models/pond");
const Crop = require("../app/models/crop");
const WeighSession = require("../app/models/weighSession");
const FishType = require("../app/models/fishType");
const FishWeight = require("../app/models/fishWeight");
const ExpenseCategory = require("../app/models/expenseCategory");
const Expense = require("../app/models/expense");

const getReport = (id) => request(app).get(`/api/crops/getCropReport/${id}`).set(authHeader());

test("báo cáo vụ: thu khớp phiếu tính tiền, chỉ tính khoản chi của vụ", async () => {
  const pond = await Pond.create({ pondName: "Ao 1" });
  const crop = await Crop.create({ pond: pond._id, cropName: "Vụ 1", startDate: new Date("2026-09-01") });
  const tram = await FishType.create({ fishName: "Cá trắm" });

  const session = await WeighSession.create({
    sessionName: "Phiên 1",
    status: "closed",
    crop: crop._id,
    prices: [{ fishType: tram._id, unitPrice: 45000 }],
  });
  const weighIn = { fishType: tram._id, basketType: "b", session: session._id, basketWeightSnapshot: 2 };
  await FishWeight.create({ ...weighIn, fishWeight: 22.3, netWeight: 20.3 });
  await FishWeight.create({ ...weighIn, fishWeight: 12, netWeight: 10 });

  // Không thuộc vụ / đã xóa → không tính
  await WeighSession.create({ sessionName: "Chưa gán", status: "closed" });
  await WeighSession.create({ sessionName: "Đã xóa", status: "closed", crop: crop._id, isDelete: true });

  const cam = await ExpenseCategory.create({ categoryName: "Cám", metric: "feed" });
  await Expense.create({ date: new Date(), category: cam._id, crop: crop._id, amount: 300000, quantity: 1, unit: "bao", kgPerUnit: 25 });
  await Expense.create({ date: new Date(), category: cam._id, crop: crop._id, amount: 200000 });
  await Expense.create({ date: new Date(), category: cam._id, crop: null, amount: 999999 });
  await Expense.create({ date: new Date(), category: cam._id, crop: crop._id, amount: 1, isDelete: true });

  const summary = await request(app).get(`/api/weigh-sessions/getSessionSummary/${session._id}`).set(authHeader());
  const res = await getReport(crop._id);
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Lấy báo cáo vụ nuôi thành công!");
  expect(res.body.data.revenue.total).toBe(summary.body.data.totalAmount);
  expect(res.body.data.revenue.sessions.map((s) => s.sessionName)).toEqual(["Phiên 1"]);
  expect(res.body.data.expense.total).toBe(500000);
  expect(res.body.data.profit).toBe(summary.body.data.totalAmount - 500000);
  expect(res.body.data.crop.pond.pondName).toBe("Ao 1");
  expect(res.body.data.metrics.totalNetKg).toBe(30.3);
});

test("vụ không tồn tại", async () => {
  expect((await getReport("khong-co")).body.message).toBe("Không tìm thấy dữ liệu!");
});
