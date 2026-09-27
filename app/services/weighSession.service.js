const WeighSession = require("../models/weighSession");
const FishWeight = require("../models/fishWeight");
const FishType = require("../models/fishType");
const Crop = require("../models/crop");
const LogTracking = require("../models/logTracking");
const logTrackingService = require("../services/logTracking.service");
const { DEFAULT_CURRENCY, isValidCurrency, roundMoney } = require("../config/currency");

const MESSAGE_NOT_FOUND = "Không tìm thấy phiên cân!";
const MESSAGE_ALREADY_CLOSED = "Phiên cân đã kết thúc!";
const MESSAGE_INVALID_PRICE = "Đơn giá không hợp lệ!";
const MESSAGE_INVALID_CURRENCY = "Loại tiền không hợp lệ!";
const MESSAGE_DATA_NOT_FOUND = "Không tìm thấy dữ liệu!";
const MESSAGE_CROP_CLOSED = "Vụ đã kết thúc, hãy chọn vụ đang nuôi!";

// Kèm vụ và ao của phiên để FE hiện tên ao (lấy cả ao đã xóa mềm)
const CROP_POPULATE = { path: "crop", populate: { path: "pond" } };

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

const findActiveCrop = (cropId) => Crop.findOne({ _id: cropId, isDelete: false });

// Phiên mới dùng lại loại tiền của phiên gần nhất để không phải chọn lại mỗi lần
const latestCurrency = async () => {
  const latest = await WeighSession.findOne({ isDelete: false }).sort({ createdAt: -1 });
  return latest?.currency ?? DEFAULT_CURRENCY;
};

const getListWeighSession = async () => {
  try {
    return await WeighSession.find({ isDelete: false }).sort({ createdAt: -1 }).populate(CROP_POPULATE);
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
    return { ok: true, data: await findOpenSession().populate(CROP_POPULATE) };
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
    const session = await WeighSession.create({
      sessionName: defaultSessionName(),
      currency: await latestCurrency(),
    });
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
  const requestedCurrency = sessionData?.currency;
  const cropId = sessionData?.cropId || null;

  if (requestedCurrency !== undefined && !isValidCurrency(requestedCurrency)) {
    await writeLog(`Tạo phiên: '${sessionName}' không thành công`, { message: MESSAGE_INVALID_CURRENCY });
    return { ok: false, message: MESSAGE_INVALID_CURRENCY };
  }

  try {
    // Kiểm tra vụ trước khi đóng phiên đang mở, để lỗi không làm mất phiên hiện tại
    if (cropId) {
      const crop = await findActiveCrop(cropId);
      const message = !crop ? MESSAGE_DATA_NOT_FOUND : crop.status !== "open" ? MESSAGE_CROP_CLOSED : null;
      if (message) {
        await writeLog(`Tạo phiên: '${sessionName}' không thành công`, { message });
        return { ok: false, message };
      }
    }

    await ensureIndexes();
    const open = await findOpenSession();
    if (open) await closeSessionDocument(open);

    const currency = requestedCurrency ?? (await latestCurrency());
    const session = await WeighSession.create({ sessionName, buyerName, currency, crop: cropId });
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

    // Làm tròn theo loại tiền của phiên (VND số nguyên, USD đến cent)
    session.prices = prices.map((price) => ({
      ...price,
      unitPrice: roundMoney(price.unitPrice, session.currency),
    }));
    let result = await session.save();
    await writeLog(`Cập nhật giá phiên: '${session.sessionName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(`Cập nhật giá phiên: '${sessionId}' không thành công`, error);
    console.log("Có lỗi xảy ra khi cập nhật giá phiên", error);
    return { ok: false };
  }
};

/**
 * Đổi loại tiền của phiên. Đơn giá cũ tính theo loại tiền cũ nên bị xóa; đổi sang đúng loại đang dùng thì giữ nguyên.
 * Phiên đã đóng vẫn đổi được (giống sửa giá).
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const updateSessionCurrency = async (sessionId, currency) => {
  try {
    if (!isValidCurrency(currency)) {
      await writeLog(`Đổi loại tiền phiên: '${sessionId}' không thành công`, { message: MESSAGE_INVALID_CURRENCY });
      return { ok: false, message: MESSAGE_INVALID_CURRENCY };
    }

    const session = await WeighSession.findOne({ _id: sessionId, isDelete: false });
    if (!session) {
      await writeLog(`Đổi loại tiền phiên: '${sessionId}' không thành công`, { message: MESSAGE_NOT_FOUND });
      return { ok: false, message: MESSAGE_NOT_FOUND };
    }
    if ((session.currency ?? DEFAULT_CURRENCY) === currency) return { ok: true, data: session };

    session.currency = currency;
    session.prices = [];
    let result = await session.save();
    await writeLog(`Đổi loại tiền phiên: '${session.sessionName}' sang ${currency} thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(`Đổi loại tiền phiên: '${sessionId}' không thành công`, error);
    console.log("Có lỗi xảy ra khi đổi loại tiền phiên", error);
    return { ok: false };
  }
};

/**
 * Gán / đổi / bỏ gán vụ (ao) cho phiên. Phiên và vụ đã kết thúc vẫn gán được (dữ liệu cũ).
 * @param {string|null} cropId null hoặc "" = bỏ gán
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const updateSessionCrop = async (sessionId, cropId) => {
  try {
    const session = await WeighSession.findOne({ _id: sessionId, isDelete: false });
    const crop = cropId ? await findActiveCrop(cropId) : null;
    if (!session || (cropId && !crop)) {
      await writeLog(`Gán ao cho phiên: '${sessionId}' không thành công`, { message: MESSAGE_DATA_NOT_FOUND });
      return { ok: false, message: MESSAGE_DATA_NOT_FOUND };
    }

    session.crop = crop?._id ?? null;
    let result = await session.save();
    await writeLog(`Gán ao cho phiên: '${session.sessionName}' → '${crop?.cropName ?? "chưa chọn"}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(`Gán ao cho phiên: '${sessionId}' không thành công`, error);
    console.log("Có lỗi xảy ra khi gán ao cho phiên", error);
    return { ok: false };
  }
};

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * Tổng hợp tiền của một phiên theo loại cá.
 * amount = totalNet × unitPrice làm tròn theo loại tiền (VND số nguyên, USD đến cent), totalNet chưa làm tròn; loại cá chưa có giá thì amount null
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
    // Phiên tạo trước khi có trường currency là VND
    const currency = session.currency ?? DEFAULT_CURRENCY;

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
          amount: unitPrice === null ? null : roundMoney(totalNet * unitPrice, currency),
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
          currency,
        },
        lines,
        totalNet: round2(lines.reduce((sum, line) => sum + line.totalNet, 0)),
        totalAmount: roundMoney(lines.reduce((sum, line) => sum + (line.amount ?? 0), 0), currency),
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
  updateSessionCurrency,
  updateSessionCrop,
};
