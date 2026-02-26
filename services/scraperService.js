const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const extractVideo = async (url) => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  );

  await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 60000
  });

  const videoUrl = await page.evaluate(() => {
    const video = document.querySelector("video");
    return video ? video.src : null;
  });

  await browser.close();

  if (!videoUrl) throw new Error("Video not found");

  return videoUrl;
};

module.exports = { extractVideo };
