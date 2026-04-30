# Scanner Engine V2 Phase 1 OCR / Verifier Reuse Audit

Source of truth:

- `docs/contracts/scanner_engine_v2_contract.md`
- `docs/plans/scanner_engine_v2_phase1_plan.md`

Status: Audit only. No production code, migrations, schema changes, scanner UI changes, backend worker changes, deployments, or dependency installs were performed.

## 1. Executive Summary

What can be reused:

- `backend/identity/parseCollectorNumberV1.mjs` can normalize and compare slash collector numbers, including OCR ambiguity flags.
- `backend/identity/normalizeSetIdentityV1.mjs` can normalize set abbreviation and set-text signals against known set metadata, although Phase 1 should use a simpler exact candidate-set check.
- `backend/ai_border_service/app.py` already contains a `/ocr-card-signals` endpoint that can extract card name, printed number, printed total, printed set abbreviation candidates, set-region text, and modifier/stamp text using `pytesseract` when available.
- `backend/condition/ai_border_detector_client.mjs` already exposes an `ocrCardSignalsAI` client wrapper for `/ocr-card-signals`.
- The existing scanner capture path already has post-capture timing, local image paths, and fallback handoff to `IdentityScanService.startScan`.
- The existing identity worker already downloads the scan, runs border detection, warps the card, calls the AI identity resolver, parses name/number/set signals, searches candidates, and writes append-only result rows.

What is missing:

- No app-side OCR module or OCR dependency exists in Flutter/Android.
- No Phase 1 verifier module exists.
- Existing `/ocr-card-signals` is not wired into `identity_scan_worker_v1`.
- Current scanner-visible identity outputs arrive after upload and AI/worker processing, so they cannot be reused for a pre-upload fast path without adding a new path.
- `backend/ai_border_service/requirements.txt` does not list `pytesseract`, even though `app.py` imports it optionally.
- Stamp/variant OCR exists only as weak text hints and is excluded from Phase 1.

Recommended verifier location:

- Recommended first implementation location: local Node test harness.
- Recommended production candidate after harness success: backend pre-AI experiment inside the identity pipeline, guarded so fallback remains unchanged.
- Not recommended for Phase 1 first implementation: app-side before upload, because the app currently has no reusable OCR or embedding runtime.

Reuse decision:

- CREATE new minimal verifier module.
- Reuse existing OCR extraction endpoint/client where practical.
- Reuse existing collector-number parser.
- Do not reuse AI preview outputs for fast-path verification because they are produced by the slow fallback path.

## 2. Existing OCR / Text Extraction Evidence

`backend/ai_border_service/app.py`

- Optional OCR import: lines 24-28 import `pytesseract` and set `_OCR_AVAILABLE`; missing import falls back instead of failing the service.
- `OCRResponse` shape: lines 36-49 define `name`, `number_raw`, `printed_total`, `printed_set_abbrev_raw`, `raw_set_text`, `raw_set_symbol_region_text`, `raw_set_candidate_signals`, `raw_printed_modifier_text`, `raw_stamp_text`, `raw_modifier_region_text`, `raw_modifier_candidate_signals`, and `printed_modifier_confidence_0_1`.
- `/ocr-card-signals`: lines 546-1088 implement OCR extraction.
- Polygon-aware preprocessing: lines 568-603 can warp from `polygon_norm`.
- Missing OCR fallback: lines 606-613 return null OCR fields with `debug.engine = pytesseract_missing`.
- Set text extraction: lines 640-717 scan bottom and number-neighbor regions for set-like tokens and confidence values.
- Modifier/stamp text extraction: lines 719-795 scan lower artwork regions for printed modifier phrases.
- Collector number extraction: lines 797-875 scan multiple bottom-region bands for slash numbers.
- Right-edge number fallback: lines 876-976 scan vertical strip variants and can set number confidence to `0.9`.
- Name extraction: lines 978-1006 OCR the top band and assigns `0.85` confidence when usable.
- Response fields: lines 1042-1068 return OCR text, confidence fields, candidate signals, and debug notes.

`backend/condition/ai_border_detector_client.mjs`

- `ocrCardSignalsAI` exists at lines 218-273.
- It is gated by `GV_AI_BORDER_ENABLE=1` and `GV_AI_BORDER_URL`.
- It posts image bytes as base64 to `/ocr-card-signals`.
- Repo search found this client exported but not used by `identity_scan_worker_v1`.

