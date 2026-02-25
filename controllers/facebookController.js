const axios = require("axios");

exports.downloadFacebook = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Facebook URL is required"
    });
  }

  try {
    const api = `https://api.vreden.my.id/api/fbdl?url=${encodeURIComponent(url)}`;

    const response = await axios.get(api);

    res.json({
      status: true,
      creator: "Rakib FBV API",
      data: response.data.result
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to fetch Facebook video"
    });
  }
};
