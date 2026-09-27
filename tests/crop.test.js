const request = require("supertest");
const app = require("../app");
const { authHeader } = require("./helpers/auth");
const Pond = require("../app/models/pond");
const Crop = require("../app/models/crop");
const WeighSession = require("../app/models/weighSession");
const LogTracking = require("../app/models/logTracking");

const base = "/api/crops";
const createCrop = (body) => request(app).post(`${base}/createCrops`).set(authHeader()).send(body);
const updateCrop = (id, body) => request(app).put(`${base}/updateCrops/${id}`).set(authHeader()).send(body);
const closeCrop = (id, body = {}) => request(app).put(`${base}/closeCrops/${id}`).set(authHeader()).send(body);
const reopenCrop = (id) => request(app).put(`${base}/reopenCrops/${id}`).set(authHeader());
const deleteCrop = (id) => request(app).delete(`${base}/deleteCrops/${id}`).set(authHeader());
const getCrops = (query = {}) => request(app).get(`${base}/getCrops`).query(query).set(authHeader());

let ao1;
let ao2;

beforeEach(async () => {
  ao1 = await Pond.create({ pondName: "Ao 1" });
  ao2 = await Pond.create({ pondName: "Ao 2" });
});

test("bắt đầu vụ với tên mặc định", async () => {
  const res = await createCrop({ pondId: ao1._id, startDate: "2026-03-05" });
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Bắt đầu vụ nuôi thành công!");
  expect(res.body.data.status).toBe("open");
  expect(res.body.data.cropName).toBe("Ao 1 · Vụ 03/2026");
  expect(res.body.data.startDate).toBe("2026-03-05T00:00:00.000Z");
  expect(res.body.data.endDate).toBeNull();
  expect(await LogTracking.countDocuments({ stepName: /Bắt đầu vụ/ })).toBe(1);
});

test("tên vụ tự đặt được trim", async () => {
  const res = await createCrop({ pondId: ao1._id, cropName: " Vụ xuân ", startDate: "2026-03-05" });
  expect(res.body.data.cropName).toBe("Vụ xuân");
});

test("ao đã có vụ mở", async () => {
  await createCrop({ pondId: ao1._id });
  const res = await createCrop({ pondId: ao1._id });
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBe("Ao này đang có vụ nuôi!");
});

test("hai request đồng thời cùng ao → chỉ một vụ mở", async () => {
  const results = await Promise.all([createCrop({ pondId: ao1._id }), createCrop({ pondId: ao1._id })]);
  expect(results.filter((res) => res.body.success)).toHaveLength(1);
  expect(results.find((res) => !res.body.success).body.message).toBe("Ao này đang có vụ nuôi!");
  expect(await Crop.countDocuments({ status: "open" })).toBe(1);
});

test("mỗi ao một vụ mở", async () => {
  expect((await createCrop({ pondId: ao1._id })).body.success).toBe(true);
  expect((await createCrop({ pondId: ao2._id })).body.success).toBe(true);
});

test("ao không tồn tại hoặc đã xóa", async () => {
  expect((await createCrop({ pondId: "khong-co" })).body.message).toBe("Không tìm thấy dữ liệu!");
  await Pond.updateOne({ _id: ao2._id }, { isDelete: true });
  expect((await createCrop({ pondId: ao2._id })).body.message).toBe("Không tìm thấy dữ liệu!");
});

test("ngày thả sai định dạng", async () => {
  expect((await createCrop({ pondId: ao1._id, startDate: "abc" })).body.message).toBe("Ngày không hợp lệ!");
});

test("kết thúc vụ cùng ngày thả", async () => {
  const crop = (await createCrop({ pondId: ao1._id, startDate: "2026-09-27" })).body.data;
  const res = await closeCrop(crop._id, { endDate: "2026-09-27" });
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Kết thúc vụ nuôi thành công!");
  expect(res.body.data.status).toBe("closed");
  expect(res.body.data.endDate).toBe("2026-09-27T00:00:00.000Z");
  expect(await LogTracking.countDocuments({ stepName: /Kết thúc vụ/ })).toBe(1);
});

test("kết thúc không truyền ngày → hôm nay", async () => {
  const crop = (await createCrop({ pondId: ao1._id, startDate: "2026-01-01" })).body.data;
  const res = await closeCrop(crop._id);
  expect(res.body.success).toBe(true);
  expect(res.body.data.endDate).toMatch(/T00:00:00.000Z$/);
});

test("kết thúc trước ngày thả", async () => {
  const crop = (await createCrop({ pondId: ao1._id, startDate: "2026-09-27" })).body.data;
  expect((await closeCrop(crop._id, { endDate: "2026-09-26" })).body.message).toBe(
    "Ngày kết thúc phải sau ngày bắt đầu!"
  );
});

test("kết thúc khi còn phiên mở", async () => {
  const crop = (await createCrop({ pondId: ao1._id, startDate: "2026-09-01" })).body.data;
  const session = await WeighSession.create({ sessionName: "P", crop: crop._id });
  expect((await closeCrop(crop._id, { endDate: "2026-09-27" })).body.message).toBe(
    "Vụ còn phiên bán đang mở, hãy kết thúc phiên trước!"
  );

  await WeighSession.updateOne({ _id: session._id }, { status: "closed" });
  expect((await closeCrop(crop._id, { endDate: "2026-09-27" })).body.success).toBe(true);
});

test("kết thúc vụ đã kết thúc → từ chối", async () => {
  const crop = (await createCrop({ pondId: ao1._id, startDate: "2026-09-01" })).body.data;
  await closeCrop(crop._id, { endDate: "2026-09-27" });
  expect((await closeCrop(crop._id, { endDate: "2026-09-27" })).body.success).toBe(false);
});

