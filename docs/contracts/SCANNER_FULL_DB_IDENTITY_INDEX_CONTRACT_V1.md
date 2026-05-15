# SCANNER_FULL_DB_IDENTITY_INDEX_CONTRACT_V1

## Status

Active.

This contract defines the long-term scanner identity index goal: the production scanner must be able to recognize every eligible card print in the Grookai canonical database while preserving the live scanner behavior, performance, and identity-authority contracts.

## Scope

Allowed scanner-only surfaces:

- `backend/identity_v3/`
- scanner identity deploy/runbook docs under `docs/`
- `lib/services/scanner_v3/`
- `lib/services/scanner_v4/`
- `lib/services/scanner/`
- `lib/screens/scanner/`

This contract permits read-only Supabase access to `public.card_prints` and Supabase Storage only for scanner reference-index generation.

Out of scope unless separately contracted:

- Supabase schema changes
- canonical identity writes
- ingestion workers
- pricing
- vault writes
- OCR authority changes
- detector threshold changes
- ML/model replacement
- backend identity-worker canon mutations

## Source Of Truth

`public.card_prints` is the source of truth for scanner reference labels.

Each scanner reference row must remain anchored to:

- `card_prints.id`
- `card_prints.gv_id` when present
- `name`
- `set_code`
- `number`
- `variant_key`

The index builder must never invent card identity, repair catalog identity, or write back to `card_prints`.

## Image Eligibility

The full-DB scanner index may include a card print only when it has at least one lawful image source.

Image source priority:

1. `image_source = identity` with `image_path`
2. `image_url`
3. `image_alt_url`
4. `representative_image_url`

Representative images are allowed only as transparent fallback references. They must remain marked as representative through index metadata and reports. A representative image must never be upgraded into exact identity truth by the scanner.

Rows with no usable image source are excluded from the generated index and must appear in the coverage report.

## Build Rules

The full-DB scanner index builder must:

- read `card_prints` in bounded pages
- support coverage-only dry runs
- support limited sample builds before full builds
- write local index/report artifacts only
- record included, excluded, skipped-download, and skipped-reference counts
- record image field/status/source distributions
- record reference-view generator and embedding model metadata
- keep exact, alternate, identity-path, and representative image provenance in the reference metadata

The builder must not:

- mutate Supabase
- run inside ingestion
- run inside pricing
- run inside vault writes
- silently replace the live production index
- hide image coverage gaps

## Runtime Rules

The scanner service may load a generated full-DB index only when:

- `/health` reports the expected index source and counts
- real-device scanner identity still satisfies `SCANNER_IDENTITY_PERFORMANCE_CONTRACT_V1`
- no-card/background blocking still satisfies `SCANNER_LIVE_BEHAVIOR_CONTRACT_V1`
- selected-card identity remains isolated in multi-card scenes
- representative-image candidates are not presented as exact image truth

The production scanner must not query Supabase on every live identity frame. Supabase is the index build authority; live recognition must use a prepared scanner-serving artifact or equivalent low-latency serving layer.

## Performance Requirement

Full-DB coverage does not weaken the scanner speed target.

If brute-force vector search cannot keep selected-card identity under `2000 ms`, the implementation must add a scanner-serving optimization such as sharded indexes, approximate nearest-neighbor search, preloaded vector matrices, or another measured low-latency path before rollout.

## Evidence Requirements

Before treating a full-DB index as production-ready, evidence must include:

- coverage report over live `card_prints`
- sample build report proving downloads and embeddings
- health output from the scanner identity service using the intended full-DB artifact
- real-device no-card/background blocking evidence
- real-device card-present identity evidence for known cards outside the old ME-only index
- timing evidence showing selected-card identity under `2000 ms`

## Stop Rules

Stop and audit before continuing if full-DB recognition appears to require:

- weakening accepted-distance or crop-support gates
- accepting one-frame locks
- detector threshold tuning
- OCR as identity authority
- Supabase schema changes
- canonical identity repairs
- representative images presented as exact
- production rollout without coverage and latency evidence

## Acceptance

The scanner satisfies this contract only when every eligible `card_prints` row is represented in a generated scanner index or explicitly excluded with a report reason, and live recognition remains fast, fail-closed, and truth-bound under the existing scanner contracts.
