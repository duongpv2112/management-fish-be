const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Schema = mongoose.Schema;

// Một khoản chi (VND) của một vụ nuôi, hoặc chi phí chung khi crop = null
const expenseSchema = new Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    // Ngày lịch Việt Nam, lưu 00:00 UTC (xem app/common/dateOnly.js)
    date: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
      ref: "expense-category",
      required: true,
    },
    crop: {
      type: String,
      ref: "crop",
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    quantity: {
      type: Number,
      default: null,
    },
    unit: {
      type: String,
      default: "",
    },
    unitPrice: {
      type: Number,
      default: null,
    },
    // Số kg của một đơn vị (vd. 25 kg/bao), dùng để quy đổi thức ăn ra kg
    kgPerUnit: {
      type: Number,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      default: "",
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

const Expense = mongoose.model("expense", expenseSchema);

module.exports = Expense;
