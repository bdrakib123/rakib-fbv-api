const { extractVideo } = require("../services/scraperService");

// FACEBOOK
exports.facebookDownload = async (req, res) => {
  const { url } = req.query;
  if (!url)
    return res.status(400).json({ status: false, message: "URL required" });

  try {
    const video = await extractVideo(url);

    res.json({
      status: true,
      platform: "facebook",
      video
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message
    });
  }
};

// INSTAGRAM
exports.instagramDownload = async (req, res) => {
  const { url } = req.query;
  if (!url)
    return res.status(400).json({ status: false, message: "URL required" });

  try {
    const video = await extractVideo(url);

    res.json({
      status: true,
      platform: "instagram",
      video
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message
    });
  }
};

// AUTO DETECT
exports.autoDownload = async (req, res) => {
  const { url } = req.query;
  if (!url)
    return res.status(400).json({ status: false, message: "URL required" });

  try {
    let platform = "";

    if (url.includes("facebook.com")) platform = "facebook";
    else if (url.includes("instagram.com")) platform = "instagram";
    else
      return res.status(400).json({
        status: false,
        message: "Unsupported platform"
      });

    const video = await extractVideo(url);

    res.json({
      status: true,
      platform,
      video
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message
    });
  }
};
