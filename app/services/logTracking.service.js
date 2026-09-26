const LogTracking = require("../models/logTracking");

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const toInteger = (value, fallback) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
};

/**
 * Nhật ký phân trang ở server, mới nhất trước
 * @param {{ fishType?: string, page?: number|string, pageSize?: number|string }} query
 * @returns {Promise<{ items, total, page, pageSize } | undefined>}
 */
const getListLogTracking = async ({ fishType, page, pageSize } = {}) => {
  try {
    const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, toInteger(pageSize, DEFAULT_PAGE_SIZE)));
    const safePage = Math.max(1, toInteger(page, 1));
    // So khớp chính xác (không dùng regex) nên ký tự đặc biệt không gây lỗi
    const filter = fishType && fishType !== "" ? { fishTypeName: String(fishType) } : {};

    const [items, total] = await Promise.all([
      LogTracking.find(filter)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safePageSize)
        .limit(safePageSize),
      LogTracking.countDocuments(filter),
    ]);
    return { items, total, page: safePage, pageSize: safePageSize };
  } catch (error) {
    console.log("Có lỗi xảy ra khi lấy danh sách log", error);
  }
};

const createLogTracking = async (logTrackingData) => {
  const logTracking = new LogTracking();
  logTracking.fishTypeName = logTrackingData.fishTypeName;
  logTracking.stepName = logTrackingData.stepName;
  logTracking.data = logTrackingData.data;

  try {
    return await logTracking.save();
  } catch (error) {
    console.log("Có lỗi xảy ra khi thêm log", error);
  }
};

module.exports = {
  getListLogTracking,
  createLogTracking,
};
