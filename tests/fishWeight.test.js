const request = require("supertest");
const app = require("../app");
const FishType = require("../app/models/fishType");
const BasketType = require("../app/models/basketType");
const FishWeight = require("../app/models/fishWeight");
const LogTracking = require("../app/models/logTracking");

let weight;

beforeEach(async () => {
  const fishType = await FishType.create({ fishName: "Cá trắm" });
  const basketType = await BasketType.create({ basketName: "Giỏ to", basketWeight: 2 });
  weight = await FishWeight.create({
    fishType: fishType._id,
    basketType: basketType._id,
    fishWeight: 25,
  });
});

test("xóa mềm bản ghi cân", async () => {
  const res = await request(app).delete(`/api/fish-weights/deleteFishWeights/${weight._id}`);
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Xóa cân cá thành công!");
  expect(res.body.data.isDelete).toBe(true);
  expect(res.body.data.fishType.fishName).toBe("Cá trắm");
  expect((await FishWeight.findById(weight._id)).isDelete).toBe(true);
  expect(await LogTracking.countDocuments({ stepName: /Xóa bản ghi cân cá/ })).toBe(1);
});

test("id không tồn tại → success false, không crash", async () => {
  const res = await request(app).delete("/api/fish-weights/deleteFishWeights/khong-co");
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Xóa cân cá không thành công!");
  expect(await LogTracking.countDocuments({ stepName: /không thành công/ })).toBe(1);
});

test("route PUT createFishWeights/:id cũ đã bị gỡ", async () => {
  const res = await request(app).put(`/api/fish-weights/createFishWeights/${weight._id}`);
  expect(res.status).toBe(404);
});
