const express = require("express");
const router = express.Router();

const { downloadFacebook } = require("../controllers/facebookController");
const { downloadInstagram } = require("../controllers/instagramController");

router.get("/facebook", downloadFacebook);
router.get("/instagram", downloadInstagram);

module.exports = router;
