require("dotenv").config();
const mongoose = require("mongoose");
const { assertRequiredEnv } = require("./app/config/env");
const { buildDbURI, requiredEnvNames } = require("./app/config/database");

// Thiếu biến môi trường bắt buộc thì không khởi động, tránh chạy mà không có bảo vệ
try {
  assertRequiredEnv(requiredEnvNames());
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const app = require("./app");

// set port, listen for requests
const PORT = process.env.NODE_PORT;

// Kết nối tới MongoDB
mongoose
  .connect(buildDbURI())
  .then((result) =>
    app.listen(PORT, (error) => {
      if (!error) console.log(`Server is running on port ${PORT}.`);
      else console.log("Error occurred, server can't start", error);
    })
  )
  .catch((err) => console.log(err));

module.exports = app;
