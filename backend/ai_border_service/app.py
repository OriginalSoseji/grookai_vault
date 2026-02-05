from fastapi import FastAPI, Request
from pydantic import BaseModel
import base64
import cv2
import numpy as np
from PIL import Image
import io
import traceback
import re
import os
import hashlib
import json
import requests
from collections import OrderedDict
from datetime import datetime

# Env required (names only):
# - OPENAI_API_KEY
# - GV_AI_ENDPOINT_TOKEN
# Optional:
# - GV_AI_MODEL
# - GV_AI_LONG_EDGE

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

class AIIdentifyRequest(BaseModel):
    image_b64: str
    force_refresh: bool = False
    trace_id: str | None = None

def _run_id():
    return datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")

def _debug_dir():
    d = os.environ.get("GV_DEBUG_DIR") or "/tmp"
    try:
        os.makedirs(d, exist_ok=True)
    except Exception:
        pass
    return d

_AI_CACHE_MAX = 2000
_ai_cache = OrderedDict()  # sha256 -> {"result":..., "cached_at": ...}

def _cache_get(k):
    v = _ai_cache.get(k)
    if v is not None:
        _ai_cache.move_to_end(k)
    return v

def _cache_put(k, v):
    _ai_cache[k] = v
    _ai_cache.move_to_end(k)
    while len(_ai_cache) > _AI_CACHE_MAX:
        _ai_cache.popitem(last=False)

def _downscale_rgb_np(img_rgb, long_edge=1024):
    h, w = img_rgb.shape[:2]
    m = max(h, w)
    if m <= long_edge:
        return img_rgb
    scale = long_edge / float(m)
    nh, nw = int(round(h * scale)), int(round(w * scale))
    return cv2.resize(img_rgb, (nw, nh), interpolation=cv2.INTER_AREA)
def _norm(points, W, H):
    return [[float(x) / W, float(y) / H] for (x, y) in points]

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

def _openai_identify(image_bytes, run_id, dbg_dir, sha256_hex, cache_hit=False, trace_id=None):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    long_edge = int(os.environ.get("GV_AI_LONG_EDGE", "1024") or "1024")
    if long_edge <= 0:
        long_edge = 1024
    model_name = os.environ.get("GV_AI_MODEL", "gpt-4o-mini")

    pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_rgb = np.array(pil)
    img_rgb = _downscale_rgb_np(img_rgb, long_edge=long_edge)

    ok, enc = cv2.imencode(
        ".jpg",
        cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR),
        [int(cv2.IMWRITE_JPEG_QUALITY), 85],
    )
    if not ok:
        raise RuntimeError("jpeg_encode_failed")

    b64 = base64.b64encode(enc.tobytes()).decode("utf-8")
    data_url = f"data:image/jpeg;base64,{b64}"

    prompt = (
        "Read this single Pokémon card image (already warped/card-only).\n"
        "Return ONLY valid JSON with keys:\n"
        "{\n"
        '  \"name\": string|null,\n'
        '  \"number\": string|null,          // like \"27/159\"\n'
        '  \"printed_total\": integer|null,  // like 159\n'
        '  \"hp\": integer|null,             // like 140\n'
        '  \"confidence\": number            // 0.0-1.0\n'
        "}\n"
        "Rules:\n"
        "- If unsure, use nulls and confidence < 0.6\n"
        "- Normalize number: remove leading zeros (027/159 -> 27/159)\n"
        "- printed_total should match denominator when present\n"
        "Return JSON only. No prose.\n"
    )

    payload = {
        "model": model_name,
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "image_url": data_url},
                ],
            }
        ],
        "temperature": 0,
        "max_output_tokens": 250,
        "store": False,
    }

    r = requests.post(
        "https://api.openai.com/v1/responses",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=payload,
        timeout=30,
    )
    if r.status_code != 200:
        raise RuntimeError(f"openai_http_{r.status_code}")

    resp = r.json()

    out_text = ""
    for item in resp.get("output", []):
        if item.get("type") == "message":
            for c in item.get("content", []):
                if c.get("type") == "output_text":
                    out_text += c.get("text", "")
    out_text = (out_text or "").strip()

    try:
        with open(os.path.join(dbg_dir, f"ai_identify_raw_{run_id}.txt"), "w", encoding="utf-8") as f:
            f.write(f"model={model_name}\nsha256={sha256_hex}\nlong_edge={long_edge}\ncache_hit={cache_hit}\ntrace_id={trace_id}\n")
            f.write(out_text)
    except Exception:
        pass

    if out_text.lower().startswith("json"):
        parts = out_text.splitlines()
        if len(parts) > 1:
            out_text = "\n".join(parts[1:]).strip()

    if out_text.startswith("```"):
        out_text = out_text.strip("`").strip()
        if out_text.lower().startswith("json"):
            out_text = out_text[4:].strip()

    m = re.search(r"\{.*\}", out_text, flags=re.DOTALL)
    if m:
        out_json = m.group(0).strip()
    else:
        out_json = out_text

    try:
        data = json.loads(out_json)
    except Exception:
        raise RuntimeError("openai_non_json")

    name = data.get("name")
    number = data.get("number")
    printed_total = data.get("printed_total")
    hp = data.get("hp")
    conf = data.get("confidence")

    if isinstance(number, str) and "/" in number:
        a, b = number.split("/", 1)
        try:
            a_i = int(a)
            b_i = int(b)
            number = f"{a_i}/{b_i}"
            if printed_total is None:
                printed_total = b_i
        except Exception:
            pass

    try:
        conf = float(conf)
    except Exception:
        conf = 0.0
    conf = max(0.0, min(1.0, conf))

    return {
        "name": name if isinstance(name, str) and name.strip() else None,
        "number": number if isinstance(number, str) and number.strip() else None,
        "printed_total": int(printed_total) if isinstance(printed_total, (int, float)) else None,
        "hp": int(hp) if isinstance(hp, (int, float)) else None,
        "confidence": conf,
        "model": model_name,
    }

