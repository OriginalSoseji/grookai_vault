# Scanner ANN Identity Prototype V1

Date: 2026-05-12

Branch: `scanner-v4-card-present-gate`

## Scope

Backend scanner identity only.

No Flutter scanner UI, detector thresholds, OCR authority, Supabase schema, pricing, vault, public web, auth, or unrelated service behavior was changed.

No production deploy or service restart was performed.

## Reason

The full-db brute-force JSON path is blocked:

- full source coverage exists, including PAL / `sv02`
- full monolithic JSON index generation hit scale limits
- projected full brute-force vector search is far above the scanner `<2s` target

This prototype validates the next serving direction: view-type sharded ANN-style lookup with exact rerank of a small candidate pool.

## Added Backend Artifacts

- `backend/identity_v3/build_scanner_v3_ann_index_v1.mjs`
- `backend/identity_v3/run_scanner_v3_ann_identity_service_v1.mjs`
- package scripts:
  - `scanner:identity:v3:ann:build`
  - `scanner:identity:v3:ann:serve`

The latency harness was extended to record ANN candidate/rerank vector counts.

## Prototype Design

Builder:

- reads `public.card_prints` through the existing backend Supabase client
- does not write Supabase
- selects a bounded sample with explicit PAL inclusion
- reuses cached reference images when present
- generates the existing Scanner V3 reference views
- embeds each view with `Xenova/clip-vit-base-patch32`
- writes one JSONL shard per `view_type`
- writes `metadata.jsonl`
- writes `manifest.json` with counts, checksums, model, LSH config, PAL count, skipped rows

ANN method:

- random hyperplane LSH
- seed: `7331`
- planes: `14`
- dimensions: `512`
- bucket probing by Hamming distance
- exact cosine rerank after bucket candidate retrieval

Service:

- loads an artifact directory, not a monolithic index file
- exposes `/health`, `/scanner-v3/resolve-crops`, `/scanner-v3/candidates`
- maps crop type to likely view shards
- searches ANN buckets, then exact-reranks only the candidate vector pool

## Sample Build

Command:

```powershell
node backend/identity_v3/build_scanner_v3_ann_index_v1.mjs --limit 20 --pal-limit 20 --out-dir .tmp/scanner_v3_ann_index_v1/sample_pal_20_v1
```

Output:

- artifact dir: `.tmp/scanner_v3_ann_index_v1/sample_pal_20_v1`
- references: `39`
- reference views: `273`
- PAL / `sv02` references: `20`
- shards: `7`
- elapsed: `18581.871 ms`

Skipped reference:

- `GV-PK-MCD-2017-5` / Pikachu / `mcd17`
- reason: `image_url=download_http_404;image_alt_url=download_http_404`

The skip is isolated to the bounded sample and does not affect PAL proof.

## Latency

Local non-live service command shape:

```powershell
node backend/identity_v3/run_scanner_v3_ann_identity_service_v1.mjs --artifact-dir .tmp/scanner_v3_ann_index_v1/sample_pal_20_v1 --port 8793 --max-hamming 2 --top-k 10
```

Latency harness:

```powershell
node backend/identity_v3/run_scanner_v3_identity_latency_harness_v1.mjs --endpoint http://127.0.0.1:8793 --iterations 6 --crop-count 1 --top-k 10 --out .tmp/scanner_v3_ann_index_v1/sample_pal_20_v1/latency_v2.json
```

Results:

- health references: `39`
- health reference views: `273`
- health PAL / `sv02`: `20`
- health shards: `7`
- cold latency: `37.737 ms`
- total p50: `35.772 ms`
- total p95: `59.629 ms`
- embedding p50: `30.142 ms`
- vector search p50: `1.134 ms`
- ANN candidate vectors p50: `53`
- exact rerank vectors p50: `53`

## PAL Self Query

Self-query artifact:

- `.tmp/scanner_v3_ann_index_v1/sample_pal_20_v1/self_query_pal_v1.json`

Expected:

- `Quaxwell`
- `GV-PK-PAL-207`
- set code: `sv02`
- number: `207`

Top result:

- `Quaxwell`
- `GV-PK-PAL-207`
- set code: `sv02`
- number: `207`
- reference view: `full_card`
- distance: `0.019386`
- rank: `1`

ANN stats for this query:

- searched view types: `full_card`, `full_card_upper`, `full_card_middle`
- probe buckets: `318`
- candidate vectors: `22`
- exact rerank vectors: `22`
- candidate cards: `10`

## Decision

This validates the backend serving direction.

Do not return to full brute-force JSON index generation.

Next implementation should scale this prototype into a production ANN artifact:

- binary or SQLite-backed vector storage
- per-view shards
- exact rerank after ANN candidate retrieval
- manifest-gated rollout
- side-by-side non-live service first
- health must report PAL count and artifact version
- latency harness must pass before production switch
