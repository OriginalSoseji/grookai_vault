# Scanner Backend Latency Audit

## 1. Executive Summary

This audit traced the scanner backend path from local image upload through enqueue, worker processing, external AI border/warp/identify calls, resolver lookup, result insert, and app polling.

Current instrumentation is strongest on the Flutter/app side and weakest inside the worker. The app logs upload, snapshot insert, enqueue invocation, poll response, and display timing. The worker logs stage names as JSON events but does not record elapsed milliseconds for the expensive operations. The edge functions also do not record per-step timings.

Most likely latency is spent in these areas:

1. Queue handoff from `identity_scan_events` insert to worker claim.
2. External AI calls:
   - `/detect-card-border`
   - `/warp-card-quad`
   - `/ai-identify-warp`
3. Storage read path:
   - signed URL creation plus fetching the uploaded image.
4. Resolver and set identity work:
   - `search_card_prints_v1`
   - `normalizeSetIdentityV1`
5. App polling cadence:
   - one-second polling interval plus two server reads per poll.

The next patch should add deterministic timing fields to worker logs and result `signals.timings` before doing optimization.

## 2. Current Flow

### App upload and enqueue

File: `lib/services/identity/identity_scan_service.dart`

Flow:

1. Read local captured file.
2. Upload image bytes to Supabase Storage bucket `identity-scans`.
3. Insert `identity_snapshots`.
4. Invoke edge function `identity_scan_enqueue_v1`.
5. Return `snapshotId`, `eventId`, and uploaded `frontPath`.

Existing app timing:

- `file_read_done`
- `upload_start`
- `upload_done`
- `snapshot_created`
- `event_created`
- `poll_response`

Evidence:

- `lib/services/identity/identity_scan_service.dart:60` starts total `Stopwatch`.
- `lib/services/identity/identity_scan_service.dart:64` times file read.
- `lib/services/identity/identity_scan_service.dart:75` times storage upload.
- `lib/services/identity/identity_scan_service.dart:134` times `identity_snapshots` insert.
- `lib/services/identity/identity_scan_service.dart:155` times `identity_scan_enqueue_v1`.
- `lib/services/identity/identity_scan_service.dart:184` times each poll request.

### Native scanner display/poll timing

File: `lib/screens/scanner/native_scanner_phase0_screen.dart`

Existing debug log:

- `camera_start_ms`
- `cache_lookup_ms`
- `identity_backend_ms`
- `auto_to_capture_return_ms`
- `capture_ms`
- `upload_to_event_ms`
- `event_to_first_poll_ms`
- `poll_to_done_ms`
- `total_identity_ms`
- `total_scan_ms`

Evidence:

- `lib/screens/scanner/native_scanner_phase0_screen.dart:825` emits `[native_scanner_timing]`.

### Enqueue edge function

File: `supabase/functions/identity_scan_enqueue_v1/index.ts`

Flow:

1. Logs auth probe metadata.
2. Authenticates user.
3. Looks up `identity_snapshots` first.
4. Falls back to `condition_snapshots`.
5. Validates front image exists.
6. Inserts `identity_scan_events`.
7. Returns `identity_scan_event_id`.

Current instrumentation:

- Only auth probe logging exists.
- No elapsed timings for auth, snapshot lookup, front image validation, or event insert.

Evidence:

- `supabase/functions/identity_scan_enqueue_v1/index.ts:21` logs `auth_probe`.
- `supabase/functions/identity_scan_enqueue_v1/index.ts:134` inserts into `identity_scan_events`.

Important queue boundary:

- This edge function inserts only `identity_scan_events`.
- It does not insert an `ingestion_jobs` row.
- The worker later creates missing jobs through `ensureJobs`.

### Poll edge function

File: `supabase/functions/identity_scan_get_v1/index.ts`

Flow:

1. Authenticates user.
2. Fetches `identity_scan_events` by `event_id`.
3. Returns event row.

Current instrumentation:

- No elapsed timings.
- The edge function does not fetch latest `identity_scan_event_results`.
- The Flutter service performs a second direct table query for `identity_scan_event_results`.

Evidence:

- `supabase/functions/identity_scan_get_v1/index.ts:42` fetches a single event row.
- `lib/services/identity/identity_scan_service.dart:203` separately fetches latest result row.

### Worker queue

File: `backend/identity/identity_scan_worker_v1.mjs`

Flow:

1. `ensureJobs` scans `identity_scan_events` with no result and no existing pending/processing job.
2. Inserts `ingestion_jobs`.
3. `claimJob` selects oldest pending `identity_scan_v1` job.
4. Updates job to `processing`, sets `locked_by`, `locked_at`, and `last_attempt_at`.
5. Calls `processEvent`.
6. Marks job `completed` or `failed`.

