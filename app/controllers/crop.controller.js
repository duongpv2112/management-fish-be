const cropService = require("../services/crop.service");
const { sendResult } = require("../common/sendResult");

const getCrops = async (req, res) => {
  let result = await cropService.getListCrop({ pondId: req.query.pondId, status: req.query.status });
  sendResult(
    res,
    result ? { ok: true, data: result } : { ok: false },
    "Lấy danh sách vụ nuôi thành công!",
    "Lấy danh sách vụ nuôi không thành công!"
  );
};

const createCrops = async (req, res) => {
  sendResult(
    res,
    await cropService.createCrop(req.body),
    "Bắt đầu vụ nuôi thành công!",
    "Bắt đầu vụ nuôi không thành công!"
  );
};

const updateCrops = async (req, res) => {
  sendResult(
    res,
    await cropService.updateCrop(req.params.cropId, req.body),
    "Cập nhật vụ nuôi thành công!",
    "Cập nhật vụ nuôi không thành công!"
  );
};

const closeCrops = async (req, res) => {
  sendResult(
    res,
    await cropService.closeCrop(req.params.cropId, req.body),
    "Kết thúc vụ nuôi thành công!",
    "Kết thúc vụ nuôi không thành công!"
  );
};

const reopenCrops = async (req, res) => {
  sendResult(
    res,
    await cropService.reopenCrop(req.params.cropId),
    "Mở lại vụ nuôi thành công!",
    "Mở lại vụ nuôi không thành công!"
  );
};

const deleteCrops = async (req, res) => {
  sendResult(
    res,
    await cropService.deleteCrop(req.params.cropId),
    "Xóa vụ nuôi thành công!",
    "Xóa vụ nuôi không thành công!"
  );
};

module.exports = {
  getCrops,
  createCrops,
  updateCrops,
  closeCrops,
  reopenCrops,
  deleteCrops,
};
