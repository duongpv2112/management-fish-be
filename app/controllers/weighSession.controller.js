const weighSessionService = require("../services/weighSession.service");

const getWeighSessions = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await weighSessionService.getListWeighSession();
  if (result) {
    response.data = result;
    response.message = "Lấy danh sách phiên cân thành công!";
  } else {
    response.success = false;
    response.message = "Lấy danh sách phiên cân không thành công!";
  }

  res.json(response);
};

const getOpenWeighSession = async (req, res) => {
  let response = {
    success: true,
    data: null,
    message: "",
  };

  let result = await weighSessionService.getOpenWeighSession();
  if (result.ok) {
    response.data = result.data;
    response.message = "Lấy phiên cân đang mở thành công!";
  } else {
    response.success = false;
    response.message = "Lấy phiên cân đang mở không thành công!";
  }

  res.json(response);
};

const createWeighSessions = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await weighSessionService.createWeighSession(req.body);
  if (result.ok) {
    response.data = result.data;
    response.message = "Tạo phiên cân thành công!";
  } else {
    response.success = false;
    response.message = result.message || "Tạo phiên cân không thành công!";
  }

  res.json(response);
};

const closeWeighSessions = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await weighSessionService.closeWeighSession(req.params.sessionId);
  if (result.ok) {
    response.data = result.data;
    response.message = "Kết thúc phiên cân thành công!";
  } else {
    response.success = false;
    response.message = result.message || "Kết thúc phiên cân không thành công!";
  }

  res.json(response);
};

const updateSessionPrices = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await weighSessionService.updateSessionPrices(req.params.sessionId, req.body?.prices);
  if (result.ok) {
    response.data = result.data;
    response.message = "Cập nhật giá phiên thành công!";
  } else {
    response.success = false;
    response.message = result.message || "Cập nhật giá phiên không thành công!";
  }

  res.json(response);
};

const updateSessionCurrency = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await weighSessionService.updateSessionCurrency(req.params.sessionId, req.body?.currency);
  if (result.ok) {
    response.data = result.data;
    response.message = "Đổi loại tiền thành công!";
  } else {
    response.success = false;
    response.message = result.message || "Đổi loại tiền không thành công!";
  }

  res.json(response);
};

const updateSessionCrop = async (req, res) => {
  let response = {
    success: true,
    data: [],
    message: "",
  };

  let result = await weighSessionService.updateSessionCrop(req.params.sessionId, req.body?.cropId);
  if (result.ok) {
    response.data = result.data;
    response.message = "Cập nhật ao cho phiên thành công!";
  } else {
    response.success = false;
    response.message = result.message || "Cập nhật ao cho phiên không thành công!";
  }

  res.json(response);
};

const getSessionSummary = async (req, res) => {
  let response = {
    success: true,
    data: null,
    message: "",
  };

  let result = await weighSessionService.getSessionSummary(req.params.sessionId);
  if (result.ok) {
    response.data = result.data;
    response.message = "Lấy tổng hợp phiên cân thành công!";
  } else {
    response.success = false;
    response.message = result.message || "Lấy tổng hợp phiên cân không thành công!";
  }

  res.json(response);
};

module.exports = {
  getSessionSummary,
  getWeighSessions,
  getOpenWeighSession,
  createWeighSessions,
  closeWeighSessions,
  updateSessionPrices,
  updateSessionCurrency,
  updateSessionCrop,
};
