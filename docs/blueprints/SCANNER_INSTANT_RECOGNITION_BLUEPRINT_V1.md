# SCANNER_INSTANT_RECOGNITION_BLUEPRINT_V1

Status: blueprint and instrumentation only. No cache behavior is implemented in this branch.

Source of authority:
- `docs/contracts/SCANNER_CAMERA_SYSTEM_V1.md`
- `docs/audits/SCANNER_IDENTITY_LATENCY_CACHE_AUDIT_V1.md`

## Desired Experience

The target scanner should feel like:

```text
camera opens
-> card is recognized as fast as possible
-> repeated or known cards feel instant
-> backend still verifies before final lock
```

The app may show a probable match quickly, but it must never silently finalize a wrong identity. Fast hints are allowed; confirmed identity remains backend-owned until a safer local recognition layer exists.

## Current Pipeline

```text
AppShell prewarms native camera
-> scanner screen attaches preview to shared AVFoundation session
-> readiness polling triggers auto-capture
-> native full-resolution JPEG is written to temp file
-> Flutter creates XFile(imagePath)
-> IdentityScanService reads bytes
-> uploads to identity-scans bucket
-> inserts identity_snapshots row
-> calls identity_scan_enqueue_v1
-> edge inserts identity_scan_events row
-> worker claims ingestion job
-> worker downloads image
-> AI border detect
-> AI warp
-> AI identify
-> resolver search_card_prints_v1
-> append identity_scan_event_results
-> Flutter polls until result
-> debug result panel displays candidate
```

Current repeated-scan behavior:
- Each scan creates a new uploaded object path.
- Each scan creates a new snapshot row.
- Each scan creates a new event row.
- Each scan waits for worker, AI, resolver, and polling.
- No app-side cache exists.
- No event-level cache exists.

## Target Pipeline

```text
camera preview
-> auto-capture
-> local recent-scan cache check
-> if known card: show instant probable match
-> start background identity confirmation
-> if backend confirms: lock result
-> if backend disagrees: replace probable result with verified result
```

Later:

```text
camera preview
-> lightweight frame sampling
-> stable perceptual/card-region signature
-> local recent-scan cache lookup before still capture completes
-> probable result appears immediately
-> full still capture + backend verification continues
```

## Why Exact Image Hash Is Insufficient

Exact image hashes are too brittle for camera scans. Two captures of the same physical card change because:
- hand position changes by a few pixels
- autofocus shifts micro detail
- exposure and white balance drift
- sensor noise changes
- card angle and distance change
- JPEG compression output changes
- background, glare, and shadows change
- native capture may produce different dimensions/orientation metadata by device path

An exact SHA-256 of the full JPEG is useful for deduplicating the same file, but not for recognizing the same card captured twice.

## Correct Cache Boundary

The cache should eventually be keyed by one of these stable boundaries, in increasing quality:

1. Canonical backend identity:
   - `card_print_id`
   - `gv_id`
   - name
   - set code
   - collector number
   - representative image URL
   - backend confidence/signals

2. Normalized card-region fingerprint:
   - border-detected crop
   - perspective-normalized card image
   - perceptual hash or embedding signature
   - tolerance for lighting and small pose changes

3. Real-time frame signature:
   - low-cost preview frame samples
   - motion-gated stable frame windows
   - approximate lookup before full backend confirmation

Do not use random upload path, event id, or raw full-frame bytes as the cache key.

## App-Side Recent Scan Cache

Purpose:
- Make repeated scans in one session feel instant.
- Show a "probable match" while backend confirmation runs.
- Avoid waiting for backend before giving the user useful feedback.

Safe payload:
- `card_print_id`
- `gv_id` when present
- `name`
- `set_code`
- `number`
- `confidence`
- `thumbnail/image_url`
- `last_seen_at`
- source metadata: `backend_confirmed`

Current code audit:
- `IdentityScanService.pollOnce` returns `candidates` and `signals`.
- Candidate rows from the worker include `card_print_id`, `name`, `set_code`, `number`, `image_url`, and resolver metadata.
- AI confidence is available in `signals.ai.confidence`.
- This is enough to store a recent known-card display entry after backend success.
- It is not enough to safely match a new image without a signature.

Phase 5 instrumentation adds these display fields only:
- `candidate_from_cache`
- `cache_lookup_ms`
- `identity_backend_ms`
- `shown_result_source`

For now they remain disabled/miss.

## Backend Event-Level Cache

Purpose:
- Avoid recomputing known identity results after backend receives an image/signature.
- Keep final confirmation authoritative.

Required proof before implementation:
- stable cache key
- false-positive budget
- invalidation rules
- proof that different variants do not collide

Likely backend cache key:
- normalized warped crop perceptual hash or embedding signature
- optionally constrained by AI-read name/number/set evidence

Do not key by:
- event id
- identity snapshot id
- upload path
- full JPEG exact hash

## Future Real-Time Frame Sampling Layer

Longer-term scanner:

```text
preview frames
-> motion/readiness window
-> low-resolution card-region sampling
-> perceptual signature estimate
-> recent-cache lookup
-> instant probable result
-> full-res still capture
-> backend confirmation
```

This layer is intentionally deferred. It needs quality gating and false-positive tests before it can influence user-visible identity.

## First Real Cache Recommendation

Recommended first real implementation: **A) app memory recent-card cache**, but only after a stable signature strategy is chosen.

Ranking:

| Option | Speed to build | Safety | UX impact | False-positive risk | Recommendation |
| --- | --- | --- | --- | --- | --- |
| A) app memory recent-card cache | High | Medium if backend-confirmed only | High for same-session scans | Medium without signature | First, with probable-label only |
| B) persistent local cache | Medium | Medium-low before signature | Medium | Higher stale/wrong-result risk | Later |
| C) backend event-level cache | Medium | High if signature is right | Medium-high | Low-medium | Best authoritative cache after signature |
| D) perceptual hash/fingerprint cache | Lower | Highest once proven | High | Lowest after validation | Correct durable boundary |
| E) real-time frame recognition layer | Lowest | Not ready | Highest | Highest until tested | Future phase |

Immediate next step:
- Do not implement cache lookup yet.
- Add backend timing in `identity_scan_event_results.signals`.
- Add a local in-memory cache structure that records backend-confirmed candidates, but does not drive UI until a signature exists.
- Then add normalized crop/perceptual signature proof.

## Risks

- A fast probable result can train user trust before backend confirmation.
- Same name/number can collide across variants or promos.
- Visual variants can share name and set-like text.
- Local cache can become stale if payload shape changes.
- Exact-image cache can appear reliable in testing while failing on real hand-held scans.
- Background confirmation mismatch must be handled visibly and deterministically.

## Stop Rules

Stop before shipping cache-influenced UI if:
- No stable signature is available.
- The app cannot label cache results as probable.
- Backend confirmation mismatch cannot replace the shown result.
- The cache key depends on event id, upload path, or raw full JPEG hash.
- Repeat captures of the same card do not consistently map to the same signature.
- Variant collisions are observed.
