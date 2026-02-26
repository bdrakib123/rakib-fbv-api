const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const extractVideo = async (url) => {
  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
    timeout: 0
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  );

  let videoUrl = null;

  page.on("response", async (response) => {
    const resUrl = response.url();
    if (resUrl.includes(".mp4")) {
      videoUrl = resUrl;
    }
  });

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  await new Promise(resolve => setTimeout(resolve, 4000));

  await browser.close();

  if (!videoUrl) throw new Error("Video not found");

  return videoUrl;
};

module.exports = { extractVideo };
