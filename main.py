from __future__ import annotations

import hmac
import logging
import mimetypes
import os
import shutil
import tempfile
from pathlib import Path
from typing import Iterator
from urllib.parse import urlparse

import yt_dlp
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("rakib-fbv-api")

APP_NAME = "Rakib FBV API"
API_KEY = os.getenv("API_KEY", "").strip()
MAX_DURATION = int(os.getenv("MAX_DURATION", "1800"))
MAX_VIDEO_BYTES = int(os.getenv("MAX_VIDEO_BYTES", str(150 * 1024 * 1024)))
EXTRACTION_TIMEOUT = int(os.getenv("EXTRACTION_TIMEOUT", "75"))

app = FastAPI(
    title=APP_NAME,
    version="2.0.0",
    description="Facebook public video and Reels metadata/download API",
)


def validate_facebook_url(value: str) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > 2048:
        raise HTTPException(status_code=400, detail="A valid Facebook video URL is required")

    value = value.strip()
    try:
        parsed = urlparse(value)
        port = parsed.port
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid URL")

    allowed_hosts = {
        "facebook.com",
        "www.facebook.com",
        "m.facebook.com",
        "web.facebook.com",
        "fb.watch",
        "www.fb.watch",
    }
    host = (parsed.hostname or "").lower()

    if (
        parsed.scheme != "https"
        or host not in allowed_hosts
        or parsed.username
        or parsed.password
        or port not in (None, 443)
    ):
        raise HTTPException(
            status_code=400,
            detail="Only HTTPS Facebook video, Reel, Watch and fb.watch links are supported",
        )

    return value


def require_api_key(x_api_key: str | None, apikey: str | None) -> None:
    if not API_KEY:
        raise HTTPException(status_code=503, detail="API_KEY is not configured on the server")

    supplied = x_api_key or apikey or ""
    if not hmac.compare_digest(supplied, API_KEY):
        raise HTTPException(status_code=401, detail="Missing or invalid API key")


def ydl_options() -> dict:
    return {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 25,
        "retries": 1,
        "fragment_retries": 1,
        "format": "best[ext=mp4]/best",
        "max_filesize": MAX_VIDEO_BYTES,
        "cachedir": False,
    }


def extract_info(url: str) -> dict:
    try:
        with yt_dlp.YoutubeDL(ydl_options()) as downloader:
            info = downloader.extract_info(url, download=False)
    except Exception as exc:
        logger.warning("Facebook metadata extraction failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=422,
            detail="Could not extract this video. It may be private, unavailable, or unsupported by the current extractor.",
        ) from None

    if not isinstance(info, dict):
        raise HTTPException(status_code=422, detail="No video metadata was returned")

    duration = info.get("duration")
    if duration and duration > MAX_DURATION:
        raise HTTPException(status_code=413, detail="Video duration exceeds the API limit")

    formats = []
    for item in info.get("formats") or []:
        media_url = item.get("url")
        if not media_url or not media_url.startswith("https://"):
            continue
        if item.get("vcodec") == "none":
            continue

        height = item.get("height")
        quality = item.get("format_note") or (f"{height}p" if height else item.get("format_id"))
        formats.append(
            {
                "quality": str(quality or "video"),
                "format_id": item.get("format_id"),
                "ext": item.get("ext"),
                "height": height,
                "filesize": item.get("filesize") or item.get("filesize_approx"),
                "url": media_url,
            }
        )

    formats.sort(key=lambda item: item.get("height") or 0, reverse=True)
    if not formats and not info.get("url"):
        raise HTTPException(status_code=422, detail="No downloadable video format was found")

    if not formats and info.get("url", "").startswith("https://"):
        formats.append(
            {
                "quality": "best",
                "format_id": info.get("format_id"),
                "ext": info.get("ext"),
                "height": info.get("height"),
                "filesize": info.get("filesize") or info.get("filesize_approx"),
                "url": info["url"],
            }
        )

    return {
        "title": info.get("title") or "Facebook video",
        "thumbnail": info.get("thumbnail"),
        "duration": duration,
        "uploader": info.get("uploader") or info.get("channel"),
        "id": info.get("id"),
        "formats": formats[:12],
    }


@app.get("/")
def root():
    return {
        "status": True,
        "message": f"{APP_NAME} is running",
        "version": app.version,
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": True, "service": "rakib-fbv-api"}


@app.get("/api/facebook")
def facebook_info(
    url: str = Query(..., min_length=12, max_length=2048),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    apikey: str | None = Query(default=None),
):
    require_api_key(x_api_key, apikey)
    safe_url = validate_facebook_url(url)
    video = extract_info(safe_url)
    return {"status": True, "creator": "Rakib FBV API", "platform": "facebook", "video": video}


@app.get("/api/facebook/download")
def facebook_download(
    url: str = Query(..., min_length=12, max_length=2048),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    apikey: str | None = Query(default=None),
):
    require_api_key(x_api_key, apikey)
    safe_url = validate_facebook_url(url)

    temp_dir = Path(tempfile.mkdtemp(prefix="rakib-fbv-"))
    output_template = str(temp_dir / "video.%(ext)s")
    options = ydl_options()
    options.update(
        {
            "outtmpl": output_template,
            "max_filesize": MAX_VIDEO_BYTES,
            "continuedl": False,
            "overwrites": True,
        }
    )

    try:
        with yt_dlp.YoutubeDL(options) as downloader:
            info = downloader.extract_info(safe_url, download=True)

        duration = info.get("duration") if isinstance(info, dict) else None
        if duration and duration > MAX_DURATION:
            raise HTTPException(status_code=413, detail="Video duration exceeds the API limit")

        candidates = [
            path for path in temp_dir.iterdir()
            if path.is_file() and not path.name.endswith((".part", ".ytdl"))
        ]
        if not candidates:
            raise HTTPException(status_code=422, detail="The extractor did not produce a video file")

        video_path = max(candidates, key=lambda path: path.stat().st_size)
        size = video_path.stat().st_size
        if size <= 0 or size > MAX_VIDEO_BYTES:
            raise HTTPException(status_code=413, detail="Video file is empty or exceeds the API size limit")

        media_type = mimetypes.guess_type(video_path.name)[0] or "application/octet-stream"
        filename = "facebook-video" + video_path.suffix

    except HTTPException:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    except Exception as exc:
        logger.warning("Facebook download failed: %s", type(exc).__name__)
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(
            status_code=422,
            detail="Download failed. The video may be private, unavailable, or unsupported by the current extractor.",
        ) from None

    def stream_file() -> Iterator[bytes]:
        try:
            with video_path.open("rb") as source:
                while chunk := source.read(1024 * 256):
                    yield chunk
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    return StreamingResponse(
        stream_file(),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(size),
            "Cache-Control": "no-store",
        },
    )


@app.exception_handler(HTTPException)
async def http_error_handler(request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": False, "message": exc.detail},
    )
