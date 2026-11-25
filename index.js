"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("node:crypto");
const {
  validateFacebookUrl,
  extractFacebookVideo
} = require("./services/facebookExtractor");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.API_KEY || "";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.disable("x-powered-by");
app.use(cors({
  origin: CORS_ORIGIN === "*" ? "*" : CORS_ORIGIN.split(",").map(value => value.trim())
}));
app.use(express.json({ limit: "16kb" }));

function requireApiKey(req, res, next) {
  if (!API_KEY) {
    return res.status(503).json({
      status: false,
      error: "API_KEY is not configured on the server"
    });
  }

  const supplied = req.get("x-api-key") || "";
  const expectedBuffer = Buffer.from(API_KEY);
  const suppliedBuffer = Buffer.from(supplied);

  const valid = expectedBuffer.length === suppliedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);

  if (!valid) {
    return res.status(401).json({
      status: false,
      error: "Missing or invalid API key"
    });
  }

  next();
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

app.get("/", (_req, res) => {
  res.json({
    status: true,
    name: "Rakib Facebook Video API",
    version: "2.0.0",
    endpoints: ["/health", "/api/facebook?url=FACEBOOK_URL", "/api/facebook/download?url=FACEBOOK_URL"]
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: true, service: "rakib-fbv-api" });
});

app.get("/api/facebook", requireApiKey, asyncRoute(async (req, res) => {
  const url = validateFacebookUrl(req.query.url);
  const video = await extractFacebookVideo(url);

  res.json({
    status: true,
    platform: "facebook",
    ...video
  });
}));

app.get("/api/facebook/download", requireApiKey, asyncRoute(async (req, res) => {
  const url = validateFacebookUrl(req.query.url);
  const video = await extractFacebookVideo(url);

  res.redirect(302, video.videoUrl);
}));

app.use((req, res) => {
  res.status(404).json({ status: false, error: "Endpoint not found" });
});

app.use((error, _req, res, _next) => {
  const status = Number(error.status) || 500;
  if (status >= 500) {
    console.error("[api-error]", error.message);
  }

  res.status(status).json({
    status: false,
    error: status >= 500 ? "Video extraction failed. The video may be private, unavailable, or blocked by Facebook." : error.message
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Rakib Facebook Video API listening on port " + PORT);
});

module.exports = { app, requireApiKey };
