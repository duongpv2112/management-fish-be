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
const { toDateOnly } = require("../app/common/dateOnly");

const getOverview = (query = {}) => request(app).get("/api/reports/getOverview").query(query).set(authHeader());
const getCropReport = (id) => request(app).get(`/api/crops/getCropReport/${id}`).set(authHeader());

let tram;
let dien;
let cam;

beforeEach(async () => {
  tram = await FishType.create({ fishName: "Cá trắm" });
  dien = await ExpenseCategory.create({ categoryName: "Điện" });
  cam = await ExpenseCategory.create({ categoryName: "Cám", metric: "feed" });
});

// Vụ có một phiên bán (netKg × giá) và một khoản chi của vụ
const makeCrop = async ({ pondName, cropName, startDate, endDate = null, netKg = 100, unitPrice = 50000, cost = 1000000 }) => {
  const pond = await Pond.create({ pondName });
  const crop = await Crop.create({
    pond: pond._id,
    cropName,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : null,
    status: endDate ? "closed" : "open",
  });
  const session = await WeighSession.create({
    sessionName: `Phiên ${cropName}`,
    status: "closed",
    crop: crop._id,
    prices: [{ fishType: tram._id, unitPrice }],
  });
  await FishWeight.create({
    fishType: tram._id,
    basketType: "b",
    session: session._id,
    basketWeightSnapshot: 2,
    fishWeight: netKg + 2,
    netWeight: netKg,
  });
  await Expense.create({ date: new Date(startDate), category: cam._id, crop: crop._id, amount: cost });
  return crop;
};

const YEAR_2026 = { from: "2026-01-01", to: "2026-12-31" };

test("vụ trong kỳ theo ngày kết thúc", async () => {
  const a = await makeCrop({ pondName: "Ao A", cropName: "Vụ A", startDate: "2026-03-01", endDate: "2026-12-31" });
  await makeCrop({ pondName: "Ao B", cropName: "Vụ B", startDate: "2026-03-01", endDate: "2027-01-01" });
  await makeCrop({ pondName: "Ao C", cropName: "Vụ C", startDate: "2025-03-01", endDate: "2025-12-31" });

  const res = await getOverview(YEAR_2026);
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Lấy báo cáo tổng thành công!");
  expect(res.body.data.period).toEqual(YEAR_2026);
  expect(res.body.data.crops).toHaveLength(1);

  const row = res.body.data.crops[0];
  const report = (await getCropReport(a._id)).body.data;
  expect(row.crop.cropName).toBe("Vụ A");
  expect(row.crop.pond.pondName).toBe("Ao A");
  expect(row.revenue).toBe(report.revenue.total);
  expect(row.expense).toBe(report.expense.total);
  expect(row.profit).toBe(report.profit);
  expect(row).toEqual({ crop: report.crop, revenue: 5000000, expense: 1000000, profit: 4000000 });
  expect(res.body.data.cropsTotal).toEqual({ revenue: 5000000, expense: 1000000, profit: 4000000 });
});

test("vụ sắp theo ngày kết thúc tăng dần", async () => {
  await makeCrop({ pondName: "Ao A", cropName: "Vụ muộn", startDate: "2026-01-01", endDate: "2026-11-01" });
  await makeCrop({ pondName: "Ao B", cropName: "Vụ sớm", startDate: "2026-01-01", endDate: "2026-05-01" });
  const res = await getOverview(YEAR_2026);
  expect(res.body.data.crops.map((row) => row.crop.cropName)).toEqual(["Vụ sớm", "Vụ muộn"]);
});

test("vụ đang nuôi tách riêng", async () => {
  await makeCrop({ pondName: "Ao A", cropName: "Vụ A", startDate: "2026-01-01", endDate: "2026-06-01" });
  await makeCrop({ pondName: "Ao D", cropName: "Vụ D", startDate: "2026-07-01", netKg: 10, cost: 2000000 });
  // Vụ E đã kết thúc trong kỳ rồi được mở lại → thành vụ đang nuôi
  const e = await makeCrop({ pondName: "Ao E", cropName: "Vụ E", startDate: "2026-02-01", endDate: "2026-08-01", netKg: 20 });
  const reopened = await request(app).put(`/api/crops/reopenCrops/${e._id}`).set(authHeader());
  expect(reopened.body.success).toBe(true);

  let res = await getOverview(YEAR_2026);
  expect(res.body.data.crops.map((row) => row.crop.cropName)).toEqual(["Vụ A"]);
  expect(res.body.data.openCrops.map((row) => row.crop.cropName)).toEqual(["Vụ E", "Vụ D"]);
  expect(res.body.data.includeOpen).toBe(false);
  expect(res.body.data.cropsTotal).toEqual({ revenue: 5000000, expense: 1000000, profit: 4000000 });
  expect((await getOverview({ ...YEAR_2026, includeOpen: 0 })).body.data.cropsTotal.profit).toBe(4000000);

  res = await getOverview({ ...YEAR_2026, includeOpen: 1 });
  expect(res.body.data.includeOpen).toBe(true);
  // A: 5.000.000 − 1.000.000; D: 500.000 − 2.000.000; E: 1.000.000 − 1.000.000
  expect(res.body.data.cropsTotal).toEqual({ revenue: 6500000, expense: 4000000, profit: 2500000 });
  expect(res.body.data.netProfit).toBe(2500000);
});

