import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException

import main


class FacebookUrlTests(unittest.TestCase):
    def test_accepts_facebook_reel(self):
        value = "https://www.facebook.com/reel/123456789/"
        self.assertEqual(main.validate_facebook_url(value), value)

    def test_accepts_watch_url(self):
        value = "https://www.facebook.com/watch/?v=123456789"
        self.assertEqual(main.validate_facebook_url(value), value)

    def test_accepts_fb_watch(self):
        value = "https://fb.watch/abc123/"
        self.assertEqual(main.validate_facebook_url(value), value)

    def test_rejects_http(self):
        with self.assertRaises(HTTPException):
            main.validate_facebook_url("http://www.facebook.com/reel/123456789/")

    def test_rejects_non_facebook_host(self):
        with self.assertRaises(HTTPException):
            main.validate_facebook_url("https://example.com/video")

    def test_rejects_facebook_lookalike(self):
        with self.assertRaises(HTTPException):
            main.validate_facebook_url("https://facebook.com.example.org/reel/123")

    def test_rejects_credentials(self):
        with self.assertRaises(HTTPException):
            main.validate_facebook_url("https://user:pass@facebook.com/reel/123")

    def test_rejects_nonstandard_port(self):
        with self.assertRaises(HTTPException):
            main.validate_facebook_url("https://facebook.com:8443/reel/123")


class ApiKeyTests(unittest.TestCase):
    def test_requires_configured_key(self):
        with patch.object(main, "API_KEY", ""):
            with self.assertRaises(HTTPException) as error:
                main.require_api_key(None, None)
            self.assertEqual(error.exception.status_code, 503)

    def test_rejects_wrong_key(self):
        with patch.object(main, "API_KEY", "secret"):
            with self.assertRaises(HTTPException) as error:
                main.require_api_key("wrong", None)
            self.assertEqual(error.exception.status_code, 401)

    def test_accepts_header_key(self):
        with patch.object(main, "API_KEY", "secret"):
            main.require_api_key("secret", None)

    def test_accepts_compatibility_query_key(self):
        with patch.object(main, "API_KEY", "secret"):
            main.require_api_key(None, "secret")


if __name__ == "__main__":
    unittest.main()
