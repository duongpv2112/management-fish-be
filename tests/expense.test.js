const request = require("supertest");
const app = require("../app");
const { authHeader } = require("./helpers/auth");
const Pond = require("../app/models/pond");
const Crop = require("../app/models/crop");
const ExpenseCategory = require("../app/models/expenseCategory");
const Expense = require("../app/models/expense");
const LogTracking = require("../app/models/logTracking");
const { toDateOnly } = require("../app/common/dateOnly");

const base = "/api/expenses";
const create = (body) => request(app).post(`${base}/createExpenses`).set(authHeader()).send(body);
const update = (id, body) => request(app).put(`${base}/updateExpenses/${id}`).set(authHeader()).send(body);
const remove = (id) => request(app).delete(`${base}/deleteExpenses/${id}`).set(authHeader());
const list = (query = {}) => request(app).get(`${base}/getExpenses`).query(query).set(authHeader());
const suggestions = (categoryId) =>
  request(app).get(`${base}/getExpenseSuggestions`).query({ categoryId }).set(authHeader());

let crop;
let closedCrop;
let cam;
let dien;

beforeEach(async () => {
  const pond = await Pond.create({ pondName: "Ao 1" });
  crop = await Crop.create({ pond: pond._id, cropName: "Ao 1 · Vụ 09/2026", startDate: new Date("2026-09-01") });
  closedCrop = await Crop.create({
    pond: pond._id,
    cropName: "Vụ cũ",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-06-01"),
    status: "closed",
  });
  cam = await ExpenseCategory.create({ categoryName: "Cám", metric: "feed" });
  dien = await ExpenseCategory.create({ categoryName: "Điện" });
});

test("số lượng × đơn giá → tự tính, bỏ qua amount gửi lên", async () => {
  const res = await create({ categoryId: cam._id, cropId: crop._id, quantity: 10, unitPrice: 350000, amount: 1, unit: "bao" });
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Thêm khoản chi thành công!");
  expect(res.body.data.amount).toBe(3500000);
  expect(res.body.data.crop).toBe(crop._id);
  expect(await LogTracking.countDocuments({ stepName: /Thêm khoản chi/ })).toBe(1);
});

test("số lượng lẻ làm tròn về đồng", async () => {
  const res = await create({ categoryId: cam._id, quantity: 2.5, unitPrice: 350500 });
  expect(res.body.data.amount).toBe(876250);
});

test.each([{ quantity: 3 }, { unitPrice: 5000 }])("thiếu một trong hai (%j) → dùng số tiền nhập tay", async (extra) => {
  const res = await create({ categoryId: dien._id, amount: 120000.4, ...extra });
  expect(res.body.success).toBe(true);
  expect(res.body.data.amount).toBe(120000);
});

test.each([{}, { amount: 0 }, { amount: -5 }, { amount: "abc" }])("không có tiền (%j)", async (extra) => {
  expect((await create({ categoryId: dien._id, ...extra })).body.message).toBe("Số tiền phải lớn hơn 0!");
});

test("số không hợp lệ và dữ liệu không tồn tại", async () => {
  expect((await create({ categoryId: cam._id, quantity: 0, unitPrice: 1 })).body.message).toBe("Số lượng không hợp lệ!");
  expect((await create({ categoryId: cam._id, quantity: 1, unitPrice: -1 })).body.message).toBe("Đơn giá không hợp lệ!");
  expect((await create({ categoryId: cam._id, amount: 1, kgPerUnit: 0 })).body.message).toBe(
    "Số kg mỗi đơn vị không hợp lệ!"
  );
  expect((await create({ categoryId: cam._id, amount: 1, date: "abc" })).body.message).toBe("Ngày không hợp lệ!");
  expect((await create({ categoryId: "khong-co", amount: 1 })).body.message).toBe("Không tìm thấy dữ liệu!");
  expect((await create({ categoryId: cam._id, cropId: "khong-co", amount: 1 })).body.message).toBe(
    "Không tìm thấy dữ liệu!"
  );
  expect(await Expense.countDocuments()).toBe(0);
});

test("cropId rỗng → khoản chung; ngày bỏ trống → hôm nay", async () => {
  const res = await create({ categoryId: dien._id, cropId: "", amount: 600000 });
  expect(res.body.data.crop).toBeNull();
  expect(res.body.data.date).toBe(toDateOnly().toISOString());
});

test("gắn được vào vụ đã kết thúc", async () => {
  const res = await create({ categoryId: cam._id, cropId: closedCrop._id, amount: 100000, date: "2026-06-15" });
  expect(res.body.success).toBe(true);
  expect(res.body.data.crop).toBe(closedCrop._id);
  expect(res.body.data.date).toBe("2026-06-15T00:00:00.000Z");
});

