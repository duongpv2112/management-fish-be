module.exports = (app) => {
  const logTrackingController = require("../controllers/logTracking.controller");

  let router = require("express").Router();

  router.get("/getLogTrackings", logTrackingController.getLogTrackings);

  app.use("/api/log-trackings", router);
};
