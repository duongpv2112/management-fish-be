const expenseService = require("../services/expense.service");
const { sendResult } = require("../common/sendResult");

const getExpenses = async (req, res) => {
  let result = await expenseService.getListExpense(req.query);
  sendResult(
    res,
    result ? { ok: true, data: result } : { ok: false },
    "Lấy danh sách khoản chi thành công!",
    "Lấy danh sách khoản chi không thành công!"
  );
};

const createExpenses = async (req, res) => {
  sendResult(res, await expenseService.createExpense(req.body), "Thêm khoản chi thành công!", "Thêm khoản chi không thành công!");
};

const updateExpenses = async (req, res) => {
  sendResult(
    res,
    await expenseService.updateExpense(req.params.expenseId, req.body),
    "Cập nhật khoản chi thành công!",
    "Cập nhật khoản chi không thành công!"
  );
};

const deleteExpenses = async (req, res) => {
  sendResult(
    res,
    await expenseService.deleteExpense(req.params.expenseId),
    "Xóa khoản chi thành công!",
    "Xóa khoản chi không thành công!"
  );
};

const getExpenseSuggestions = async (req, res) => {
  sendResult(
    res,
    await expenseService.getExpenseSuggestions(req.query.categoryId),
    "Lấy gợi ý thành công!",
    "Lấy gợi ý không thành công!"
  );
};

module.exports = {
  getExpenses,
  createExpenses,
  updateExpenses,
  deleteExpenses,
  getExpenseSuggestions,
};
