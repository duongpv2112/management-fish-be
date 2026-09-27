const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Schema = mongoose.Schema;

// Chỉ số báo cáo vụ dùng nhóm này để tính: số con giống / lượng thức ăn
const EXPENSE_METRICS = ["seed", "feed", "none"];

const expenseCategorySchema = new Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    categoryName: {
      type: String,
      required: true,
      unique: true,
    },
    metric: {
      type: String,
      enum: EXPENSE_METRICS,
      default: "none",
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      default: "admin",
    },
    modifiedBy: {
      type: String,
      default: "admin",
    },
  },
  { timestamps: true }
);

const ExpenseCategory = mongoose.model("expense-category", expenseCategorySchema);

module.exports = ExpenseCategory;
module.exports.EXPENSE_METRICS = EXPENSE_METRICS;