`backend/ai_border_service/requirements.txt`

- Contains FastAPI, OpenCV, Pillow, NumPy, and related server dependencies.
- Does not include `pytesseract`, even though OCR depends on it when available.

`package.json`

- Contains Node dependencies for Supabase, dotenv, pg, sharp, and Phase 8 embedding research.
- Contains no OCR-specific Node dependency.

Flutter / Android scanner app

- `pubspec.yaml` includes camera packages but no OCR/text-recognition package.
- `lib/services/identity/identity_scan_service.dart` reads the captured file, uploads it to `identity-scans`, creates an `identity_snapshots` row, enqueues `identity_scan_enqueue_v1`, then polls `identity_scan_event_results`.
- `lib/services/scanner/native_scanner_phase0_bridge.dart` exposes readiness and capture only: image path, dimensions, file size, zoom, exposure, and ready state.
- `android/.../ScannerCameraPhase0Controller.kt` writes a JPEG capture and returns capture metadata; it does not run text detection.

AI identify output

- `/ai-identify-warp` prompts the AI model to return `name`, `raw_name_text`, `collector_number`, `raw_number_text`, `raw_set_abbrev_text`, `raw_set_text`, printed modifier/stamp text, printed total, HP, set confidence, modifier confidence, and overall confidence.
- This is useful fallback evidence, but it is not reusable for fast-path verification because it is the slow AI path itself.

Can existing code already extract required fields?

| Field | Existing extraction? | Evidence | Reuse status |
| --- | --- | --- | --- |
| Printed card number | Yes | `/ocr-card-signals` `number_raw`; AI identify `collector_number`; `parseCollectorNumberV1` normalizes slash numbers. | Reuse parser; use OCR endpoint only in harness/backend experiment. |
| Set code / set abbreviation | Partial | `/ocr-card-signals` set regions and `normalizeSetIdentityV1`; AI identify set fields. | Reuse normalization cautiously; Phase 1 should require exact match to candidate metadata. |
| Card name | Yes | OCR top-band extraction and AI identify output. | Not required for Phase 1 verifier acceptance. |
| Stamp / variant hints | Partial | OCR modifier/stamp regions and `normalizePrintedModifierV1`. | Preserve for future; exclude from Phase 1 acceptance. |
| OCR confidence | Partial | Endpoint returns heuristic confidence per field; AI identify returns model confidence. | Reuse only as logging/fallback reason, not identity proof. |

## 3. Existing Identity Resolver Evidence

`backend/identity/identity_scan_worker_v1.mjs`

- Lines 596-690 resolve the scan event, download the front image, run AI border detection, and warp the card.
- Lines 693-707 call `/ai-identify-warp` and unwrap the AI response.
- Lines 708-727 parse AI name and collector number through `normalizeCardNameV1` and `parseCollectorNumberV1`.
- Lines 773-808 build `signals.ai` with name, raw number, collector number, number plain, printed total, raw set fields, set confidence, and debug.
- Lines 818-836 call `search_card_prints_v1` and shape candidate rows with `card_print_id`, `name`, `set_code`, `number`, `number_plain`, `printed_set_abbrev`, `printed_total`, `variant_key`, and `print_identity_key`.
- Lines 857-890 call `normalizeSetIdentityV1` using AI set fields and resolver candidates.
- Lines 898-910 insert an append-only `ai_hint_ready` result and optionally start real-scan learning after high-confidence outcomes.

Important limitation:

- The worker imports `detectOuterBorderAI` and `warpCardQuadAI`, but not `ocrCardSignalsAI`.
- `ENABLE_AI_READ_NUMBER` is hardcoded `false`, and the referenced `/ai-read-number` endpoint was not found in `app.py`.
- The worker uses AI identity output as its primary text source, not the standalone Tesseract OCR endpoint.

`backend/identity/grookai_vision_worker_v1.mjs`

- Lines 304-366 parse AI result name, number, printed total, HP, confidence, raw set text, and set confidence.
- Lines 368-381 call `normalizeSetIdentityV1`.
- Lines 391-400 append `identity_scan_event_results`.
- This is another AI-output consumer, not a pre-AI OCR/verifier path.

`backend/identity/normalizeSetIdentityV1.mjs`

