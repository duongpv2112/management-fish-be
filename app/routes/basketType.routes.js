module.exports = (app) => {
  const basketTypeController = require("../controllers/basketType.controller");

  let router = require("express").Router();

  router.get("/getBasketTypes", basketTypeController.getBasketTypes);

  router.post("/createBasketTypes", basketTypeController.createBasketTypes);

  router.put("/updateBasketTypes/:basketTypeId", basketTypeController.updateBasketTypes);

  router.delete("/deleteBasketTypes/:basketTypeId", basketTypeController.deleteBasketTypes);

  app.use("/api/basket-types", router);
};
