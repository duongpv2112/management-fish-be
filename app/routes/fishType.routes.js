module.exports = (app) => {
  const fishTypeController = require("../controllers/fishType.controller");

  let router = require("express").Router();

  router.get("/getFishTypes", fishTypeController.getFishTypes);

  router.get("/getDataFish", fishTypeController.getDataFish);

  router.post("/createFishTypes", fishTypeController.createFishTypes);

  router.put("/updateFishTypes/:fishTypeId", fishTypeController.updateFishTypes);

  router.delete("/deleteFishTypes/:fishTypeId", fishTypeController.deleteFishTypes);

  app.use("/api/fish-types", router);
};
