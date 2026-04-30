# Scanner V2 Harness OCR Timeout Audit

Source of truth:

- `docs/contracts/scanner_engine_v2_contract.md`
- `docs/plans/scanner_engine_v2_phase1_plan.md`
- `docs/audits/scanner_engine_v2_phase1_ocr_verifier_reuse_audit.md`
- `backend/scanner_v2/run_scanner_engine_v2_phase1_harness.mjs`

Status: Audit only. No verifier rules, production scanner code, backend identity worker code, schema, deployments, or dependencies were changed.

## Root Cause

The harness times out because it sends a full-resolution scanner frame to the multi-pass `/ocr-card-signals` Tesseract endpoint under a 4 second client timeout. When embedding decode fallback normalizes an Android JPEG, the harness sends the normalized PNG buffer to OCR; for the audited image that expanded the OCR request from a 6.82 MB JPEG to a 20.48 MB PNG, then to about 27.30 MB of base64 before JSON overhead.

The OCR service is currently reachable. Current probes show:

- TCP `165.227.51.242:7788`: reachable.
- `GET http://165.227.51.242:7788/`: HTTP 404 in about 1.50s, which is compatible with no root route.
- `GET http://165.227.51.242:7788/openapi.json`: HTTP 200 in about 1.51s.
- `GET http://165.227.51.242:7788/ocr-card-signals`: HTTP 405 in about 1.50s, which confirms the route exists and rejects GET.

So the current failure is not service reachability. It is the exact harness OCR POST workload exceeding the configured timeout.

## Harness Call Evidence

`backend/scanner_v2/run_scanner_engine_v2_phase1_harness.mjs`:

- Imports `ocrCardSignalsAI` from `backend/condition/ai_border_detector_client.mjs`.
- Sets the default OCR timeout to `4000` ms.
- Allows `--ocr-timeout-ms <ms>`, clamped to values `>= 500`.
- Normalizes failed embedding inputs with Sharp as PNG:
  - `sharp(originalBuffer, { failOn: 'none' }).rotate().png({ compressionLevel: 9 }).toBuffer()`
- If original embedding succeeds, OCR receives the original buffer.
- If embedding decode fallback is used, OCR receives `normalized.normalizedBuffer`.
- Calls:
  - `ocrCardSignalsAI({ imageBuffer: embeddedResult.imageBufferForOcr, timeoutMs: ocrTimeoutMs })`

The harness does not send `polygon_norm`, does not send a card crop, and does not create an OCR-specific bounded JPEG.

## Client Evidence

`backend/condition/ai_border_detector_client.mjs`:

- Reads `GV_AI_BORDER_ENABLE` and `GV_AI_BORDER_URL`.
- Builds the endpoint as:
  - `${GV_AI_BORDER_URL}/ocr-card-signals`
- With current `.env.local`, that resolves to:
  - `http://165.227.51.242:7788/ocr-card-signals`
- Sends:
  - `POST`
  - `content-type: application/json`
  - body `{ image_b64: imageBuffer.toString('base64') }`
- Uses `AbortController`.
- Maps an abort to:
  - `error: "ai_timeout"`

The client supports only image bytes for OCR. Unlike the service endpoint, this wrapper does not accept or forward `polygon_norm`.

## OCR Endpoint Evidence

`backend/ai_border_service/app.py`:

- Exposes `POST /ocr-card-signals`.
- Accepts either raw request bytes or JSON with `image_b64`.
- Optionally accepts `polygon_norm`.
- If `polygon_norm` is present, it warps the image before OCR.
- If `polygon_norm` is absent, it OCRs the supplied image as-is.
- Uses Pillow decode, OpenCV preprocessing, and optional `pytesseract`.
- If `pytesseract` is unavailable, it returns null OCR fields with `debug.engine = "pytesseract_missing"`.

The endpoint does not accept explicit OCR regions as API inputs. Its internal region math scans expected card areas from the image it receives.

## Workload Evidence

The endpoint performs many OCR passes:

- Collector-number OCR over multiple bottom bands.
- Orientation retries across 0, 90 clockwise, 180, and 90 counterclockwise.
- Right-edge vertical strip OCR across orientation variants.
- Set-region OCR over several bottom and neighbor bands with multiple PSM modes.
- Modifier/stamp OCR over artwork regions with multiple PSM modes.
- Name OCR on the top band.
- Full-image OCR with `--psm 6`.

That workload is too heavy for a full 3000x4000 scanner frame with a 27 MB base64 JSON request and a 4 second timeout.

## Payload Size After Normalization

Audited image:

