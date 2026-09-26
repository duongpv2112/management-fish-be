const WeighSession = require("../models/weighSession");
const FishWeight = require("../models/fishWeight");
const FishType = require("../models/fishType");
const LogTracking = require("../models/logTracking");
const logTrackingService = require("../services/logTracking.service");

const MESSAGE_NOT_FOUND = "Không tìm thấy phiên cân!";
const MESSAGE_ALREADY_CLOSED = "Phiên cân đã kết thúc!";
const MESSAGE_INVALID_PRICE = "Đơn giá không hợp lệ!";

const writeLog = async (stepName, data) => {
  let logTracking = new LogTracking({
    fishTypeName: "",
    stepName: stepName,
    data: data,
  });
  _ = await logTrackingService.createLogTracking(logTracking);
};

const isDuplicateKeyError = (error) => error?.code === 11000;

// "Phiên dd/MM/yyyy" theo giờ Việt Nam (server Vercel chạy UTC)
const defaultSessionName = (date = new Date()) => {
  const text = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  return `Phiên ${text}`;
};

// Đảm bảo unique partial index "một phiên mở" đã được tạo trước khi ghi
const ensureIndexes = () => WeighSession.init();

const findOpenSession = () => WeighSession.findOne({ status: "open", isDelete: false });

const getListWeighSession = async () => {
  try {
    return await WeighSession.find({ isDelete: false }).sort({ createdAt: -1 });
  } catch (error) {
    await writeLog("Có lỗi xảy ra khi lấy danh sách phiên cân!", error);
    console.log("Có lỗi xảy ra khi lấy danh sách phiên cân", error);
  }
};

/**
 * @returns {Promise<{ ok: true, data: session|null } | { ok: false }>}
 */
const getOpenWeighSession = async () => {
  try {
    return { ok: true, data: await findOpenSession() };
  } catch (error) {
    console.log("Có lỗi xảy ra khi lấy phiên cân đang mở", error);
    return { ok: false };
  }
};

const closeSessionDocument = async (session) => {
  session.status = "closed";
  session.closedAt = new Date();
  let result = await session.save();
  await writeLog(`Đóng phiên: '${session.sessionName}' thành công`, result);
  return result;
};

/**
 * Lấy phiên đang mở, chưa có thì tạo "Phiên dd/MM/yyyy". An toàn khi gọi song song:
 * lần tạo thứ hai vấp unique index thì đọc lại phiên vừa được tạo.
 */
const getOrCreateOpenSession = async () => {
  await ensureIndexes();
  const open = await findOpenSession();
  if (open) return open;

  try {
    const session = await WeighSession.create({ sessionName: defaultSessionName() });
    await writeLog(`Tạo phiên: '${session.sessionName}' thành công`, session);
    return session;
  } catch (error) {
    if (isDuplicateKeyError(error)) return await findOpenSession();
    throw error;
  }
};

