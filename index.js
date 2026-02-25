const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// =======================
// Middlewares
// =======================
app.use(cors());
app.use(express.json());

// 🔎 DEBUG (Temporary - পরে চাইলে remove করো)
console.log("Loaded API_KEY:", process.env.API_KEY);

// =======================
// 🔐 API KEY PROTECTION
// =======================
app.use("/api", (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apikey;

  console.log("Incoming API Key:", apiKey); // Debug

  if (!apiKey) {
    return res.status(401).json({
      status: false,
      message: "API Key missing"
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      status: false,
      message: "Unauthorized! Invalid API Key"
    });
  }

  next();
});

// =======================
// Routes
// =======================
const routes = require("./routes/downloadRoutes");
app.use("/api", routes);

// =======================
// Home Route
// =======================
app.get("/", (req, res) => {
  res.json({
    status: true,
    message: "Rakib FBV API Running 🚀"
  });
});

// =======================
// 404 Handler
// =======================
app.use((req, res) => {
  res.status(404).json({
    status: false,
    message: "Route not found"
  });
});

// =======================
// Start Server
// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
