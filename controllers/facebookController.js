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

    console.log("External API Response:", response.data);

    if (!response.data || !response.data.result) {
      return res.status(500).json({
        status: false,
        message: "External API returned invalid data",
        raw: response.data
      });
    }

    res.json({
      status: true,
      creator: "Rakib FBV API",
      data: response.data.result
    });

  } catch (error) {
    console.log("Facebook API Error:", error.message);

    res.status(500).json({
      status: false,
      message: "External API request failed",
      error: error.message
    });
  }
};
