module.exports = {
  _id: {
    type: String,
    default: uuidv4,
  },
  fishName: {
    type: String,
    required: true,
    unique: true,
  },
  fishWeights: {
    type: Array,
  },
  createdBy: {
    type: String,
    default: "admin",
  },
  modifiedBy: {
    type: String,
    default: "admin",
  },
};