/**
 * Tạo phiên mới; nếu còn phiên đang mở thì đóng phiên đó trước
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const createWeighSession = async (sessionData) => {
  const sessionName = (sessionData?.sessionName ?? "").toString().trim() || defaultSessionName();
  const buyerName = (sessionData?.buyerName ?? "").toString().trim();

  try {
    await ensureIndexes();
    const open = await findOpenSession();
    if (open) await closeSessionDocument(open);

    const session = await WeighSession.create({ sessionName, buyerName });
    await writeLog(`Tạo phiên: '${sessionName}' thành công`, session);
    return { ok: true, data: session };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      // Một yêu cầu khác vừa tạo phiên mở cùng lúc: dùng luôn phiên đó
      return { ok: true, data: await findOpenSession() };
    }
    await writeLog(`Tạo phiên: '${sessionName}' không thành công`, error);
    console.log("Có lỗi xảy ra khi tạo phiên cân", error);
    return { ok: false };
  }
};

/**
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const closeWeighSession = async (sessionId) => {
  try {
    const session = await WeighSession.findOne({ _id: sessionId, isDelete: false });
    if (!session) {
      await writeLog(`Đóng phiên: '${sessionId}' không thành công`, { message: MESSAGE_NOT_FOUND });
      return { ok: false, message: MESSAGE_NOT_FOUND };
    }
    if (session.status === "closed") {
      await writeLog(`Đóng phiên: '${session.sessionName}' không thành công`, { message: MESSAGE_ALREADY_CLOSED });
      return { ok: false, message: MESSAGE_ALREADY_CLOSED };
    }
    return { ok: true, data: await closeSessionDocument(session) };
  } catch (error) {
    await writeLog(`Đóng phiên: '${sessionId}' không thành công`, error);
    console.log("Có lỗi xảy ra khi đóng phiên cân", error);
    return { ok: false };
  }
};

/**
 * Thay toàn bộ bảng giá của phiên. unitPrice null/"" nghĩa là chưa có giá (bỏ khỏi mảng).
 * Phiên đã đóng vẫn sửa được giá.
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const updateSessionPrices = async (sessionId, pricesData) => {
  try {
    const prices = [];
    for (const item of Array.isArray(pricesData) ? pricesData : []) {
      if (item?.unitPrice === null || item?.unitPrice === undefined || item?.unitPrice === "") continue;
      const unitPrice = Number(item.unitPrice);
      if (!item.fishType || !Number.isFinite(unitPrice) || unitPrice < 0) {
        await writeLog(`Cập nhật giá phiên: '${sessionId}' không thành công`, { message: MESSAGE_INVALID_PRICE });
        return { ok: false, message: MESSAGE_INVALID_PRICE };
      }
      prices.push({ fishType: item.fishType, unitPrice });
    }

    const session = await WeighSession.findOne({ _id: sessionId, isDelete: false });
    if (!session) {
      await writeLog(`Cập nhật giá phiên: '${sessionId}' không thành công`, { message: MESSAGE_NOT_FOUND });
      return { ok: false, message: MESSAGE_NOT_FOUND };
    }

    session.prices = prices;
    let result = await session.save();
    await writeLog(`Cập nhật giá phiên: '${session.sessionName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(`Cập nhật giá phiên: '${sessionId}' không thành công`, error);
    console.log("Có lỗi xảy ra khi cập nhật giá phiên", error);
    return { ok: false };
  }
};

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * Tổng hợp tiền của một phiên theo loại cá.
 * amount = Math.round(totalNet × unitPrice) với totalNet chưa làm tròn; loại cá chưa có giá thì amount null
 * và không cộng vào totalAmount.
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const getSessionSummary = async (sessionId) => {
  try {
    const session = await WeighSession.findOne({ _id: sessionId, isDelete: false });
    if (!session) return { ok: false, message: MESSAGE_NOT_FOUND };

    const fishWeights = await FishWeight.find({ session: session._id, isDelete: false });
    const fishTypeIds = [...new Set(fishWeights.map((weight) => weight.fishType))];
    // Lấy cả loại cá đã xóa mềm: lần cân trong phiên vẫn phải được tính tiền
    const fishTypes = await FishType.find({ _id: { $in: fishTypeIds } });
    const fishNames = new Map(fishTypes.map((fishType) => [fishType._id, fishType.fishName]));
    const prices = new Map(session.prices.map((price) => [price.fishType, price.unitPrice]));

    const lines = fishTypeIds
      .map((fishTypeId) => {
        const weights = fishWeights.filter((weight) => weight.fishType === fishTypeId);
        const totalGross = weights.reduce((sum, weight) => sum + weight.fishWeight, 0);
        const totalNet = weights.reduce(
          (sum, weight) => sum + (weight.netWeight ?? weight.fishWeight),
          0
        );
        const unitPrice = prices.has(fishTypeId) ? prices.get(fishTypeId) : null;
        return {
          fishTypeId,
          fishName: fishNames.get(fishTypeId) ?? "",
          count: weights.length,
          totalGross: round2(totalGross),
          totalNet: round2(totalNet),
          unitPrice,
          amount: unitPrice === null ? null : Math.round(totalNet * unitPrice),
        };
      })
      .sort((a, b) => a.fishName.localeCompare(b.fishName, "vi"));

    return {
      ok: true,
      data: {
        session: {
          _id: session._id,
          sessionName: session.sessionName,
          buyerName: session.buyerName,
          status: session.status,
          createdAt: session.createdAt,
          closedAt: session.closedAt,
        },
        lines,
        totalNet: round2(lines.reduce((sum, line) => sum + line.totalNet, 0)),
        totalAmount: lines.reduce((sum, line) => sum + (line.amount ?? 0), 0),
        missingPriceCount: lines.filter((line) => line.amount === null).length,
      },
    };
  } catch (error) {
    console.log("Có lỗi xảy ra khi tổng hợp phiên cân", error);
    return { ok: false };
  }
};

module.exports = {
  getSessionSummary,
  getListWeighSession,
  getOpenWeighSession,
  getOrCreateOpenSession,
  createWeighSession,
  closeWeighSession,
  updateSessionPrices,
};
