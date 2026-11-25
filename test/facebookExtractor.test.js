"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateFacebookUrl,
  isAllowedMediaUrl
} = require("../services/facebookExtractor");

test("accepts supported HTTPS Facebook video URLs", () => {
  assert.equal(
    validateFacebookUrl("https://www.facebook.com/reel/123456789012345"),
    "https://www.facebook.com/reel/123456789012345"
  );
  assert.equal(
    validateFacebookUrl("https://fb.watch/AbCdEf123/"),
    "https://fb.watch/AbCdEf123/"
  );
});

test("rejects non-Facebook, insecure and credential URLs", () => {
  for (const url of [
    "http://facebook.com/watch?v=123456789012",
    "https://evil.example/facebook.com/video",
    "https://user:pass@www.facebook.com/watch?v=123456789012",
    "https://facebook.com:8443/watch?v=123456789012",
    "not-a-url"
  ]) {
    assert.throws(() => validateFacebookUrl(url));
  }
});

test("allows only HTTPS fbcdn media URLs", () => {
  assert.equal(isAllowedMediaUrl("https://video.xx.fbcdn.net/video.mp4"), true);
  assert.equal(isAllowedMediaUrl("https://fbcdn.net/video.mp4"), true);
  assert.equal(isAllowedMediaUrl("http://video.xx.fbcdn.net/video.mp4"), false);
  assert.equal(isAllowedMediaUrl("https://evil.example/video.mp4"), false);
  assert.equal(isAllowedMediaUrl("https://fbcdn.net.evil.example/video.mp4"), false);
});
