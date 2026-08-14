# MTG Self-Hosted Image Readiness V1

Status: **offline_readiness_plan_complete**

## Scope

- Frozen manifest sets: 953
- Exact MTG card prints inventoried: 104712
- Card prints with at least one planned image: 104550
- Card prints with image gaps: 162
- Planned face assets: 108487
- Proposed Storage bucket: `user-card-images`
- Proposed path collisions: 0
- Blocking input/URL issues: 0
- Network requests: 0
- Database reads/writes: 0 / 0
- Storage reads/writes: 0 / 0

## Faces

| Face role | Count |
| --- | ---: |
| back | 3937 |
| front | 104550 |

## Gaps

| Gap | Count |
| --- | ---: |
| missing_source_images | 162 |

## Identity And Dedupe Policy

Every planned asset preserves both the Grookai `card_print_id` and exact Scryfall print ID.
Front, back, and future additional faces have independent rows and paths. Distinct print IDs are
never deduplicated from source URLs or filenames. Content-hash deduplication is explicitly deferred
until a later download, image inspection, hash, and exact readback gate.

## Proposed Path Contract

`warehouse-derived/self-hosted-images-v1/card_prints/mtg/{set_code}/{scryfall_print_id}/{face_role}/{source_url_hash_24}.{ext}`

These paths are proposals only. No object was uploaded and no database pointer was changed.

The bucket is compatible with `CANON_IMAGE_RESOLUTION_CONTRACT_V1` and the existing
self-hosted image tooling, which uses `SELF_HOSTED_IMAGES_STORAGE_BUCKET` with
`user-card-images` as its canonical default.

## Source Format Economics Gate

PNG remains the preferred source in this offline inventory because the current order is frozen as
`png > large > normal`. A bounded download canary must measure bytes, dimensions, visual quality,
decode behavior, and projected Storage/egress cost for PNG versus large JPEG before any permanent
acquisition plan. This readiness result is not evidence that PNG is the economical permanent format.

## Artifacts

- `summary.json`: complete aggregate result and plan fingerprint.
- `image_assets.jsonl.gz`: deterministic one-row-per-face plan (gzip-compressed JSONL).
- `set_coverage.jsonl`: coverage by set and face role.
- `image_gaps.jsonl`: cards/faces without a trusted usable source.
- `url_and_identity_issues.jsonl`: invalid, untrusted, or inconsistent source evidence.
- `path_collisions.jsonl`: proposed target collisions.
- `payload_inventory.jsonl`: exact payload hash verification.
- `artifact_hashes.json`: SHA-256 manifest for all generated artifacts.
