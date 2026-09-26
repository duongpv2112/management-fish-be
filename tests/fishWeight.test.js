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

describe("sửa bản ghi cân", () => {
  const update = (id, body) =>
    request(app).put(`/api/fish-weights/updateFishWeights/${id}`).send(body);

  test("đổi số cân và loại cá", async () => {
    const me = await FishType.create({ fishName: "Cá mè" });
    const res = await update(weight._id, {
      fishType: me._id,
      basketType: weight.basketType,
      fishWeight: 26.5,
    });
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Cập nhật cân cá thành công!");
    expect(res.body.data.fishWeight).toBe(26.5);
    expect(res.body.data.fishType.fishName).toBe("Cá mè");
    const saved = await FishWeight.findById(weight._id);
    expect(saved.fishWeight).toBe(26.5);
    expect(saved.fishType).toBe(me._id);
    expect(await LogTracking.countDocuments({ stepName: /Cập nhật bản ghi cân cá/ })).toBe(1);
  });

  test.each([0, -2, "abc", null])("số cân %j bị từ chối", async (fishWeight) => {
    const res = await update(weight._id, {
      fishType: weight.fishType,
      basketType: weight.basketType,
      fishWeight,
    });
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Số cân cá phải là số dương!");
    expect((await FishWeight.findById(weight._id)).fishWeight).toBe(25);
  });

  test("id không tồn tại", async () => {
    const res = await update("khong-co", { fishType: weight.fishType, fishWeight: 3 });
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Không tìm thấy bản ghi cân cá!");
  });

  test("loại cá không tồn tại → từ chối", async () => {
    const res = await update(weight._id, { fishType: "khong-co", fishWeight: 3 });
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Không tìm thấy loại cá!");
  });
});
