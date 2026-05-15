# Scanner ANN Compact Artifact V1

Date: 2026-05-12

## Scope

This audit continues the scanner identity backend recovery work only. Flutter scanner UI, detector behavior, OCR authority, Supabase schema, pricing, vault, auth, public web, and production deployment were not changed.

## Why This Exists

The deployed scanner identity service is healthy but is serving a partial index:

- Production endpoint: `https://scanner-identity.grookaivault.com`
- Production reference count: about `1,138`
- Production PAL / `sv02` count: `2`
- Supabase eligible PAL / `sv02` count: `295`

The PAL recognition failure is therefore an index coverage problem, not a reverse ADB, camera, detector, outline, or OCR problem.

## Scale Bugs Found

The full brute-force JSON rebuild path is not safe to continue:

- V1 embedded all `24,715` references, then failed while calculating `Math.max(...timings)` because the array spread exceeded call stack limits.
- V2 embedded all `24,715` references, then failed during monolithic `JSON.stringify` with `RangeError: Invalid string length`.
- V3 was stopped before completion by rollout instruction. No V4 full JSON rebuild was started.

The core issue is artifact shape. A full scanner index cannot be treated as one giant JSON document carrying every embedding array inline.

## Cached Image Status

The existing full-db builder cache is populated:

- Cache path: `.tmp/scanner_v3_full_db_identity_index_v1/reference_cache`
- Cached files observed earlier: `24,716`
- Approximate cache size observed earlier: `3.056 GiB`

The bounded compact sample reused the cache and only skipped one selected non-PAL card because both image URLs returned `404`:

- `GV-PK-MCD-2017-5` Pikachu, set `mcd17`, number `5`

## What Changed

Added a compact ANN artifact path:

- Builder: `backend/identity_v3/build_scanner_v3_ann_index_v1.mjs`
- Service: `backend/identity_v3/run_scanner_v3_ann_identity_service_v1.mjs`

The builder now writes production-shaped shard files instead of embedding-heavy JSONL rows:

- `vectors/*.f32`: Float32LE embedding vectors
- `metadata/*.jsonl`: per-vector card metadata without embedding arrays
- `buckets/*.buckets.json`: LSH bucket to vector-index map
- `manifest.json`: storage format, checksums, LSH settings, coverage counts

The ANN service can load the compact artifact and still supports the earlier JSONL prototype for comparison.

## Compact Sample Proof

Bounded build command:

```powershell
node backend/identity_v3/build_scanner_v3_ann_index_v1.mjs --limit 20 --pal-limit 20 --out-dir .tmp/scanner_v3_ann_index_v1/sample_pal_20_compact_v1
```

Output:

- Artifact path: `.tmp/scanner_v3_ann_index_v1/sample_pal_20_compact_v1`
- Storage format: `compact_f32_shards_v1`
- Reference count: `39`
- Reference view count: `273`
- PAL / `sv02` selected count: `20`
- Shard count: `7`
- Skipped references: `1`

Shard view counts:

- `artwork`: `39`
- `artwork_zoom_in_10`: `39`
- `center_tight`: `39`
- `full_card`: `39`
- `full_card_middle`: `39`
- `full_card_upper`: `39`
- `title_band`: `39`

## PAL Inclusion Proof

The compact sample explicitly includes PAL / `sv02` cards. Service health for the local compact artifact reported:

- `reference_count=39`
- `reference_view_count=273`
- `pal_sv02_count=20`
- `storage.format=compact_f32_shards_v1`

Self-query using a cached PAL source image:

- Expected: Quaxwell `GV-PK-PAL-207`
- Rank 1: Quaxwell `GV-PK-PAL-207`
- Result: pass
- Service crop elapsed: `38.099 ms`

## Latency Harness

Local compact service:

```powershell
node backend/identity_v3/run_scanner_v3_ann_identity_service_v1.mjs --artifact-dir .tmp/scanner_v3_ann_index_v1/sample_pal_20_compact_v1 --port 8796 --max-hamming 2 --top-k 10
```

Harness:

```powershell
node backend/identity_v3/run_scanner_v3_identity_latency_harness_v1.mjs --endpoint http://127.0.0.1:8796 --iterations 6 --crop-count 1 --top-k 10 --crop-type full_card --out .tmp/scanner_v3_ann_index_v1/sample_pal_20_compact_v1/latency_v1.json
```

Results:

- Runs: `6`
- OK: `true`
- Cold request: `35.522 ms`
- Total p50: `27.954 ms`
- Total p95: `61.948 ms`
- Embedding p50: `25.322 ms`
- Embedding p95: `58.751 ms`
- Vector search p50: `0.308 ms`
- Vector search p95: `1.903 ms`
- ANN candidate vector p50: `8`
- ANN exact rerank vector p50: `8`

