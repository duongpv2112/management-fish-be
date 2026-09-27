const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { CURRENCIES, DEFAULT_CURRENCY } = require("../config/currency");
const Schema = mongoose.Schema;

const priceSchema = new Schema(
  {
    fishType: {
      type: String,
      ref: "fish-type",
      required: true,
    },
    // Đơn giá cho mỗi kg, tính theo loại tiền của phiên (currency)
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const weighSessionSchema = new Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    sessionName: {
      type: String,
      required: true,
    },
    buyerName: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    closedAt: {
      type: Date,
    },
    // Loại tiền của bảng giá phiên; đổi loại tiền thì bảng giá bị xóa
    currency: {
      type: String,
      enum: Object.keys(CURRENCIES),
      default: DEFAULT_CURRENCY,
    },
    prices: {
      type: [priceSchema],
      default: [],
    },
    note: {
      type: String,
      default: "",
    },
    // Vụ nuôi (của một ao) mà phiên bán này thuộc về; null = chưa chọn ao
    crop: {
      type: String,
      ref: "crop",
      default: null,
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

// Tại mỗi thời điểm chỉ có một phiên đang mở (chặn cả khi hai tab cùng bấm "Phiên mới")
weighSessionSchema.index(
  { status: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);

const WeighSession = mongoose.model("weigh-session", weighSessionSchema);

module.exports = WeighSession;
