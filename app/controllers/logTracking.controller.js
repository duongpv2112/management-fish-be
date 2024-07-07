const logTrackingService = require("../services/logTracking.service");

// Lấy danh sách tất cả các log
const getLogTrackings = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };
  let queryParams = req.query.fishType;

  let result = await logTrackingService.getListLogTracking(queryParams);
  if (result) {
    response.data = result;
    response.message = "Lấy danh sách log thành công!";
  } else {
    response.success = false;
    response.message = "Lấy danh sách log không thành công!";
  }

  res.json(response);
};

// Tạo 1 log tracking
const createLogTrackings = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await logTrackingService.createLogTracking(req.body);
  if (result) {
    response.data = result;
    response.message = "Ghi log tracking thành công!";
  } else {
    response.success = false;
    response.message = "Ghi log tracking không thành công!";
  }

  res.json(response);
};

module.exports = {
  getLogTrackings,
  createLogTrackings,
};
