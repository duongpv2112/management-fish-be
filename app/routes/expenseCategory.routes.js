module.exports = (app) => {
  const expenseCategoryController = require("../controllers/expenseCategory.controller");

  let router = require("express").Router();

  router.get("/getExpenseCategories", expenseCategoryController.getExpenseCategories);

  router.post("/createExpenseCategories", expenseCategoryController.createExpenseCategories);

  router.put("/updateExpenseCategories/:categoryId", expenseCategoryController.updateExpenseCategories);

  router.delete("/deleteExpenseCategories/:categoryId", expenseCategoryController.deleteExpenseCategories);

  app.use("/api/expense-categories", router);
};
