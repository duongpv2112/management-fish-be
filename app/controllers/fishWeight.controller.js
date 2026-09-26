const fishWeightService = require("../services/fishWeight.service");

const getFishWeights = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await fishWeightService.getListFishWeight();
  if (result) {
    response.data = result;
    response.message = "Lấy danh sách cân cá thành công!";
  } else {
    response.success = false;
    response.message = "Lấy danh sách cân cá không thành công!";
  }

  res.json(response);
};

const createFishWeights = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await fishWeightService.createFishWeight(req.body);
  if (result) {
    response.data = result;
    response.message = "Thêm cân cá thành công!";
  } else {
    response.success = false;
    response.message = "Thêm cân cá không thành công!";
  }

  res.json(response);
};

const deleteFishWeights = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await fishWeightService.deleteFishWeight(req.params.fishWeightId);
  if (result) {
    response.data = result;
    response.message = "Xóa cân cá thành công!";
  } else {
    response.success = false;
    response.message = "Xóa cân cá không thành công!";
  }

  res.json(response);
};

const updateFishWeights = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await fishWeightService.updateFishWeight(req.params.fishWeightId, req.body);
  if (result.ok) {
    response.data = result.data;
    response.message = "Cập nhật cân cá thành công!";
  } else {
    response.success = false;
    response.message = result.message || "Cập nhật cân cá không thành công!";
  }

  res.json(response);
};

module.exports = {
  getFishWeights,
  createFishWeights,
  updateFishWeights,
  deleteFishWeights,
};
