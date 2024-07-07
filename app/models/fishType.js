const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Schema = mongoose.Schema;

const fishTypeSchema = new Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    fishName: {
      type: String,
      required: true,
      unique: true,
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

const FishType = mongoose.model("fish-type", fishTypeSchema);

module.exports = FishType;
