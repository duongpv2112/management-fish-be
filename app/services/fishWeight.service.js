const FishWeight = require("../models/fishWeight");
const FishType = require("../models/fishType");
const BasketType = require("../models/basketType");
const WeighSession = require("../models/weighSession");
const LogTracking = require("../models/logTracking");
const logTrackingService = require("../services/logTracking.service");
const weighSessionService = require("../services/weighSession.service");

const MESSAGE_INVALID_WEIGHT = "Số cân cá phải là số dương!";
const MESSAGE_NOT_FOUND = "Không tìm thấy bản ghi cân cá!";
const MESSAGE_FISH_TYPE_NOT_FOUND = "Không tìm thấy loại cá!";
const MESSAGE_SESSION_CLOSED_UPDATE = "Phiên đã đóng, không thể sửa!";
const MESSAGE_SESSION_CLOSED_DELETE = "Phiên đã đóng, không thể xóa!";

const round2 = (value) => Math.round(value * 100) / 100;

const writeLog = async (fishTypeName, stepName, data) => {
  let logTracking = new LogTracking({ fishTypeName, stepName, data });
  _ = await logTrackingService.createLogTracking(logTracking);
};

// Số cân phải là số dương; trả NaN nếu không hợp lệ
const parseWeight = (value) => {
  if (value === null || value === undefined || value === "") return NaN;
  const weight = Number(value);
  return Number.isFinite(weight) && weight > 0 ? weight : NaN;
};

// Trọng lượng giỏ hiện tại để chụp lại lúc cân (không có giỏ thì 0)
const getBasketWeight = async (basketTypeId) => {
  if (!basketTypeId) return 0;
  const basketType = await BasketType.findById(basketTypeId);
  return basketType?.basketWeight ?? 0;
};

const netWeightMessage = (snapshot) =>
  `Số cân phải lớn hơn trọng lượng giỏ (${snapshot} kg)!`;

const isSessionClosed = async (sessionId) => {
  if (!sessionId) return false;
  const session = await WeighSession.findById(sessionId);
  return session?.status === "closed";
};

const getListFishWeight = async () => {
  try {
    return await FishWeight.find({ isDelete: false }).populate([
      "fishType",
      "basketType",
    ]);
  } catch (error) {
    await writeLog("", `Có lỗi xảy ra khi lấy danh sách cân cá!`, error);
    console.log("Có lỗi xảy ra khi lấy danh sách cân cá", error);
  }
};

/**
 * Thêm một lần cân vào phiên đang mở (chưa có thì tự tạo), chụp lại trọng lượng giỏ
 * và tính trọng lượng thực = số cân − trọng lượng giỏ
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const createFishWeight = async (fishWeightData) => {
  const failStep = `Thêm mới bản ghi cân cá: '${fishWeightData?.fishType}' không thành công`;

  try {
    const weightValue = parseWeight(fishWeightData?.fishWeight);
    if (Number.isNaN(weightValue)) {
      await writeLog("", failStep, { message: MESSAGE_INVALID_WEIGHT });
      return { ok: false, message: MESSAGE_INVALID_WEIGHT };
    }

    const snapshot = await getBasketWeight(fishWeightData.basketType);
    const netWeight = round2(weightValue - snapshot);
    if (netWeight <= 0) {
      const message = netWeightMessage(snapshot);
      await writeLog("", failStep, { message });
      return { ok: false, message };
    }

    const session = await weighSessionService.getOrCreateOpenSession();

    const fishWeight = new FishWeight();
    fishWeight.fishType = fishWeightData.fishType;
    fishWeight.fishWeight = weightValue;
    fishWeight.basketType = fishWeightData.basketType;
    fishWeight.session = session._id;
    fishWeight.basketWeightSnapshot = snapshot;
    fishWeight.netWeight = netWeight;

    let result = await (await fishWeight.save()).populate(["fishType", "basketType"]);
    await writeLog(
      result.fishType.fishName,
      `Thêm mới bản ghi cân cá: '${result.fishType.fishName}' thành công`,
      result
    );
    return { ok: true, data: result };
  } catch (error) {
    await writeLog("", failStep, error);
    console.log("Có lỗi xảy ra khi thêm cân cá", error);
    return { ok: false };
  }
};

/**
 * Xóa mềm một lần cân (không cho xóa nếu phiên đã đóng)
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const deleteFishWeight = async (fishWeightId) => {
  const failStep = `Xóa bản ghi cân cá: '${fishWeightId}' không thành công`;

  try {
    const fishWeight = await FishWeight.findOne({ _id: fishWeightId, isDelete: false });
    if (!fishWeight) {
      await writeLog("", failStep, { fishWeightId, reason: "Không tìm thấy bản ghi cân cá" });
      return { ok: false };
    }
    if (await isSessionClosed(fishWeight.session)) {
      await writeLog("", failStep, { message: MESSAGE_SESSION_CLOSED_DELETE });
      return { ok: false, message: MESSAGE_SESSION_CLOSED_DELETE };
    }

    fishWeight.isDelete = true;
    let result = await (await fishWeight.save()).populate(["fishType", "basketType"]);
    await writeLog(
      result.fishType.fishName,
      `Xóa bản ghi cân cá: '${result.fishType.fishName}' thành công`,
      result
    );
    return { ok: true, data: result };
  } catch (error) {
    await writeLog("", failStep, error);
    console.log("Có lỗi xảy ra khi xóa cân cá", error);
    return { ok: false };
  }
};

/**
 * Sửa một lần cân (loại cá, loại giỏ, số cân). Đổi giỏ thì chụp lại trọng lượng giỏ,
 * không đổi giỏ thì giữ snapshot cũ. Không cho sửa nếu phiên đã đóng.
 * @returns {Promise<{ ok: true, data } | { ok: false, message }>}
 */
