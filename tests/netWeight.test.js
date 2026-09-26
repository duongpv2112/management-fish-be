const request = require("supertest");
const app = require("../app");
const { authHeader } = require("./helpers/auth");
const FishType = require("../app/models/fishType");
const BasketType = require("../app/models/basketType");
const FishWeight = require("../app/models/fishWeight");
const WeighSession = require("../app/models/weighSession");

let tram;
let gio;

beforeEach(async () => {
  tram = await FishType.create({ fishName: "Cá trắm" });
  gio = await BasketType.create({ basketName: "Giỏ to", basketWeight: 2 });
});

const create = (body) => request(app).post("/api/fish-weights/createFishWeights").set(authHeader()).send(body);
const update = (id, body) => request(app).put(`/api/fish-weights/updateFishWeights/${id}`).set(authHeader()).send(body);
const remove = (id) => request(app).delete(`/api/fish-weights/deleteFishWeights/${id}`).set(authHeader());

test("trừ trọng lượng giỏ; sửa giỏ sau đó không làm đổi bản ghi cũ", async () => {
  const res = await create({ fishType: tram._id, basketType: gio._id, fishWeight: 25.5 });
  expect(res.body.success).toBe(true);
  expect(res.body.data.netWeight).toBe(23.5);
  expect(res.body.data.basketWeightSnapshot).toBe(2);

  await request(app)
    .put(`/api/basket-types/updateBasketTypes/${gio._id}`)
    .set(authHeader())
    .send({ basketName: "Giỏ to", basketWeight: 3 });
  const saved = await FishWeight.findById(res.body.data._id);
  expect(saved.netWeight).toBe(23.5);
  expect(saved.basketWeightSnapshot).toBe(2);
});

test("không có giỏ → trừ 0", async () => {
  const res = await create({ fishType: tram._id, fishWeight: 10 });
  expect(res.body.data.netWeight).toBe(10);
  expect(res.body.data.basketWeightSnapshot).toBe(0);
});

test("làm tròn 2 chữ số", async () => {
  const res = await create({ fishType: tram._id, basketType: gio._id, fishWeight: 12.3 });
  expect(res.body.data.netWeight).toBe(10.3);
});

test.each([2, 1.5])("số cân %j <= trọng lượng giỏ → từ chối", async (fishWeight) => {
  const res = await create({ fishType: tram._id, basketType: gio._id, fishWeight });
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Số cân phải lớn hơn trọng lượng giỏ (2 kg)!");
  expect(await FishWeight.countDocuments()).toBe(0);
});

test("số cân không dương → từ chối", async () => {
  const res = await create({ fishType: tram._id, fishWeight: 0 });
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Số cân cá phải là số dương!");
});

test("chưa có phiên → tự tạo phiên mở; lần cân sau dùng lại phiên đó", async () => {
  const first = await create({ fishType: tram._id, basketType: gio._id, fishWeight: 20 });
  const second = await create({ fishType: tram._id, basketType: gio._id, fishWeight: 30 });
  expect(first.body.data.session).toBeTruthy();
  expect(second.body.data.session).toBe(first.body.data.session);
  const session = await WeighSession.findById(first.body.data.session);
  expect(session.status).toBe("open");
  expect(await WeighSession.countDocuments()).toBe(1);
});

test("sửa: tính lại netWeight với snapshot cũ; đổi giỏ thì chụp lại snapshot", async () => {
  const nho = await BasketType.create({ basketName: "Giỏ nhỏ", basketWeight: 1 });
  const created = (await create({ fishType: tram._id, basketType: gio._id, fishWeight: 25 })).body.data;
  // Sửa trọng lượng giỏ hiện tại: bản ghi vẫn dùng snapshot 2 khi không đổi giỏ
  await BasketType.updateOne({ _id: gio._id }, { basketWeight: 5 });

  let res = await update(created._id, { fishType: tram._id, basketType: gio._id, fishWeight: 26 });
  expect(res.body.data.netWeight).toBe(24);

  res = await update(created._id, { fishType: tram._id, basketType: nho._id, fishWeight: 26 });
  expect(res.body.data.basketWeightSnapshot).toBe(1);
  expect(res.body.data.netWeight).toBe(25);
});

test("sửa thành số cân <= giỏ → từ chối", async () => {
  const created = (await create({ fishType: tram._id, basketType: gio._id, fishWeight: 25 })).body.data;
  const res = await update(created._id, { fishType: tram._id, basketType: gio._id, fishWeight: 2 });
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Số cân phải lớn hơn trọng lượng giỏ (2 kg)!");
});

test("sửa/xóa bản ghi thuộc phiên đã đóng → từ chối", async () => {
  const created = (await create({ fishType: tram._id, basketType: gio._id, fishWeight: 25 })).body.data;
  await WeighSession.updateOne({ _id: created.session }, { status: "closed", closedAt: new Date() });

  const updated = await update(created._id, { fishType: tram._id, basketType: gio._id, fishWeight: 26 });
  expect(updated.body.success).toBe(false);
  expect(updated.body.message).toBe("Phiên đã đóng, không thể sửa!");

  const removed = await remove(created._id);
  expect(removed.body.success).toBe(false);
  expect(removed.body.message).toBe("Phiên đã đóng, không thể xóa!");
  expect((await FishWeight.findById(created._id)).isDelete).toBe(false);
});
