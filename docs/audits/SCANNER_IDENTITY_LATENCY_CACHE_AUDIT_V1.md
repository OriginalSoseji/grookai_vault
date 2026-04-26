# SCANNER_IDENTITY_LATENCY_CACHE_AUDIT_V1

Status: instrumentation added, real-device repeated Rufflet timings pending.

Source of authority:
- `docs/contracts/SCANNER_CAMERA_SYSTEM_V1.md`
- Branch: `scanner-camera-phase4b-identity-latency-cache-audit`

## Executive Summary

The native scanner now records app-side timing buckets for camera startup, native capture, upload/enqueue, polling, and total identity latency.

Code audit found no proven app/backend event-level cache for repeated identity scans. Each scan currently creates a new storage object path, a new `identity_snapshots` row, a new `identity_scan_events` row, and a new worker job/result path. Repeated scans of the same physical card are therefore expected to run the full identity path unless the external AI endpoint has an internal cache. That external cache, if present, is not proven from repo code and likely depends on image bytes or derived crop bytes that change between captures.

## Instrumentation Added

Flutter native scanner screen:
- `screen_opened_at`
- `preview_ready_at`
- `auto_capture_started_at`
- `capture_returned_at`
- `identity_upload_started_at`
- `identity_event_created_at`
- `poll_started_at`
- `first_poll_response_at`
- `identity_done_at`

Debug panel fields:
- `camera_start_ms`
- `capture_ms`
- `upload_to_event_ms`
- `event_to_first_poll_ms`
- `poll_to_done_ms`
- `total_identity_ms`
- `total_scan_ms`

Debug-only logs:
- `[native_scanner_timing] upload_start`
- `[native_scanner_timing] event_created`
- `[native_scanner_timing] poll_response ...`
- `[native_scanner_timing] final_result_*`
- `[identity_scan_timing] file_read_done`
- `[identity_scan_timing] upload_start`
- `[identity_scan_timing] upload_done`
- `[identity_scan_timing] snapshot_created`
- `[identity_scan_timing] event_created`
- `[identity_scan_timing] poll_response`

No secrets are printed. Logs include elapsed milliseconds, byte count, status, candidate count, and whether a result row exists.

## Measured Timings

Real-device repeated scan timings were not captured in this Codex session.

Record these from the debug timing panel on the iPhone using the same Rufflet card:

| Field | Scan 1 | Scan 2 | Scan 3 |
| --- | ---: | ---: | ---: |
| camera_start_ms | pending | pending | pending |
| capture_ms | pending | pending | pending |
| upload_to_event_ms | pending | pending | pending |
| event_to_first_poll_ms | pending | pending | pending |
| poll_to_done_ms | pending | pending | pending |
| total_identity_ms | pending | pending | pending |
| total_scan_ms | pending | pending | pending |
| candidate_count | pending | pending | pending |
| top_candidate | pending | pending | pending |

Repeat-cache result: unknown until the three real-device scans are recorded.

## Cache Behavior Found In Code

### Flutter identity service

File: `lib/services/identity/identity_scan_service.dart`

Observed behavior:
- Reads the captured `XFile` bytes for every scan.
- Generates a new random path with timestamp and random integer for every upload.
- Uploads to the private `identity-scans` bucket.
- Inserts a new `identity_snapshots` row for every scan.
- Invokes `identity_scan_enqueue_v1` for that new snapshot.
- Polls `identity_scan_get_v1` and then reads latest `identity_scan_event_results`.

Cache finding:
- No image hash is computed in Flutter.
- No app-side repeated-image lookup exists.
- No event-level cache lookup exists before upload or enqueue.
- Repeated scans always create new uploaded objects and new scan events.

### Edge enqueue

File: `supabase/functions/identity_scan_enqueue_v1/index.ts`

Observed behavior:
- Looks up the submitted `identity_snapshots` or `condition_snapshots` row.
- Validates that a front image exists.
- Inserts a new `identity_scan_events` row.
- Returns `identity_scan_event_id`.

Cache finding:
- No image hash lookup.
- No search for prior matching event.
- No reuse of prior `identity_scan_event_results`.

### Edge poll

File: `supabase/functions/identity_scan_get_v1/index.ts`

