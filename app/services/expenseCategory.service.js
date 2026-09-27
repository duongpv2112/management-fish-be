const ExpenseCategory = require("../models/expenseCategory");
const { EXPENSE_METRICS } = require("../models/expenseCategory");
const LogTracking = require("../models/logTracking");
const logTrackingService = require("../services/logTracking.service");

const MESSAGE_EMPTY_NAME = "Tên nhóm chi không được để trống!";
const MESSAGE_DUPLICATE_NAME = "Tên nhóm chi đã tồn tại!";
const MESSAGE_INVALID_METRIC = "Nhóm dùng để tính không hợp lệ!";
const MESSAGE_NOT_FOUND = "Không tìm thấy dữ liệu!";

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// So sánh tên sau khi trim, không phân biệt hoa thường
const nameFilter = (name) => ({
  categoryName: new RegExp(`^${escapeRegExp(name)}$`, "i"),
});

const writeLog = async (stepName, data) => {
  let logTracking = new LogTracking({
    fishTypeName: "",
    stepName: stepName,
    data: data,
  });
  _ = await logTrackingService.createLogTracking(logTracking);
};

const readInput = (categoryData) => ({
  categoryName: (categoryData?.categoryName ?? "").toString().trim(),
  metric: categoryData?.metric ?? "none",
});

// Kiểm tra dữ liệu đầu vào chung cho thêm/sửa; trả message lỗi hoặc null
const validateCategory = ({ categoryName, metric }) => {
  if (!categoryName) return MESSAGE_EMPTY_NAME;
  if (!EXPENSE_METRICS.includes(metric)) return MESSAGE_INVALID_METRIC;
  return null;
};

// Lỗi nghiệp vụ: ghi log rồi trả { ok: false, message }
const fail = async (stepName, message) => {
  await writeLog(stepName, { message });
  return { ok: false, message };
};

const getListExpenseCategory = async () => {
  try {
    return await ExpenseCategory.find({ isDelete: false }).sort({ createdAt: 1 });
  } catch (error) {
    await writeLog("Có lỗi xảy ra lấy danh sách nhóm chi!", error);
    console.log("Có lỗi xảy ra lấy danh sách nhóm chi", error);
  }
};

/**
 * Thêm nhóm chi. Nếu đã có nhóm cùng tên nhưng đã xóa mềm thì khôi phục bản ghi cũ.
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const createExpenseCategory = async (categoryData) => {
  const input = readInput(categoryData);
  const step = `Thêm mới nhóm chi: '${input.categoryName}' không thành công`;

  try {
    const invalidMessage = validateCategory(input);
    if (invalidMessage) return await fail(step, invalidMessage);

    if (await ExpenseCategory.exists({ ...nameFilter(input.categoryName), isDelete: false })) {
      return await fail(step, MESSAGE_DUPLICATE_NAME);
    }

    const deleted = await ExpenseCategory.findOne({ ...nameFilter(input.categoryName), isDelete: true });
    if (deleted) {
      Object.assign(deleted, input, { isDelete: false });
      let result = await deleted.save();
      await writeLog(`Khôi phục nhóm chi: '${input.categoryName}' thành công`, result);
      return { ok: true, data: result };
    }

    let result = await ExpenseCategory.create(input);
    await writeLog(`Thêm mới nhóm chi: '${input.categoryName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(step, error);
    console.log("Có lỗi xảy ra khi thêm nhóm chi", error);
    if (error?.code === 11000) return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    return { ok: false };
  }
};

/**
 * Sửa tên và "dùng để tính" của nhóm chi
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const updateExpenseCategory = async (categoryId, categoryData) => {
  const input = readInput(categoryData);
  const step = `Cập nhật nhóm chi: '${categoryId}' không thành công`;

  try {
    const invalidMessage = validateCategory(input);
    if (invalidMessage) return await fail(step, invalidMessage);

    const category = await ExpenseCategory.findOne({ _id: categoryId, isDelete: false });
    if (!category) return await fail(step, MESSAGE_NOT_FOUND);

    if (
      await ExpenseCategory.exists({ ...nameFilter(input.categoryName), isDelete: false, _id: { $ne: categoryId } })
    ) {
      return await fail(step, MESSAGE_DUPLICATE_NAME);
    }

    const oldName = category.categoryName;
    Object.assign(category, input);
    let result = await category.save();
    await writeLog(`Cập nhật nhóm chi: '${oldName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(step, error);
    console.log("Có lỗi xảy ra khi cập nhật nhóm chi", error);
    // Trùng với tên của một nhóm đã xóa (unique index)
    if (error?.code === 11000) return { ok: false, message: MESSAGE_DUPLICATE_NAME };
    return { ok: false };
  }
};

/**
 * Xóa mềm nhóm chi; khoản chi cũ vẫn giữ tên nhóm
 * @returns {Promise<{ ok: true, data } | { ok: false, message? }>}
 */
const deleteExpenseCategory = async (categoryId) => {
  const step = `Xóa nhóm chi: '${categoryId}' không thành công`;
  try {
    let result = await ExpenseCategory.findOneAndUpdate(
      { _id: categoryId, isDelete: false },
      { isDelete: true },
      { new: true }
    );
    if (!result) return await fail(step, MESSAGE_NOT_FOUND);
    await writeLog(`Xóa nhóm chi: '${result.categoryName}' thành công`, result);
    return { ok: true, data: result };
  } catch (error) {
    await writeLog(step, error);
    console.log("Có lỗi xảy ra khi xóa nhóm chi", error);
    return { ok: false };
  }
};

module.exports = {
  getListExpenseCategory,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
};