const updateFishWeight = async (fishWeightId, fishWeightData) => {
  const failStep = `Cập nhật bản ghi cân cá: '${fishWeightId}' không thành công`;

  try {
    const weightValue = parseWeight(fishWeightData?.fishWeight);
    if (Number.isNaN(weightValue)) {
      await writeLog("", failStep, { message: MESSAGE_INVALID_WEIGHT });
      return { ok: false, message: MESSAGE_INVALID_WEIGHT };
    }

    const fishWeight = await FishWeight.findOne({ _id: fishWeightId, isDelete: false });
    if (!fishWeight) {
      await writeLog("", failStep, { message: MESSAGE_NOT_FOUND });
      return { ok: false, message: MESSAGE_NOT_FOUND };
    }

    if (await isSessionClosed(fishWeight.session)) {
      await writeLog("", failStep, { message: MESSAGE_SESSION_CLOSED_UPDATE });
      return { ok: false, message: MESSAGE_SESSION_CLOSED_UPDATE };
    }

    const fishType = await FishType.findOne({ _id: fishWeightData?.fishType, isDelete: false });
    if (!fishType) {
      await writeLog("", failStep, { message: MESSAGE_FISH_TYPE_NOT_FOUND });
      return { ok: false, message: MESSAGE_FISH_TYPE_NOT_FOUND };
    }

    const basketType =
      fishWeightData.basketType !== undefined ? fishWeightData.basketType : fishWeight.basketType;
    const basketChanged = (basketType ?? null) !== (fishWeight.basketType ?? null);
    const snapshot =
      basketChanged || fishWeight.basketWeightSnapshot === undefined
        ? await getBasketWeight(basketType)
        : fishWeight.basketWeightSnapshot;
    const netWeight = round2(weightValue - snapshot);
    if (netWeight <= 0) {
      const message = netWeightMessage(snapshot);
      await writeLog("", failStep, { message });
      return { ok: false, message };
    }

    fishWeight.fishType = fishType._id;
    fishWeight.fishWeight = weightValue;
    fishWeight.basketType = basketType;
    fishWeight.basketWeightSnapshot = snapshot;
    fishWeight.netWeight = netWeight;
    let result = await (await fishWeight.save()).populate(["fishType", "basketType"]);
    await writeLog(
      result.fishType.fishName,
      `Cập nhật bản ghi cân cá: '${result.fishType.fishName}' thành công`,
      result
    );
    return { ok: true, data: result };
  } catch (error) {
    await writeLog("", failStep, error);
    console.log("Có lỗi xảy ra khi cập nhật cân cá", error);
    return { ok: false };
  }
};

module.exports = {
  getListFishWeight,
  createFishWeight,
  updateFishWeight,
  deleteFishWeight,
};
