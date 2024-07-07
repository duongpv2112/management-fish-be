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
  if (result) {
    response.data = result;
    response.message = "Tạo loại giỏ thành công!";
  } else {
    response.success = false;
    response.message = "Tạo loại giỏ không thành công!";
  }

  res.json(response);
};

module.exports = {
  getBasketTypes,
  createBasketTypes,
};
