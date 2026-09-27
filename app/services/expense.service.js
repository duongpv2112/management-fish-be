const Expense = require("../models/expense");
const ExpenseCategory = require("../models/expenseCategory");
const Crop = require("../models/crop");
const LogTracking = require("../models/logTracking");
const logTrackingService = require("../services/logTracking.service");
const { toDateOnly } = require("../common/dateOnly");

const MESSAGE_INVALID_AMOUNT = "Số tiền phải lớn hơn 0!";
const MESSAGE_INVALID_QUANTITY = "Số lượng không hợp lệ!";
const MESSAGE_INVALID_UNIT_PRICE = "Đơn giá không hợp lệ!";
const MESSAGE_INVALID_KG_PER_UNIT = "Số kg mỗi đơn vị không hợp lệ!";
const MESSAGE_INVALID_DATE = "Ngày không hợp lệ!";
const MESSAGE_NOT_FOUND = "Không tìm thấy dữ liệu!";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_SUGGESTIONS = 10;

// Kèm tên nhóm chi và tên ao (lấy cả bản ghi đã xóa mềm để khoản chi cũ vẫn hiện tên)
const POPULATE = [{ path: "category" }, { path: "crop", populate: { path: "pond" } }];

const INVALID = Symbol("invalid");

const writeLog = async (stepName, data) => {
  let logTracking = new LogTracking({
    fishTypeName: "",
    stepName: stepName,
    data: data,
  });
  _ = await logTrackingService.createLogTracking(logTracking);
};

const fail = async (stepName, message) => {
  await writeLog(stepName, { message });
  return { ok: false, message };
};

const formatVnd = (amount) => `${new Intl.NumberFormat("vi-VN").format(amount)} đ`;

// Số tùy chọn: bỏ trống → null; có nhập thì phải là số thỏa isValid, không thì INVALID
const optionalNumber = (value, isValid) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && isValid(number) ? number : INVALID;
};

/**
 * Kiểm tra và chuẩn hóa dữ liệu khoản chi. Có cả số lượng và đơn giá thì số tiền = số lượng × đơn giá.
 * @returns {Promise<{ data } | { message }>}
 */
const readExpense = async (expenseData, currentCategoryId = null) => {
  const quantity = optionalNumber(expenseData?.quantity, (n) => n > 0);
  if (quantity === INVALID) return { message: MESSAGE_INVALID_QUANTITY };
  const unitPrice = optionalNumber(expenseData?.unitPrice, (n) => n >= 0);
  if (unitPrice === INVALID) return { message: MESSAGE_INVALID_UNIT_PRICE };
  const kgPerUnit = optionalNumber(expenseData?.kgPerUnit, (n) => n > 0);
  if (kgPerUnit === INVALID) return { message: MESSAGE_INVALID_KG_PER_UNIT };

  const amount =
    quantity !== null && unitPrice !== null
      ? Math.round(quantity * unitPrice)
      : Math.round(Number(expenseData?.amount));
  if (!(amount > 0)) return { message: MESSAGE_INVALID_AMOUNT };

  const date = toDateOnly(expenseData?.date);
  if (!date) return { message: MESSAGE_INVALID_DATE };

  // Khi sửa, giữ nguyên nhóm cũ vẫn được dù nhóm đó đã bị xóa mềm; chọn nhóm khác thì nhóm phải còn dùng
  const keepsCategory = currentCategoryId !== null && expenseData?.categoryId === currentCategoryId;
  const category = await ExpenseCategory.findOne(
    keepsCategory ? { _id: currentCategoryId } : { _id: expenseData?.categoryId, isDelete: false }
  );
  if (!category) return { message: MESSAGE_NOT_FOUND };

  const cropId = expenseData?.cropId || null;
  if (cropId && !(await Crop.exists({ _id: cropId, isDelete: false }))) return { message: MESSAGE_NOT_FOUND };

  return {
    data: {
      date,
      category: category._id,
      crop: cropId,
      description: (expenseData?.description ?? "").toString().trim(),
      quantity,
      unit: (expenseData?.unit ?? "").toString().trim(),
      unitPrice,
      kgPerUnit,
      amount,
      note: (expenseData?.note ?? "").toString().trim(),
    },
    categoryName: category.categoryName,
  };
};

// "YYYY-MM-DD" → Date, bỏ trống/sai định dạng → undefined (không lọc)
const filterDate = (value) => (value ? toDateOnly(String(value)) ?? undefined : undefined);

