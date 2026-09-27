const Pond = require("../models/pond");
const Crop = require("../models/crop");
const LogTracking = require("../models/logTracking");
const logTrackingService = require("../services/logTracking.service");

const MESSAGE_EMPTY_NAME = "Tên ao không được để trống!";
const MESSAGE_DUPLICATE_NAME = "Tên ao đã tồn tại!";
const MESSAGE_INVALID_AREA = "Diện tích ao không hợp lệ!";
const MESSAGE_NOT_FOUND = "Không tìm thấy dữ liệu!";
const MESSAGE_HAS_OPEN_CROP = "Ao đang có vụ nuôi, hãy kết thúc vụ trước!";

// Giá trị "không hợp lệ" để phân biệt với null (bỏ trống)
const INVALID = Symbol("invalid");

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// So sánh tên sau khi trim, không phân biệt hoa thường
const nameFilter = (name) => ({
  pondName: new RegExp(`^${escapeRegExp(name)}$`, "i"),
});

// Diện tích bỏ trống → null; có nhập thì phải là số > 0
const parseArea = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const area = Number(value);
  if (!Number.isFinite(area) || area <= 0) return INVALID;
  return area;
};

const writeLog = async (stepName, data) => {
  let logTracking = new LogTracking({
    fishTypeName: "",
    stepName: stepName,
    data: data,
  });
  _ = await logTrackingService.createLogTracking(logTracking);
};

const readInput = (pondData) => ({
  pondName: (pondData?.pondName ?? "").toString().trim(),
  area: parseArea(pondData?.area),
  note: (pondData?.note ?? "").toString().trim(),
});

// Kiểm tra dữ liệu đầu vào chung cho thêm/sửa; trả message lỗi hoặc null
const validatePond = ({ pondName, area }) => {
  if (!pondName) return MESSAGE_EMPTY_NAME;
  if (area === INVALID) return MESSAGE_INVALID_AREA;
  return null;
};

const getListPond = async () => {
  try {
    return await Pond.find({ isDelete: false }).sort({ createdAt: 1 });
  } catch (error) {
    await writeLog("Có lỗi xảy ra lấy danh sách ao!", error);
    console.log("Có lỗi xảy ra lấy danh sách ao", error);
  }
};

/**
 * Thêm ao. Nếu đã có ao cùng tên nhưng đã xóa mềm thì khôi phục bản ghi cũ.
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const createPond = async (pondData) => {
  const input = readInput(pondData);

  try {
    const invalidMessage = validatePond(input);
    if (invalidMessage) {
      await writeLog(`Thêm mới ao: '${input.pondName}' không thành công`, { message: invalidMessage });
      return { ok: false, message: invalidMessage };
    }

    const existed = await Pond.findOne({ ...nameFilter(input.pondName), isDelete: false });
    if (existed) {
      await writeLog(`Thêm mới ao: '${input.pondName}' không thành công`, { message: MESSAGE_DUPLICATE_NAME });
      return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    }

    const deleted = await Pond.findOne({ ...nameFilter(input.pondName), isDelete: true });
    if (deleted) {
      Object.assign(deleted, input, { isDelete: false });
      let result = await deleted.save();
      await writeLog(`Khôi phục ao: '${input.pondName}' thành công`, result);
      return { ok: true, data: result };
    }

    let result = await Pond.create(input);
    await writeLog(`Thêm mới ao: '${input.pondName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(`Thêm mới ao: '${input.pondName}' không thành công`, error);
    console.log("Có lỗi xảy ra khi thêm ao", error);
    if (error?.code === 11000) return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    return { ok: false };
  }
};

/**
 * Sửa tên, diện tích, ghi chú của ao
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const updatePond = async (pondId, pondData) => {
  const input = readInput(pondData);

  try {
    const invalidMessage = validatePond(input);
    if (invalidMessage) {
      await writeLog(`Cập nhật ao: '${pondId}' không thành công`, { message: invalidMessage });
      return { ok: false, message: invalidMessage };
    }

    const pond = await Pond.findOne({ _id: pondId, isDelete: false });
    if (!pond) {
      await writeLog(`Cập nhật ao: '${pondId}' không thành công`, { message: MESSAGE_NOT_FOUND });
      return { ok: false, message: MESSAGE_NOT_FOUND };
    }

    const existed = await Pond.findOne({ ...nameFilter(input.pondName), isDelete: false, _id: { $ne: pondId } });
    if (existed) {
      await writeLog(`Cập nhật ao: '${pond.pondName}' không thành công`, { message: MESSAGE_DUPLICATE_NAME });
      return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    }

    const oldName = pond.pondName;
    Object.assign(pond, input);
    let result = await pond.save();
    await writeLog(`Cập nhật ao: '${oldName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(`Cập nhật ao: '${pondId}' không thành công`, error);
    console.log("Có lỗi xảy ra khi cập nhật ao", error);
    // Trùng với tên của một ao đã xóa (unique index)
    if (error?.code === 11000) return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    return { ok: false };
  }
};

/**
 * Xóa mềm ao
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const deletePond = async (pondId) => {
  try {
    if (await Crop.exists({ pond: pondId, status: "open", isDelete: false })) {
      await writeLog(`Xóa ao: '${pondId}' không thành công`, { message: MESSAGE_HAS_OPEN_CROP });
      return { ok: false, message: MESSAGE_HAS_OPEN_CROP };
    }
    let result = await Pond.findOneAndUpdate({ _id: pondId, isDelete: false }, { isDelete: true }, { new: true });
    if (!result) {
      await writeLog(`Xóa ao: '${pondId}' không thành công`, { message: MESSAGE_NOT_FOUND });
      return { ok: false, message: MESSAGE_NOT_FOUND };
    }
    await writeLog(`Xóa ao: '${result.pondName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(`Xóa ao: '${pondId}' không thành công`, error);
    console.log("Có lỗi xảy ra khi xóa ao", error);
    return { ok: false };
  }
};

module.exports = {
  getListPond,
  createPond,
  updatePond,
  deletePond,
};
