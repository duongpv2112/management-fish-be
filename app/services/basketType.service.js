const BasketType = require("../models/basketType");
const LogTracking = require("../models/logTracking");
const logTrackingService = require("../services/logTracking.service");

const getListBasketType = async () => {
  try {
    return await BasketType.find();
  } catch (error) {
    let logTracking = new LogTracking({
      fishTypeName: "",
      stepName: `Có lỗi xảy ra lấy danh sách loại giỏ!`,
      data: error,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    console.log("Có lỗi xảy ra lấy danh sách loại giỏ", error);
  }
};

const createBasketType = async (basketTypeData) => {
  const basketType = new BasketType();
  basketType.basketName = basketTypeData.basketName;
  basketType.basketWeight = basketTypeData.basketWeight;

  try {
    let result = await basketType.save();
    let logTracking = new LogTracking({
      fishTypeName: "",
      stepName: `Thêm mới loại giỏ: '${basketTypeData.basketName}' thành công`,
      data: result,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    return result;
  } catch (error) {
    let logTracking = new LogTracking({
      fishTypeName: "",
      stepName: `Thêm mới loại giỏ: '${basketTypeData.basketName}' không thành công`,
      data: error,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    console.log("Có lỗi xảy ra khi thêm loại giỏ", error);
  }
};

module.exports = {
  getListBasketType,
  createBasketType,
};
