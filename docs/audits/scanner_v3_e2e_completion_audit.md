# Scanner V3 E2E Completion Audit

Date: 2026-05-03

## Active Runtime Path

- Scan tab entry: `lib/main_shell.dart` calls `ConditionCameraScreen(title: 'Scan Card')`.
- Scanner screen: `lib/screens/scanner/condition_camera_screen.dart`.
- V3 routing: `ConditionCameraScreen` treats `title == 'Scan Card'` as the Scanner V3 live loop path.
- Camera stream: `CameraController.startImageStream` samples YUV420 frames about every 200-250 ms.
- Native quad detector: Dart calls `NativeQuadDetector` through channel `gv/quad_detector_v1`; current Android bridge files exist under `android/app/src/main/kotlin/com/example/grookai_vault/scanner/`.
- Normalization: `ScannerV3LiveLoopController` normalizes each accepted frame, extracts full-card and artwork regions, and measures quality.
- Identity: `ScannerV3IdentityPipelineV8` generates eight query crops, calls `/scanner-v3/embed`, then `/scanner-v3/candidates`, unions/reranks the results, and sends top candidates into `CandidateVoteState`.
- Guard: V9 confidence guard accepts only temporally stable candidates with crop support, recent frame support, score gap, and distance checks.

## Findings

| Check | Result |
| --- | --- |
| Scan tab opens V3 path | Yes, by `title == 'Scan Card'` routing in `ConditionCameraScreen`. |
| `SCANNER V3 LIVE LOOP` literal visible | No; production UI now shows `Live scan` instead of the old debug label. Diagnostics still show `V8/V9` in debug builds. |
| Camera stream starts | Yes, after camera initialization; stream feeds native quad detection and V3 controller. |
| Native quad detector registered | Expected through Android bridge recovery files; build validation is required because these files are currently dirty/untracked. |
| Normalized artifacts produced | Yes inside `ScannerV3LiveLoopController` for accepted frames; lock artifact export remains debug-only. |
| Identity endpoints configured | Only when built with `SCANNER_V3_EMBEDDING_ENDPOINT` and `SCANNER_V3_VECTOR_ENDPOINT` dart-defines or matching dotenv entries. |
| `/embed` called | Yes, once per generated crop when endpoint config exists and a frame passes quality. |
| `/candidates` called | Yes, after each successful crop embedding. |
| Top-5 candidates reach UI | Yes through `CandidateVoteState` and `ScannerV3LiveLoopState.candidates`; production UI shows only one primary candidate. |
| V9 guard blocks/accepts | Guard state drives `candidate_unstable`, `candidate_ambiguous`, `candidate_unknown`, and `identity_locked`. |

## Root Cause Of Missing Candidates

The installed debug APK was built without Scanner V3 identity endpoint dart-defines. In that state the embedding service throws `embedding_endpoint_not_configured` for every crop, no crop succeeds, V8 returns no candidates, and the UI previously continued to look like normal scanning.

This patch makes that failure mode explicit and fail-safe:

- production UI shows `Scanner identity service unavailable`;
- no primary candidate is shown while identity service is unavailable;
- debug Diagnostics show the service error reason;
- service-backed builds still use the same V8/V9 candidate and guard path.

## Request Shapes

`POST /scanner-v3/embed`

```json
{
  "image_b64": "<png base64>",
  "input": "scanner_v3_v8_artwork",
  "mode": "scanner_v3_option_a_embedding_v1"
}
```

`POST /scanner-v3/candidates`

```json
{
  "embedding": [0.0],
  "top_k": 50,
  "mode": "scanner_v3_option_a_vector_v1",
  "query_crop_type": "artwork"
}
```

## Response Shapes

`/scanner-v3/embed` returns `embedding`, `dimensions`, `model`, and timing fields.

`/scanner-v3/candidates` returns `candidates`, each with `card_id`, `distance`, `similarity`, rank/view/crop metadata, and optional display metadata such as `name`, `set_code`, `number`, `gv_id`, and `image_url`.

## Completion Changes

- Added explicit Scanner V3 identity service unavailable state in `ScannerV3LiveLoopState`.
- Added production UI copy for unavailable identity service.
- Preserved backend-looking details inside debug-only Diagnostics.
- Carried display metadata from vector candidates into the vote snapshot so production UI can avoid raw candidate IDs.
- Kept raw IDs available in Diagnostics only.

## Validation Required

1. Build once without endpoint defines and confirm the unavailable state appears after an accepted frame attempts identity.
2. Start local identity service, build with endpoint dart-defines, install, and confirm candidates populate.
3. Scan an out-of-index card and confirm it remains unknown/ambiguous instead of final-locking a wrong card.
4. If no in-index physical card is available, rely on `run_scanner_v3_v8_known_reference_validation.mjs` for known-reference lock proof.