test("kết thúc xong bắt đầu vụ mới", async () => {
  const crop = (await createCrop({ pondId: ao1._id, startDate: "2026-01-01" })).body.data;
  await closeCrop(crop._id, { endDate: "2026-06-01" });
  expect((await createCrop({ pondId: ao1._id, startDate: "2026-06-02" })).body.success).toBe(true);
  expect(await Crop.countDocuments({ pond: ao1._id, status: "open" })).toBe(1);
  expect(await Crop.countDocuments({ pond: ao1._id, status: "closed" })).toBe(1);
});

test("mở lại vụ", async () => {
  const crop = (await createCrop({ pondId: ao1._id, startDate: "2026-01-01" })).body.data;
  await closeCrop(crop._id, { endDate: "2026-06-01" });
  const res = await reopenCrop(crop._id);
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Mở lại vụ nuôi thành công!");
  expect(res.body.data.status).toBe("open");
  expect(res.body.data.endDate).toBeNull();
});

test("mở lại khi ao đã có vụ mở khác", async () => {
  const crop = (await createCrop({ pondId: ao1._id, startDate: "2026-01-01" })).body.data;
  await closeCrop(crop._id, { endDate: "2026-06-01" });
  await createCrop({ pondId: ao1._id, startDate: "2026-06-02" });
  expect((await reopenCrop(crop._id)).body.message).toBe("Ao này đang có vụ nuôi!");
});

test("mở lại khi ao đã bị xóa", async () => {
  const crop = (await createCrop({ pondId: ao1._id, startDate: "2026-01-01" })).body.data;
  await closeCrop(crop._id, { endDate: "2026-06-01" });
  await Pond.updateOne({ _id: ao1._id }, { isDelete: true });
  expect((await reopenCrop(crop._id)).body.message).toBe("Không tìm thấy dữ liệu!");
});

test("sửa vụ", async () => {
  const crop = (await createCrop({ pondId: ao1._id, startDate: "2026-01-01" })).body.data;
  const res = await updateCrop(crop._id, { cropName: " Vụ đông ", startDate: "2026-01-05", note: "ghi chú" });
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Cập nhật vụ nuôi thành công!");
  expect(res.body.data.cropName).toBe("Vụ đông");
  expect(res.body.data.startDate).toBe("2026-01-05T00:00:00.000Z");
  expect(res.body.data.note).toBe("ghi chú");

  expect((await updateCrop(crop._id, { cropName: " ", startDate: "2026-01-05" })).body.message).toBe(
    "Tên vụ không được để trống!"
  );
});

test("sửa ngày thả sau ngày kết thúc", async () => {
  const crop = (await createCrop({ pondId: ao1._id, startDate: "2026-01-01" })).body.data;
  await closeCrop(crop._id, { endDate: "2026-06-01" });
  expect((await updateCrop(crop._id, { cropName: "X", startDate: "2026-06-02" })).body.message).toBe(
    "Ngày kết thúc phải sau ngày bắt đầu!"
  );
});

test("xóa vụ trống / vụ có phiên", async () => {
  const empty = (await createCrop({ pondId: ao1._id })).body.data;
  const res = await deleteCrop(empty._id);
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Xóa vụ nuôi thành công!");
  expect((await Crop.findById(empty._id)).isDelete).toBe(true);

  const used = (await createCrop({ pondId: ao1._id })).body.data;
  await WeighSession.create({ sessionName: "P", crop: used._id, status: "closed" });
  expect((await deleteCrop(used._id)).body.message).toBe("Vụ đã có dữ liệu, không xóa được!");
});

test("id không tồn tại", async () => {
  expect((await closeCrop("khong-co")).body.message).toBe("Không tìm thấy dữ liệu!");
  expect((await reopenCrop("khong-co")).body.message).toBe("Không tìm thấy dữ liệu!");
  expect((await deleteCrop("khong-co")).body.message).toBe("Không tìm thấy dữ liệu!");
  expect((await updateCrop("khong-co", { cropName: "X" })).body.message).toBe("Không tìm thấy dữ liệu!");
});

test("danh sách: vụ mở trước, rồi ngày thả mới nhất; lọc theo ao và trạng thái", async () => {
  const old = (await createCrop({ pondId: ao1._id, startDate: "2025-01-01" })).body.data;
  await closeCrop(old._id, { endDate: "2025-06-01" });
  const newer = (await createCrop({ pondId: ao1._id, startDate: "2025-07-01" })).body.data;
  await closeCrop(newer._id, { endDate: "2025-12-01" });
  await createCrop({ pondId: ao2._id, startDate: "2026-01-01", cropName: "Mở ao 2" });

  const res = await getCrops();
  expect(res.body.message).toBe("Lấy danh sách vụ nuôi thành công!");
  expect(res.body.data.map((c) => c.cropName)).toEqual(["Mở ao 2", newer.cropName, old.cropName]);
  expect(res.body.data[0].pond.pondName).toBe("Ao 2");

  expect((await getCrops({ pondId: ao1._id })).body.data).toHaveLength(2);
  expect((await getCrops({ status: "open" })).body.data.map((c) => c.cropName)).toEqual(["Mở ao 2"]);
});

test("xóa vụ có khoản chi → Vụ đã có dữ liệu, không xóa được!", async () => {
  const Expense = require("../app/models/expense");
  const ExpenseCategory = require("../app/models/expenseCategory");
  const category = await ExpenseCategory.create({ categoryName: "Cám" });
  const crop = (await createCrop({ pondId: ao1._id })).body.data;
  await Expense.create({ date: new Date(), category: category._id, crop: crop._id, amount: 1000 });
  expect((await deleteCrop(crop._id)).body.message).toBe("Vụ đã có dữ liệu, không xóa được!");
});
