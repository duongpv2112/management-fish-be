const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Schema = mongoose.Schema;

const basketTypeSchema = new Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    basketName: {
      type: String,
      required: true,
      unique: true,
    },
    basketWeight: {
      type: Number,
      required: true,
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

const BasketType = mongoose.model("basket-type", basketTypeSchema);

module.exports = BasketType;