This is a bounded sample, not a production-scale proof. It proves the compact artifact and loader work, and it shows the vector path is no longer the bottleneck at small scale.

## Architecture Recommendation

Do not continue full brute-force JSON rebuilds.

Recommended next architecture: sharded ANN index using compact vector shards.

Rationale:

- It preserves exact rerank quality after a small ANN candidate lookup.
- It avoids a monolithic JSON artifact.
- It can be built incrementally by shard.
- It keeps rollback simple through versioned artifact directories.
- It lets us promote PAL coverage without requiring a live brute-force scan over every vector.

Next implementation step:

1. Build a full compact ANN artifact into a versioned local directory using the cached images.
2. Keep per-shard manifests and checksums.
3. Measure local full-scale load time, memory, PAL coverage, and `/scanner-v3/resolve-crops` latency.
4. If latency is under contract, stage side-by-side on the droplet.
5. Only switch production after health proves the expected full coverage and rollback is confirmed.

## Full Compact Candidate

Full local build command:

```powershell
node backend/identity_v3/build_scanner_v3_ann_index_v1.mjs --full --progress-every 100 --out-dir .tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1
```

Build result:

- Artifact path: `.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1`
- Storage format: `compact_f32_shards_v1`
- Selected rows: `24,821`
- Completed references: `24,715`
- Reference views: `173,005`
- PAL / `sv02` selected: `295`
- PAL / `sv02` completed: `295`
- Skipped references: `106`
- Skip reason: `106` image downloads returned `404`
- Artifact size: about `469.35 MiB`
- Build elapsed: about `10,479,187.579 ms`
- Average embedding time: `36.738 ms`
- Max embedding time: `583.53 ms`

Shard counts:

- `artwork`: `24,715` vectors, `981` buckets
- `artwork_zoom_in_10`: `24,715` vectors, `906` buckets
- `center_tight`: `24,715` vectors, `756` buckets
- `full_card`: `24,715` vectors, `968` buckets
- `full_card_middle`: `24,715` vectors, `1,430` buckets
- `full_card_upper`: `24,715` vectors, `1,516` buckets
- `title_band`: `24,715` vectors, `933` buckets

Local service health using the full compact artifact:

- Startup to healthy: about `2.163 s`
- References loaded: `24,715`
- Reference views loaded: `173,005`
- PAL / `sv02` loaded: `295`
- Max candidate vectors: `5,000`
- RSS: about `1,156.9 MiB`

Latency harness with default ANN service settings after raising the candidate cap to `5,000`:

- Runs: `6`
- OK: `true`
- Total p50: `159.968 ms`
- Total p95: `214.549 ms`
- Embedding p50: `31.949 ms`
- Vector search p50: `126.922 ms`
- Vector search p95: `175.72 ms`
- ANN candidate vector p50: `4,254`
- Exact rerank vector p50: `4,254`

PAL self-query proof:

- Expected: Quaxwell `GV-PK-PAL-207`
- Rank 1: Quaxwell `GV-PK-PAL-207`
- Result: pass
- Crop elapsed: `180.204 ms`
- Vector search: `141.449 ms`

Important tuning note:

- A `2,000` candidate cap was faster but failed the same Quaxwell PAL self-query.
- The full-index service default was therefore raised to `5,000` candidates for this ANN service path.
- `5,000` remains far below the `2s` scanner contract in local testing.

Verification run after the full candidate:

- `git diff --check`: pass
- `node --check backend/identity_v3/build_scanner_v3_ann_index_v1.mjs`: pass
- `node --check backend/identity_v3/run_scanner_v3_ann_identity_service_v1.mjs`: pass
- `node --check backend/identity_v3/run_scanner_v3_identity_latency_harness_v1.mjs`: pass
- `node --check backend/identity_v3/build_scanner_v3_full_db_identity_index_v1.mjs`: pass
- `node --check backend/identity_v3/run_scanner_v3_identity_service_v1.mjs`: pass
- `node --check backend/identity_v3/lib/embedding_index_v1.mjs`: pass
- `node --check backend/scanner_v4/parse_real_device_auto_test_report_v1.mjs`: pass
- `flutter analyze lib\screens\scanner lib\services\scanner lib\services\scanner_v3 lib\services\scanner_v4 --no-pub`: pass

## Rollout Gate

Do not deploy until all are true:

- Full compact artifact includes expected PAL / `sv02` scale, close to `295`.
- Service health reports the compact storage format and expected counts.
- Rollback artifact remains available.
- Local full-scale latency is measured.
- Production deployment is side-by-side and reversible.
