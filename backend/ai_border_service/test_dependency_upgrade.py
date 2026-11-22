"""Offline smoke tests; install requirements.txt and test-only httpx first."""

import base64
import io
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app import app


class ImagePipelineDependencyTest(unittest.TestCase):
    def test_missing_service_token_fails_closed(self):
        with patch.dict(os.environ, {"GV_AI_ENDPOINT_TOKEN": ""}):
            with TestClient(app) as client:
                response = client.post("/detect-card-border", content=b"not an image")
                self.assertEqual(response.status_code, 503)
                self.assertEqual(response.json()["detail"], "service_unconfigured")

    def test_authenticated_image_processing_and_rejection(self):
        with patch.dict(os.environ, {"GV_AI_ENDPOINT_TOKEN": "test-only-token"}):
            with TestClient(app) as client:
                denied = client.post("/detect-card-border", content=b"not an image")
                self.assertEqual(denied.status_code, 401)

                headers = {"x-gv-token": "test-only-token"}
                image = Image.new("RGB", (200, 300), "black")
                ImageDraw.Draw(image).rectangle((25, 25, 175, 275), fill="white")
                for image_format in ("PNG", "JPEG"):
                    with self.subTest(image_format=image_format):
                        output = io.BytesIO()
                        image.save(output, format=image_format)
                        encoded = base64.b64encode(output.getvalue()).decode("ascii")
                        detection = client.post("/detect-card-border", headers=headers, json={"image_b64": encoded})
                        self.assertEqual(detection.status_code, 200)
                        self.assertTrue(detection.json()["ok"])
                        self.assertEqual(len(detection.json()["polygon_norm"]), 4)

                        warp = client.post("/warp-card-quad", headers=headers, json={
                            "image_b64": encoded,
                            "quad_norm": [[0.125, 0.083], [0.875, 0.083], [0.875, 0.917], [0.125, 0.917]],
                            "out_w": 128, "out_h": 180,
                        })
                        self.assertEqual(warp.status_code, 200)
                        self.assertTrue(warp.json()["ok"])
                        with Image.open(io.BytesIO(base64.b64decode(warp.json()["warped_jpg_b64"]))) as result:
                            self.assertEqual(result.size, (128, 180))
                            self.assertEqual(result.format, "JPEG")

                invalid = client.post("/warp-card-quad", headers=headers, json={
                    "image_b64": "not-image", "quad_norm": [[0, 0], [1, 0], [1, 1], [0, 1]],
                })
                self.assertFalse(invalid.json()["ok"])


if __name__ == "__main__":
    unittest.main()
