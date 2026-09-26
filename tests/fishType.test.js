const request = require("supertest");
const app = require("../app");
const FishType = require("../app/models/fishType");
const LogTracking = require("../app/models/logTracking");

let tram;
let me;

beforeEach(async () => {
  tram = await FishType.create({ fishName: "Cá trắm" });
  me = await FishType.create({ fishName: "Cá mè" });
});

const update = (id, body) => request(app).put(`/api/fish-types/updateFishTypes/${id}`).send(body);
const remove = (id) => request(app).delete(`/api/fish-types/deleteFishTypes/${id}`);
const create = (body) => request(app).post("/api/fish-types/createFishTypes").send(body);

test("sửa tên loại cá", async () => {
  const res = await update(me._id, { fishName: "  Cá mè hoa " });
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Cập nhật loại cá thành công!");
  expect(res.body.data.fishName).toBe("Cá mè hoa");
  expect((await FishType.findById(me._id)).fishName).toBe("Cá mè hoa");
  expect(await LogTracking.countDocuments({ stepName: /Cập nhật loại cá/ })).toBe(1);
});

test("sửa thành tên đã tồn tại (khác hoa thường) → từ chối", async () => {
  const res = await update(me._id, { fishName: "cá TRẮM" });
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Tên loại cá đã tồn tại!");
  expect((await FishType.findById(me._id)).fishName).toBe("Cá mè");
  expect(await LogTracking.countDocuments({ stepName: /không thành công/ })).toBe(1);
});

test("giữ nguyên tên của chính nó là hợp lệ", async () => {
  const res = await update(me._id, { fishName: "Cá mè" });
  expect(res.body.success).toBe(true);
});

test("tên rỗng → từ chối", async () => {
  const res = await update(me._id, { fishName: "  " });
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Tên loại cá không được để trống!");
});

test("thêm mới tên rỗng hoặc trùng → từ chối", async () => {
  expect((await create({ fishName: " " })).body.message).toBe("Tên loại cá không được để trống!");
  expect((await create({ fishName: "cá trắm" })).body.message).toBe("Tên loại cá đã tồn tại!");
});

test("xóa mềm loại cá", async () => {
  const res = await remove(tram._id);
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Xóa loại cá thành công!");
  expect((await FishType.findById(tram._id)).isDelete).toBe(true);
  const list = await request(app).get("/api/fish-types/getFishTypes");
  expect(list.body.data.map((x) => x.fishName)).toEqual(["Cá mè"]);
  expect(await LogTracking.countDocuments({ stepName: /Xóa loại cá/ })).toBe(1);
});

test("thêm lại tên đã xóa → khôi phục bản ghi cũ", async () => {
  await remove(tram._id);
  const res = await create({ fishName: "Cá trắm" });
  expect(res.body.success).toBe(true);
  expect(res.body.data._id).toBe(tram._id);
  expect(res.body.data.isDelete).toBe(false);
  expect(await FishType.countDocuments()).toBe(2);
});

test("xóa id không tồn tại", async () => {
  const res = await remove("khong-co");
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Không tìm thấy loại cá!");
});

test("sửa id không tồn tại", async () => {
  const res = await update("khong-co", { fishName: "Cá chép" });
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Không tìm thấy loại cá!");
});

test("đổi tên trùng với loại đã xóa → báo trùng, không crash", async () => {
  await remove(tram._id);
  const res = await update(me._id, { fishName: "Cá trắm" });
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Tên loại cá đã tồn tại!");
});