Observed behavior:
- Reads `identity_scan_events` by event id and user id.
- The Flutter service separately reads latest `identity_scan_event_results`.

Cache finding:
- Polling is read-only.
- No cache or acceleration path.

### Identity worker

File: `backend/identity/identity_scan_worker_v1.mjs`

Observed behavior:
- `ensureJobs` inserts pending `ingestion_jobs` for identity events with no results and no active job.
- `claimJob` picks one pending job.
- `processEvent` downloads the image from storage.
- Calls `detectOuterBorderAI` with a 6000 ms timeout.
- Calls `warpCardQuadAI` with a 15000 ms timeout.
- Calls `/ai-identify-warp` with `force_refresh: false` and `trace_id: eventId`.
- Calls resolver RPC `search_card_prints_v1`.
- Inserts append-only `identity_scan_event_results`.

Cache finding:
- No local image hash is computed.
- No local image-hash cache lookup exists.
- No event-level result cache exists.
- `force_refresh: false` may allow an external AI cache, but repo code does not prove the cache key or hit behavior.
- Because each native capture produces different JPEG bytes and each worker call uses a new event id, exact-byte cache hits are unlikely unless the external AI service uses perceptual or normalized crop caching.

### AI border client

File: `backend/condition/ai_border_detector_client.mjs`

Observed behavior:
- Sends base64 image bytes to `/detect-card-border`.
- Sends base64 image bytes and quad to `/warp-card-quad`.
- Does not compute local hashes.
- Does not persist local cache entries.

Cache finding:
- No repo-visible border/warp cache.

### Database schema

Files:
- `supabase/migrations/20260206110803_identity_snapshots_table.sql`
- `supabase/migrations/20260121194000_identity_scanner_v1_phase0_schema.sql`
- `supabase/migrations/20260121212000_identity_scanner_v1_phase1b_results_table.sql`

Observed behavior:
- `identity_snapshots` stores `images`, `scan_quality`, `created_at`.
- `identity_scan_events` stores event envelope fields and is append-only.
- `identity_scan_event_results` stores append-only `signals`, `candidates`, `status`, `error`.

Cache finding:
- No first-class image hash column found.
- No unique cache key found.
- JSON fields could carry future telemetry without schema change, but no current cache contract exists.

## Likely Latency Causes

Classification before real-device timings:
- B) upload latency: likely, because every scan uploads a full-resolution JPEG.
- C) worker pickup latency: likely, worker has a default `sleepMs` of 1500 ms when idle.
- D) AI border latency: likely, border detection timeout is 6000 ms.
- E) AI identity latency: likely, `/ai-identify-warp` has no explicit local timeout in `identity_scan_worker_v1.mjs`.
- G) polling interval latency: likely, Flutter waits 1 second between poll attempts after each non-final response.
- H) cache miss due to changed image hash: suspected if external AI cache is exact-byte based.
- I) no event-level cache exists: proven.

Not proven yet:
- F) resolver latency.
- Repeat Rufflet cache hit or miss.

## Recommended Next Fix

Do not add a cache blindly yet. The correct next fix is backend timing instrumentation in the existing `identity_scan_event_results.signals` JSON, with no schema change:

- `worker_claimed_at`
- `image_download_ms`
- `ai_border_ms`
- `ai_warp_ms`
- `ai_identity_ms`
- `resolver_ms`
- `result_insert_ms`
- `worker_total_ms`

After those timings are visible, choose the cache boundary:

- If upload dominates, reduce upload size or add client-side upload progress/latency masking.
- If worker pickup dominates, reduce worker sleep/poll cadence or trigger the worker directly from enqueue.
- If AI border/warp dominates, cache by stable card crop/perceptual hash after border normalization.
- If AI identity dominates, cache identity output by normalized warped crop hash, not by event id.
- If polling dominates, use shorter initial polling cadence or realtime/event push.

## Hard Stop Conditions

Stop before adding a cache if:
- No stable hash boundary is proven.
- Repeated captures of the same card produce different normalized crop hashes.
- The cache key would depend on user ids, event ids, or random upload paths.
- The cache could reuse an identity result across visually different card variants.
- Runtime timing data still cannot distinguish upload, worker pickup, AI, resolver, and polling.
