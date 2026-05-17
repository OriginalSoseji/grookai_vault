# SCANNER ANN INDEX OPERATIONS PLAYBOOK V1

## Status

- Status: ACTIVE
- Type: Operational Playbook
- Scope: Scanner ANN identity index build, verification, staging, deployment, rollback, and future card additions
- Owner: Grookai Vault backend/scanner infrastructure

## Purpose

This playbook governs the lifecycle of scanner identity artifacts generated from Grookai canonical data. It is the operator guide for rebuilding, updating, verifying, staging, deploying, and rolling back Scanner ANN identity indexes without guessing.

## Core Principle

Scanner recognition must be generated from Grookai canonical identity, not hand-curated files.

```text
Supabase canonical card_prints
-> eligible reference images
-> embedding generation
-> compact ANN shards
-> manifest/checksums
-> scanner identity service
-> Grookai ID returned to app
```

## What This System Does

- Builds visual fingerprints for eligible cards.
- Stores fingerprints in compact per-view shards.
- Lets the scanner identity service find nearest card matches quickly.
- Returns canonical Grookai IDs, not source-specific IDs.

## What This System Is Not

- Not a Flutter scanner UI system.
- Not detector/guide logic.
- Not OCR authority.
- Not a pricing system.
- Not a Supabase schema migration system.
- Not a manual card list.

## Canonical Source Rules

- `public.card_prints` is the source of truth for scanner reference labels.
- Scanner index artifacts are generated from canon.
- External sources do not define scanner identity.
- Index rows must map back to canonical Grookai IDs when present.
- Missing or invalid image rows are excluded and reported.
- The index builder must not repair canonical identity, invent IDs, or write back to Supabase.

## Eligibility Contract

Include a row only when canonical identity fields and a usable reference image exist.

Required identity anchors:

- `card_prints.id`
- `card_prints.gv_id` when present
- `name`
- `set_code`
- `number`
- `variant_key`

Image source priority:

1. `image_source = identity` with `image_path`
2. `image_url`
3. `image_alt_url`
4. `representative_image_url`

Rules:

- Exclude rows when image source is missing or unusable.
- Report excluded rows with reason.
- Report skipped-download rows with reason.
- Explicitly report PAL / `sv02` coverage.
- Never assume artifact coverage from total DB rows alone.
- Representative images are fallback references only and must remain marked as representative metadata.

## Artifact Format

Current compact artifact format:

- `manifest.json`
- `vectors/*.f32` compact Float32LE shard files
- `metadata/*.jsonl` per-vector metadata without embedding arrays
- `buckets/*.buckets.json` bucket-to-vector-index maps
- top-level `metadata.jsonl` card metadata
- per-file checksums in the manifest
- reference counts, reference-view counts, shard counts, PAL counts, and skipped rows
- build timestamp in `generated_at`
- storage format: `compact_f32_shards_v1`

Source timestamps are available in the full-db coverage report, not currently in the compact ANN manifest. Treat compact artifact source timestamp as:

```text
UNVERIFIED — DO NOT USE OPERATIONALLY
```

until the compact manifest records source timestamps directly.

## View Shards

Current view types:

- `artwork`
- `artwork_zoom_in_10`
- `center_tight`
- `title_band`
- `full_card`
- `full_card_upper`
- `full_card_middle`

View sharding matters because it:

- prevents noisy global matching
- supports crop-specific search
- keeps candidate retrieval fast
- improves exact rerank quality

## Build Modes

### Smoke Build

Small proof that full-mode row loading, compact vector writing, manifest generation, and service loading still work.

Verified direct command:

```powershell
node backend/identity_v3/build_scanner_v3_ann_index_v1.mjs --full --max-rows 80 --progress-every 20 --out-dir .tmp/scanner_v3_ann_index_v1/full_mode_smoke_80_v1
```

### Bounded Sample Build

Used for PAL/self-query proof or targeted validation.

Verified direct command:

```powershell
node backend/identity_v3/build_scanner_v3_ann_index_v1.mjs --limit 20 --pal-limit 20 --out-dir .tmp/scanner_v3_ann_index_v1/sample_pal_20_compact_v1
```

### Full Candidate Build

Used when building a complete production candidate.

Verified direct command:

