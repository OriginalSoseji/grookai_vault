# Scanner V2 OCR Service POST Timeout Audit

Status: Audit only. No runtime behavior, scanner UI, production scanner flow, identity worker, schema, embeddings, verifier rules, deployments, or dependencies were changed.

## Route File

Repo route implementation:

- `backend/ai_border_service/app.py`
- Route: `@app.post("/ocr-card-signals")`
- Function: `ocr_card_signals(request: Request)`

Live traceback confirms the deployed route is the same file shape:

- `/opt/grookai-ai/app.py`, line `564`: `Image.open(...)`
- `/opt/grookai-ai/app.py`, line `1030`: `_scan_modifier_region(img_np)`
- `/opt/grookai-ai/app.py`, line `747`: `pytesseract.image_to_string(...)`

## Endpoint URL Used

Harness/client endpoint:

- `GV_AI_BORDER_URL=http://165.227.51.242:7788`
- `${GV_AI_BORDER_URL}/ocr-card-signals`
- Exact URL: `http://165.227.51.242:7788/ocr-card-signals`

## Request Shape

Expected by `backend/ai_border_service/app.py`:

- `POST /ocr-card-signals`
- JSON body is accepted when the request body starts with `{` or `[`.
- Expected image field: `image_b64`
- Optional field: `polygon_norm`
- Raw image bytes are also accepted when the body is not JSON.

Actual harness/client shape:

- `POST`
- `content-type: application/json`
- Body: `{ "image_b64": "<base64 image bytes>" }`

The field name and payload shape match the route contract. This is not a payload field mismatch.

## Route Reachability

Current probes:

- `GET /openapi.json`: HTTP 200 in about 0.10s.
- `GET /ocr-card-signals`: HTTP 405 in about 0.10s, confirming the route exists and rejects GET.
- `POST /ocr-card-signals` with `{}`: HTTP 200 in about 0.10s with `debug.engine = "exception"` and a Pillow decode traceback at line 564.

The route is registered and reached. The service process is reachable.

## Valid Tiny JPEG Probe

Direct OCR-only POST:

- Payload: 8x8 white JPEG.
- JPEG bytes: `267`.
- Approx base64 bytes: `356`.
- Shape: `{ "image_b64": "<base64 jpeg>" }`.

With a 4 second client timeout:

- Result: client abort after about `4010` ms.
- Error: `AbortError`, message `This operation was aborted`.

With a 15 second client timeout:

- Result: HTTP 200 after about `7317` ms.
- Response body begins with `error: "No closing quotation"`.
- Trace points to:
  - line `1030`: `modifier_candidate_signals = _scan_modifier_region(img_np)`
  - line `747`: `pytesseract.image_to_string(...)`

This proves the tiny JPEG is decoded correctly and the route enters OCR. The 4 second timeout occurs while the server is still executing the OCR flow.

## OCR Flow Evidence

The route does all of the following synchronously inside one FastAPI request:

- Parses request body and optional JSON.
- Decodes base64 into image bytes.
- Decodes image with Pillow.
- Optionally warps by `polygon_norm`.
- Runs collector-number OCR across 3 y-bands x 3 x-bands x 4 orientations.
- Runs right-edge strip OCR across 4 orientations.
- Runs name OCR with two PSM modes.
- Runs full-image OCR.
- Runs set-region OCR across 4 regions x 2 PSM modes.
- Runs modifier/stamp OCR across 2 regions x 2 PSM modes.

There is no per-`pytesseract.image_to_string` timeout in the route.

## Where Timeout Occurs

The timeout is not before request parsing, route registration, JSON parsing, base64 decode, or image decode.

The timeout occurs after valid image decode, while the route is executing synchronous multi-pass Tesseract OCR. With a longer client timeout, the route eventually returns an exception body from the modifier/stamp OCR path, not a successful OCR result.

The specific later exception is caused by the modifier-region Tesseract config:

- `-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'’ -`

That config includes quote-like characters and a space in the whitelist string. The live Tesseract error is `No closing quotation`.

## Classification

Verified cause:

- Server process reachable but route blocks longer than the harness timeout on valid-image OCR.
- Tesseract subprocess work is the blocking section.
- The route also has a modifier/stamp Tesseract config error that can surface after several seconds.

Rejected causes:

- Wrong endpoint URL: no.
- Wrong request shape: no.
- Server route not registered: no.
- Image decode issue for tiny JPEGs: no.
- Payload field mismatch: no.
- Normalized PNG size as the only cause: no. The tiny 267-byte JPEG still exceeds 4 seconds.

## Root Cause

`/ocr-card-signals` is implemented as one broad, synchronous, multi-pass OCR endpoint. Even a tiny valid JPEG triggers many Tesseract subprocess calls before the route can respond. The current route has no internal OCR budget, no per-call Tesseract timeout, no fast path for only number/set signals, and no early return for small or invalid OCR regions. After several OCR passes, the modifier/stamp scan can raise `No closing quotation` because of its Tesseract whitelist config.

The harness timeout is therefore a symptom. Raising the timeout is not the primary fix because it would still leave the route slow and would still expose the modifier/stamp OCR exception.

## Recommended Next Patch

Patch belongs primarily in the OCR service route.

Recommended service patch:

- Add a constrained OCR mode or route path for Scanner V2 Phase 1 that extracts only collector number and set signals.
- Skip modifier/stamp OCR and full-card OCR for the harness fast path.
- Add per-call `pytesseract.image_to_string(..., timeout=<seconds>)` budgets.
- Catch `pytesseract.TesseractError` around each OCR pass so one failed region does not fail the whole response.
- Fix or remove the modifier-region whitelist config that currently produces `No closing quotation`.
- Add route-level timing/debug notes that identify which OCR phase ran and which phase timed out or failed.

Secondary patch locations:

- OCR client/helper: optionally pass an explicit OCR mode, such as `mode: "number_set"` or `signals: ["number", "set"]`, once the service supports it.
- Harness: keep bounded JPEG input prep and POST preflight. Do not rely on timeout increases as the fix.
- Config/env: no primary fix identified.

## Verification Commands Run

- `rg -n "ocr-card-signals|image_b64|polygon_norm|pytesseract|image_to_string" backend/ai_border_service backend/condition backend/scanner_v2 docs/audits/scanner_v2_harness_ocr_timeout_audit.md -S`
- `curl.exe -m 5 -s -o - -w "\\ninvalid_json_http=%{http_code} time=%{time_total} error=%{errormsg}\\n" -H "content-type: application/json" -d "{}" http://165.227.51.242:7788/ocr-card-signals`
- `curl.exe -m 5 -s -o NUL -w "openapi_http=%{http_code} time=%{time_total} error=%{errormsg}\\n" http://165.227.51.242:7788/openapi.json`
- `curl.exe -m 5 -s -o NUL -w "ocr_get_http=%{http_code} time=%{time_total} error=%{errormsg}\\n" http://165.227.51.242:7788/ocr-card-signals`
- Direct Node OCR-only POST with an 8x8 JPEG and 15 second timeout.
- Direct Node OCR-only POST with an 8x8 JPEG and 4 second timeout.

No temporary helper files were created.
