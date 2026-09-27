const Crop = require("../models/crop");
const Expense = require("../models/expense");
const { loadCropReport, summarizeExpenses } = require("./cropReport.service");
const { toDateOnly } = require("../common/dateOnly");

const MESSAGE_INVALID_DATE = "Ngày không hợp lệ!";
const MESSAGE_INVALID_RANGE = "Ngày kết thúc không được trước ngày bắt đầu!";

// "YYYY-MM-DD" → Date (00:00 UTC); bỏ trống → fallback; sai → null
const readDate = (value, fallback) =>
  value === undefined || value === null || value === "" ? fallback : toDateOnly(String(value));

const formatDay = (date) => date.toISOString().slice(0, 10);

const toRow = (report) => ({
  crop: report.crop,
  revenue: report.revenue.total,
  expense: report.expense.total,
  profit: report.profit,
});

/**
 * Lãi ròng cả nhà trong một kỳ: lãi các vụ kết thúc trong kỳ (+ vụ đang nuôi nếu includeOpen) − chi phí chung.
 * @param {{ from?: string, to?: string, includeOpen?: string|number }} query bỏ trống ngày → năm hiện tại (giờ Việt Nam)
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const getOverview = async ({ from, to, includeOpen } = {}) => {
  try {
    const year = toDateOnly().getUTCFullYear();
    const fromDate = readDate(from, new Date(Date.UTC(year, 0, 1)));
    const toDate = readDate(to, new Date(Date.UTC(year, 11, 31)));
    if (!fromDate || !toDate) return { ok: false, message: MESSAGE_INVALID_DATE };
    if (fromDate > toDate) return { ok: false, message: MESSAGE_INVALID_RANGE };
    const withOpen = String(includeOpen) === "1";

    const [closedCrops, openCrops, commonExpenses] = await Promise.all([
      Crop.find({ isDelete: false, status: "closed", endDate: { $gte: fromDate, $lte: toDate } })
        .sort({ endDate: 1, createdAt: 1 })
        .populate("pond"),
      Crop.find({ isDelete: false, status: "open" }).sort({ startDate: 1, createdAt: 1 }).populate("pond"),
      // Lấy cả nhóm chi đã xóa mềm để khoản chi cũ vẫn có tên nhóm
      Expense.find({ crop: null, isDelete: false, date: { $gte: fromDate, $lte: toDate } }).populate("category"),
    ]);
    const [closedReports, openReports] = await Promise.all([
      Promise.all(closedCrops.map(loadCropReport)),
      Promise.all(openCrops.map(loadCropReport)),
    ]);

    const counted = withOpen ? [...closedReports, ...openReports] : closedReports;
    const cropsTotal = counted.reduce(
      (total, report) => ({
        revenue: total.revenue + report.revenue.total,
        expense: total.expense + report.expense.total,
        profit: total.profit + report.profit,
      }),
      { revenue: 0, expense: 0, profit: 0 }
    );
    const commonExpense = summarizeExpenses(commonExpenses);

    return {
      ok: true,
      data: {
        period: { from: formatDay(fromDate), to: formatDay(toDate) },
        crops: closedReports.map(toRow),
        openCrops: openReports.map(toRow),
        cropsTotal,
        commonExpense,
        netProfit: cropsTotal.profit - commonExpense.total,
        excludedForeignCurrency: counted.reduce((sum, report) => sum + report.revenue.excludedForeignCurrency, 0),
        includeOpen: withOpen,
      },
    };
  } catch (error) {
    console.log("Có lỗi xảy ra khi lập báo cáo tổng", error);
    return { ok: false };
  }
};

module.exports = { getOverview };
