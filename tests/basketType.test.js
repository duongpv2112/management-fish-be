const request = require("supertest");
const app = require("../app");
const { authHeader } = require("./helpers/auth");
const BasketType = require("../app/models/basketType");
const LogTracking = require("../app/models/logTracking");

let to;
let nho;

beforeEach(async () => {
  to = await BasketType.create({ basketName: "Giỏ to", basketWeight: 2 });
  nho = await BasketType.create({ basketName: "Giỏ nhỏ", basketWeight: 1 });
});

const update = (id, body) => request(app).put(`/api/basket-types/updateBasketTypes/${id}`).set(authHeader()).send(body);
const remove = (id) => request(app).delete(`/api/basket-types/deleteBasketTypes/${id}`).set(authHeader());
const create = (body) => request(app).post("/api/basket-types/createBasketTypes").set(authHeader()).send(body);

test("sửa loại giỏ", async () => {
  const res = await update(nho._id, { basketName: " Giỏ vừa ", basketWeight: 1.5 });
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Cập nhật loại giỏ thành công!");
  const saved = await BasketType.findById(nho._id);
  expect(saved.basketName).toBe("Giỏ vừa");
  expect(saved.basketWeight).toBe(1.5);
  expect(await LogTracking.countDocuments({ stepName: /Cập nhật loại giỏ/ })).toBe(1);
});

test("sửa thành tên trùng (khác hoa thường) → từ chối", async () => {
  const res = await update(nho._id, { basketName: "GIỎ TO", basketWeight: 1 });
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Tên loại giỏ đã tồn tại!");
});

test("tên rỗng → từ chối", async () => {
  const res = await update(nho._id, { basketName: " ", basketWeight: 1 });
  expect(res.body.message).toBe("Tên loại giỏ không được để trống!");
});

test.each([-1, "abc", null, ""])("trọng lượng giỏ %j không hợp lệ", async (basketWeight) => {
  const res = await update(nho._id, { basketName: "Giỏ nhỏ", basketWeight });
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Trọng lượng giỏ không hợp lệ!");
  expect((await create({ basketName: "Giỏ mới", basketWeight })).body.message).toBe(
    "Trọng lượng giỏ không hợp lệ!"
  );
});

test("trọng lượng giỏ 0 hợp lệ", async () => {
  const res = await update(nho._id, { basketName: "Giỏ nhỏ", basketWeight: 0 });
  expect(res.body.success).toBe(true);
  expect((await BasketType.findById(nho._id)).basketWeight).toBe(0);
});

test("xóa mềm loại giỏ", async () => {
  const res = await remove(to._id);
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Xóa loại giỏ thành công!");
  expect((await BasketType.findById(to._id)).isDelete).toBe(true);
  const list = await request(app).get("/api/basket-types/getBasketTypes").set(authHeader());
  expect(list.body.data.map((x) => x.basketName)).toEqual(["Giỏ nhỏ"]);
});

test("thêm lại tên đã xóa → khôi phục bản ghi cũ với trọng lượng mới", async () => {
  await remove(to._id);
  const res = await create({ basketName: "giỏ to", basketWeight: 2.5 });
  expect(res.body.success).toBe(true);
  expect(res.body.data._id).toBe(to._id);
  expect(res.body.data.basketWeight).toBe(2.5);
});

test("thêm trùng tên đang dùng → từ chối", async () => {
  const res = await create({ basketName: "Giỏ to", basketWeight: 2 });
  expect(res.body.message).toBe("Tên loại giỏ đã tồn tại!");
});

test("id không tồn tại", async () => {
  expect((await remove("khong-co")).body.message).toBe("Không tìm thấy loại giỏ!");
  expect((await update("khong-co", { basketName: "X", basketWeight: 1 })).body.message).toBe(
    "Không tìm thấy loại giỏ!"
  );
});
