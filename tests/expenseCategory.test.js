const request = require("supertest");
const app = require("../app");
const { authHeader } = require("./helpers/auth");
const ExpenseCategory = require("../app/models/expenseCategory");
const LogTracking = require("../app/models/logTracking");

const base = "/api/expense-categories";
const create = (body) => request(app).post(`${base}/createExpenseCategories`).set(authHeader()).send(body);
const update = (id, body) => request(app).put(`${base}/updateExpenseCategories/${id}`).set(authHeader()).send(body);
const remove = (id) => request(app).delete(`${base}/deleteExpenseCategories/${id}`).set(authHeader());
const list = () => request(app).get(`${base}/getExpenseCategories`).set(authHeader());

test("thêm nhóm chi, tên được trim, metric mặc định none", async () => {
  const res = await create({ categoryName: " Xăng dầu " });
  expect(res.body.success).toBe(true);
  expect(res.body.message).toBe("Tạo nhóm chi thành công!");
  expect(res.body.data.categoryName).toBe("Xăng dầu");
  expect(res.body.data.metric).toBe("none");
  expect(await LogTracking.countDocuments({ stepName: /Thêm mới nhóm chi/ })).toBe(1);
});

test("metric không hợp lệ", async () => {
  expect((await create({ categoryName: "A", metric: "abc" })).body.message).toBe("Nhóm dùng để tính không hợp lệ!");
  const category = await ExpenseCategory.create({ categoryName: "B" });
  expect((await update(category._id, { categoryName: "B", metric: "abc" })).body.message).toBe(
    "Nhóm dùng để tính không hợp lệ!"
  );
});

test("tên rỗng", async () => {
  expect((await create({ categoryName: " " })).body.message).toBe("Tên nhóm chi không được để trống!");
});

test("trùng tên khác hoa thường", async () => {
  await ExpenseCategory.create({ categoryName: "Cám" });
  const other = await ExpenseCategory.create({ categoryName: "Điện" });
  expect((await create({ categoryName: "CÁM" })).body.message).toBe("Tên nhóm chi đã tồn tại!");
  expect((await update(other._id, { categoryName: "cám" })).body.message).toBe("Tên nhóm chi đã tồn tại!");
});

test("sửa đổi được metric", async () => {
  const category = await ExpenseCategory.create({ categoryName: "Cám" });
  const res = await update(category._id, { categoryName: "Cám viên", metric: "feed" });
  expect(res.body.message).toBe("Cập nhật nhóm chi thành công!");
  const saved = await ExpenseCategory.findById(category._id);
  expect(saved.categoryName).toBe("Cám viên");
  expect(saved.metric).toBe("feed");
});

test("xóa mềm rồi thêm lại → khôi phục cùng _id", async () => {
  const category = await ExpenseCategory.create({ categoryName: "Cám", metric: "feed" });
  expect((await remove(category._id)).body.message).toBe("Xóa nhóm chi thành công!");
  expect((await list()).body.data).toHaveLength(0);
  const res = await create({ categoryName: "cám", metric: "feed" });
  expect(res.body.data._id).toBe(category._id);
  expect(await LogTracking.countDocuments({ stepName: /Khôi phục nhóm chi/ })).toBe(1);
});

test("danh sách theo thứ tự tạo", async () => {
  await create({ categoryName: "Giống", metric: "seed" });
  await create({ categoryName: "Cám", metric: "feed" });
  const res = await list();
  expect(res.body.message).toBe("Lấy danh sách nhóm chi thành công!");
  expect(res.body.data.map((c) => c.categoryName)).toEqual(["Giống", "Cám"]);
});

test("id không tồn tại", async () => {
  expect((await update("khong-co", { categoryName: "X" })).body.message).toBe("Không tìm thấy dữ liệu!");
  expect((await remove("khong-co")).body.message).toBe("Không tìm thấy dữ liệu!");
});
