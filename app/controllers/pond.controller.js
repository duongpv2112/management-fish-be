const pondService = require("../services/pond.service");
const { sendResult } = require("../common/sendResult");

const getPonds = async (req, res) => {
  let result = await pondService.getListPond();
  sendResult(
    res,
    result ? { ok: true, data: result } : { ok: false },
    "Lấy danh sách ao thành công!",
    "Lấy danh sách ao không thành công!"
  );
};

const createPonds = async (req, res) => {
  sendResult(res, await pondService.createPond(req.body), "Tạo ao thành công!", "Tạo ao không thành công!");
};

const updatePonds = async (req, res) => {
  sendResult(
    res,
    await pondService.updatePond(req.params.pondId, req.body),
    "Cập nhật ao thành công!",
    "Cập nhật ao không thành công!"
  );
};

const deletePonds = async (req, res) => {
  sendResult(res, await pondService.deletePond(req.params.pondId), "Xóa ao thành công!", "Xóa ao không thành công!");
};

module.exports = {
  getPonds,
  createPonds,
  updatePonds,
  deletePonds,
};
