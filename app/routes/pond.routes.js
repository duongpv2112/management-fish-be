module.exports = (app) => {
  const pondController = require("../controllers/pond.controller");

  let router = require("express").Router();

  router.get("/getPonds", pondController.getPonds);

  router.post("/createPonds", pondController.createPonds);

  router.put("/updatePonds/:pondId", pondController.updatePonds);

  router.delete("/deletePonds/:pondId", pondController.deletePonds);

  app.use("/api/ponds", router);
};
