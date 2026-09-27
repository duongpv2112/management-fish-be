const Crop = require("../models/crop");
const Pond = require("../models/pond");
const WeighSession = require("../models/weighSession");
const LogTracking = require("../models/logTracking");
const logTrackingService = require("../services/logTracking.service");
const { toDateOnly, formatMonthYear } = require("../common/dateOnly");

const MESSAGE_NOT_FOUND = "Không tìm thấy dữ liệu!";
const MESSAGE_POND_HAS_OPEN_CROP = "Ao này đang có vụ nuôi!";
const MESSAGE_OPEN_SESSION = "Vụ còn phiên bán đang mở, hãy kết thúc phiên trước!";
const MESSAGE_END_BEFORE_START = "Ngày kết thúc phải sau ngày bắt đầu!";
const MESSAGE_HAS_DATA = "Vụ đã có dữ liệu, không xóa được!";
const MESSAGE_EMPTY_NAME = "Tên vụ không được để trống!";
const MESSAGE_INVALID_DATE = "Ngày không hợp lệ!";
const MESSAGE_ALREADY_CLOSED = "Vụ nuôi đã kết thúc!";

const writeLog = async (stepName, data) => {
  let logTracking = new LogTracking({
    fishTypeName: "",
    stepName: stepName,
    data: data,
  });
  _ = await logTrackingService.createLogTracking(logTracking);
};

const isDuplicateKeyError = (error) => error?.code === 11000;

// Đảm bảo unique partial index "một vụ mở mỗi ao" đã được tạo trước khi ghi
const ensureIndexes = () => Crop.init();

const findActivePond = (pondId) => Pond.findOne({ _id: pondId, isDelete: false });
const findActiveCrop = (cropId) => Crop.findOne({ _id: cropId, isDelete: false });

// Lỗi nghiệp vụ: ghi log rồi trả { ok: false, message }
const fail = async (stepName, message) => {
  await writeLog(stepName, { message });
  return { ok: false, message };
};

/**
 * @param {{ pondId?: string, status?: "open"|"closed" }} filter
 * Vụ đang nuôi đứng trước, rồi ngày thả mới nhất; kèm thông tin ao
 */
const getListCrop = async ({ pondId, status } = {}) => {
  try {
    const query = { isDelete: false };
    if (pondId) query.pond = pondId;
    if (status) query.status = status;
    return await Crop.find(query).sort({ status: -1, startDate: -1 }).populate("pond");
  } catch (error) {
    await writeLog("Có lỗi xảy ra khi lấy danh sách vụ nuôi!", error);
    console.log("Có lỗi xảy ra khi lấy danh sách vụ nuôi", error);
  }
};

