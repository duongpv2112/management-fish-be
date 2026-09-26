const express = require("express");
const cors = require("cors");

const app = express();

var corsOptions = {
  origin: "*",
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

require("./app/routes/fishType.routes")(app);
require("./app/routes/fishWeight.routes")(app);
require("./app/routes/basketType.routes")(app);
require("./app/routes/logTracking.routes")(app);
require("./app/routes/weighSession.routes")(app);

module.exports = app;
