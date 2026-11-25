# Rakib Facebook Video API

A clean Facebook-only API for public videos, Reels and Watch links. Built with Express and Puppeteer Chromium for Render.

## Important

- Only public videos that Facebook exposes without login are supported.
- This project does not bypass login, private-group restrictions, DRM, or access controls.
- Facebook may change its page markup or delivery format; extraction can stop working without notice.
- The extractor only accepts HTTPS Facebook URLs and only returns HTTPS media URLs hosted on `fbcdn.net`.
- Configure a strong `API_KEY` in Render. API routes fail closed if it is missing.

## Deploy on Render

1. Push this repository to GitHub.
2. In Render, create a Web Service from this repository (or use the included Blueprint).
3. Runtime: Node. Build: `npm install`. Start: `npm start`.
4. Set `API_KEY` to a long random secret in Render Environment. The Blueprint can generate one automatically.
5. Deploy and open `/health`; expected response: `{"status":true,"service":"rakib-fbv-api"}`.

The Blueprint uses Render Free. Free instances can sleep and have limited memory; Chromium startup or extraction may fail under memory pressure. Upgrade the Render instance only if you choose to and need more reliable extraction.

## API

All `/api` routes require the header:

```http
X-API-Key: YOUR_API_KEY
```

### Get video metadata and direct URL

```http
GET /api/facebook?url=https%3A%2F%2Fwww.facebook.com%2Freel%2FVIDEO_ID
```

Success:

```json
{
  "status": true,
  "platform": "facebook",
  "title": "Video title",
  "thumbnail": null,
  "videoUrl": "https://...fbcdn.net/...mp4"
}
```

### Redirect to the video

```http
GET /api/facebook/download?url=ENCODED_FACEBOOK_URL
```

Returns HTTP 302 to the validated Facebook CDN URL. The caller should follow redirects.

## Local development

```bash
npm install
cp .env.example .env
# Set API_KEY in .env
npm test
npm start
```
