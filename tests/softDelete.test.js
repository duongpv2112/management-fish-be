const request = require("supertest");
const app = require("../app");
const FishType = require("../app/models/fishType");
const BasketType = require("../app/models/basketType");
const FishWeight = require("../app/models/fishWeight");
const WeighSession = require("../app/models/weighSession");

beforeEach(async () => {
  // getDataFish chỉ lấy lần cân của phiên đang mở
  const session = await WeighSession.create({ sessionName: "Đang mở" });
  const tram = await FishType.create({ fishName: "Cá trắm" });
  const me = await FishType.create({ fishName: "Cá mè", isDelete: true });
  await BasketType.create({ basketName: "Giỏ to", basketWeight: 2 });
  await BasketType.create({ basketName: "Giỏ cũ", basketWeight: 1, isDelete: true });
  await FishWeight.create({ fishType: tram._id, fishWeight: 25, session: session._id });
  await FishWeight.create({ fishType: tram._id, fishWeight: 10, isDelete: true, session: session._id });
  await FishWeight.create({ fishType: me._id, fishWeight: 7, session: session._id });
});

test("getFishTypes bỏ loại cá đã xóa", async () => {
  const res = await request(app).get("/api/fish-types/getFishTypes");
  expect(res.body.data.map((x) => x.fishName)).toEqual(["Cá trắm"]);
});

test("getDataFish bỏ loại cá và bản ghi cân đã xóa", async () => {
  const res = await request(app).get("/api/fish-types/getDataFish");
  expect(res.body.data).toHaveLength(1);
  expect(res.body.data[0].fishName).toBe("Cá trắm");
  expect(res.body.data[0].fishWeights).toEqual([25]);
});

test("getBasketTypes bỏ giỏ đã xóa", async () => {
  const res = await request(app).get("/api/basket-types/getBasketTypes");
  expect(res.body.data.map((x) => x.basketName)).toEqual(["Giỏ to"]);
});

test("danh mục sắp theo createdAt tăng dần", async () => {
  await FishType.create({ fishName: "Cá chép" });
  const res = await request(app).get("/api/fish-types/getFishTypes");
  expect(res.body.data.map((x) => x.fishName)).toEqual(["Cá trắm", "Cá chép"]);
});
