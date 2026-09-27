const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Schema = mongoose.Schema;

const pondSchema = new Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    pondName: {
      type: String,
      required: true,
      unique: true,
    },
    // Diện tích (m²), không bắt buộc
    area: {
      type: Number,
      default: null,
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

const Pond = mongoose.model("pond", pondSchema);

module.exports = Pond;
