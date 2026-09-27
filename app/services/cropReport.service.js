const Crop = require("../models/crop");
const WeighSession = require("../models/weighSession");
const Expense = require("../models/expense");
const weighSessionService = require("./weighSession.service");
const { toDateOnly } = require("../common/dateOnly");
const { DEFAULT_CURRENCY } = require("../config/currency");

const MESSAGE_NOT_FOUND = "Không tìm thấy dữ liệu!";
const REPORT_CURRENCY = "VND";
const DAY_MS = 86400000;

const round1 = (value) => Math.round(value * 10) / 10;
const round2 = (value) => Math.round(value * 100) / 100;
const normalizeUnit = (unit) => (unit ?? "").trim().toLowerCase();

// Cộng số lượng theo đơn vị (chữ thường), sắp theo đơn vị a→z; khoản không có số lượng bỏ qua
const sumByUnit = (expenses) => {
  const totals = new Map();
  for (const expense of expenses) {
    if (expense.quantity === null || expense.quantity === undefined) continue;
    const unit = normalizeUnit(expense.unit);
    totals.set(unit, (totals.get(unit) ?? 0) + expense.quantity);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "vi"))
    .map(([unit, quantity]) => ({ unit, quantity: round2(quantity) }));
};

// Tổng kg thức ăn; null nếu có khoản không quy ra kg được (thiếu số lượng, hoặc không phải kg mà thiếu kg/đơn vị)
const feedKgOf = (feedExpenses) => {
  if (feedExpenses.length === 0) return null;
  let total = 0;
  for (const expense of feedExpenses) {
    if (expense.quantity === null || expense.quantity === undefined) return null;
    if (normalizeUnit(expense.unit) === "kg") total += expense.quantity;
    else if (expense.kgPerUnit) total += expense.quantity * expense.kgPerUnit;
    else return null;
  }
  return round2(total);
};

const categoryInfo = (category) => ({
  _id: category?._id ?? null,
  categoryName: category?.categoryName ?? "",
  metric: category?.metric ?? "none",
});

/**
 * Tổng chi và chi theo nhóm (sắp giảm dần, phần trăm 1 chữ số) — dùng cho báo cáo vụ và chi phí chung.
 * @param {object[]} expenses khoản chi đã populate category
 * @returns {{ total: number, byCategory: { category, amount, percent, count }[] }}
 */
const summarizeExpenses = (expenses) => {
  const byCategoryMap = new Map();
  for (const expense of expenses) {
    const info = categoryInfo(expense.category);
    const entry = byCategoryMap.get(info._id) ?? { category: info, amount: 0, count: 0 };
    entry.amount += expense.amount;
    entry.count += 1;
    byCategoryMap.set(info._id, entry);
  }
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const byCategory = [...byCategoryMap.values()]
    .sort((a, b) => b.amount - a.amount)
    .map(({ category, amount, count }) => ({
      category,
      amount,
      percent: round1((amount / total) * 100),
      count,
    }));
  return { total, byCategory };
};

/**
 * Báo cáo thu – chi – lãi của một vụ từ dữ liệu đã tải (hàm thuần, không truy cập DB).
 * @param {{ crop, sessions: object[], expenses: object[], today?: Date }} input
 *   sessions: kết quả summarizeSession; expenses: khoản chi đã populate category
 */
const buildCropReport = ({ crop, sessions, expenses, today = new Date() }) => {
  const vndSessions = sessions.filter((summary) => (summary.session.currency ?? DEFAULT_CURRENCY) === REPORT_CURRENCY);
  const revenueTotal = vndSessions.reduce((sum, summary) => sum + summary.totalAmount, 0);
  const totalNetKg = round2(vndSessions.reduce((sum, summary) => sum + summary.totalNet, 0));

  const { total: expenseTotal, byCategory } = summarizeExpenses(expenses);

  const withMetric = (metric) => expenses.filter((expense) => categoryInfo(expense.category).metric === metric);
  const feedKg = feedKgOf(withMetric("feed"));

  const startDay = toDateOnly(crop.startDate);
  const endDay = crop.status === "closed" && crop.endDate ? toDateOnly(crop.endDate) : toDateOnly(today);

  return {
    crop: {
      _id: crop._id,
      cropName: crop.cropName,
      pond: { _id: crop.pond?._id ?? null, pondName: crop.pond?.pondName ?? "" },
      startDate: crop.startDate,
      endDate: crop.endDate ?? null,
      status: crop.status,
      days: Math.max(0, Math.round((endDay - startDay) / DAY_MS)),
    },
    revenue: {
      total: revenueTotal,
      sessions: vndSessions.map((summary) => ({
        _id: summary.session._id,
        sessionName: summary.session.sessionName,
        buyerName: summary.session.buyerName,
        createdAt: summary.session.createdAt,
        status: summary.session.status,
        totalNet: summary.totalNet,
        amount: summary.totalAmount,
        missingPrice: summary.missingPriceCount > 0,
      })),
      excludedForeignCurrency: sessions.length - vndSessions.length,
    },
    expense: { total: expenseTotal, byCategory },
    profit: revenueTotal - expenseTotal,
    metrics: {
      totalNetKg,
      costPerKg: totalNetKg > 0 ? Math.round(expenseTotal / totalNetKg) : null,
      seedQuantities: sumByUnit(withMetric("seed")),
      feedQuantities: sumByUnit(withMetric("feed")),
      feedKg,
      fcr: feedKg !== null && totalNetKg > 0 ? round2(feedKg / totalNetKg) : null,
    },
  };
};

/**
 * Tải phiên bán và khoản chi của một vụ rồi lập báo cáo.
 * @param {object} crop vụ đã populate pond
 */
const loadCropReport = async (crop) => {
  const sessionDocs = await WeighSession.find({ crop: crop._id, isDelete: false }).sort({ createdAt: 1 });
  const sessions = await Promise.all(sessionDocs.map((session) => weighSessionService.summarizeSession(session)));
  // Lấy cả nhóm chi đã xóa mềm để khoản chi cũ vẫn có tên nhóm
  const expenses = await Expense.find({ crop: crop._id, isDelete: false }).populate("category");
  return buildCropReport({ crop, sessions, expenses });
};

/**
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const getCropReport = async (cropId) => {
  try {
    const crop = await Crop.findOne({ _id: cropId, isDelete: false }).populate("pond");
    if (!crop) return { ok: false, message: MESSAGE_NOT_FOUND };
    return { ok: true, data: await loadCropReport(crop) };
  } catch (error) {
    console.log("Có lỗi xảy ra khi lập báo cáo vụ nuôi", error);
    return { ok: false };
  }
};

module.exports = { buildCropReport, summarizeExpenses, loadCropReport, getCropReport };