test("chi phí chung theo ngày", async () => {
  await makeCrop({ pondName: "Ao A", cropName: "Vụ A", startDate: "2026-01-01", endDate: "2026-06-01" });
  await Expense.create({ date: new Date("2026-03-01"), category: dien._id, crop: null, amount: 600000 });
  await Expense.create({ date: new Date("2027-01-05"), category: dien._id, crop: null, amount: 1 });
  await Expense.create({ date: new Date("2025-12-31"), category: dien._id, crop: null, amount: 2 });

  const res = await getOverview(YEAR_2026);
  expect(res.body.data.commonExpense.total).toBe(600000);
  expect(res.body.data.commonExpense.byCategory).toHaveLength(1);
  expect(res.body.data.commonExpense.byCategory[0].category.categoryName).toBe("Điện");
  expect(res.body.data.commonExpense.byCategory[0].amount).toBe(600000);
  expect(res.body.data.netProfit).toBe(res.body.data.cropsTotal.profit - 600000);
  expect(res.body.data.netProfit).toBe(3400000);
});

test("kỳ trống", async () => {
  const res = await getOverview(YEAR_2026);
  expect(res.body.success).toBe(true);
  expect(res.body.data).toEqual({
    period: YEAR_2026,
    crops: [],
    openCrops: [],
    cropsTotal: { revenue: 0, expense: 0, profit: 0 },
    commonExpense: { total: 0, byCategory: [] },
    netProfit: 0,
    excludedForeignCurrency: 0,
    includeOpen: false,
  });
});

test("mặc định năm hiện tại", async () => {
  const year = toDateOnly().getUTCFullYear();
  const res = await getOverview();
  expect(res.body.data.period).toEqual({ from: `${year}-01-01`, to: `${year}-12-31` });
});

test("ngày sai", async () => {
  expect((await getOverview({ from: "abc", to: "2026-12-31" })).body).toMatchObject({
    success: false,
    message: "Ngày không hợp lệ!",
  });
  expect((await getOverview({ from: "2026-01-01", to: "2026-02-30" })).body.message).toBe("Ngày không hợp lệ!");
  expect((await getOverview({ from: "2026-12-31", to: "2026-01-01" })).body).toMatchObject({
    success: false,
    message: "Ngày kết thúc không được trước ngày bắt đầu!",
  });
  // Cùng một ngày là hợp lệ
  expect((await getOverview({ from: "2026-06-01", to: "2026-06-01" })).body.success).toBe(true);
});

test("phiên USD đếm vào excludedForeignCurrency", async () => {
  const a = await makeCrop({ pondName: "Ao A", cropName: "Vụ A", startDate: "2026-01-01", endDate: "2026-06-01" });
  await WeighSession.create({ sessionName: "USD", status: "closed", crop: a._id, currency: "USD" });
  const res = await getOverview(YEAR_2026);
  expect(res.body.data.excludedForeignCurrency).toBe(1);
  expect(res.body.data.cropsTotal.revenue).toBe(5000000);
});

test("vụ và khoản chi đã xóa không tính", async () => {
  const a = await makeCrop({ pondName: "Ao A", cropName: "Vụ A", startDate: "2026-01-01", endDate: "2026-06-01" });
  await Crop.updateOne({ _id: a._id }, { isDelete: true });
  await Expense.create({ date: new Date("2026-03-01"), category: dien._id, crop: null, amount: 7, isDelete: true });
  const res = await getOverview(YEAR_2026);
  expect(res.body.data.crops).toEqual([]);
  expect(res.body.data.commonExpense).toEqual({ total: 0, byCategory: [] });
});
