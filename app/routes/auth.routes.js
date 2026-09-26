module.exports = (app) => {
  const authController = require("../controllers/auth.controller");

  let router = require("express").Router();

  router.post("/login", authController.login);

  app.use("/api/auth", router);
};
