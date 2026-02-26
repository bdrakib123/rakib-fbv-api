const axios = require("axios");

// Basic header to avoid block
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
};

// Simple HTML video extractor
const extractVideo = async (url) => {
  const { data } = await axios.get(url, { headers });

  const videoRegex = /<meta property="og:video" content="(.*?)"/;
  const match = data.match(videoRegex);

  if (!match) throw new Error("Video not found");

  return match[1];
};

module.exports = { extractVideo };
