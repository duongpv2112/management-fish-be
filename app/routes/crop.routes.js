module.exports = (app) => {
  const cropController = require("../controllers/crop.controller");

  let router = require("express").Router();

  router.get("/getCrops", cropController.getCrops);

  router.post("/createCrops", cropController.createCrops);

  router.put("/updateCrops/:cropId", cropController.updateCrops);

  router.put("/closeCrops/:cropId", cropController.closeCrops);

  router.put("/reopenCrops/:cropId", cropController.reopenCrops);

  router.delete("/deleteCrops/:cropId", cropController.deleteCrops);

  app.use("/api/crops", router);
};
