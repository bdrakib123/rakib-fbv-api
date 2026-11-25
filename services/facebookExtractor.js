"use strict";

const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "mbasic.facebook.com",
  "web.facebook.com",
  "fb.watch"
]);

function isFacebookHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return FACEBOOK_HOSTS.has(host) ||
    host.endsWith(".facebook.com") ||
    host === "fb.watch";
}

function validateFacebookUrl(value) {
  if (typeof value !== "string" || value.length < 12 || value.length > 4096) {
    const error = new Error("A valid Facebook video URL is required");
    error.status = 400;
    throw error;
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    const error = new Error("Invalid URL");
    error.status = 400;
    throw error;
  }

  if (
    parsed.protocol !== "https:" ||
    !isFacebookHost(parsed.hostname) ||
    parsed.username ||
    parsed.password ||
    parsed.port
  ) {
    const error = new Error("Only HTTPS Facebook video URLs are supported");
    error.status = 400;
    throw error;
  }

  return parsed.toString();
}

function isAllowedMediaUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();

    return parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      (host === "fbcdn.net" || host.endsWith(".fbcdn.net"));
  } catch {
    return false;
  }
}

function isAllowedPageRequest(value) {
  try {
    const parsed = new URL(value);
    if (["data:", "blob:", "about:"].includes(parsed.protocol)) return true;
    if (parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase();
    return isFacebookHost(host) ||
      host === "fbcdn.net" ||
      host.endsWith(".fbcdn.net") ||
      host === "fbsbx.com" ||
      host.endsWith(".fbsbx.com");
  } catch {
    return false;
  }
}

async function extractFacebookVideo(inputUrl) {
  const url = validateFacebookUrl(inputUrl);
  let browser;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(18000);

    await page.setRequestInterception(true);
    page.on("request", request => {
      if (isAllowedPageRequest(request.url())) {
        request.continue().catch(() => {});
      } else {
        request.abort().catch(() => {});
      }
    });

    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    const finalUrl = page.url();
    if (!isFacebookHost(new URL(finalUrl).hostname)) {
      const error = new Error("Facebook redirected to an unsupported page");
      error.status = 422;
      throw error;
    }

    await page.waitForFunction(() => {
      const video = document.querySelector("video");
      const meta = document.querySelector('meta[property="og:video"], meta[property="og:video:url"]');
      return Boolean((video && (video.currentSrc || video.src)) || (meta && meta.content));
    }, { timeout: 18000 }).catch(() => {});

    const result = await page.evaluate(() => {
      const video = document.querySelector("video");
      const meta = selector => document.querySelector(selector)?.content || "";

      const candidates = [
        video?.currentSrc,
        video?.src,
        video?.querySelector("source")?.src,
        meta('meta[property="og:video"]'),
        meta('meta[property="og:video:url"]'),
        meta('meta[name="twitter:player:stream"]')
      ].filter(Boolean);

      const resources = performance.getEntriesByType("resource")
        .map(entry => entry.name)
        .filter(value => value.includes("fbcdn.net") && /\.mp4([?#]|$)/i.test(value));

      candidates.push(...resources);

      return {
        title: meta('meta[property="og:title"]') || document.title || "Facebook video",
        thumbnail: meta('meta[property="og:image"]') || "",
        candidates
      };
    });

    const videoUrl = result.candidates.find(isAllowedMediaUrl);

    if (!videoUrl) {
      const error = new Error("No public direct MP4 URL was exposed by Facebook");
      error.status = 422;
      throw error;
    }

    return {
      title: String(result.title || "Facebook video").slice(0, 300),
      thumbnail: result.thumbnail && isAllowedMediaUrl(result.thumbnail) ? result.thumbnail : null,
      videoUrl
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

module.exports = {
  validateFacebookUrl,
  isAllowedMediaUrl,
  extractFacebookVideo
};
