const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Schema = mongoose.Schema;

const fishWeightSchema = new Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    fishType: {
      type: String,
      ref: "fish-type",
      required: true,
    },
    fishWeight: {
      type: Number,
      required: true,
    },
    basketType: {
      type: String,
      ref: "basket-type",
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

const FishWeight = mongoose.model("fish-weight", fishWeightSchema);

module.exports = FishWeight;
