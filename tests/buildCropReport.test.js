const { buildCropReport } = require("../app/services/cropReport.service");

const pond = { _id: "p1", pondName: "Ao 1" };
const openCrop = {
  _id: "c1",
  cropName: "Ao 1 · Vụ 09/2026",
  pond,
  startDate: new Date("2026-09-01T00:00:00Z"),
  endDate: null,
  status: "open",
};

// Dữ liệu giống summarizeSession trả về
const summary = ({ id, currency = "VND", totalNet = 100, totalAmount = 1000000, missingPriceCount = 0 }) => ({
  session: {
    _id: id,
    sessionName: `Phiên ${id}`,
    buyerName: "Anh Tuấn",
    status: "closed",
    createdAt: new Date("2026-09-20T01:00:00Z"),
    currency,
  },
  lines: [],
  totalNet,
  totalAmount,
  missingPriceCount,
});

const giong = { _id: "g", categoryName: "Giống", metric: "seed" };
const cam = { _id: "cam", categoryName: "Cám", metric: "feed" };
const dien = { _id: "d", categoryName: "Điện", metric: "none" };
const expense = (category, amount, extra = {}) => ({
  category,
  amount,
  quantity: null,
  unit: "",
  kgPerUnit: null,
  ...extra,
});

const today = new Date("2026-09-27T05:00:00Z");

test("vụ trống: không chia cho 0", () => {
  const report = buildCropReport({ crop: openCrop, sessions: [], expenses: [], today });
  expect(report.revenue).toEqual({ total: 0, sessions: [], excludedForeignCurrency: 0 });
  expect(report.expense).toEqual({ total: 0, byCategory: [] });
  expect(report.profit).toBe(0);
  expect(report.metrics).toEqual({
    totalNetKg: 0,
    costPerKg: null,
    seedQuantities: [],
    feedQuantities: [],
    feedKg: null,
    fcr: null,
  });
});

test("thu chỉ cộng phiên VND; phiên USD bị đếm và loại", () => {
  const report = buildCropReport({
    crop: openCrop,
    sessions: [summary({ id: "s1", totalNet: 120.5 }), summary({ id: "s2", currency: "USD", totalNet: 50, totalAmount: 99 })],
    expenses: [],
    today,
  });
  expect(report.revenue.total).toBe(1000000);
  expect(report.revenue.excludedForeignCurrency).toBe(1);
  expect(report.revenue.sessions.map((s) => s._id)).toEqual(["s1"]);
  expect(report.revenue.sessions[0]).toMatchObject({
    sessionName: "Phiên s1",
    buyerName: "Anh Tuấn",
    status: "closed",
    totalNet: 120.5,
    amount: 1000000,
    missingPrice: false,
  });
  expect(report.metrics.totalNetKg).toBe(120.5);
});

test("phiên chưa có trường currency tính là VND", () => {
  const legacy = summary({ id: "s0" });
  delete legacy.session.currency;
  expect(buildCropReport({ crop: openCrop, sessions: [legacy], expenses: [], today }).revenue.total).toBe(1000000);
});

test("phiên thiếu giá", () => {
  const report = buildCropReport({
    crop: openCrop,
    sessions: [summary({ id: "s1", totalAmount: 400000, missingPriceCount: 1 })],
    expenses: [],
    today,
  });
  expect(report.revenue.sessions[0]).toMatchObject({ missingPrice: true, amount: 400000 });
});

test("chi theo nhóm: sắp giảm dần, phần trăm 1 chữ số, lãi = thu − chi", () => {
  const report = buildCropReport({
    crop: openCrop,
    sessions: [summary({ id: "s1", totalAmount: 10000000 })],
    expenses: [expense(cam, 2000000), expense(giong, 4000000), expense(dien, 500000), expense(cam, 1500000)],
    today,
  });
  expect(report.expense.total).toBe(8000000);
  expect(report.expense.byCategory).toEqual([
    { category: { _id: "g", categoryName: "Giống", metric: "seed" }, amount: 4000000, percent: 50, count: 1 },
    { category: { _id: "cam", categoryName: "Cám", metric: "feed" }, amount: 3500000, percent: 43.8, count: 2 },
    { category: { _id: "d", categoryName: "Điện", metric: "none" }, amount: 500000, percent: 6.3, count: 1 },
  ]);
  expect(report.profit).toBe(2000000);
});

test("lỗ → profit âm", () => {
  const report = buildCropReport({
    crop: openCrop,
    sessions: [summary({ id: "s1", totalAmount: 1000000 })],
    expenses: [expense(dien, 1500000)],
    today,
  });
  expect(report.profit).toBe(-500000);
});

test("quy đổi cám: KG và Bao (có kg/bao), gom theo đơn vị chữ thường", () => {
  const report = buildCropReport({
    crop: openCrop,
    sessions: [summary({ id: "s1", totalNet: 240 })],
    expenses: [
      expense(cam, 1, { quantity: 50, unit: "KG" }),
      expense(cam, 1, { quantity: 10, unit: "Bao", kgPerUnit: 25 }),
    ],
    today,
  });
  expect(report.metrics.feedQuantities).toEqual([
    { unit: "bao", quantity: 10 },
    { unit: "kg", quantity: 50 },
  ]);
  expect(report.metrics.feedKg).toBe(300);
  expect(report.metrics.fcr).toBe(1.25);
});

test.each([
  ["khoản cám không có số lượng", expense(cam, 1)],
  ["khoản cám 'bao' thiếu kg/bao", expense(cam, 1, { quantity: 2, unit: "bao" })],
])("%s → feedKg và fcr null", (_name, extra) => {
  const report = buildCropReport({
    crop: openCrop,
    sessions: [summary({ id: "s1", totalNet: 240 })],
    expenses: [expense(cam, 1, { quantity: 50, unit: "kg" }), extra],
    today,
  });
  expect(report.metrics.feedKg).toBeNull();
  expect(report.metrics.fcr).toBeNull();
});

test("giống: gom số lượng theo đơn vị", () => {
  const report = buildCropReport({
    crop: openCrop,
    sessions: [],
    expenses: [expense(giong, 1, { quantity: 3000, unit: "con" }), expense(giong, 1, { quantity: 2000, unit: "Con " })],
    today,
  });
  expect(report.metrics.seedQuantities).toEqual([{ unit: "con", quantity: 5000 }]);
});

test("giá vốn / kg làm tròn đồng", () => {
  const report = buildCropReport({
    crop: openCrop,
    sessions: [summary({ id: "s1", totalNet: 300 })],
    expenses: [expense(dien, 1000000)],
    today,
  });
  expect(report.metrics.costPerKg).toBe(3333);
});

test("số ngày: vụ đã kết thúc tính tới ngày kết thúc, vụ đang nuôi tới hôm nay", () => {
  const closed = { ...openCrop, status: "closed", endDate: new Date("2026-09-27T00:00:00Z") };
  expect(buildCropReport({ crop: closed, sessions: [], expenses: [], today: new Date("2026-12-01") }).crop.days).toBe(26);
  const report = buildCropReport({ crop: openCrop, sessions: [], expenses: [], today });
  expect(report.crop).toMatchObject({ _id: "c1", cropName: "Ao 1 · Vụ 09/2026", pond: { _id: "p1", pondName: "Ao 1" }, status: "open", days: 26 });
});