Current instrumentation:

- JSON log events exist, but they are stage markers without elapsed timing.
- Logs include:
  - `worker_start`
  - `enqueue_missing_jobs`
  - `claim_noop`
  - `job_claimed`
  - `snapshot_resolved`
  - `resolver_candidates`
  - `ai_identify_ok`
  - `job_ok`
  - failures

Evidence:

- `backend/identity/identity_scan_worker_v1.mjs:27` defines structured `log`.
- `backend/identity/identity_scan_worker_v1.mjs:43` defines `ensureJobs`.
- `backend/identity/identity_scan_worker_v1.mjs:77` defines `claimJob`.
- `backend/identity/identity_scan_worker_v1.mjs:133` defines `markStatus`.
- `backend/identity/identity_scan_worker_v1.mjs:944` claims jobs.
- `backend/identity/identity_scan_worker_v1.mjs:974` calls `processEvent`.

Queue timing note:

- `ingestion_jobs` has `created_at`, `last_attempt_at`, and `locked_at`.
- `identity_scan_events` has `created_at`.
- These timestamps can estimate:
  - event insert to job creation,
  - job creation to worker lock,
  - worker lock to result insert.
- The worker currently does not log those deltas.

Potential queue delay:

- Worker default args are `maxJobs: 5`, `sleepMs: 1500`.
- The loop exits once `processed >= maxJobs`, even when `once` is false.
- If the service manager restarts the worker, restart cadence may add latency or uneven queue pickup.

## 3. Worker Processing Stages

File: `backend/identity/identity_scan_worker_v1.mjs`

### Event/snapshot fetch

Evidence:

- `backend/identity/identity_scan_worker_v1.mjs:596` begins `processEvent`.
- `backend/identity/identity_scan_worker_v1.mjs:599` fetches `identity_scan_events` plus snapshot envelope.
- `backend/identity/identity_scan_worker_v1.mjs:625` inserts a failure result when snapshot images are missing.

Missing timing:

- No timer for event row fetch.
- No timer for snapshot envelope resolution.

### Image download

Evidence:

- `backend/identity/identity_scan_worker_v1.mjs:147` defines `downloadImage`.
- It creates a signed URL and then `fetch`es the uploaded image.
- `backend/identity/identity_scan_worker_v1.mjs:646` calls `downloadImage`.

Missing timing:

- No separate timing for signed URL creation.
- No timing for storage fetch.
- No log of downloaded byte size.

### Border detection

Evidence:

- `backend/condition/ai_border_detector_client.mjs:63` defines `detectOuterBorderAI`.
- It posts JSON `{ image_b64, mode: "polygon" }` to `/detect-card-border`.
- Default helper timeout is `2000ms`; scanner worker calls it with `6000ms`.
- `backend/identity/identity_scan_worker_v1.mjs:652` calls it.

Missing timing:

- No elapsed timing around the fetch.
- No HTTP status timing in success path.
- No response byte/body-shape timing.

Likely cost:

- External service call.
- Base64 JSON payload overhead proportional to captured JPEG size.

### Warp

Evidence:

- `backend/condition/ai_border_detector_client.mjs:136` defines `warpCardQuadAI`.
- It posts JSON `{ image_b64, quad_norm, out_w, out_h }` to `/warp-card-quad`.
- Worker calls it with `outW=1024`, `outH=1428`, and `timeoutMs=15000`.
- `backend/identity/identity_scan_worker_v1.mjs:666` calls it.

Missing timing:

- No elapsed timing around fetch.
- No output byte size log.
- No per-stage signal stored in result.

Likely cost:

- External service call.
- Image transform work.
- Base64 encode/decode.

### AI identify

Evidence:

- `backend/identity/identity_scan_worker_v1.mjs:160` defines `aiIdentifyWarp`.
- It posts `{ image_b64, force_refresh: false, trace_id }` to `/ai-identify-warp`.
- `backend/identity/identity_scan_worker_v1.mjs:693` calls it.

Missing timing:

- No elapsed timing.
- No explicit timeout/AbortController in `aiIdentifyWarp`.
- No log of response status on success.
- No prompt/model/service breakdown.

Likely cost:

- Highest probable single-stage latency.
- Unlike border/warp, this call currently has no explicit timeout in the worker helper.

### Resolver/search

Evidence:

