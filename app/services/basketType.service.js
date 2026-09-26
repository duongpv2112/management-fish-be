const BasketType = require("../models/basketType");
const LogTracking = require("../models/logTracking");
const logTrackingService = require("../services/logTracking.service");

const getListBasketType = async () => {
  try {
    return await BasketType.find({ isDelete: false }).sort({ createdAt: 1 });
  } catch (error) {
    let logTracking = new LogTracking({
      fishTypeName: "",
      stepName: `Có lỗi xảy ra lấy danh sách loại giỏ!`,
      data: error,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    console.log("Có lỗi xảy ra lấy danh sách loại giỏ", error);
  }
};

const MESSAGE_EMPTY_NAME = "Tên loại giỏ không được để trống!";
const MESSAGE_DUPLICATE_NAME = "Tên loại giỏ đã tồn tại!";
const MESSAGE_INVALID_WEIGHT = "Trọng lượng giỏ không hợp lệ!";
const MESSAGE_NOT_FOUND = "Không tìm thấy loại giỏ!";

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// So sánh tên sau khi trim, không phân biệt hoa thường
const nameFilter = (name) => ({
  basketName: new RegExp(`^${escapeRegExp(name)}$`, "i"),
});

// Trọng lượng giỏ phải là số >= 0; trả null nếu không hợp lệ
const parseBasketWeight = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const weight = Number(value);
  if (!Number.isFinite(weight) || weight < 0) return null;
  return weight;
};

const writeLog = async (stepName, data) => {
  let logTracking = new LogTracking({
    fishTypeName: "",
    stepName: stepName,
    data: data,
  });
  _ = await logTrackingService.createLogTracking(logTracking);
};

// Kiểm tra dữ liệu đầu vào chung cho thêm/sửa; trả message lỗi hoặc null
const validateBasketType = (basketName, basketWeight) => {
  if (!basketName) return MESSAGE_EMPTY_NAME;
  if (basketWeight === null) return MESSAGE_INVALID_WEIGHT;
  return null;
};

/**
 * Thêm loại giỏ. Nếu đã có loại giỏ cùng tên nhưng đã xóa mềm thì khôi phục bản ghi cũ.
 * @returns {Promise<{ ok: true, data } | { ok: false, message }>}
 */
const createBasketType = async (basketTypeData) => {
  const basketName = (basketTypeData?.basketName ?? "").toString().trim();
  const basketWeight = parseBasketWeight(basketTypeData?.basketWeight);

  try {
    const invalidMessage = validateBasketType(basketName, basketWeight);
    if (invalidMessage) {
      await writeLog(`Thêm mới loại giỏ: '${basketName}' không thành công`, { message: invalidMessage });
      return { ok: false, message: invalidMessage };
    }

    const existed = await BasketType.findOne({ ...nameFilter(basketName), isDelete: false });
    if (existed) {
      await writeLog(`Thêm mới loại giỏ: '${basketName}' không thành công`, { message: MESSAGE_DUPLICATE_NAME });
      return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    }

    const deleted = await BasketType.findOne({ ...nameFilter(basketName), isDelete: true });
    if (deleted) {
      deleted.basketName = basketName;
      deleted.basketWeight = basketWeight;
      deleted.isDelete = false;
      let result = await deleted.save();
      await writeLog(`Khôi phục loại giỏ: '${basketName}' thành công`, result);
      return { ok: true, data: result };
    }

    const basketType = new BasketType();
    basketType.basketName = basketName;
    basketType.basketWeight = basketWeight;
    let result = await basketType.save();
    await writeLog(`Thêm mới loại giỏ: '${basketName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(`Thêm mới loại giỏ: '${basketName}' không thành công`, error);
    console.log("Có lỗi xảy ra khi thêm loại giỏ", error);
    if (error?.code === 11000) return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    return { ok: false };
  }
};

/**
 * Sửa tên và trọng lượng loại giỏ
 * @returns {Promise<{ ok: true, data } | { ok: false, message }>}
 */
const updateBasketType = async (basketTypeId, basketTypeData) => {
  const basketName = (basketTypeData?.basketName ?? "").toString().trim();
  const basketWeight = parseBasketWeight(basketTypeData?.basketWeight);

  try {
    const invalidMessage = validateBasketType(basketName, basketWeight);
    if (invalidMessage) {
      await writeLog(`Cập nhật loại giỏ: '${basketTypeId}' không thành công`, { message: invalidMessage });
      return { ok: false, message: invalidMessage };
    }

    const basketType = await BasketType.findOne({ _id: basketTypeId, isDelete: false });
    if (!basketType) {
      await writeLog(`Cập nhật loại giỏ: '${basketTypeId}' không thành công`, { message: MESSAGE_NOT_FOUND });
      return { ok: false, message: MESSAGE_NOT_FOUND };
    }

    const existed = await BasketType.findOne({
      ...nameFilter(basketName),
      isDelete: false,
      _id: { $ne: basketTypeId },
    });
    if (existed) {
      await writeLog(`Cập nhật loại giỏ: '${basketType.basketName}' không thành công`, { message: MESSAGE_DUPLICATE_NAME });
      return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    }

    const oldName = basketType.basketName;
    basketType.basketName = basketName;
    basketType.basketWeight = basketWeight;
    let result = await basketType.save();
    await writeLog(`Cập nhật loại giỏ: '${oldName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(`Cập nhật loại giỏ: '${basketTypeId}' không thành công`, error);
    console.log("Có lỗi xảy ra khi cập nhật loại giỏ", error);
    // Trùng với tên của một loại giỏ đã xóa (unique index)
    if (error?.code === 11000) return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    return { ok: false };
  }
};

/**
 * Xóa mềm loại giỏ
 * @returns {Promise<{ ok: true, data } | { ok: false, message }>}
 */
const deleteBasketType = async (basketTypeId) => {
  try {
    let result = await BasketType.findOneAndUpdate(
      { _id: basketTypeId, isDelete: false },
      { isDelete: true },
      { new: true }
    );
    if (!result) {
      await writeLog(`Xóa loại giỏ: '${basketTypeId}' không thành công`, { message: MESSAGE_NOT_FOUND });
      return { ok: false, message: MESSAGE_NOT_FOUND };
    }
    await writeLog(`Xóa loại giỏ: '${result.basketName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(`Xóa loại giỏ: '${basketTypeId}' không thành công`, error);
    console.log("Có lỗi xảy ra khi xóa loại giỏ", error);
    return { ok: false };
  }
};

module.exports = {
  getListBasketType,
  createBasketType,
  updateBasketType,
  deleteBasketType,
};
