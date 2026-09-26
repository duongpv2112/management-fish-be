const request = require("supertest");
const app = require("../app");
const LogTracking = require("../app/models/logTracking");

beforeEach(async () => {
  const base = Date.parse("2026-09-26T00:00:00Z");
  await LogTracking.insertMany(
    Array.from({ length: 25 }, (_, i) => ({
      fishTypeName: i % 5 === 0 ? "Cá trắm" : "Cá mè",
      stepName: `Bước ${i + 1}`,
      data: {},
      createdAt: new Date(base + i * 1000),
      updatedAt: new Date(base + i * 1000),
    }))
  );
});

const getLogs = (query) => request(app).get("/api/log-trackings/getLogTrackings").query(query);

test("trang 2 cỡ 20 có 5 dòng, total 25", async () => {
  const res = await getLogs({ page: 2, pageSize: 20 });
  expect(res.body.success).toBe(true);
  expect(res.body.data).toMatchObject({ total: 25, page: 2, pageSize: 20 });
  expect(res.body.data.items).toHaveLength(5);
});

test("mặc định trang 1 cỡ 20, mới nhất trước", async () => {
  const res = await getLogs({});
  expect(res.body.data.page).toBe(1);
  expect(res.body.data.pageSize).toBe(20);
  expect(res.body.data.items).toHaveLength(20);
  expect(res.body.data.items[0].stepName).toBe("Bước 25");
});

test.each([
  [1000, 100],
  [0, 1],
  ["abc", 20],
])("pageSize %j bị kẹp về %j", async (pageSize, expected) => {
  const res = await getLogs({ pageSize });
  expect(res.body.data.pageSize).toBe(expected);
});

test("page không hợp lệ về 1", async () => {
  const res = await getLogs({ page: -3 });
  expect(res.body.data.page).toBe(1);
});

test("lọc theo loại cá (so khớp chính xác)", async () => {
  const res = await getLogs({ fishType: "Cá trắm" });
  expect(res.body.data.total).toBe(5);
  expect(res.body.data.items.every((log) => log.fishTypeName === "Cá trắm")).toBe(true);
});

test("ký tự đặc biệt trong fishType không gây lỗi", async () => {
  const res = await getLogs({ fishType: "Cá (trắm" });
  expect(res.body.success).toBe(true);
  expect(res.body.data.total).toBe(0);
});