test("sửa: đổi tiền/nhóm/vụ, tính lại amount", async () => {
  const created = (await create({ categoryId: dien._id, amount: 100000 })).body.data;
  const res = await update(created._id, { categoryId: cam._id, cropId: crop._id, quantity: 4, unitPrice: 25000 });
  expect(res.body.message).toBe("Cập nhật khoản chi thành công!");
  const saved = await Expense.findById(created._id);
  expect(saved.amount).toBe(100000);
  expect(saved.category).toBe(cam._id);
  expect(saved.crop).toBe(crop._id);
  expect((await update("khong-co", { categoryId: cam._id, amount: 1 })).body.message).toBe("Không tìm thấy dữ liệu!");
});

test("xóa mềm", async () => {
  const created = (await create({ categoryId: dien._id, amount: 100000 })).body.data;
  expect((await remove(created._id)).body.message).toBe("Xóa khoản chi thành công!");
  expect((await Expense.findById(created._id)).isDelete).toBe(true);
  expect((await list()).body.data.items).toHaveLength(0);
  expect((await remove(created._id)).body.message).toBe("Không tìm thấy dữ liệu!");
});

test("danh sách lọc và phân trang", async () => {
  await create({ categoryId: cam._id, cropId: crop._id, amount: 300, date: "2026-09-05" });
  await create({ categoryId: dien._id, cropId: crop._id, amount: 200, date: "2026-09-10" });
  await create({ categoryId: dien._id, amount: 100, date: "2026-09-20" });

  let res = await list();
  expect(res.body.message).toBe("Lấy danh sách khoản chi thành công!");
  expect(res.body.data.items.map((e) => e.amount)).toEqual([100, 200, 300]);
  expect(res.body.data).toMatchObject({ total: 3, totalAmount: 600, page: 1, pageSize: 20 });
  expect(res.body.data.items[1].category.categoryName).toBe("Điện");
  expect(res.body.data.items[1].crop.pond.pondName).toBe("Ao 1");

  expect((await list({ cropId: crop._id })).body.data.total).toBe(2);
  expect((await list({ common: 1 })).body.data.items.map((e) => e.amount)).toEqual([100]);
  expect((await list({ categoryId: dien._id })).body.data.totalAmount).toBe(300);
  expect((await list({ from: "2026-09-10", to: "2026-09-20" })).body.data.totalAmount).toBe(300);

  res = await list({ page: 2, pageSize: 1 });
  expect(res.body.data.items.map((e) => e.amount)).toEqual([200]);
  expect(res.body.data).toMatchObject({ total: 3, totalAmount: 600, page: 2, pageSize: 1 });
  expect((await list({ pageSize: 500 })).body.data.pageSize).toBe(100);
});

test("nhóm chi đã xóa vẫn hiện tên ở khoản chi cũ", async () => {
  await create({ categoryId: dien._id, amount: 100 });
  await ExpenseCategory.updateOne({ _id: dien._id }, { isDelete: true });
  expect((await list()).body.data.items[0].category.categoryName).toBe("Điện");
});

test("gợi ý mô tả: khác nhau, mới nhất trước, kèm đơn vị của lần gần nhất", async () => {
  await create({ categoryId: cam._id, description: "Cám A", unit: "kg", amount: 1, date: "2026-09-01" });
  await create({ categoryId: cam._id, description: "Cám B", amount: 1, date: "2026-09-02" });
  await create({ categoryId: cam._id, description: "Cám A", unit: "bao", kgPerUnit: 25, quantity: 1, unitPrice: 350000, date: "2026-09-03" });
  await create({ categoryId: cam._id, description: "", amount: 1, date: "2026-09-04" });
  await create({ categoryId: dien._id, description: "Tiền điện", amount: 1 });

  const res = await suggestions(cam._id);
  expect(res.body.message).toBe("Lấy gợi ý thành công!");
  expect(res.body.data.map((s) => s.description)).toEqual(["Cám A", "Cám B"]);
  expect(res.body.data[0]).toMatchObject({ unit: "bao", kgPerUnit: 25, unitPrice: 350000 });
});

test("sửa khoản chi có nhóm chi đã xóa: giữ nhóm cũ được, đổi sang nhóm đã xóa khác thì không", async () => {
  const created = (await create({ categoryId: dien._id, amount: 100000 })).body.data;
  await ExpenseCategory.updateOne({ _id: dien._id }, { isDelete: true });
  const res = await update(created._id, { categoryId: dien._id, amount: 150000 });
  expect(res.body.success).toBe(true);
  expect((await Expense.findById(created._id)).amount).toBe(150000);

  const other = (await create({ categoryId: cam._id, amount: 1 })).body.data;
  expect((await update(other._id, { categoryId: dien._id, amount: 1 })).body.message).toBe("Không tìm thấy dữ liệu!");
});