```powershell
node backend/identity_v3/build_scanner_v3_ann_index_v1.mjs --full --progress-every 100 --out-dir .tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1
```

### Future Incremental Build

Future direction, not implemented yet.

When supported, incremental build should:

- detect new sets, cards, or changed reference images
- rebuild only affected shards
- update manifest version and checksums
- rerun coverage and latency gates before promotion

Until incremental shard rebuild exists, schedule a full compact rebuild only when justified by card coverage needs.

## Required Commands

These commands are verified from source files or `backend/package.json`. Re-check `backend/package.json` before running package scripts.

Syntax checks:

```powershell
node --check backend/identity_v3/build_scanner_v3_ann_index_v1.mjs
node --check backend/identity_v3/run_scanner_v3_ann_identity_service_v1.mjs
node --check backend/identity_v3/run_scanner_v3_identity_latency_harness_v1.mjs
node --check backend/identity_v3/build_scanner_v3_full_db_identity_index_v1.mjs
node --check backend/identity_v3/run_scanner_v3_identity_service_v1.mjs
node --check backend/identity_v3/lib/embedding_index_v1.mjs
node --check backend/scanner_v4/parse_real_device_auto_test_report_v1.mjs
```

Package scripts:

```powershell
npm --prefix backend run scanner:identity:v3:full-db:coverage
npm --prefix backend run scanner:identity:v3:latency
npm --prefix backend run scanner:identity:v3:ann:build
npm --prefix backend run scanner:identity:v3:ann:serve
```

Smoke build:

```powershell
node backend/identity_v3/build_scanner_v3_ann_index_v1.mjs --full --max-rows 80 --progress-every 20 --out-dir .tmp/scanner_v3_ann_index_v1/full_mode_smoke_80_v1
```

Sample PAL build:

```powershell
node backend/identity_v3/build_scanner_v3_ann_index_v1.mjs --limit 20 --pal-limit 20 --out-dir .tmp/scanner_v3_ann_index_v1/sample_pal_20_compact_v1
```

Full candidate build:

```powershell
node backend/identity_v3/build_scanner_v3_ann_index_v1.mjs --full --progress-every 100 --out-dir .tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1
```

Local ANN service:

```powershell
node backend/identity_v3/run_scanner_v3_ann_identity_service_v1.mjs --artifact-dir .tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1 --port 8789 --max-hamming 2 --top-k 10
```

Local health:

```powershell
curl http://127.0.0.1:8789/health
```

Latency harness:

```powershell
node backend/identity_v3/run_scanner_v3_identity_latency_harness_v1.mjs --endpoint http://127.0.0.1:8789 --iterations 6 --crop-count 1 --top-k 10 --crop-type full_card --out .tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1/latency_full_default5000_v1.json
```

Scanner Flutter analyze gate:

```powershell
flutter analyze lib\screens\scanner lib\services\scanner lib\services\scanner_v3 lib\services\scanner_v4 --no-pub
```

Production health read:

```powershell
curl https://scanner-identity.grookaivault.com/health
```

## Full Candidate Build Procedure

1. Confirm branch/status:

```powershell
git status --short --branch
```

2. Confirm no Flutter scanner changes are being mixed into this backend operation. If Flutter scanner files are dirty from unrelated work, do not edit or revert them during index work.
3. Confirm Supabase read-only env. The ANN builder reads `card_prints` and Supabase Storage; it must not write to Supabase.
4. Confirm reference cache availability:

```text
.tmp/scanner_v3_full_db_identity_index_v1/reference_cache
```

5. Run the full compact ANN build:

```powershell
node backend/identity_v3/build_scanner_v3_ann_index_v1.mjs --full --progress-every 100 --out-dir .tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1
```

6. Monitor:

```text
.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1/progress.json
.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1/build.out.log
.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1/build.err.log
```

7. Confirm `build.err.log` is empty.
8. Confirm completed references, views, skipped count, and PAL count from `manifest.json`.
9. Confirm artifact size.
10. Confirm manifest checksums exist for vector, metadata, bucket, and top-level metadata files.

## Latency Gate

The local ANN service must load the artifact and `/health` must report expected:

- reference count
- reference view count
- PAL / `sv02` count
- shard count
- storage format
- candidate default
- memory usage

