const basketTypeService = require("../services/basketType.service");

const getBasketTypes = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await basketTypeService.getListBasketType();
  if (result) {
    response.data = result;
    response.message = "Lấy danh sách loại giỏ thành công!";
  } else {
    response.success = false;
    response.message = "Lấy danh sách loại giỏ không thành công!";
  }

  res.json(response);
};

const createBasketTypes = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await basketTypeService.createBasketType(req.body);
  if (result.ok) {
    response.data = result.data;
    response.message = "Tạo loại giỏ thành công!";
  } else {
    response.success = false;
    response.message = result.message || "Tạo loại giỏ không thành công!";
  }

  res.json(response);
};

const updateBasketTypes = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await basketTypeService.updateBasketType(req.params.basketTypeId, req.body);
  if (result.ok) {
    response.data = result.data;
    response.message = "Cập nhật loại giỏ thành công!";
  } else {
    response.success = false;
    response.message = result.message || "Cập nhật loại giỏ không thành công!";
  }

  res.json(response);
};

const deleteBasketTypes = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await basketTypeService.deleteBasketType(req.params.basketTypeId);
  if (result.ok) {
    response.data = result.data;
    response.message = "Xóa loại giỏ thành công!";
  } else {
    response.success = false;
    response.message = result.message || "Xóa loại giỏ không thành công!";
  }

  res.json(response);
};

module.exports = {
  getBasketTypes,
  createBasketTypes,
  updateBasketTypes,
  deleteBasketTypes,
};
