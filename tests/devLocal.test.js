const request = require("supertest");
const app = require("../app");
const FishType = require("../app/models/fishType");
const BasketType = require("../app/models/basketType");
const FishWeight = require("../app/models/fishWeight");
const { seedDemoData } = require("../scripts/dev-local");
const { authHeader } = require("./helpers/auth");

test("seedDemoData tạo loại cá, loại giỏ và vài lần cân trong phiên đang mở", async () => {
  await seedDemoData();

  expect((await FishType.find()).map((f) => f.fishName).sort()).toEqual(["Cá mè", "Cá trắm"]);
  expect(await BasketType.countDocuments()).toBe(2);
  const weights = await FishWeight.find();
  expect(weights).toHaveLength(2);
  expect(weights.every((w) => w.session && w.netWeight > 0)).toBe(true);

  const res = await request(app).get("/api/fish-types/getDataFish").set(authHeader());
  expect(res.body.success).toBe(true);
  expect(res.body.data.some((row) => row.fishWeights.length > 0)).toBe(true);
});

test("seedDemoData không tạo trùng khi DB đã có dữ liệu", async () => {
  await seedDemoData();
  await seedDemoData();
  expect(await FishType.countDocuments()).toBe(2);
  expect(await FishWeight.countDocuments()).toBe(2);
});
