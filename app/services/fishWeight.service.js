const FishWeight = require("../models/fishWeight");
const LogTracking = require("../models/logTracking");
const logTrackingService = require("../services/logTracking.service");

const getListFishWeight = async () => {
  try {
    return await FishWeight.find({ isDelete: false }).populate([
      "fishType",
      "basketType",
    ]);
  } catch (error) {
    let logTracking = new LogTracking({
      fishTypeName: "",
      stepName: `Có lỗi xảy ra khi lấy danh sách cân cá!`,
      data: error,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    console.log("Có lỗi xảy ra khi lấy danh sách cân cá", error);
  }
};

const createFishWeight = async (fishWeightData) => {
  const fishWeight = new FishWeight();
  fishWeight.fishType = fishWeightData.fishType;
  fishWeight.fishWeight = fishWeightData.fishWeight;
  fishWeight.basketType = fishWeightData.basketType;

  try {
    let result = await (await fishWeight.save()).populate(["fishType", "basketType"]);
    let logTracking = new LogTracking({
      fishTypeName: result.fishType.fishName,
      stepName: `Thêm mới bản ghi cân cá: '${result.fishType.fishName}' thành công`,
      data: result,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    return result;
  } catch (error) {
    let logTracking = new LogTracking({
      fishTypeName: "",
      stepName: `Thêm mới bản ghi cân cá: '${fishWeightData.fishType}' không thành công`,
      data: error,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    console.log("Có lỗi xảy ra khi thêm cân cá", error);
  }
};

const deleteFishWeight = async (fishWeightId) => {
  try {
    let result = await FishWeight.findByIdAndUpdate(
      fishWeightId,
      { isDelete: true },
      { new: true }
    ).populate(["fishType", "basketType"]);
    let logTracking = new LogTracking({
      fishTypeName: result.fishType.fishName,
      stepName: `Xóa bản ghi cân cá: '${result.fishType.fishName}' thành công`,
      data: result,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    return result;
  } catch (error) {
    let logTracking = new LogTracking({
      fishTypeName: "",
      stepName: `Xóa bản ghi cân cá: '${fishWeightId}' không thành công`,
      data: error,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    console.log("Có lỗi xảy ra khi xóa cân cá", error);
  }
};

module.exports = {
  getListFishWeight,
  createFishWeight,
  deleteFishWeight,
};
