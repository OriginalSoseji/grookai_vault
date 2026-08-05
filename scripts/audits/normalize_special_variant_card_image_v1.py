import argparse
import json
from pathlib import Path

import cv2
import numpy as np


OUTPUT_WIDTH = 750
OUTPUT_HEIGHT = 1050


def parse_args():
    parser = argparse.ArgumentParser(
        description="Deterministically perspective-normalize a reviewed card image."
    )
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument(
        "--corners",
        required=True,
        help="JSON array of top-left, top-right, bottom-right, bottom-left points.",
    )
    return parser.parse_args()


def normalize(input_path: Path, output_path: Path, corners):
    image = cv2.imread(str(input_path), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("source image could not be decoded")
    if len(corners) != 4 or any(len(point) != 2 for point in corners):
        raise ValueError("corners must contain four x/y points")

    height, width = image.shape[:2]
    for x, y in corners:
        if x < 0 or y < 0 or x >= width or y >= height:
            raise ValueError(f"corner outside source bounds: {x},{y} vs {width}x{height}")

    source = np.array(corners, dtype=np.float32)
    target = np.array(
        [
            [0, 0],
            [OUTPUT_WIDTH - 1, 0],
            [OUTPUT_WIDTH - 1, OUTPUT_HEIGHT - 1],
            [0, OUTPUT_HEIGHT - 1],
        ],
        dtype=np.float32,
    )
    matrix = cv2.getPerspectiveTransform(source, target)
    normalized = cv2.warpPerspective(
        image,
        matrix,
        (OUTPUT_WIDTH, OUTPUT_HEIGHT),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_REPLICATE,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(
        str(output_path),
        normalized,
        [cv2.IMWRITE_JPEG_QUALITY, 95, cv2.IMWRITE_JPEG_OPTIMIZE, 0],
    ):
        raise ValueError("normalized image could not be written")


def main():
    args = parse_args()
    corners = json.loads(args.corners)
    normalize(Path(args.input), Path(args.output), corners)


if __name__ == "__main__":
    main()
