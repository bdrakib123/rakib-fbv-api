const express = require("express");
const router = express.Router();

const {
  facebookDownload,
  instagramDownload,
  autoDownload
} = require("../controllers/downloadController");

router.get("/facebook", facebookDownload);
router.get("/instagram", instagramDownload);
router.get("/download", autoDownload);

module.exports = router;