def _require_gv_token(request: Request):
    expected = os.environ.get("GV_AI_ENDPOINT_TOKEN")
    if not expected:
        raise RuntimeError("GV_AI_ENDPOINT_TOKEN not set")
    got = request.headers.get("x-gv-token")
    if not got or got != expected:
        raise RuntimeError("unauthorized")

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
        polygon_norm = None
        if body[:1] in (b"{", b"["):
            try:
                payload = await request.json()
                image_b64 = payload.get("image_b64")
                if isinstance(image_b64, str) and image_b64:
                    img_bytes = base64.b64decode(image_b64)
                polygon_norm = payload.get("polygon_norm")
            except Exception:
                img_bytes = None
        if img_bytes is None:
            img_bytes = body

        pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_np = np.array(pil)
        debug_notes = []

        if polygon_norm and isinstance(polygon_norm, list) and len(polygon_norm) == 4:
            try:
                H0, W0 = img_np.shape[:2]
                pts = np.array(
                    [(float(p[0]) * W0, float(p[1]) * H0) for p in polygon_norm],
                    dtype=np.float32,
                )
                ordered = _order_quad(pts)
                pts_ord = np.array(ordered, dtype=np.float32)
                w0 = np.linalg.norm(pts_ord[1] - pts_ord[0])
                w1 = np.linalg.norm(pts_ord[2] - pts_ord[3])
                h0 = np.linalg.norm(pts_ord[3] - pts_ord[0])
                h1 = np.linalg.norm(pts_ord[2] - pts_ord[1])
                warp_w = int(max(w0, w1))
                warp_h = int(max(h0, h1))
                pad_frac = 0.03
                center = pts_ord.mean(axis=0, keepdims=True)
                pts_pad = center + (pts_ord - center) * (1.0 + pad_frac)
                pts_pad[:, 0] = np.clip(pts_pad[:, 0], 0, W0 - 1)
                pts_pad[:, 1] = np.clip(pts_pad[:, 1], 0, H0 - 1)
                dst = np.array(
                    [[0, 0], [warp_w - 1, 0], [warp_w - 1, warp_h - 1], [0, warp_h - 1]],
                    dtype=np.float32,
                )
                M = cv2.getPerspectiveTransform(pts_pad, dst)
                img_np = cv2.warpPerspective(img_np, M, (warp_w, warp_h))
                h_warp, w_warp = img_np.shape[:2]
                if h_warp > w_warp:
                    img_np = cv2.rotate(img_np, cv2.ROTATE_90_CLOCKWISE)
                    debug_notes.append("rotate:90cw")
                try:
                    cv2.imwrite("/tmp/gv_warp.png", cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR))
                except Exception:
                    pass
                debug_notes.append("warp:polygon_norm")
            except Exception:
                pass

        if not _OCR_AVAILABLE:
            return {
                "name": None,
                "number_raw": None,
                "printed_total": None,
                "printed_set_abbrev_raw": None,
                "debug": {"engine": "pytesseract_missing"},
            }

        number_text = None
        total_val = None
        abbrev_text = None
        number_conf = 0.0
        total_conf = 0.0
        roi_text = ""

        def _scan_number(img_rgb):
            H, W = img_rgb.shape[:2]
            y_bands = [(0.70, 0.82), (0.78, 0.90), (0.86, 1.00)]
            x_bands = [(0.00, 0.40), (0.30, 0.70), (0.60, 1.00)]
            regex = re.compile(r"(\d{1,3})\s*/\s*(\d{2,4})")
            best = None
            near = []
            for y0f, y1f in y_bands:
                for x0f, x1f in x_bands:
                    x0, x1 = int(x0f * W), int(x1f * W)
                    y0, y1 = int(y0f * H), int(y1f * H)
                    roi = img_rgb[y0:y1, x0:x1]
                    if roi.size == 0:
                        continue
                    roi_gray = cv2.cvtColor(roi, cv2.COLOR_RGB2GRAY)
                    roi_up = cv2.resize(roi_gray, None, fx=4.0, fy=4.0, interpolation=cv2.INTER_CUBIC)
                    roi_blur = cv2.GaussianBlur(roi_up, (3, 3), 0)
                    _, roi_thresh = cv2.threshold(roi_blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                    if roi_thresh.mean() / 255.0 > 0.9:
                        roi_thresh = cv2.bitwise_not(roi_thresh)
                    roi_proc = cv2.dilate(roi_thresh, np.ones((2, 2), np.uint8), iterations=1)
                    roi_text_local = pytesseract.image_to_string(
                        roi_proc, config="--psm 7 -c tessedit_char_whitelist=0123456789/"
                    ).strip()
                    m_roi = regex.search(roi_text_local)
                    if m_roi:
                        score = len(m_roi.group(0)) + 10
                        if (best is None) or (score > best["score"]):
                            best = {
                                "score": score,
                                "text": m_roi.group(0),
                                "a": m_roi.group(1),
                                "b": m_roi.group(2),
                                "roi": roi,
                                "proc": roi_proc,
                                "roi_text": roi_text_local,
                            }
                    elif len(near) < 3:
                        near.append({"roi": roi, "proc": roi_proc})
            return best, near

        orientations = [
            ("0", img_np),
            ("90cw", cv2.rotate(img_np, cv2.ROTATE_90_CLOCKWISE)),
            ("180", cv2.rotate(img_np, cv2.ROTATE_180)),
            ("90ccw", cv2.rotate(img_np, cv2.ROTATE_90_COUNTERCLOCKWISE)),
        ]
        best_global = None
        best_orient = "0"
        near_misses = []

        for orient_name, img_orient in orientations:
            hit, near = _scan_number(img_orient)
            if hit:
                if (best_global is None) or (hit["score"] > best_global["score"]):
                    best_global = hit | {"orient": orient_name}
                    best_orient = orient_name
            if near_misses == []:
                near_misses = near

        if best_global:
            img_np = orientations[["0", "90cw", "180", "90ccw"].index(best_orient)][1]
            number_text = f"{best_global['a']}/{best_global['b']}"
            try:
                total_val = int(best_global["b"])
            except Exception:
                total_val = None
            number_conf = 0.85
            total_conf = 0.85
            roi_text = best_global.get("roi_text", "")
            cv2.imwrite("/tmp/gv_num_roi.png", best_global["roi"])
            cv2.imwrite("/tmp/gv_num_roi_proc.png", best_global["proc"])
            debug_notes.append(f"orient:{best_orient}")
        else:
            for idx, miss in enumerate(near_misses, start=1):
                cv2.imwrite(f"/tmp/gv_num_roi_miss{idx}.png", miss["roi"])
                cv2.imwrite(f"/tmp/gv_num_roi_proc_miss{idx}.png", miss["proc"])
            debug_notes.append("orient:none")

        # Vertical strip OCR (right edge)
        Hs, Ws = img_np.shape[:2]
        x0_strip, x1_strip = int(0.80 * Ws), Ws
        strip = img_np[:, x0_strip:x1_strip]
        strip_variants = [
            ("0", strip),
            ("90cw", cv2.rotate(strip, cv2.ROTATE_90_CLOCKWISE)),
            ("180", cv2.rotate(strip, cv2.ROTATE_180)),
            ("90ccw", cv2.rotate(strip, cv2.ROTATE_90_COUNTERCLOCKWISE)),
        ]

        # === STRIP_OCR_BEGIN ===

        best_strip = None
        best_proc = None
        best_strip_img = None
        best_tag = None

        strip_any_text = False
        strip_all_text = []

        debug_notes.append("strip:entered")

        for tag, strip_img in strip_variants:
            strip_gray = cv2.cvtColor(strip_img, cv2.COLOR_BGR2GRAY)
            strip_up = cv2.resize(strip_gray, None, fx=3.0, fy=3.0, interpolation=cv2.INTER_CUBIC)
            strip_proc = cv2.GaussianBlur(strip_up, (3, 3), 0)

            strip_txt = (pytesseract.image_to_string(strip_proc, config="--psm 6") or "").strip()

            if strip_txt:
                strip_any_text = True
            strip_all_text.append((tag, strip_txt))

            matches = list(re.finditer(r"(\d{1,3})\s*/\s*(\d{2,4})", strip_txt))
            debug_notes.append(f"strip:slash_candidates:{len(matches)}")

            for mm in matches[:3]:
                debug_notes.append(f"strip:cand:{tag}:{mm.group(1)}/{mm.group(2)}")

            for m in matches:
                num_val = int(m.group(1))
                total_val_candidate = int(m.group(2))

                if not (10 <= total_val_candidate <= 400 and 1 <= num_val <= total_val_candidate):
                    continue

                score = 0
                if 50 <= total_val_candidate <= 250:
                    score += 1000
                if 100 <= total_val_candidate <= 220:
                    score += 200
                score += 300 - abs(total_val_candidate - 159)
                score += (3 - len(str(total_val_candidate))) * 10

                if best_strip is None or score > best_strip["score"]:
                    best_strip = {
                        "num": num_val,
                        "total": total_val_candidate,
                        "score": score,
                        "roi_text": strip_txt,
                        "tag": tag,
                    }
                    best_proc = strip_proc
                    best_strip_img = strip_img
                    best_tag = tag

        debug_notes.append(f"strip:any_text:{strip_any_text}")
        for tag, txt in strip_all_text:
            debug_notes.append(f"strip:{tag}:len:{len(txt)}")

        try:
            if best_strip_img is not None:
                cv2.imwrite("/tmp/gv_num_strip.png", best_strip_img)
            if best_proc is not None:
                cv2.imwrite("/tmp/gv_num_strip_proc.png", best_proc)
                assert best_proc.ndim == 2
        except Exception:
            pass

        if best_strip is not None:
            number_text = f"{best_strip['num']}/{best_strip['total']}"
            total_val = best_strip["total"]
            number_conf = 0.9
            total_conf = 0.9
            roi_text = best_strip["roi_text"]

            debug_notes.append(f"num:vertical_strip:{best_tag}")

            if best_tag == "90cw":
                img_np = cv2.rotate(img_np, cv2.ROTATE_90_CLOCKWISE)
            elif best_tag == "180":
                img_np = cv2.rotate(img_np, cv2.ROTATE_180)
            elif best_tag == "90ccw":
                img_np = cv2.rotate(img_np, cv2.ROTATE_90_COUNTERCLOCKWISE)

            debug_notes.append(f"orient:{best_tag}")
        else:
            debug_notes.append("orient:none")

        # === STRIP_OCR_END ===

        # Name OCR from top band after orientation
        Ht, Wt = img_np.shape[:2]
        top = img_np[0:int(0.22 * Ht), 0:Wt]
        top_gray = cv2.cvtColor(top, cv2.COLOR_RGB2BGR)
        top_gray = cv2.cvtColor(top_gray, cv2.COLOR_BGR2GRAY)

        top_up = cv2.resize(top_gray, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)
        top_clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(top_up)
        top_blur = cv2.GaussianBlur(top_clahe, (3, 3), 0)
        top_sharp = cv2.addWeighted(top_clahe, 1.3, top_blur, -0.3, 0)

        raw7 = (pytesseract.image_to_string(top_sharp, config="--psm 7") or "").strip()
        raw6 = (pytesseract.image_to_string(top_sharp, config="--psm 6") or "").strip()

        def _letters(s: str) -> int:
            return sum(c.isalpha() for c in s)

        raw = raw6 if _letters(raw6) > _letters(raw7) else raw7
        line = next((ln.strip() for ln in raw.splitlines() if ln.strip()), "")
        line = re.sub(r"HP\s*\d{2,3}\b", "", line, flags=re.IGNORECASE).strip()
        line = re.sub(r"^[^A-Za-z]+", "", line).strip()

        if _letters(line) < 3:
            name_text = None
            name_conf = 0.0
        else:
            name_text = line
            name_conf = 0.85
        debug_notes.append("name:top_band")

        # Basic OCR using pytesseract; keeping minimal and deterministic.
        config = "--psm 6"
        text = pytesseract.image_to_string(img_np, config=config)
        text_norm = text.strip()

        for token in text_norm.split():
            if (
                len(token) <= 5
                and token.isalnum()
                and any(c.isalpha() for c in token)
                and any(c.isdigit() for c in token)
            ):
                abbrev_text = token.upper()

        debug_text_raw = text_norm
        if roi_text:
            debug_text_raw = f"{text_norm}\n[roi_num] {roi_text}"

        return {
            "name": {"text": name_text or None, "confidence": name_conf if name_text else 0.0},
            "number_raw": {"text": number_text or None, "confidence": number_conf if number_text else 0.0},
            "printed_total": {"value": total_val, "confidence": total_conf if total_val is not None else 0.0},
            "printed_set_abbrev_raw": {"text": abbrev_text or None, "confidence": 0.4 if abbrev_text else 0.0},
            "debug": {
                "engine": "pytesseract" if _OCR_AVAILABLE else "none",
                "text_raw": debug_text_raw,
                "notes": debug_notes,
            },
        }

    except Exception as e:
        return {
            "error": str(e),
            "trace": traceback.format_exc(),
            "name": None,
            "number_raw": None,
            "printed_total": None,
            "printed_set_abbrev_raw": None,
            "debug": {"engine": "exception"},
        }

@app.post("/ai-identify-warp")
async def ai_identify_warp(request: Request, req: AIIdentifyRequest):
    try:
        _require_gv_token(request)

        run_id = _run_id()
        dbg_dir = _debug_dir()

        if len(req.image_b64) > 8_000_000:
            return {
                "ok": False,
                "cache_hit": False,
                "run_id": run_id,
                "trace_id": req.trace_id,
                "sha256": None,
                "cached_at": None,
                "result": None,
                "error": "image_too_large",
            }

        try:
            img_bytes = base64.b64decode(req.image_b64)
        except Exception:
            return {
                "ok": False,
                "cache_hit": False,
                "run_id": run_id,
                "trace_id": req.trace_id,
                "sha256": None,
                "cached_at": None,
                "result": None,
                "error": "decode_failed",
            }

        if len(img_bytes) > 6_000_000:
            return {
                "ok": False,
                "cache_hit": False,
                "run_id": run_id,
                "trace_id": req.trace_id,
                "sha256": None,
                "cached_at": None,
                "result": None,
                "error": "image_too_large",
            }

        sha = hashlib.sha256(img_bytes).hexdigest()

        if not req.force_refresh:
            cached = _cache_get(sha)
            if cached is not None:
                try:
                    with open(os.path.join(dbg_dir, f"ai_identify_raw_{run_id}.txt"), "w", encoding="utf-8") as f:
                        f.write(
                            f"model={cached['result'].get('model')}\n"
                            f"sha256={sha}\n"
                            f"long_edge={os.environ.get('GV_AI_LONG_EDGE','1024')}\n"
                            f"cache_hit=True\n"
                            f"trace_id={req.trace_id}\n"
                        )
                except Exception:
                    pass
                return {
                    "ok": True,
                    "cache_hit": True,
                    "run_id": run_id,
                    "trace_id": req.trace_id,
                    "sha256": sha,
                    "cached_at": cached.get("cached_at"),
                    "result": cached["result"],
                    "error": None,
                }

        result = _openai_identify(img_bytes, run_id, dbg_dir, sha, cache_hit=False, trace_id=req.trace_id)
        cached_entry = {"result": result, "cached_at": datetime.utcnow().isoformat() + "Z"}
        _cache_put(sha, cached_entry)

        return {
            "ok": True,
            "cache_hit": False,
            "run_id": run_id,
            "trace_id": req.trace_id,
            "sha256": sha,
            "cached_at": cached_entry["cached_at"],
            "result": result,
            "error": None,
        }
    except Exception as e:
        err = str(e)
        if err == "unauthorized":
            return {
                "ok": False,
                "cache_hit": False,
                "run_id": _run_id(),
                "trace_id": None,
                "sha256": None,
                "cached_at": None,
                "result": None,
                "error": "unauthorized",
            }
        return {
            "ok": False,
            "cache_hit": False,
            "run_id": _run_id(),
            "trace_id": None,
            "sha256": None,
            "cached_at": None,
            "result": None,
            "error": err,
        }
