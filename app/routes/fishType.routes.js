module.exports = (app) => {
  const fishTypeController = require("../controllers/fishType.controller");

  let router = require("express").Router();

  router.get("/getFishTypes", fishTypeController.getFishTypes);

  router.post("/createFishTypes", fishTypeController.createFishTypes);

  app.use("/api/fish-types", router);
};
