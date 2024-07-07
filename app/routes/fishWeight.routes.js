module.exports = (app) => {
  const fishWeightController = require("../controllers/fishWeight.controller");

  let router = require("express").Router();

  router.get("/getFishWeights", fishWeightController.getFishWeights);

  router.post("/createFishWeights", fishWeightController.createFishWeights);

  router.put(
    "/createFishWeights/:fishWeightId",
    fishWeightController.deleteFishWeights
  );

  app.use("/api/fish-weights", router);
};
