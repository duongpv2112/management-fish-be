module.exports = (app) => {
  const expenseController = require("../controllers/expense.controller");

  let router = require("express").Router();

  router.get("/getExpenses", expenseController.getExpenses);

  router.get("/getExpenseSuggestions", expenseController.getExpenseSuggestions);

  router.post("/createExpenses", expenseController.createExpenses);

  router.put("/updateExpenses/:expenseId", expenseController.updateExpenses);

  router.delete("/deleteExpenses/:expenseId", expenseController.deleteExpenses);

  app.use("/api/expenses", router);
};
