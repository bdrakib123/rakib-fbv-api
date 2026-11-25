# Rakib FBV API

A clean Facebook-only video metadata and download API for Render.

## Features

- Facebook Reels, Watch, page-video and `fb.watch` URLs
- yt-dlp extraction (no SnapSave, Vreden API or Puppeteer)
- Best available MP4 preferred
- Metadata endpoint returns title, thumbnail, duration, uploader and video formats
- Download endpoint streams a temporary downloaded file and removes it after the response
- API-key protection, strict Facebook URL validation and size/duration limits
- GitHub Actions unit tests

## Deploy on Render

1. Connect this repository to Render as a **Blueprint**.
2. Render reads `render.yaml` and creates the Python web service.
3. Render generates `API_KEY` automatically. Copy the generated value from the service Environment page for your bot configuration.
4. Wait for deployment, then open `/health`. It should return `{"status":true,"service":"rakib-fbv-api"}`.

Do not commit `.env`, cookies, or API keys. If an API key was ever committed to a public repository, rotate it in Render.

## Endpoints

### Health (public)

`GET /health`

### Facebook video information

`GET /api/facebook?url=FACEBOOK_URL`

Send the key using the `X-API-Key` header (recommended), or use `apikey=YOUR_KEY` for compatibility with simple bot clients.

Example:

```bash
curl -H "X-API-Key: YOUR_KEY" \
  "https://YOUR-SERVICE.onrender.com/api/facebook?url=https%3A%2F%2Fwww.facebook.com%2Freel%2FVIDEO_ID%2F"
```

Success response:

```json
{
  "status": true,
  "creator": "Rakib FBV API",
  "platform": "facebook",
  "video": {
    "title": "Video title",
    "thumbnail": "https://...",
    "duration": 30,
    "uploader": "Page name",
    "id": "VIDEO_ID",
    "formats": [
      {
        "quality": "720p",
        "format_id": "hd",
        "ext": "mp4",
        "height": 720,
        "filesize": 12345678,
        "url": "https://..."
      }
    ]
  }
}
```

### Download video

`GET /api/facebook/download?url=FACEBOOK_URL`

Returns the video as a streamed attachment. Use the same API key header or `apikey` query parameter.

## Environment variables

| Name | Default | Purpose |
|---|---:|---|
| `API_KEY` | required | API authentication secret |
| `MAX_DURATION` | `1800` | Maximum video duration in seconds |
| `MAX_VIDEO_BYTES` | `157286400` | Maximum video size (150 MiB) |
| `EXTRACTION_TIMEOUT` | `75` | Reserved extraction timeout setting |

## Important limitations

- Designed for public videos accessible to yt-dlp without a Facebook login.
- Private, friends-only, login-gated or group-restricted videos are not bypassed.
- Facebook changes its page and delivery systems; extraction can temporarily break even with an updated yt-dlp.
- Render free instances can sleep and have limited CPU, memory and request duration. Large downloads may fail or time out.
- Use only for videos you have permission to download.
