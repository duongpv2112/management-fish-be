module.exports = (app) => {
  const weighSessionController = require("../controllers/weighSession.controller");

  let router = require("express").Router();

  router.get("/getWeighSessions", weighSessionController.getWeighSessions);

  router.get("/getOpenWeighSession", weighSessionController.getOpenWeighSession);

  router.get("/getSessionSummary/:sessionId", weighSessionController.getSessionSummary);

  router.post("/createWeighSessions", weighSessionController.createWeighSessions);

  router.put("/closeWeighSessions/:sessionId", weighSessionController.closeWeighSessions);

  router.put("/updateSessionPrices/:sessionId", weighSessionController.updateSessionPrices);

  router.put("/updateSessionCurrency/:sessionId", weighSessionController.updateSessionCurrency);

  app.use("/api/weigh-sessions", router);
};
