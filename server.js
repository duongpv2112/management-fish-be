require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const { buildDbURI } = require("./app/config/database");

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
