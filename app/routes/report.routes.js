module.exports = (app) => {
  const reportController = require("../controllers/report.controller");

  let router = require("express").Router();

  router.get("/getOverview", reportController.getOverview);

  app.use("/api/reports", router);
};