/**
 * Bắt đầu vụ mới cho một ao; tên mặc định "<Tên ao> · Vụ MM/yyyy"
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const createCrop = async (cropData) => {
  const pondId = cropData?.pondId;
  const step = `Bắt đầu vụ cho ao: '${pondId}' không thành công`;

  try {
    const pond = await findActivePond(pondId);
    if (!pond) return await fail(step, MESSAGE_NOT_FOUND);

    const startDate = toDateOnly(cropData?.startDate);
    if (!startDate) return await fail(step, MESSAGE_INVALID_DATE);

    const cropName =
      (cropData?.cropName ?? "").toString().trim() || `${pond.pondName} · Vụ ${formatMonthYear(startDate)}`;

    await ensureIndexes();
    if (await Crop.exists({ pond: pond._id, status: "open", isDelete: false })) {
      return await fail(step, MESSAGE_POND_HAS_OPEN_CROP);
    }

    const crop = await Crop.create({
      pond: pond._id,
      cropName,
      startDate,
      note: (cropData?.note ?? "").toString().trim(),
    });
    await writeLog(`Bắt đầu vụ: '${cropName}' thành công`, crop);
    return { ok: true, data: crop };
  } catch (error) {
    // Một request khác vừa bắt đầu vụ cho ao này cùng lúc
    if (isDuplicateKeyError(error)) return await fail(step, MESSAGE_POND_HAS_OPEN_CROP);
    await writeLog(step, error);
    console.log("Có lỗi xảy ra khi bắt đầu vụ nuôi", error);
    return { ok: false };
  }
};

/**
 * Sửa tên, ngày thả, ghi chú
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const updateCrop = async (cropId, cropData) => {
  const step = `Cập nhật vụ: '${cropId}' không thành công`;

  try {
    const crop = await findActiveCrop(cropId);
    if (!crop) return await fail(step, MESSAGE_NOT_FOUND);

    const cropName = (cropData?.cropName ?? "").toString().trim();
    if (!cropName) return await fail(step, MESSAGE_EMPTY_NAME);

    const startDate = cropData?.startDate === undefined ? crop.startDate : toDateOnly(cropData.startDate);
    if (!startDate) return await fail(step, MESSAGE_INVALID_DATE);
    if (crop.endDate && crop.endDate.getTime() < startDate.getTime()) return await fail(step, MESSAGE_END_BEFORE_START);

    crop.cropName = cropName;
    crop.startDate = startDate;
    if (cropData?.note !== undefined) crop.note = (cropData.note ?? "").toString().trim();
    let result = await crop.save();
    await writeLog(`Cập nhật vụ: '${cropName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(step, error);
    console.log("Có lỗi xảy ra khi cập nhật vụ nuôi", error);
    return { ok: false };
  }
};

/**
 * Kết thúc vụ (mặc định hôm nay). Không cho kết thúc khi còn phiên bán đang mở của vụ.
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const closeCrop = async (cropId, closeData) => {
  const step = `Kết thúc vụ: '${cropId}' không thành công`;

  try {
    const crop = await findActiveCrop(cropId);
    if (!crop) return await fail(step, MESSAGE_NOT_FOUND);
    if (crop.status === "closed") return await fail(step, MESSAGE_ALREADY_CLOSED);

    const endDate = toDateOnly(closeData?.endDate);
    if (!endDate) return await fail(step, MESSAGE_INVALID_DATE);
    if (endDate.getTime() < crop.startDate.getTime()) return await fail(step, MESSAGE_END_BEFORE_START);

    if (await WeighSession.exists({ crop: crop._id, status: "open", isDelete: false })) {
      return await fail(step, MESSAGE_OPEN_SESSION);
    }

    crop.status = "closed";
    crop.endDate = endDate;
    let result = await crop.save();
    await writeLog(`Kết thúc vụ: '${crop.cropName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(step, error);
    console.log("Có lỗi xảy ra khi kết thúc vụ nuôi", error);
    return { ok: false };
  }
};

/**
 * Mở lại vụ đã kết thúc (khi ao chưa có vụ mở khác)
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const reopenCrop = async (cropId) => {
  const step = `Mở lại vụ: '${cropId}' không thành công`;

  try {
    const crop = await findActiveCrop(cropId);
    if (!crop || !(await findActivePond(crop.pond))) return await fail(step, MESSAGE_NOT_FOUND);
    if (crop.status === "open") return { ok: true, data: crop };

    await ensureIndexes();
    crop.status = "open";
    crop.endDate = null;
    let result = await crop.save();
    await writeLog(`Mở lại vụ: '${crop.cropName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    if (isDuplicateKeyError(error)) return await fail(step, MESSAGE_POND_HAS_OPEN_CROP);
    await writeLog(step, error);
    console.log("Có lỗi xảy ra khi mở lại vụ nuôi", error);
    return { ok: false };
  }
};

/**
 * Xóa mềm vụ chưa có dữ liệu (chưa có phiên bán)
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const deleteCrop = async (cropId) => {
  const step = `Xóa vụ: '${cropId}' không thành công`;

  try {
    const crop = await findActiveCrop(cropId);
    if (!crop) return await fail(step, MESSAGE_NOT_FOUND);
    if (await WeighSession.exists({ crop: crop._id, isDelete: false })) return await fail(step, MESSAGE_HAS_DATA);

    crop.isDelete = true;
    let result = await crop.save();
    await writeLog(`Xóa vụ: '${crop.cropName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(step, error);
    console.log("Có lỗi xảy ra khi xóa vụ nuôi", error);
    return { ok: false };
  }
};

module.exports = {
  getListCrop,
  createCrop,
  updateCrop,
  closeCrop,
  reopenCrop,
  deleteCrop,
};
