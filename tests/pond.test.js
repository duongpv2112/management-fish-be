const request = require("supertest");
const app = require("../app");
const { authHeader } = require("./helpers/auth");
const Pond = require("../app/models/pond");
const LogTracking = require("../app/models/logTracking");

const base = "/api/ponds";
const create = (body) => request(app).post(`${base}/createPonds`).set(authHeader()).send(body);
const update = (id, body) => request(app).put(`${base}/updatePonds/${id}`).set(authHeader()).send(body);
const remove = (id) => request(app).delete(`${base}/deletePonds/${id}`).set(authHeader());
const list = () => request(app).get(`${base}/getPonds`).set(authHeader());

test("thêm ao, tên được trim", async () => {
  const res = await create({ pondName: " Ao 1 ", area: 500 });
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Tạo ao thành công!");
  expect(res.body.data.pondName).toBe("Ao 1");
  expect(res.body.data.area).toBe(500);
  expect(await LogTracking.countDocuments({ stepName: /Thêm mới ao/ })).toBe(1);
});

test.each(["", null, undefined])("diện tích %j bỏ trống → null", async (area) => {
  const res = await create({ pondName: "Ao 2", area });
  expect(res.body.success).toBe(true);
  expect(res.body.data.area).toBeNull();
});

test.each([0, -5, "abc"])("diện tích %j không hợp lệ", async (area) => {
  expect((await create({ pondName: "Ao 3", area })).body.message).toBe("Diện tích ao không hợp lệ!");
  const pond = await Pond.create({ pondName: "Ao 9" });
  expect((await update(pond._id, { pondName: "Ao 9", area })).body.message).toBe("Diện tích ao không hợp lệ!");
});

test("tên rỗng", async () => {
  const res = await create({ pondName: "  " });
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Tên ao không được để trống!");
});

test("trùng tên khác hoa thường", async () => {
  await Pond.create({ pondName: "Ao 1" });
  const other = await Pond.create({ pondName: "Ao 2" });
  expect((await create({ pondName: "ao 1" })).body.message).toBe("Tên ao đã tồn tại!");
  expect((await update(other._id, { pondName: "AO 1" })).body.message).toBe("Tên ao đã tồn tại!");
});

test("sửa ao", async () => {
  const pond = await Pond.create({ pondName: "Ao 1", area: 100 });
  const res = await update(pond._id, { pondName: " Ao lớn ", area: 800 });
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Cập nhật ao thành công!");
  const saved = await Pond.findById(pond._id);
  expect(saved.pondName).toBe("Ao lớn");
  expect(saved.area).toBe(800);
});

test("xóa mềm rồi thêm lại tên cũ → khôi phục cùng _id", async () => {
  const pond = await Pond.create({ pondName: "Ao 1", area: 100 });
  const res = await remove(pond._id);
  expect(res.body.message).toBe("Xóa ao thành công!");
  expect((await Pond.findById(pond._id)).isDelete).toBe(true);
  expect((await list()).body.data).toHaveLength(0);

  const restored = await create({ pondName: "AO 1", area: 300 });
  expect(restored.body.success).toBe(true);
  expect(restored.body.data._id).toBe(pond._id);
  expect(restored.body.data.area).toBe(300);
  expect(await LogTracking.countDocuments({ stepName: /Khôi phục ao/ })).toBe(1);
});

test("danh sách theo thứ tự tạo", async () => {
  await create({ pondName: "Ao 1" });
  await create({ pondName: "Ao 2" });
  const res = await list();
  expect(res.body.message).toBe("Lấy danh sách ao thành công!");
  expect(res.body.data.map((p) => p.pondName)).toEqual(["Ao 1", "Ao 2"]);
});

test("id không tồn tại", async () => {
  expect((await update("khong-co", { pondName: "X" })).body.message).toBe("Không tìm thấy dữ liệu!");
  expect((await remove("khong-co")).body.message).toBe("Không tìm thấy dữ liệu!");
});

test("không xóa ao đang có vụ mở; vụ đã kết thúc thì xóa được", async () => {
  const Crop = require("../app/models/crop");
  const pond = await Pond.create({ pondName: "Ao 1" });
  const crop = await Crop.create({ pond: pond._id, cropName: "Vụ", startDate: new Date("2026-01-01") });
  expect((await remove(pond._id)).body.message).toBe("Ao đang có vụ nuôi, hãy kết thúc vụ trước!");

  await Crop.updateOne({ _id: crop._id }, { status: "closed", endDate: new Date("2026-06-01") });
  expect((await remove(pond._id)).body.success).toBe(true);
});
