from fastapi import FastAPI, Request
from pydantic import BaseModel
import base64
import cv2
import numpy as np
from PIL import Image
import io
import traceback

try:
    import pytesseract
    _OCR_AVAILABLE = True
except Exception:
    _OCR_AVAILABLE = False

app = FastAPI()

class DetectRequest(BaseModel):
    image_b64: str
    mode: str = "polygon"

class OCRResponse(BaseModel):
    name: dict | None = None
    number_raw: dict | None = None
    printed_total: dict | None = None
    printed_set_abbrev_raw: dict | None = None
    debug: dict | None = None

def _norm(points, W, H):
    return [[float(x)/W, float(y)/H] for (x,y) in points]

def _order_quad(pts):
    pts = np.array(pts, dtype=np.float32)
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1).reshape(-1)
    tl = pts[np.argmin(s)]
    br = pts[np.argmax(s)]
    tr = pts[np.argmin(diff)]
    bl = pts[np.argmax(diff)]
    return [tuple(tl), tuple(tr), tuple(br), tuple(bl)]

def _center_seed_mask_bbox(img_bgr):
    H, W = img_bgr.shape[:2]
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

    # Sample a center patch and compute median HSV
    cx, cy = W // 2, H // 2
    r = int(max(8, min(W, H) * 0.03))
    x0, x1 = max(0, cx - r), min(W, cx + r)
    y0, y1 = max(0, cy - r), min(H, cy + r)
    patch = hsv[y0:y1, x0:x1]
    if patch.size == 0:
        return None

    med = np.median(patch.reshape(-1, 3), axis=0)
    h0, s0, v0 = float(med[0]), float(med[1]), float(med[2])

    # Tolerances (fairly wide; we refine by connected component)
    dh = 18
    ds = 70
    dv = 70

    lower = np.array([max(0, h0 - dh), max(0, s0 - ds), max(0, v0 - dv)], dtype=np.uint8)
    upper = np.array([min(179, h0 + dh), min(255, s0 + ds), min(255, v0 + dv)], dtype=np.uint8)

    mask = cv2.inRange(hsv, lower, upper)

    # Clean mask
    kernel = np.ones((9, 9), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    # Connected components: pick the component that contains the center
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if num <= 1:
        return None

    center_label = labels[cy, cx]
    if center_label == 0:
        # center isn’t in the mask; fallback to largest non-zero component
        areas = stats[1:, cv2.CC_STAT_AREA]
        best = int(1 + np.argmax(areas))
    else:
        best = int(center_label)

    x = int(stats[best, cv2.CC_STAT_LEFT])
    y = int(stats[best, cv2.CC_STAT_TOP])
    w = int(stats[best, cv2.CC_STAT_WIDTH])
    h = int(stats[best, cv2.CC_STAT_HEIGHT])

    area_frac = (w * h) / float(W * H)
    return (x, y, w, h, area_frac)

@app.post("/detect-card-border")
async def detect_card_border(request: Request):
    try:
        body = await request.body()

        img_bytes = None

        if body[:1] in (b"{", b"["):
            try:
                payload = await request.json()
                image_b64 = payload.get("image_b64")
                if isinstance(image_b64, str) and image_b64:
                    img_bytes = base64.b64decode(image_b64)
            except Exception:
                img_bytes = None

        if img_bytes is None:
            img_bytes = body

        pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_rgb = np.array(pil)
        H, W = img_rgb.shape[:2]
        img = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)

        # --- Attempt 1: edge/quad detection ---
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blur, 50, 150)

        kernel = np.ones((5, 5), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=1)
        edges = cv2.erode(edges, kernel, iterations=1)

        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            img_area = float(W * H)
            min_area = img_area * 0.03

            best_quad = None
            best_area = 0.0

            for c in contours:
                a = cv2.contourArea(c)
                if a < min_area:
                    continue
                peri = cv2.arcLength(c, True)
                approx = cv2.approxPolyDP(c, 0.02 * peri, True)
                if len(approx) == 4 and cv2.isContourConvex(approx):
                    if a > best_area:
                        best_area = a
                        best_quad = approx.reshape(4, 2)

            if best_quad is not None:
                ordered = _order_quad(best_quad)
                area_frac = best_area / img_area
                conf = float(max(0.1, min(1.0, area_frac)))
                return {
                    "ok": True,
                    "confidence": conf,
                    "polygon_norm": _norm(ordered, W, H),
                    "notes": ["quad_contour", f"area={area_frac:.3f}"],
                }

        # --- Attempt 2 (fallback): center-seeded mask bbox ---
        res = _center_seed_mask_bbox(img)
        if res is None:
            return {"ok": False, "confidence": 0.0, "notes": ["no_big_contours", "center_seed_failed"]}

        x, y, w, h, area_frac = res
        if area_frac < 0.05:
            return {"ok": False, "confidence": float(area_frac), "notes": ["center_seed_too_small", f"area={area_frac:.3f}"]}

        poly = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
        conf = float(max(0.1, min(1.0, area_frac)))
        return {
            "ok": True,
            "confidence": conf,
            "polygon_norm": _norm(poly, W, H),
            "notes": ["center_seed_bbox", f"area={area_frac:.3f}"],
        }

    except Exception as e:
        return {"ok": False, "confidence": 0.0, "error": str(e), "notes": ["exception"]}


@app.post("/ocr-card-signals")
async def ocr_card_signals(request: Request):
    try:
        body = await request.body()
        img_bytes = None
        if body[:1] in (b"{", b"["):
            try:
                payload = await request.json()
                image_b64 = payload.get("image_b64")
                if isinstance(image_b64, str) and image_b64:
                    img_bytes = base64.b64decode(image_b64)
            except Exception:
                img_bytes = None
        if img_bytes is None:
            img_bytes = body

        pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_np = np.array(pil)

        if not _OCR_AVAILABLE:
          return {
            "name": None,
            "number_raw": None,
            "printed_total": None,
            "printed_set_abbrev_raw": None,
            "debug": {"engine": "pytesseract_missing"}
          }

        # Basic OCR using pytesseract; keeping minimal and deterministic.
        config = "--psm 6"
        text = pytesseract.image_to_string(img_np, config=config)
        text_norm = text.strip()

        name_text = text_norm.splitlines()[0] if text_norm else ""
        number_text = None
        total_val = None
        abbrev_text = None

        for token in text_norm.split():
            if "/" in token and any(ch.isdigit() for ch in token):
                number_text = token
                parts = token.split("/")
                if len(parts) == 2 and parts[1].isdigit():
                    total_val = int(parts[1])
            elif len(token) <= 5 and token.isalnum() and any(c.isalpha() for c in token) and any(c.isdigit() for c in token):
                abbrev_text = token.upper()

        return {
            "name": {"text": name_text or None, "confidence": 0.5 if name_text else 0.0},
            "number_raw": {"text": number_text or None, "confidence": 0.5 if number_text else 0.0},
            "printed_total": {"value": total_val, "confidence": 0.4 if total_val is not None else 0.0},
            "printed_set_abbrev_raw": {"text": abbrev_text or None, "confidence": 0.4 if abbrev_text else 0.0},
            "debug": {"engine": "pytesseract" if _OCR_AVAILABLE else "none", "text_raw": text_norm},
        }
    except Exception as e:
        return {"error": str(e), "trace": traceback.format_exc(), "name": None, "number_raw": None, "printed_total": None, "printed_set_abbrev_raw": None, "debug": {"engine": "exception"}}
