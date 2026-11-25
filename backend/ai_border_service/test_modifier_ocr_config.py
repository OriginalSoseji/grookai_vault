"""Exercise the real OCR route and argument parser without an OCR/model service."""

import asyncio
import base64
import io
import json
import os
import shlex
import types
import unittest
from unittest.mock import patch

from PIL import Image
from starlette.requests import Request

import app as service


class ModifierOcrConfigurationTest(unittest.TestCase):
    def test_modifier_whitelist_is_one_argument_and_preserves_printed_characters(self):
        output = io.BytesIO()
        Image.new("RGB", (200, 300), "white").save(output, format="PNG")
        body = json.dumps({"image_b64": base64.b64encode(output.getvalue()).decode("ascii")}).encode()
        modifier_whitelists = []

        def parse_engine_arguments(_image, config=""):
            arguments = shlex.split(config)
            for argument in arguments:
                if argument.startswith("tessedit_char_whitelist=") and "’" in argument:
                    modifier_whitelists.append(argument.split("=", 1)[1])
            return ""

        async def receive():
            return {"type": "http.request", "body": body, "more_body": False}

        request = Request({
            "type": "http", "method": "POST", "path": "/ocr-card-signals",
            "headers": [(b"x-gv-token", b"test-only-token"), (b"content-type", b"application/json")],
        }, receive)
        engine = types.SimpleNamespace(image_to_string=parse_engine_arguments)
        with patch.dict(os.environ, {"GV_AI_ENDPOINT_TOKEN": "test-only-token"}):
            with patch.object(service, "_OCR_AVAILABLE", True), patch.object(service, "pytesseract", engine, create=True):
                result = asyncio.run(service.ocr_card_signals(request))

        self.assertNotIn("error", result)
        self.assertGreaterEqual(len(modifier_whitelists), 4)
        expected = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'’ -"
        self.assertTrue(all(value == expected for value in modifier_whitelists))
        self.assertIsNone(result["raw_printed_modifier_text"]["text"])
        self.assertIsNone(result["raw_stamp_text"]["text"])


if __name__ == "__main__":
    unittest.main()
