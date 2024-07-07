module.exports = (app) => {
  const basketTypeController = require("../controllers/basketType.controller");

  let router = require("express").Router();

  router.get("/getBasketTypes", basketTypeController.getBasketTypes);

  router.post("/createBasketTypes", basketTypeController.createBasketTypes);

  app.use("/api/basket-types", router);
};
