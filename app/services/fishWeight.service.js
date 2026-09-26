const FishWeight = require("../models/fishWeight");
const FishType = require("../models/fishType");
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
    if (!result) {
      let logTracking = new LogTracking({
        fishTypeName: "",
        stepName: `Xóa bản ghi cân cá: '${fishWeightId}' không thành công`,
        data: { fishWeightId, reason: "Không tìm thấy bản ghi cân cá" },
      });
      _ = await logTrackingService.createLogTracking(logTracking);
      return null;
    }
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

/**
 * Sửa một lần cân (loại cá, loại giỏ, số cân)
 * @returns {Promise<{ ok: true, data } | { ok: false, message }>}
 */
const updateFishWeight = async (fishWeightId, fishWeightData) => {
  const writeLog = async (fishTypeName, stepName, data) => {
    let logTracking = new LogTracking({ fishTypeName, stepName, data });
    _ = await logTrackingService.createLogTracking(logTracking);
  };
  const failStep = `Cập nhật bản ghi cân cá: '${fishWeightId}' không thành công`;

  try {
    const weightValue =
      fishWeightData?.fishWeight === null || fishWeightData?.fishWeight === ""
        ? NaN
        : Number(fishWeightData?.fishWeight);
    if (!Number.isFinite(weightValue) || weightValue <= 0) {
      const message = "Số cân cá phải là số dương!";
      await writeLog("", failStep, { message });
      return { ok: false, message };
    }

    const fishWeight = await FishWeight.findOne({ _id: fishWeightId, isDelete: false });
    if (!fishWeight) {
      const message = "Không tìm thấy bản ghi cân cá!";
      await writeLog("", failStep, { message });
      return { ok: false, message };
    }

    const fishType = await FishType.findOne({ _id: fishWeightData?.fishType, isDelete: false });
    if (!fishType) {
      const message = "Không tìm thấy loại cá!";
      await writeLog("", failStep, { message });
      return { ok: false, message };
    }

    fishWeight.fishType = fishType._id;
    fishWeight.fishWeight = weightValue;
    if (fishWeightData.basketType !== undefined) {
      fishWeight.basketType = fishWeightData.basketType;
    }
    let result = await (await fishWeight.save()).populate(["fishType", "basketType"]);
    await writeLog(
      result.fishType.fishName,
      `Cập nhật bản ghi cân cá: '${result.fishType.fishName}' thành công`,
      result
    );
    return { ok: true, data: result };
  } catch (error) {
    await writeLog("", failStep, error);
    console.log("Có lỗi xảy ra khi cập nhật cân cá", error);
    return { ok: false };
  }
};

module.exports = {
  getListFishWeight,
  createFishWeight,
  updateFishWeight,
  deleteFishWeight,
};