- Lines 136-177 collect AI and OCR set signals, including `ocr:printed_set_abbrev_raw`, `ocr:set_symbol_region_text`, and `ocr:set_candidate`.
- Lines 180-205 match direct set signals to set code and printed set abbreviation indexes.
- Lines 273-475 resolve direct set signals against resolver candidates and confidence thresholds.
- It is useful for mapping raw OCR set text to canonical set rows, but Phase 1 should avoid complex confidence promotion and use exact candidate agreement.

`backend/identity/normalizePrintedModifierV1.mjs`

- Lines 30-83 collect AI/OCR printed modifier, stamp, modifier-region, and candidate signals.
- Lines 86-103 currently recognize Pokemon Together stamp text.
- Lines 105-208 return READY/PARTIAL/BLOCKED modifier decisions.
- This should be preserved for future stamp/variant work, but not used in Phase 1 instant acceptance.

`backend/identity/identity_resolution_v1.mjs`

- Provides warehouse/canonical promotion resolution states such as `PROMOTE_NEW`, `PROMOTE_VARIANT`, `ATTACH_PRINTING`, `MAP_ALIAS`, and ambiguity/review blockers.
- It is not the right module for scanner fast-path identity confirmation.

`backend/identity/identity_verify_v1.mjs`

- Audits active identity rows and required identity fields such as printed number and set code.
- It is not a runtime OCR/verifier module.

## 4. Scanner Integration Options

| Option | Pros | Risks | Latency impact | Implementation complexity |
| --- | --- | --- | --- | --- |
| App-side before upload | Matches the V2 contract target; can avoid upload/AI when accepted; best user experience if fully local. | No current app OCR dependency, no app embedding runtime, no existing candidate metadata join, more mobile complexity, harder auth/RPC/error handling. | Best possible accepted-path latency, but unavailable with current reusable modules. | High. |
| Local Node test harness | Reuses existing embedding service, Supabase RPC, OCR endpoint/client, and parser modules; no production UI/backend change; safest way to prove Phase 1. | Not user-facing; not true pre-upload; depends on local/remote AI border OCR availability; cannot prove mobile latency. | No production latency impact. | Low to medium. |
| Backend pre-AI | Can reuse existing identity worker image download, border detection, warp, Supabase service role, candidate metadata, and append-only result pattern. | Runs after upload; can delay fallback unless gated or parallelized; not under 300ms due upload/download/warp/network; worker already has slow-path responsibilities. | Adds OCR/retrieval work before fallback unless carefully guarded. | Medium. |
| AI border service-side | Has OpenCV, PIL, and optional Tesseract; already owns image preprocessing and OCR. | Verifier would need DB/RPC access or candidate metadata, which does not belong in the AI border service; mixes deterministic identity decision into an image service; deployment/dependency risk. | Adds another service hop or expands an existing one. | Medium to high. |
| Existing identity worker | Centralized, already appends results and has resolver candidates; easiest production place to observe decisions. | Same as backend pre-AI; current worker does not call standalone OCR; using AI outputs would not be fast path. | Potential fallback regression unless verifier is measured and non-blocking. | Medium. |

Recommendation:

- Use a local Node test harness first.
- The harness should run capture image -> existing embedding service -> `embedding_lookup_v1` -> OCR extraction -> minimal verifier -> decision report.
- Only after it proves useful should the production experiment move to backend pre-AI, and only with latency logging and a fallback-preserving guard.
- App-side before upload remains the architectural goal, but the current repo has no reusable app OCR implementation to support it safely.

## 5. Reuse Decision

Decision: CREATE new minimal verifier module.

Rationale:

- There is no existing function that accepts embedding candidates plus OCR number/set and returns a deterministic instant/fallback decision.
- Existing identity resolver modules are broader than Phase 1 and use AI/resolver evidence rather than operating strictly inside an embedding candidate set.
- Existing OCR can be reused as an input source, but not as the verifier itself.
- Existing AI preview outputs must not be used for fast-path acceptance because they arrive from the fallback AI path.

Reuse list:

- Reuse `parseCollectorNumberV1` for OCR number normalization.
- Reuse candidate metadata fields already present in `card_prints` / `search_card_prints_v1` style rows: `card_print_id`, `set_code`, `number`, `number_plain`, `printed_set_abbrev`, and `printed_total`.
- Reuse `/ocr-card-signals` or its client wrapper for test harness OCR if the environment has Tesseract available.
- Keep `normalizeSetIdentityV1` available for raw set token normalization, but do not let it promote ambiguous set evidence in Phase 1.

Do not reuse:

