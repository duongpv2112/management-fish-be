// Tạo các nhóm chi mặc định nếu chưa có (so tên không phân biệt hoa thường, kể cả nhóm đã xóa mềm:
// nhóm người dùng đã xóa thì không tạo lại). Chạy lại nhiều lần vẫn cho cùng kết quả.
//   npm run migrate:expense-categories -- --dry-run   # chỉ in những nhóm sẽ tạo
//   npm run migrate:expense-categories
const ExpenseCategory = require("../app/models/expenseCategory");

const DEFAULT_EXPENSE_CATEGORIES = [
  { categoryName: "Giống", metric: "seed" },
  { categoryName: "Cám", metric: "feed" },
  { categoryName: "Thuốc/hóa chất", metric: "none" },
  { categoryName: "Điện", metric: "none" },
  { categoryName: "Nhân công", metric: "none" },
  { categoryName: "Khác", metric: "none" },
];

/**
 * @param {{ dryRun: boolean }} options
 * @returns {Promise<{ created: string[] }>}
 */
const seedExpenseCategories = async ({ dryRun }) => {
  const existing = new Set(
    (await ExpenseCategory.find()).map((category) => category.categoryName.trim().toLowerCase())
  );
  const missing = DEFAULT_EXPENSE_CATEGORIES.filter(
    (category) => !existing.has(category.categoryName.toLowerCase())
  );

  console.log(
    missing.length > 0
      ? `Nhóm chi sẽ tạo: ${missing.map((category) => category.categoryName).join(", ")}`
      : "Đã có đủ nhóm chi mặc định"
  );
  if (!dryRun) {
    // Tạo lần lượt để createdAt giữ đúng thứ tự hiển thị
    for (const category of missing) await ExpenseCategory.create(category);
  }
  return { created: missing.map((category) => category.categoryName) };
};

if (require.main === module) {
  require("dotenv").config();
  const mongoose = require("mongoose");
  const { buildDbURI } = require("../app/config/database");
  const dryRun = process.argv.includes("--dry-run");

  mongoose
    .connect(buildDbURI())
    .then(() => seedExpenseCategories({ dryRun }))
    .then(() => mongoose.disconnect())
    .catch(async (error) => {
      console.error("Tạo nhóm chi mặc định thất bại:", error);
      await mongoose.disconnect();
      process.exit(1);
    });
}

module.exports = { seedExpenseCategories, DEFAULT_EXPENSE_CATEGORIES };
