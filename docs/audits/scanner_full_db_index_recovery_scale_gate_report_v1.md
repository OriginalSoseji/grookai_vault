# Scanner Full-DB Index Recovery Scale Gate Report V1

Date: 2026-05-12

Branch: `scanner-v4-card-present-gate`

## Scope

This report covers scanner backend identity/index work only.

No Flutter scanner UI, detector thresholds, OCR authority, Supabase schema, pricing, vault, auth, public web, or unrelated worker behavior was changed in this pass.

Existing scanner UI/native dirty files were observed in the working tree from prior work and were not reverted or edited.

## Production State

Current production health:

- endpoint: `https://scanner-identity.grookaivault.com/health`
- service: `scanner_v3_identity_service_v1`
- model: `Xenova/clip-vit-base-patch32`
- index source: `/opt/grookai-scanner-identity/data/scanner_v3_embedding_index_v7_plus_me_sets_plus_sv10_5w_title_v1.json`
- references: `1138`
- reference views: `7005`
- PAL / `sv02` references in deployed primary artifact: `2`

Droplet rollback artifacts exist under `/opt/grookai-scanner-identity/data/`:

- primary: `scanner_v3_embedding_index_v7_plus_me_sets_plus_sv10_5w_title_v1.json`
  - bytes: `125369600`
  - sha256: `55c773012afc32e5064de658632d436dde15dba637b690d8853a5e8d4a976b88`
- fallback: `scanner_v3_embedding_index_v7_plus_me_sets_v1.json`
  - bytes: `103513549`
  - sha256: `71f06b90af2230c069cf39accfad62216ecafd1fe97015f93b81b9b20b6cf9a3`

No production service restart, index swap, or deploy was performed.

## Supabase Coverage Proof

Coverage-only builder report:

- path: `.tmp/scanner_v3_full_db_identity_index_v1/build_report_v1.json`
- generated at: `2026-05-12T13:55:19.741Z`
- total `card_prints` rows: `25404`
- eligible scanner references: `24821`
- excluded references: `583`
- exclusion reason: `missing_usable_image_source`
- reference source counts:
  - `image_url`: `24064`
  - `representative_image_url`: `756`
  - `image_path`: `1`
- representative references: `756`
- eligible PAL / `sv02`: `295`
- selected PAL / `sv02`: `295`

Source timestamps:

- max `created_at`: `2026-04-22T02:40:35.624093+00:00`
- max `updated_at`: `2026-04-22T02:40:35.624093+00:00`
- max `last_synced_at`: `2026-02-26T19:13:02.768742+00:00`
- max `image_last_checked_at`: `2026-02-23T20:25:29.222964+00:00`

PAL is present in Supabase and selected by the builder. The current production PAL miss is a deployed-index coverage problem.

## Full Build Attempts

Full brute-force JSON build attempts were stopped after scale issues were found.

### `20260512_full_v1`

- downloaded/materialized selection reached: `24821 / 24821`
- embedded: `24715 / 24715`
- embedded PAL / `sv02` log count: `295`
- last embedded PAL row: `Floragato`, `sv02`, number `197`
- index written: no
- failure:
  - `RangeError: Maximum call stack size exceeded`
  - root cause: `Math.max(...timings)` over a full-view timing array in `embedding_index_v1.mjs`

### `20260512_full_v2`

- downloaded/materialized selection reached: `24821 / 24821`
- embedded: `24715 / 24715`
- embedded PAL / `sv02` log count: `295`
- last embedded PAL row: `Floragato`, `sv02`, number `197`
- index written: no
- failure:
  - `RangeError: Invalid string length`
  - root cause: one-shot `JSON.stringify(fullIndex)` exceeded V8 string limits for the full monolithic JSON artifact

### `20260512_full_v3`

- started after adding a streaming index writer
- stopped intentionally per operator instruction because it was not near completion
- last embedded: `5770 / 24715`
- embedded PAL / `sv02` log count before stop: `66`
- index written: no
- failure: none before stop
- no v4 or further full rebuild was started

## Cached Image Status

Reference image cache:

- path: `.tmp/scanner_v3_full_db_identity_index_v1/reference_cache`
- files: `24716`
- size: `3281611366` bytes (`3.056 GiB`)
- oldest file timestamp: `2026-05-09T21:14:45.2946164-06:00`
- newest file timestamp: `2026-05-12T12:24:42.4067984-06:00`

The cache is useful for future non-brute-force index builds. The full build logs imply `24715` materialized entries were embeddable from the `24821` eligible selection. The `106` skipped materializations were not written to a final report because both full attempts failed during final artifact/report creation.

## Latency Gate

Baseline latency against the current deployed partial index:

- report: `.tmp/scanner_v3_full_db_identity_index_v1/deployed_partial_latency_baseline_v1.json`
- references: `1138`
- reference views searched: `7005`
- cold request latency: `684.9 ms`
- total p50: `561.852 ms`
- total p95: `684.9 ms`
- embedding p50: `95.749 ms`
- vector search p50: `369.35 ms`
- vector search p95: `386.15 ms`

Projected full brute-force scale:

- materialized full references: `24715`
- views per reference: `7`
- projected full reference views: `173005`
- view scale versus deployed partial index: `24.697x`
- projected brute-force vector p50: about `9122 ms` per crop before app/UI overhead

Full brute-force search is blocked. It does not satisfy the scanner target of under `2s`.

## Backend Changes Made

Backend-only changes made during this pass:

- Added full-db coverage manifest fields:
  - eligible set-code counts
  - PAL / `sv02` counts
  - source timestamps
  - checksum fields
- Added service health fields for future rollout gates:
  - index version
  - index model
  - views per reference
  - memory usage
- Added backend latency harness:
  - `backend/identity_v3/run_scanner_v3_identity_latency_harness_v1.mjs`
- Fixed scale bug in timing max calculation:
  - changed spread-based max to iterative max
- Added streaming index writer as a defensive fix, but full JSON rebuilds should not continue as the rollout path.

## Decision

Do not deploy a full monolithic JSON index.

Do not run another full brute-force JSON rebuild.

The full-db work proved the source coverage and PAL path, but the serving architecture must change before rollout.

## Recommended Architecture

Build an ANN-backed scanner serving index, preferably HNSW-style, with exact rerank:

1. Offline builder reads Supabase `card_prints` read-only, as today.
2. Generate the same reference views and metadata, but write:
   - compact vector artifact, not one huge JSON blob
   - metadata as JSONL or SQLite
   - manifest with counts, checksums, source timestamps, and PAL counts
3. Partition by `view_type` first:
   - `artwork`
   - `artwork_zoom_in_10`
   - `center_tight`
   - `title_band`
   - `full_card`
   - `full_card_upper`
   - `full_card_middle`
4. Query flow:
   - embed incoming crop
   - search the matching view-type ANN shard for top candidates
   - merge by `card_id`
   - exact cosine rerank only the top candidate pool
   - pass candidates into existing scanner vote/lock logic
5. Health endpoint must expose:
   - artifact version
   - manifest checksum
   - reference count
   - view count
   - PAL / `sv02` count
   - shard count
   - memory usage
6. Deploy side-by-side:
   - current partial index remains rollback
   - ANN candidate service runs on a non-live port first
   - latency harness must prove under `2s` before switching production

Set-code sharding alone is not recommended as the first production path unless there is a reliable non-OCR coarse set signal. Sharding by view type plus ANN is safer because it does not require guessing the set before identity search.

## Next Step

Stop brute-force JSON index generation and build a small backend-only ANN prototype over the cached reference images or already generated embeddings from a bounded sample, then scale it to the full cached image set once the p50/p95 latency target is proven.