- Do not use AI identify result as fast-path OCR.
- Do not use `identity_resolution_v1` as the Phase 1 scanner verifier.
- Do not use `normalizePrintedModifierV1` for Phase 1 acceptance.
- Do not use fingerprint/cache fast paths as proof of V2 embedding identity.

## 6. Phase 1 Minimal Verifier Contract

Inputs:

```ts
type Phase1Candidate = {
  card_print_id: string;
  set_code: string | null;
  number: string | null;
  number_plain: string | null;
  printed_set_abbrev?: string | null;
  printed_total?: number | null;
  distance?: number | null;
};

type Phase1OcrNumber = {
  raw: string | null;
  number_raw: string | null;
  number_plain: string | null;
  printed_total: number | null;
  confidence: number | null;
};

type Phase1OcrSet = {
  raw: string | null;
  set_code: string | null;
  printed_set_abbrev: string | null;
  confidence: number | null;
};
```

Required verifier call:

```ts
verifyScannerEngineV2Phase1({
  candidates,
  ocr_number,
  ocr_set,
})
```

Output:

```ts
type Phase1VerifierDecision = {
  decision: 'instant' | 'fallback';
  card_print_id: string | null;
  passed_candidate_count: number;
  reason:
    | 'accepted_exact_number_set'
    | 'no_candidates'
    | 'ocr_number_missing'
    | 'ocr_set_missing'
    | 'ocr_number_mismatch'
    | 'ocr_set_mismatch'
    | 'ambiguous_candidates'
    | 'unsupported_set'
    | 'invalid_candidate_metadata';
  evidence: {
    ocr_number_raw: string | null;
    ocr_number_plain: string | null;
    ocr_set_raw: string | null;
    matched_number_plain: string | null;
    matched_set_code: string | null;
  };
};
```

Rules:

- Operate only on the embedding candidate set.
- Require `top_k = 5`.
- Require OCR number to normalize successfully.
- Require OCR set to normalize to the candidate's set code or exact printed set abbreviation.
- Accept only when exactly one candidate has both number and set agreement.
- Return fallback for missing OCR, mismatches, multiple passing candidates, unsupported sets, or invalid metadata.
- Ignore embedding distance for identity confirmation.
- Ignore stamp/variant hints in Phase 1.

## 7. Risks

- OCR failures: scanner captures may be too blurry, glared, rotated, or low resolution for reliable bottom-number/set OCR.
- Set abbreviation ambiguity: raw OCR tokens can match noise, short set abbreviations, or unrelated card text.
- Dependency risk: `pytesseract` is optional in `app.py` but absent from `requirements.txt`; runtime availability is not guaranteed from repo state.
- Current embedding limitation: Phase 8 real-image tests showed embeddings alone were not ready, so verifier testing must assume retrieval misses can be common.
- Backend latency risk: backend pre-AI OCR/retrieval can delay fallback unless measured and guarded.
- App-side gap: no current OCR implementation exists in Flutter/Android, so true pre-upload fast path needs new mobile capability later.
- Stamp/variant exclusion: Phase 1 must not accept stamp/variant-sensitive identity where number/set agreement is insufficient.
- Existing fingerprint/cache path risk: it is a separate experimental fast path and should not be treated as V2 verifier evidence.

## 8. Recommended Next Step

Next Codex step:

- Create a local, non-production Scanner Engine V2 Phase 1 harness plan or harness contract before writing production code.
- The harness should reuse:
  - `backend/embeddings/image_embedding_service_v1.mjs`
  - `embedding_lookup_v1`
  - `/ocr-card-signals` or `ocrCardSignalsAI`
  - `parseCollectorNumberV1`
  - a new minimal verifier module
- Test only real ME scanner images.
- Record OCR outputs, top 5 embedding candidates, verifier decision, fallback reason, and timing.

Implementation should not begin in the scanner UI or identity worker until the harness proves:

- OCR number and set extraction are usable on clean ME scans.
- The true card appears in the embedding candidate set often enough to justify integration.
- The verifier produces 0 wrong instant matches.

Explicit recommendation:

- OCR reuse decision: reuse existing OCR endpoint/client for harness/backend experiments; do not reuse AI preview outputs for fast path.
- Verifier reuse decision: create a new minimal verifier module.
- Recommended verifier location for the first working Phase 1 implementation: local Node test harness.
- Recommended later production experiment location: backend pre-AI, only after harness success and with fallback latency protection.
