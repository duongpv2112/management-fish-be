const FishType = require("../models/fishType");
const FishWeight = require("../models/fishWeight");
const WeighSession = require("../models/weighSession");

const LogTracking = require("../models/logTracking");
const logTrackingService = require("../services/logTracking.service");

const getListFishType = async () => {
  try {
    return await FishType.find({ isDelete: false }).sort({ createdAt: 1 });
  } catch (error) {
    let logTracking = new LogTracking({
      fishTypeName: "",
      stepName: `Có lỗi xảy ra khi lấy danh sách loại cá!`,
      data: error,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    console.log("Có lỗi xảy ra khi lấy danh sách loại cá", error);
  }
};

/**
 * Dữ liệu bảng cân: mỗi loại cá kèm các lần cân của một phiên.
 * Không truyền sessionId thì lấy phiên đang mở; không có phiên mở thì danh sách cân rỗng.
 */
const getDataFish = async (sessionId) => {
  try {
    let fishTypes = await FishType.find({ isDelete: false }).sort({ createdAt: 1 });
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      const openSession = await WeighSession.findOne({ status: "open", isDelete: false });
      targetSessionId = openSession?._id ?? null;
    }
    let fishWeights = targetSessionId
      ? await FishWeight.find({ isDelete: false, session: targetSessionId }).sort({ createdAt: 1 })
      : [];
    const dataResult = [];
    fishTypes.forEach((fishType) => {
      let fishTypeClone = JSON.parse(JSON.stringify(fishType));
      // fishWeightItems có _id để FE sửa/xóa từng lần cân; fishWeights giữ lại cho tương thích
      fishTypeClone.fishWeightItems = fishWeights
        .filter((fishWeight) => fishWeight.fishType === fishType._id)
        .map((fishWeight) => ({
          _id: fishWeight._id,
          fishWeight: fishWeight.fishWeight,
          netWeight: fishWeight.netWeight,
          basketWeightSnapshot: fishWeight.basketWeightSnapshot,
          basketType: fishWeight.basketType,
          createdAt: fishWeight.createdAt,
        }));
      fishTypeClone.fishWeights = fishTypeClone.fishWeightItems.map(
        (item) => item.fishWeight
      );
      dataResult.push(fishTypeClone);
    });
    return dataResult;
  } catch (error) {
    let logTracking = new LogTracking({
      fishTypeName: "",
      stepName: `Có lỗi xảy ra khi lấy dữ liệu bảng hiển thị!`,
      data: error,
    });
    _ = await logTrackingService.createLogTracking(logTracking);
    console.log("Có lỗi xảy ra khi lấy danh sách loại cá", error);
  }
};

const MESSAGE_EMPTY_NAME = "Tên loại cá không được để trống!";
const MESSAGE_DUPLICATE_NAME = "Tên loại cá đã tồn tại!";
const MESSAGE_NOT_FOUND = "Không tìm thấy loại cá!";

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// So sánh tên sau khi trim, không phân biệt hoa thường
const nameFilter = (name) => ({
  fishName: new RegExp(`^${escapeRegExp(name)}$`, "i"),
});

const writeLog = async (stepName, data) => {
  let logTracking = new LogTracking({
    fishTypeName: "",
    stepName: stepName,
    data: data,
  });
  _ = await logTrackingService.createLogTracking(logTracking);
};

/**
 * Thêm loại cá. Nếu đã có loại cá cùng tên nhưng đã xóa mềm thì khôi phục bản ghi cũ
 * để lịch sử cân cũ vẫn gắn đúng loại cá.
 * @returns {Promise<{ ok: true, data } | { ok: false, message }>}
 */
const createFishType = async (fishTypeData) => {
  const fishName = (fishTypeData?.fishName ?? "").toString().trim();

  try {
    if (!fishName) {
      await writeLog(`Thêm mới loại cá: '${fishName}' không thành công!`, { message: MESSAGE_EMPTY_NAME });
      return { ok: false, message: MESSAGE_EMPTY_NAME };
    }

    const existed = await FishType.findOne({ ...nameFilter(fishName), isDelete: false });
    if (existed) {
      await writeLog(`Thêm mới loại cá: '${fishName}' không thành công!`, { message: MESSAGE_DUPLICATE_NAME });
      return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    }

    const deleted = await FishType.findOne({ ...nameFilter(fishName), isDelete: true });
    if (deleted) {
      deleted.fishName = fishName;
      deleted.isDelete = false;
      let result = await deleted.save();
      await writeLog(`Khôi phục loại cá: '${fishName}' thành công!`, result);
      return { ok: true, data: result };
    }

    const fishType = new FishType();
    fishType.fishName = fishName;
    let result = await fishType.save();
    await writeLog(`Thêm mới loại cá: '${fishName}' thành công!`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(`Thêm mới loại cá: '${fishName}' không thành công!`, error);
    console.log("Có lỗi xảy ra khi thêm loại cá", error);
    if (error?.code === 11000) return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    return { ok: false };
  }
};

/**
 * Đổi tên loại cá
 * @returns {Promise<{ ok: true, data } | { ok: false, message }>}
 */
const updateFishType = async (fishTypeId, fishTypeData) => {
  const fishName = (fishTypeData?.fishName ?? "").toString().trim();

  try {
    if (!fishName) {
      await writeLog(`Cập nhật loại cá: '${fishTypeId}' không thành công!`, { message: MESSAGE_EMPTY_NAME });
      return { ok: false, message: MESSAGE_EMPTY_NAME };
    }

    const fishType = await FishType.findOne({ _id: fishTypeId, isDelete: false });
    if (!fishType) {
      await writeLog(`Cập nhật loại cá: '${fishTypeId}' không thành công!`, { message: MESSAGE_NOT_FOUND });
      return { ok: false, message: MESSAGE_NOT_FOUND };
    }

    const existed = await FishType.findOne({
      ...nameFilter(fishName),
      isDelete: false,
      _id: { $ne: fishTypeId },
    });
    if (existed) {
      await writeLog(`Cập nhật loại cá: '${fishType.fishName}' không thành công!`, { message: MESSAGE_DUPLICATE_NAME });
      return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    }

    const oldName = fishType.fishName;
    fishType.fishName = fishName;
    let result = await fishType.save();
    await writeLog(`Cập nhật loại cá: '${oldName}' thành '${fishName}' thành công!`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(`Cập nhật loại cá: '${fishTypeId}' không thành công!`, error);
    console.log("Có lỗi xảy ra khi cập nhật loại cá", error);
    // Trùng với tên của một loại cá đã xóa (unique index)
    if (error?.code === 11000) return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    return { ok: false };
  }
};

/**
 * Xóa mềm loại cá
 * @returns {Promise<{ ok: true, data } | { ok: false, message }>}
 */
const deleteFishType = async (fishTypeId) => {
  try {
    let result = await FishType.findOneAndUpdate(
      { _id: fishTypeId, isDelete: false },
      { isDelete: true },
      { new: true }
    );
    if (!result) {
      await writeLog(`Xóa loại cá: '${fishTypeId}' không thành công!`, { message: MESSAGE_NOT_FOUND });
      return { ok: false, message: MESSAGE_NOT_FOUND };
    }
    await writeLog(`Xóa loại cá: '${result.fishName}' thành công!`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(`Xóa loại cá: '${fishTypeId}' không thành công!`, error);
    console.log("Có lỗi xảy ra khi xóa loại cá", error);
    return { ok: false };
  }
};

module.exports = {
  getListFishType,
  createFishType,
  updateFishType,
  deleteFishType,
  getDataFish,
};
