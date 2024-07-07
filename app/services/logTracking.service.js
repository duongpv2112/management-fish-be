const LogTracking = require("../models/logTracking");

const getListLogTracking = async (fishTypeQuery) => {
  try {
    if (fishTypeQuery && fishTypeQuery != "") {
      return await LogTracking.find({ fishTypeName: fishTypeQuery });
    }

    return await LogTracking.find();
  } catch (error) {
    console.log("Có lỗi xảy ra khi lấy danh sách log", error);
  }
};

const createLogTracking = async (logTrackingData) => {
  const logTracking = new LogTracking();
  logTracking.fishTypeName = logTrackingData.fishTypeName;
  logTracking.stepName = logTrackingData.stepName;
  logTracking.data = logTrackingData.data;

  try {
    return await logTracking.save();
  } catch (error) {
    console.log("Có lỗi xảy ra khi thêm log", error);
  }
};

module.exports = {
  getListLogTracking,
  createLogTracking,
};
