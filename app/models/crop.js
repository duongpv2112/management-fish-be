const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Schema = mongoose.Schema;

// Vụ nuôi của một ao: từ lúc thả giống đến lúc bán xong
const cropSchema = new Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    pond: {
      type: String,
      ref: "pond",
      required: true,
    },
    cropName: {
      type: String,
      required: true,
    },
    // Ngày lịch Việt Nam, lưu 00:00 UTC (xem app/common/dateOnly.js)
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
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

// Mỗi ao chỉ có một vụ đang nuôi (chặn cả khi hai request cùng bấm "Bắt đầu vụ")
cropSchema.index(
  { pond: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "open", isDelete: false } }
);

const Crop = mongoose.model("crop", cropSchema);

module.exports = Crop;
