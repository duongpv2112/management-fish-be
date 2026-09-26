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

  let result = await fishTypeService.getDataFish(req.query.sessionId);
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
  if (result.ok) {
    response.data = result.data;
    response.message = "Tạo loại cá thành công!";
  } else {
    response.success = false;
    response.message = result.message || "Tạo loại cá không thành công!";
  }

  res.json(response);
};

const updateFishTypes = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await fishTypeService.updateFishType(req.params.fishTypeId, req.body);
  if (result.ok) {
    response.data = result.data;
    response.message = "Cập nhật loại cá thành công!";
  } else {
    response.success = false;
    response.message = result.message || "Cập nhật loại cá không thành công!";
  }

  res.json(response);
};

const deleteFishTypes = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await fishTypeService.deleteFishType(req.params.fishTypeId);
  if (result.ok) {
    response.data = result.data;
    response.message = "Xóa loại cá thành công!";
  } else {
    response.success = false;
    response.message = result.message || "Xóa loại cá không thành công!";
  }

  res.json(response);
};

module.exports = {
  getFishTypes,
  createFishTypes,
  updateFishTypes,
  deleteFishTypes,
  getDataFish
};