The latency harness must run against `/scanner-v3/resolve-crops`.

Target:

```text
production recognition response under 2s
```

Current full candidate local proof:

- selected rows: `24,821`
- completed references: `24,715`
- reference views: `173,005`
- PAL/sv02: `295 / 295`
- skipped: `106`, all `download_http_404`
- artifact size: `469.35 MiB`
- startup: about `2.16s`
- memory: about `1.16 GiB RSS`
- latency p50: about `159.968 ms`
- latency p95: about `214.549 ms`
- candidate default: `5,000`
- Quaxwell `GV-PK-PAL-207`: rank 1

Important: `2,000` candidates was faster but failed the Quaxwell self-query. The current safer ANN default is `5,000`.

## Deployment / Staging Procedure

Known verified production context:

- domain: `scanner-identity.grookaivault.com`
- public health path: `/health`
- public scanner path: `/scanner-v3/resolve-crops`
- existing production systemd service: `scanner-v3-identity.service`
- existing production service bind: `127.0.0.1:8787`
- existing scanner artifact root: `/opt/grookai-scanner-identity`
- existing app directory: `/opt/grookai-scanner-identity/app/backend`
- existing data directory: `/opt/grookai-scanner-identity/data`
- existing Nginx host file name in runbook: `scanner-identity.grookaivault.com`

ANN-specific production service name, env file, and config switch are not yet verified in repo:

```text
UNVERIFIED — DO NOT USE OPERATIONALLY
```

Safe side-by-side staging rules:

1. Do not overwrite the live artifact.
2. Copy/stage candidate under a versioned artifact directory.
3. Preserve rollback artifact.
4. Load via non-live config or side-by-side service first when possible.
5. Verify `/health`.
6. Verify PAL count.
7. Verify latency.
8. Verify known self-query.
9. Promote only after all gates pass.

Do not edit or replace the existing `ai.grookaivault.com` Nginx file while staging scanner identity.

## Rollback Procedure

Verified current rollback artifacts from scanner audit:

- `/opt/grookai-scanner-identity/data/scanner_v3_embedding_index_v7_plus_me_sets_plus_sv10_5w_title_v1.json`
- `/opt/grookai-scanner-identity/data/scanner_v3_embedding_index_v7_plus_me_sets_v1.json`

Rollback rules:

1. Previous artifact must remain present.
2. Switch config back to previous artifact.
3. Restart scanner service only.
4. Verify health count returns to prior index.
5. Do not touch `ai.grookaivault.com`.
6. Do not touch condition highway, identity highway, Discord, pricing, vault, or unrelated workers.

ANN-specific config switch command is:

```text
UNVERIFIED — DO NOT USE OPERATIONALLY
```

until an ANN deploy env/unit is committed and verified.

## Production Health Contract

Health must expose or allow operators to verify:

- reference count
- reference view count
- PAL/sv02 count
- shard count
- storage format
- index/artifact version
- memory usage
- candidate default
- checksum or manifest ID if available

Current ANN service health exposes:

- `reference_count`
- `reference_view_count`
- `pal_sv02_count`
- `shard_count`
- `storage`
- `max_candidate_vectors`
- `memory_usage`
- `artifact`
- `generated_at`

Manifest checksum ID in health is not currently verified:

```text
UNVERIFIED — DO NOT USE OPERATIONALLY
```

## Future Card Addition Procedure

When new cards are added to Grookai canon:

1. Confirm cards exist in Supabase canonical tables.
2. Confirm usable reference images exist.
3. Run coverage-only check if available:

```powershell
npm --prefix backend run scanner:identity:v3:full-db:coverage
```

4. Build sample or affected-set candidate.
5. Eventually rebuild only affected shards when incremental rebuild is implemented.
6. Until incremental exists, schedule full compact rebuild only when justified.
7. Verify new set/card count.
8. Run latency gate.
9. Stage side-by-side.
10. Promote only after health and query proof.

## Failure Modes

Known failure modes:

- partial deployed index causing false scanner misses
- missing PAL/sv02 coverage
- monolithic JSON invalid string length
- `Math.max(...timings)` spread/call-stack failure
- brute-force full DB projected about `9.1s` per crop
- image `404` exclusions
- candidate pool too small causing true match miss
- artifact too large for unsafe copy/deploy
- memory pressure on service startup
- accidental Flutter/UI changes mixed into backend task