const buildFilter = ({ cropId, common, categoryId, from, to } = {}) => {
  const filter = { isDelete: false };
  if (String(common) === "1") filter.crop = null;
  else if (cropId) filter.crop = String(cropId);
  if (categoryId) filter.category = String(categoryId);
  const fromDate = filterDate(from);
  const toDate = filterDate(to);
  if (fromDate || toDate) {
    filter.date = {};
    if (fromDate) filter.date.$gte = fromDate;
    if (toDate) filter.date.$lte = toDate;
  }
  return filter;
};

const clampInt = (value, fallback, min, max) => {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

/**
 * @param {{ cropId?, common?, categoryId?, from?, to?, page?, pageSize? }} query
 * @returns {Promise<{ items, total, totalAmount, page, pageSize } | undefined>}
 */
const getListExpense = async (query = {}) => {
  try {
    const filter = buildFilter(query);
    const pageSize = clampInt(query.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
    const page = clampInt(query.page, 1, 1, Number.MAX_SAFE_INTEGER);

    const [items, total, sums] = await Promise.all([
      Expense.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate(POPULATE),
      Expense.countDocuments(filter),
      Expense.aggregate([{ $match: filter }, { $group: { _id: null, totalAmount: { $sum: "$amount" } } }]),
    ]);
    return { items, total, totalAmount: sums[0]?.totalAmount ?? 0, page, pageSize };
  } catch (error) {
    await writeLog("Có lỗi xảy ra khi lấy danh sách khoản chi!", error);
    console.log("Có lỗi xảy ra khi lấy danh sách khoản chi", error);
  }
};

/**
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const createExpense = async (expenseData) => {
  const step = "Thêm khoản chi không thành công";
  try {
    const { data, message, categoryName } = await readExpense(expenseData);
    if (message) return await fail(step, message);

    const expense = await Expense.create(data);
    await writeLog(`Thêm khoản chi: '${categoryName}' ${formatVnd(expense.amount)} thành công`, expense);
    return { ok: true, data: expense };
  } catch (error) {
    await writeLog(step, error);
    console.log("Có lỗi xảy ra khi thêm khoản chi", error);
    return { ok: false };
  }
};

/**
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const updateExpense = async (expenseId, expenseData) => {
  const step = `Cập nhật khoản chi: '${expenseId}' không thành công`;
  try {
    const expense = await Expense.findOne({ _id: expenseId, isDelete: false });
    if (!expense) return await fail(step, MESSAGE_NOT_FOUND);

    const { data, message, categoryName } = await readExpense(expenseData, expense.category);
    if (message) return await fail(step, message);

    Object.assign(expense, data);
    let result = await expense.save();
    await writeLog(`Cập nhật khoản chi: '${categoryName}' ${formatVnd(result.amount)} thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(step, error);
    console.log("Có lỗi xảy ra khi cập nhật khoản chi", error);
    return { ok: false };
  }
};

/**
 * Xóa mềm khoản chi
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const deleteExpense = async (expenseId) => {
  const step = `Xóa khoản chi: '${expenseId}' không thành công`;
  try {
    let result = await Expense.findOneAndUpdate({ _id: expenseId, isDelete: false }, { isDelete: true }, { new: true });
    if (!result) return await fail(step, MESSAGE_NOT_FOUND);
    await writeLog(`Xóa khoản chi: ${formatVnd(result.amount)} thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(step, error);
    console.log("Có lỗi xảy ra khi xóa khoản chi", error);
    return { ok: false };
  }
};

/**
 * Mô tả đã dùng gần đây của một nhóm chi (khác nhau, mới nhất trước) kèm đơn vị/đơn giá/kg của lần gần nhất
 * @returns {Promise<{ ok: true, data: { description, unit, unitPrice, kgPerUnit }[] } | { ok: false }>}
 */
const getExpenseSuggestions = async (categoryId) => {
  try {
    const recent = await Expense.find({ category: categoryId, isDelete: false, description: { $ne: "" } })
      .sort({ date: -1, createdAt: -1 })
      .limit(200);
    const seen = new Set();
    const data = [];
    for (const expense of recent) {
      const key = expense.description.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const { description, unit, unitPrice, kgPerUnit } = expense;
      data.push({ description, unit, unitPrice, kgPerUnit });
      if (data.length === MAX_SUGGESTIONS) break;
    }
    return { ok: true, data };
  } catch (error) {
    console.log("Có lỗi xảy ra khi lấy gợi ý khoản chi", error);
    return { ok: false };
  }
};

module.exports = {
  getListExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSuggestions,
};
