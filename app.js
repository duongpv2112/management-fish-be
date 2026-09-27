const express = require("express");
const cors = require("cors");
const requireAuth = require("./app/middlewares/requireAuth");

const app = express();

// Chạy sau proxy của Vercel: lấy IP thật của người dùng (dùng cho giới hạn số lần đăng nhập sai)
app.set("trust proxy", 1);

// Chỉ cho phép FE trên GitHub Pages và khi chạy dev
var corsOptions = {
  origin: ["https://duongpv2112.github.io", "http://localhost:3001"],
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Mọi API đều cần đăng nhập, trừ /api/auth/login
app.use(requireAuth);

require("./app/routes/auth.routes")(app);
require("./app/routes/fishType.routes")(app);
require("./app/routes/fishWeight.routes")(app);
require("./app/routes/basketType.routes")(app);
require("./app/routes/logTracking.routes")(app);
require("./app/routes/weighSession.routes")(app);
require("./app/routes/pond.routes")(app);

module.exports = app;