- `backend/identity/identity_scan_worker_v1.mjs:819` calls `search_card_prints_v1`.
- `backend/identity/identity_scan_worker_v1.mjs:857` calls `normalizeSetIdentityV1`.
- `backend/identity/normalizeSetIdentityV1.mjs:58` loads Pokémon set index from `sets`.
- `backend/identity/normalizeSetIdentityV1.mjs:238` can call `search_card_prints_v1` once per candidate set during direct set disambiguation.

Missing timing:

- No timer for primary resolver RPC.
- No timer for set index load.
- No timer for set identity normalization.
- No count of extra RPCs from `resolveDirectSetByCanonPoolV1`.

Potential correctness/latency note:

- Current migration `supabase/migrations/20260121170000_add_search_contract_v1_rpc.sql` defines `search_card_prints_v1(q, set_code_in, number_in, limit_in, offset_in)`.
- Worker calls `search_card_prints_v1` with `{ q, limit_n: 10 }`.
- A quarantined remote schema snapshot has a `limit_n` signature.
- Verify deployed RPC signature before optimizing, because a signature mismatch can convert resolver work into silent/no-candidate behavior rather than normal latency.

### Result insert

Evidence:

- `backend/identity/identity_scan_worker_v1.mjs:576` defines `insertResult`.
- It inserts into `identity_scan_event_results` and returns `id`.
- Successful AI path inserts result at `backend/identity/identity_scan_worker_v1.mjs:898`.

Missing timing:

- No timer for result insert.
- No result row `created_at` returned to the worker log.

## 4. Timing Point Coverage

| Timing point | Current coverage | Gap |
|---|---|---|
| upload complete -> enqueue | App has upload elapsed and enqueue function elapsed | Enqueue function does not break down auth/snapshot/event insert |
| enqueue -> worker picked up | `identity_scan_events.created_at`, `ingestion_jobs.created_at`, `locked_at` exist | Worker does not log event-to-job or job-to-lock deltas |
| worker start -> image downloaded | Worker logs job claim and snapshot resolution | No elapsed timing or byte size for signed URL/create/fetch |
| border detect duration | No timer | Need elapsed, HTTP status, request bytes, response shape |
| warp duration | No timer | Need elapsed, HTTP status, output bytes |
| AI identify duration | No timer | Need elapsed and explicit timeout |
| resolver/search duration | No timer | Need primary RPC elapsed, set index elapsed, disambiguation RPC count/elapsed |
| result insert duration | No timer | Need insert elapsed and result created_at |
| polling/app display delay | App logs poll response and native timing | Poll cadence adds up to 1s; get function lacks timings and app performs second result query |

## 5. Likely Bottlenecks

Ranked by likely impact:

1. **AI identify call**
   - `/ai-identify-warp` is likely the most expensive stage.
   - It has no explicit timeout in the worker helper.
   - No timing currently proves how long it takes.

2. **Queue handoff**
   - Enqueue edge function creates `identity_scan_events`, not jobs.
   - Worker `ensureJobs` later materializes `ingestion_jobs`.
   - Worker sleep/backlog/restart behavior can add latency before image processing starts.

3. **Warp and border external calls**
   - Border has `6000ms` timeout in scanner worker.
   - Warp has `15000ms` timeout in scanner worker.
   - Both send base64 JSON images to external service.

4. **Storage path**
   - App uploads full JPEG to Supabase Storage.
   - Worker creates signed URL and downloads the same image back.
   - Large Android captures will increase upload and download time.

5. **Polling cadence**
   - Native screen polls every one second after event creation.
   - Even when result is ready, display waits until next poll.
   - App performs `identity_scan_get_v1` plus a direct result table query per poll.

6. **Resolver/set identity**
   - Primary `search_card_prints_v1` plus `normalizeSetIdentityV1`.
   - First set identity call loads all Pokémon sets.
   - Ambiguous direct set signals can trigger multiple extra `search_card_prints_v1` RPC calls.

## 6. Recommended Exact Timers To Add

Add a lightweight timing helper in `backend/identity/identity_scan_worker_v1.mjs`:

```js
function nowMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}

async function timed(label, fields, fn) {
  const start = nowMs();
  try {
    const result = await fn();
    log('timing', { stage: label, elapsed_ms: nowMs() - start, ...fields });
    return result;
  } catch (error) {
    log('timing_failed', {
      stage: label,
      elapsed_ms: nowMs() - start,
      error: error?.message || String(error),
      ...fields,
    });
    throw error;
  }
}
```

Recommended worker timers:

1. `worker_claim`
   - Include `jobId`, `eventId`, `job_created_at`, `job_locked_at`, `event_created_at`, `queue_wait_ms`.

2. `event_fetch`
   - Around `identity_scan_events` select.

