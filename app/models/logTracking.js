const { json } = require("express");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Schema = mongoose.Schema;

const logTrackingSchema = new Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    fishTypeName: {
      type: String,
    },
    stepName: {
      type: String,
      required: true,
    },
    data: {
      type: Object,
      required: true,
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

const LogTracking = mongoose.model("log-tracking", logTrackingSchema);

module.exports = LogTracking;
