# Scanner Full-DB Identity Index Audit V1

Date: 2026-05-09

Branch: `scanner-v4-card-present-gate`

## Purpose

Audit whether the scanner already had a contract for full-DB camera identity work and establish the starting coverage facts before building the full scanner identity index lane.

## Existing Contract Findings

Relevant active scanner contracts already exist:

- `SCANNER_LIVE_BEHAVIOR_CONTRACT_V1`
- `SCANNER_IDENTITY_PERFORMANCE_CONTRACT_V1`
- `SCANNER_NATIVE_CAMERA_SURFACE_CONTRACT_V1`
- `scanner_v3_instant_scan_contract`

Archived scanner fingerprint contracts also establish useful source boundaries:

- scanner reference generation reads canonical `card_prints`
- generation is independent from ingestion
- generation must not mutate `card_prints`
- reference matches are scanner signals, not catalog identity truth

Gap found: no active contract specifically governed a full-database scanner identity index sourced from all eligible `card_prints` rows.

Result: added `SCANNER_FULL_DB_IDENTITY_INDEX_CONTRACT_V1`.

## Live Supabase Coverage Snapshot

Read-only audit query against `public.card_prints`:

- total rows: `25404`
- rows with `image_url`: `24064`
- rows with `image_alt_url`: `16333`
- rows with `representative_image_url`: `756`
- rows with no `image_url`, `image_alt_url`, or `representative_image_url`: `584`
- rows with `image_path`: `1`
- missing `name`: `0`
- missing `set_code`: `2166`
- missing `number`: `2135`
- missing `gv_id`: `3559`
- missing `print_identity_key`: `22678`
- distinct non-empty `set_code` values: `206`

Image status distribution:

- `exact`: `23877`
- `representative_shared_stamp`: `626`
- `missing`: `771`
- `representative_shared`: `118`
- `representative_shared_collision`: `12`

Image source distribution:

- `tcgdex`: `21623`
- `pokemonapi`: `2606`
- `null`: `1174`
- `identity`: `1`

## Decision

The scanner should tie back to Supabase through an offline/generated scanner-serving index, not through live Supabase calls on every camera frame.

Supabase remains the source of truth for build input and labels. The live scanner service should serve a prepared artifact so identity can remain under the existing `<2000 ms` production target.

## Next Build Boundary

Implement a read-only full-DB index builder that can:

- run coverage-only without downloads or embedding work
- build limited samples for proof
- build a full artifact when explicitly requested
- report excluded rows and failed downloads
- preserve image provenance metadata in the index

Do not deploy the full artifact until coverage and latency evidence are reviewed.
