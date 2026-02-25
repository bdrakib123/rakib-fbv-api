const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// 🔐 API KEY PROTECTION
app.use("/api", (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apikey;

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      status: false,
      message: "Unauthorized! Invalid API Key"
    });
  }

  next();
});

// Routes
const routes = require("./routes/downloadRoutes");
app.use("/api", routes);

// Home
app.get("/", (req, res) => {
  res.json({
    status: true,
    message: "Rakib FBV API Running 🚀"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
