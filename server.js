require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();

// set port, listen for requests
const PORT = process.env.NODE_PORT;
const USER_MONGODB = process.env.USER_MONGODB;
const PWD_MONGODB = process.env.PWD_MONGODB;

const corsOptions = {
  origin: "http://localhost:3001/", // Allow only this origin
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Allowed methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  credentials: true, // Allow credentials
  optionsSuccessStatus: 204, // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Replace the following with your MongoDB connection string
const dbURI = `mongodb+srv://${USER_MONGODB}:${PWD_MONGODB}@cluster0.w4zp0gf.mongodb.net/management-fish?retryWrites=true&w=majority&appName=Cluster0`;

// Kết nối tới MongoDB
mongoose
  .connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((result) =>
    app.listen(PORT, (error) => {
      if (!error) console.log(`Server is running on port ${PORT}.`);
      else console.log("Error occurred, server can't start", error);
    })
  )
  .catch((err) => console.log(err));

require("./app/routes/fishType.routes")(app);
require("./app/routes/fishWeight.routes")(app);
require("./app/routes/basketType.routes")(app);
require("./app/routes/logTracking.routes")(app);
