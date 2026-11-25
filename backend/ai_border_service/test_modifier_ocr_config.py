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


class NumberRegionEngineFailureTest(unittest.TestCase):
    def run_route_with_number_failure(self, status, later_number=""):
        output = io.BytesIO()
        Image.new("RGB", (200, 300), "white").save(output, format="PNG")
        body = json.dumps({"image_b64": base64.b64encode(output.getvalue()).decode("ascii")}).encode()
        number_calls = []

        class RegionalTesseractError(RuntimeError):
            def __init__(self, engine_status):
                self.status = engine_status
                super().__init__(engine_status, "synthetic regional engine failure")

        def engine_response(_image, config=""):
            shlex.split(config)
            if config == "--psm 7 -c tessedit_char_whitelist=0123456789/":
                number_calls.append(config)
                if len(number_calls) == 1:
                    raise RegionalTesseractError(status)
                if len(number_calls) == 2:
                    return later_number
            return ""

        async def receive():
            return {"type": "http.request", "body": body, "more_body": False}

        request = Request({
            "type": "http", "method": "POST", "path": "/ocr-card-signals",
            "headers": [(b"x-gv-token", b"test-only-token"), (b"content-type", b"application/json")],
        }, receive)
        engine = types.SimpleNamespace(image_to_string=engine_response, TesseractError=RegionalTesseractError)
        with patch.dict(os.environ, {"GV_AI_ENDPOINT_TOKEN": "test-only-token"}):
            with patch.object(service, "_OCR_AVAILABLE", True), patch.object(service, "pytesseract", engine, create=True):
                result = asyncio.run(service.ocr_card_signals(request))
        return result, len(number_calls)

    def test_native_number_region_failure_is_visible_and_does_not_invent_a_number(self):
        result, calls = self.run_route_with_number_failure(-8)
        self.assertNotIn("error", result)
        self.assertEqual(calls, 36)
        self.assertIsNone(result["number_raw"]["text"])
        self.assertTrue(result["debug"]["partial"])
        self.assertEqual(result["debug"]["ocr_errors"], [{
            "code": "number_region_engine_failure", "engine_exit_code": -8,
            "region": {"x0": 0.0, "x1": 0.4, "y0": 0.7, "y1": 0.82},
        }])

    def test_native_number_region_failure_preserves_an_independent_number_observation(self):
        result, calls = self.run_route_with_number_failure(-8, "012/124")
        self.assertNotIn("error", result)
        self.assertEqual(calls, 36)
        self.assertEqual(result["number_raw"]["text"], "012/124")
        self.assertTrue(result["debug"]["partial"])
        self.assertEqual(len(result["debug"]["ocr_errors"]), 1)

    def test_other_engine_errors_still_fail_closed(self):
        result, calls = self.run_route_with_number_failure(1)
        self.assertEqual(result["error"], "ocr_processing_failed")
        self.assertEqual(result["debug"]["engine"], "exception")
        self.assertEqual(calls, 1)


if __name__ == "__main__":
    unittest.main()