3. `image_signed_url`
   - Around signed URL creation.

4. `image_download`
   - Around signed URL fetch.
   - Include `image_bytes`.

5. `ai_border`
   - Around `detectOuterBorderAI`.
   - Include `ok`, `confidence`, `notes_count`, `error`.

6. `ai_warp`
   - Around `warpCardQuadAI`.
   - Include `ok`, `output_bytes`, `error`.

7. `ai_identify`
   - Around `aiIdentifyWarp`.
   - Include `ok`, `confidence`, `has_name`, `has_number`, `error`.

8. `parse_ai_payload`
   - Local CPU time for AI payload normalization.

9. `resolver_search`
   - Around primary `search_card_prints_v1`.
   - Include query and candidate count, but not secrets or image payloads.

10. `set_identity`
   - Around `normalizeSetIdentityV1`.
   - Include status, set code, ambiguity count, extra RPC count if exposed.

11. `result_insert`
   - Around `insertResult`.
   - Include `result_id`.

12. `process_event_total`
   - Around all of `processEvent`.

Recommended edge-function timers:

- `identity_scan_enqueue_v1`
  - `auth_ms`
  - `identity_snapshot_lookup_ms`
  - `condition_snapshot_lookup_ms` when used
  - `event_insert_ms`
  - `total_ms`

- `identity_scan_get_v1`
  - `auth_ms`
  - `event_fetch_ms`
  - Optional: include latest result fetch here later if moving that query into the function.

Recommended app timers:

- Preserve existing `identity_scan_timing`.
- Add poll attempt number to native scanner timing.
- Log `event_created_at` and result `created_at` when available, so app can compute:
  - server processing time,
  - result-ready to displayed time.

Recommended result payload:

Store timing summary under `signals.timings`, for example:

```json
{
  "timings": {
    "queue_wait_ms": 123,
    "event_fetch_ms": 18,
    "image_download_ms": 211,
    "ai_border_ms": 740,
    "ai_warp_ms": 430,
    "ai_identify_ms": 2800,
    "resolver_search_ms": 92,
    "set_identity_ms": 24,
    "result_insert_ms": 31,
    "worker_total_ms": 4470
  }
}
```

## 7. Optimization Candidates

Do not optimize before timing is added. Once measurements exist, rank fixes by observed cost.

Likely high-impact candidates:

1. **Inline job creation in `identity_scan_enqueue_v1`**
   - Insert an `ingestion_jobs` row in the enqueue function.
   - Removes dependency on worker `ensureJobs` polling.
   - Requires careful duplicate protection but no scanner contract change.

2. **Add explicit timeout to `aiIdentifyWarp`**
   - Prevents unbounded scanner hangs.
   - Should return a controlled failure and let app show error/fallback.

3. **Reduce upload/download image bytes**
   - If Android JPEGs are very large, resize/compress before upload or configure capture size.
   - Must preserve enough detail for AI.

4. **Move latest result fetch into `identity_scan_get_v1`**
   - App currently calls edge function and then queries `identity_scan_event_results`.
   - Returning latest result in the edge function would reduce poll roundtrips.

5. **Shorten poll interval only after backend latency is improved**
   - Current one-second polling adds display delay.
   - Lower interval increases load; better after worker timing confirms result-ready latency.

6. **Cache set index across worker process**
   - Already cached in `normalizeSetIdentityV1` process memory.
   - Verify worker service lifetime; if worker exits every five jobs, cache benefit is limited.

7. **Resolver RPC signature cleanup**
   - Verify whether deployed `search_card_prints_v1` expects `limit_n` or `limit_in`.
   - Fixing mismatch is correctness-first, but can also avoid wasted error paths.

## 8. Recommended Next Patch

Implement instrumentation only:

1. Add worker timing helper.
2. Wrap all worker stages listed above.
3. Include `queue_wait_ms` derived from `identity_scan_events.created_at`, `ingestion_jobs.created_at`, and `locked_at`.
4. Store final timings under `signals.timings` on both success and failure results.
5. Add enqueue/get edge-function total timings to logs.
6. Run one controlled scanner test and compare:
   - app upload/enqueue timing,
   - worker queue wait,
   - AI border/warp/identify,
   - resolver,
   - result insert,
   - polling display delay.

Do not tune camera, AI, resolver, schema, or polling cadence until these timings are captured from the live path.

## 9. Final Verdict

Latency source is currently under-instrumented. The top suspects are AI identify duration, queue handoff delay, external border/warp calls, and polling cadence. The immediate next step is a no-behavior-change timing patch in the worker and edge functions.
