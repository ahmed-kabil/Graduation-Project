const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require('dotenv').config();

const url = process.env.DATABASE_URL ;

 
const app = express();
const port = process.env.PORT || 7020;

// Middlewares
app.use(cors());
app.use(express.json()); // parse JSON bodies


// Routers
const readings_Router = require("./routers/readings_router");
app.use("/api/readings/", readings_Router);


// Connect to MongoDB
mongoose.connect(url)
  .then(() => {
    console.log("✅ Connected to the DB");
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });
  })
  .catch((err) => console.error("❌ DB Connection Error:", err));