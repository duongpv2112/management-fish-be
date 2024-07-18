const fishTypeService = require("../services/fishType.service");

const getFishTypes = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await fishTypeService.getListFishType();
  if (result) {
    response.data = result;
    response.message = "Lấy danh sách loại cá thành công!";
  } else {
    response.success = false;
    response.message = "Lấy danh sách loại cá không thành công!";
  }

  res.json(response);
};

const getDataFish = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await fishTypeService.getDataFish();
  if (result) {
    response.data = result;
    response.message = "Lấy danh sách dữ liệu cá thành công!";
  } else {
    response.success = false;
    response.message = "Lấy danh sách dữ liệu cá không thành công!";
  }

  res.json(response);
};

const createFishTypes = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await fishTypeService.createFishType(req.body);
  if (result) {
    response.data = result;
    response.message = "Tạo loại cá thành công!";
  } else {
    response.success = false;
    response.message = "Tạo loại cá không thành công!";
  }

  res.json(response);
};

module.exports = {
  getFishTypes,
  createFishTypes,
  getDataFish
};