## Stop Rules

Stop immediately if:

- Supabase write is required
- Flutter scanner UI changes appear in scope
- production artifact would be overwritten without rollback
- health cannot prove active artifact
- PAL/sv02 count is wrong
- latency exceeds `2s`
- self-query known proof fails
- service memory exceeds safe host capacity
- deployment would touch unrelated services

## Multi-TCG Scaling Direction

Future scaling should use:

- domain shards by TCG
- language shards
- set/era shards if needed
- per-view shards retained
- routing to the relevant domain index before ANN search

Never build one giant mixed global index without routing once multiple TCG domains are live.

## Operational Checklist

### Pre-build Checklist

- [ ] Branch/status captured.
- [ ] Scope confirmed backend/scanner-index only.
- [ ] No Flutter scanner changes are being edited for this task.
- [ ] Supabase access is read-only for this operation.
- [ ] Reference cache path exists or cache rebuild cost is accepted.
- [ ] Existing production health captured.
- [ ] Current rollback artifact recorded.

### Build Checklist

- [ ] Syntax checks pass.
- [ ] Smoke build passes.
- [ ] Sample PAL build passes when needed.
- [ ] Full candidate build started with a versioned output directory.
- [ ] `progress.json` updates.
- [ ] `build.err.log` stays empty.
- [ ] Manifest written.
- [ ] Checksums present.
- [ ] Skipped rows reviewed.
- [ ] PAL/sv02 count matches expected coverage.

### Local Verification Checklist

- [ ] Local ANN service loads artifact.
- [ ] `/health` reports expected counts.
- [ ] Storage format is `compact_f32_shards_v1`.
- [ ] Memory usage is acceptable.
- [ ] Latency harness passes under `2s`.
- [ ] Known PAL self-query passes.
- [ ] Candidate cap remains `5,000` unless a better proof replaces it.

### Staging Checklist

- [ ] Candidate staged side-by-side.
- [ ] Live artifact not overwritten.
- [ ] Rollback artifact preserved.
- [ ] Non-live service or config path verified.
- [ ] Health verified on staged service.
- [ ] PAL count verified on staged service.
- [ ] Latency verified on staged service.
- [ ] Known self-query verified on staged service.

### Promotion Checklist

- [ ] Operator explicitly approves promotion.
- [ ] Active artifact version recorded before switch.
- [ ] Switch is limited to scanner identity service.
- [ ] Health proves new artifact active.
- [ ] App path `/scanner-v3/resolve-crops` responds.
- [ ] Logs contain no startup/runtime error.
- [ ] Rollback path still available.

### Rollback Checklist

- [ ] Switch config back to previous artifact.
- [ ] Restart scanner service only.
- [ ] Verify `/health`.
- [ ] Verify reference counts returned to prior index.
- [ ] Verify `/scanner-v3/resolve-crops` responds.
- [ ] Confirm no unrelated service was touched.

## Current Known Baseline

Current full compact candidate:

- artifact path: `.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1`
- storage: `compact_f32_shards_v1`
- selected rows: `24,821`
- completed references: `24,715`
- reference views: `173,005`
- PAL/sv02: `295 / 295`
- skipped: `106`, all `download_http_404`
- artifact size: `469.35 MiB`
- startup: about `2.16s`
- memory: about `1.16 GiB RSS`
- latency p50: about `159.968 ms`
- latency p95: about `214.549 ms`
- candidate default: `5,000`
- Quaxwell `GV-PK-PAL-207`: rank 1

Current production partial index baseline:

- endpoint: `https://scanner-identity.grookaivault.com`
- service health name: `scanner_v3_identity_service_v1`
- model: `Xenova/clip-vit-base-patch32`
- index source: `/opt/grookai-scanner-identity/data/scanner_v3_embedding_index_v7_plus_me_sets_plus_sv10_5w_title_v1.json`
- references: `1,138`
- reference views: `7,005`
- PAL/sv02 references: `2`

## Final Principle

Scanner identity is infrastructure. It must be versioned, measurable, rollbackable, and generated from canon.
