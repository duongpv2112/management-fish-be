const ExpenseCategory = require("../app/models/expenseCategory");
const { seedExpenseCategories, DEFAULT_EXPENSE_CATEGORIES } = require("../scripts/seed-expense-categories");

const NAMES = ["Giống", "Cám", "Thuốc/hóa chất", "Điện", "Nhân công", "Khác"];

beforeEach(() => jest.spyOn(console, "log").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

test("DB trống → tạo 6 nhóm theo thứ tự, Giống seed, Cám feed", async () => {
  expect(DEFAULT_EXPENSE_CATEGORIES.map((c) => c.categoryName)).toEqual(NAMES);
  const { created } = await seedExpenseCategories({ dryRun: false });
  expect(created).toEqual(NAMES);
  const saved = await ExpenseCategory.find().sort({ createdAt: 1 });
  expect(saved.map((c) => c.categoryName)).toEqual(NAMES);
  expect(saved[0].metric).toBe("seed");
  expect(saved[1].metric).toBe("feed");
  expect(saved[2].metric).toBe("none");
});

test("chạy lần hai không tạo thêm", async () => {
  await seedExpenseCategories({ dryRun: false });
  expect((await seedExpenseCategories({ dryRun: false })).created).toEqual([]);
  expect(await ExpenseCategory.countDocuments()).toBe(6);
});

test("đã có 'cám' (chữ thường) → không tạo Cám lần nữa", async () => {
  await ExpenseCategory.create({ categoryName: "cám" });
  const { created } = await seedExpenseCategories({ dryRun: false });
  expect(created).toHaveLength(5);
  expect(created).not.toContain("Cám");
});

test("dryRun không ghi gì", async () => {
  expect((await seedExpenseCategories({ dryRun: true })).created).toEqual(NAMES);
  expect(await ExpenseCategory.countDocuments()).toBe(0);
});
