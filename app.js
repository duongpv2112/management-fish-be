require('dotenv').config();
const express = require("express");

const app = express();

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// simple route
app.get("/healtcheck", (req, res) => {
  res.send("Ok");
});

// set port, listen for requests
const PORT = process.env.NODE_PORT;

app.listen(PORT, (error) => {
  if (!error) console.log(`Server is running on port ${PORT}.`);
  else console.log("Error occurred, server can't start", error);
});
