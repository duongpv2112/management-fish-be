const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Schema = mongoose.Schema;

const priceSchema = new Schema(
  {
    fishType: {
      type: String,
      ref: "fish-type",
      required: true,
    },
    // Đơn giá VND/kg
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
    prices: {
      type: [priceSchema],
      default: [],
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

// Tại mỗi thời điểm chỉ có một phiên đang mở (chặn cả khi hai tab cùng bấm "Phiên mới")
weighSessionSchema.index(
  { status: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);

const WeighSession = mongoose.model("weigh-session", weighSessionSchema);

module.exports = WeighSession;
