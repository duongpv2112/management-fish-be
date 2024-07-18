const FishType = require("../models/fishType");
const FishWeight = require("../models/fishWeight");

const LogTracking = require("../models/logTracking");
const logTrackingService = require("../services/logTracking.service");

const getListFishType = async () => {
  try {
    return await FishType.find();
  } catch (error) {
    let logTracking = new LogTracking({
      fishTypeName: "",
      stepName: `Có lỗi xảy ra khi lấy danh sách loại cá!`,
      data: error,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    console.log("Có lỗi xảy ra khi lấy danh sách loại cá", error);
  }
};

const getDataFish = async () => {
  try {
    let fishTypes = await FishType.find();
    let fishWeights = await FishWeight.find();
    const dataResult = [];
    fishTypes.forEach((fishType) => {
      let fishTypeClone = JSON.parse(JSON.stringify(fishType));
      fishTypeClone.fishWeights = fishWeights
        .filter(
          (fishWeight) =>
            fishWeight.fishType === fishType._id &&
            fishWeight.isDelete === false
        )
        .map((fishWeight) => fishWeight.fishWeight);
      dataResult.push(fishTypeClone);
    });
    return dataResult;
  } catch (error) {
    let logTracking = new LogTracking({
      fishTypeName: "",
      stepName: `Có lỗi xảy ra khi lấy dữ liệu bảng hiển thị!`,
      data: error,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    console.log("Có lỗi xảy ra khi lấy danh sách loại cá", error);
  }
};

const createFishType = async (fishTypeData) => {
  const fishType = new FishType();
  fishType.fishName = fishTypeData.fishName;

  try {
    let result = await fishType.save();
    let logTracking = new LogTracking({
      fishTypeName: "",
      stepName: `Thêm mới loại cá: '${fishTypeData.fishName}' thành công!`,
      data: result,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    return result;
  } catch (error) {
    let logTracking = new LogTracking({
      fishTypeName: "",
      stepName: `Thêm mới loại cá: '${fishTypeData.fishName}' không thành công!`,
      data: error,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    console.log("Có lỗi xảy ra khi thêm loại cá", error);
  }
};

module.exports = {
  getListFishType,
  createFishType,
  getDataFish,
};