- Original file:
  - `.tmp/embedding_test_images/01_c6042d0e-972c-4048-b7ff-038b027135f6.jpg`
  - JPEG, 4000x3000
  - `6,820,400` bytes
  - base64 length about `9,093,868` bytes
- Harness-normalized file:
  - `.tmp/scanner_v2_normalized/01_c6042d0e-972c-4048-b7ff-038b027135f6__normalized.png`
  - PNG, 3000x4000
  - `20,477,797` bytes
  - base64 length about `27,303,732` bytes
  - JSON body about `27,303,748` bytes before HTTP framing

Safe OCR-only test on that one normalized image:

- Input: normalized PNG above.
- Timeout: `4000` ms.
- Result: `ok: false`, `error: "ai_timeout"`.
- Elapsed: about `4005` ms.
- Notes: `This operation was aborted`.

No production writes were performed.

## Input Shape Findings

Does OCR expect raw image, warped image, or specific regions?

- The service can accept raw image bytes or JSON base64.
- The service can also accept `polygon_norm` and internally warp the card.
- The service does not accept specific OCR regions.
- Best behavior is expected when the supplied image is already a card-like frame, or when `polygon_norm` lets the service warp to one.

Current harness behavior:

- Sends the full input image.
- Sends no `polygon_norm`.
- Sends no card crop.
- For embedding decode fallback cases, sends a full-resolution normalized PNG.

This is poorly aligned with the endpoint's internal region assumptions and creates unnecessary OCR work.

## JPEG / PNG Findings

PNG conversion does not appear semantically wrong for OCR:

- Pillow decodes PNG.
- The endpoint converts decoded images to RGB and NumPy arrays.
- There is no evidence that PNG format itself breaks OCR.

PNG conversion is operationally harmful for scanner photos:

- Lossless PNG inflates photographic images substantially.
- Base64 JSON expands the payload again.
- Larger payloads increase client-side encoding time, upload time, server JSON parse/base64 decode time, image decode time, memory pressure, and OCR preprocessing time.

For OCR, a bounded JPEG crop or warped card image is the better transport shape.

## Recommended Fix

Recommended next patch: change only the Scanner V2 harness.

1. Add an OCR service preflight once at harness startup.
   - Probe `GV_AI_BORDER_URL` with a short timeout.
   - Treat HTTP 200 on `/openapi.json` or HTTP 405 on `GET /ocr-card-signals` as reachable.
   - If unreachable, skip per-image OCR and record an OCR skip reason instead of spending 4 seconds per image.

2. Split embedding normalization from OCR input normalization.
   - Keep PNG decode repair only for embedding if needed.
   - Do not pass the full normalized PNG to OCR.
   - Build an OCR-specific bounded JPEG buffer, for example EXIF-rotated with long edge capped and JPEG quality around 88-92.

3. Prefer card crop or warp before OCR.
   - Best harness path: detect border -> use `polygon_norm` or warp/crop -> OCR.
   - If using `/ocr-card-signals` directly, extend the client wrapper to pass `polygon_norm`.
   - If no crop or polygon is available, skip full-image OCR or use a much smaller bounded JPEG and record that it was uncropped.

4. Keep verifier rules unchanged.
   - OCR failure, OCR skip, timeout, or no crop should route to fallback.
   - Do not relax deterministic number/set agreement.

5. Tune timeout only after fixing input shape.
   - Raising timeout alone hides the problem and makes harness runs slow.
   - A modest timeout increase may be reasonable after OCR input is bounded and cropped.

## OCR Strategy Decision

Use the existing OCR service, but region crop or warp first.

Do not add local OCR now:

- It would require new runtime assumptions or dependencies.
- The task explicitly prohibits new dependencies.
- The repo already has a service/client boundary for OCR.

Do not keep full-image OCR as the default:

- It is slow.
- It is expensive over JSON base64.
- It is weaker for OCR accuracy because endpoint regions are relative to the entire scanner frame rather than the card.

Recommended order:

1. OCR service preflight.
2. OCR-specific bounded JPEG buffer.
3. Card crop or `polygon_norm` warp before OCR.
4. Timeout tuning after the above.

## Recommended Next Patch

Patch only `backend/scanner_v2/run_scanner_engine_v2_phase1_harness.mjs`, with a small compatible client extension if needed:

- Add one OCR reachability check.
- Add OCR diagnostics fields such as `ocr_reason`, `ocr_payload_bytes`, and `ocr_payload_format`.
- For normalized embedding cases, keep using the normalized image for embedding but prepare a separate bounded JPEG for OCR.
- Prefer `polygon_norm`/warp/crop before OCR when available.
- Skip OCR cleanly when the service is unreachable or the OCR input would be unbounded.
- Preserve fallback behavior and verifier rules.
