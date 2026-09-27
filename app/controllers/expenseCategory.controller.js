const expenseCategoryService = require("../services/expenseCategory.service");
const { sendResult } = require("../common/sendResult");

const getExpenseCategories = async (req, res) => {
  let result = await expenseCategoryService.getListExpenseCategory();
  sendResult(
    res,
    result ? { ok: true, data: result } : { ok: false },
    "Lấy danh sách nhóm chi thành công!",
    "Lấy danh sách nhóm chi không thành công!"
  );
};

const createExpenseCategories = async (req, res) => {
  sendResult(
    res,
    await expenseCategoryService.createExpenseCategory(req.body),
    "Tạo nhóm chi thành công!",
    "Tạo nhóm chi không thành công!"
  );
};

const updateExpenseCategories = async (req, res) => {
  sendResult(
    res,
    await expenseCategoryService.updateExpenseCategory(req.params.categoryId, req.body),
    "Cập nhật nhóm chi thành công!",
    "Cập nhật nhóm chi không thành công!"
  );
};

const deleteExpenseCategories = async (req, res) => {
  sendResult(
    res,
    await expenseCategoryService.deleteExpenseCategory(req.params.categoryId),
    "Xóa nhóm chi thành công!",
    "Xóa nhóm chi không thành công!"
  );
};

module.exports = {
  getExpenseCategories,
  createExpenseCategories,
  updateExpenseCategories,
  deleteExpenseCategories,
};
