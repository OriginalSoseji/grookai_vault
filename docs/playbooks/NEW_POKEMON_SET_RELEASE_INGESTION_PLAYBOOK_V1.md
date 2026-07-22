# NEW_POKEMON_SET_RELEASE_INGESTION_PLAYBOOK_V1

## Status

ACTIVE

## Purpose

This is the standing Grookai playbook for adding every newly released Pokemon
TCG set to the master indexes, canonical database, and self-hosted image
storage.

It replaces one-off set ingestion plans. Each new release should be handled by
one repeatable command backed by a checked-in release manifest, deterministic
readbacks, and a completion report.

## Scope

In scope:

- English Pokemon TCG set releases
- Japanese Pokemon TCG set releases when they are part of the supported canon
  pipeline
- master index updates
- set/card raw ingestion
- canonical set and card print materialization
- external mapping creation
- source image download and self-hosting
- post-apply DB and storage readbacks
- release completion reports

Out of scope:

- pricing backfills unless a separate pricing playbook is invoked
- destructive cleanup of older sets
- invented set/card rows without source evidence
- user vault ownership mutation
- user-uploaded image mutation

## Required Inputs

Every release run starts with a manifest:

```text
data/set_ingest/<release_slug>_new_sets_v1.json
```

The manifest must contain one entry per target set:

```json
{
  "release_slug": "20260714_abyss_eye_pitch_black",
  "sets": [
    {
      "target_key": "pitch_black_en",
      "name": "Mega Evolution: Pitch Black",
      "language": "en",
      "region": "english",
      "release_date": "2026-07-17",
      "source_route": "tcgdex_or_manifest_seed",
      "source_ids": {
        "tcgdex": null,
        "pokemon_tcg_api": null,
        "manual_seed": "pitch_black_en_v1"
      },
      "source_urls": [],
      "expected_counts": {
        "official": null,
        "secret": null,
        "total": null
      },
      "notes": []
    }
  ]
}
```

Required fields:

- `target_key`
- `name`
- `language`
- `region`
- `release_date`
- `source_route`
- `source_ids`
- `source_urls`
- `expected_counts`

Null source IDs are allowed during discovery. Null expected counts are not
allowed for apply.

## Source Identity Rule

Before ingesting, resolve the exact set identity from governed sources.

Allowed source classes:

- official Pokemon set gallery or checklist
- TCGdex set/card API
- PokemonTCG API
- Bulbapedia set list used as human-readable support
- bounded manual seed fixture with captured source URLs and retrieval timestamp

The runner must reject a set when:

- the name maps to an older unrelated set
- two sources disagree on release identity
- expected card counts are missing in apply mode
- source IDs are ambiguous
- a source route has no raw snapshot or reproducible fixture

Example guard:

- `Pitch Black` must not be mapped to `Black Bolt`.

## Master Index Rule

Update the active master index artifacts for the set's language/region.

For English sets, follow `VERIFIED_MASTER_SET_INDEX_V1`.

For Japanese sets, use the Japanese master index path currently active in the
repo. If there is no active Japanese verified index yet, create the release
artifact as a source-backed candidate index and do not label it
`master_verified`.

The update must preserve:

- source name
- source kind
- source URL or stable source identifier
- retrieval timestamp
- raw snapshot or fixture reference
- conflict status

The master index update is evidence. It is not deletion authority for older
canon rows.

## Ingestion Routes

### Route A: TCGdex Available

Use the existing TCGdex workers:

```bash
node backend/sets/tcgdex_import_sets_worker.mjs --mode=full --set <set_id>
node backend/pokemon/tcgdex_import_cards_worker.mjs --mode=full --set <set_id> --detail
node backend/pokemon/tcgdex_normalize_worker.mjs --mode=backfill --set <set_id>
node backend/tools/tcgdex_canonize_set.mjs --set <set_id> --dry-run --detail
node backend/tools/tcgdex_canonize_set.mjs --set <set_id> --apply
```

### Route B: TCGdex Not Yet Available

Use a bounded manifest seed:

```text
data/set_ingest/<release_slug>/raw_sources/<source_key>.json
```

The seed must contain card-level source rows and provenance. The importer must
write through the same raw-source and normalization boundary used by API
workers. It must not directly hand-insert final canon rows.

Route B is allowed only when:

- the official or human-readable source exists
- card count is known
- every card row has set, number, and name
- image URLs are captured or explicitly absent
- source evidence is stored in the release artifact

## Self-Hosted Image Rule

New set images should be self-hosted when lawful source image URLs are available.

The image step must:

1. Build an image manifest from normalized target `card_prints`.
2. Download source images to a transient workspace.
3. Validate successful HTTP response and image content type.
4. Validate image identity against the manifest guard before upload. A Japanese
   set must not accept an English sibling-set image URL, page title, or known
   placeholder image. Reviewed overrides are allowed only when they include the
   exact card number, source page, image URL, and a note explaining why the
   normal source was insufficient.
5. Upload to durable storage path:

```text
warehouse-derived/self-hosted-images-v1/<set-code>/<card-print-id-or-source-id>.<ext>
```

6. Read back a sample of uploaded objects.
7. Update canon only after upload succeeds:

```text
card_prints.image_source = 'identity'
card_prints.image_path = <durable_storage_path>
```

The image step must follow `CANON_IMAGE_RESOLUTION_CONTRACT_V1`.

It must not:

- store signed URLs in canon
- make the canon bucket public
- overwrite user-uploaded images
- overwrite existing exact image paths unless a refresh flag is explicitly set
- use external image URLs as final identity paths
- ingest images whose source URL or source title matches a manifest
  `image_identity_guard` rejection pattern

## One-Command Runner

Each release should be executable by one command:

```powershell
npm run pokemon:new-sets:ingest -- --manifest data/set_ingest/<release_slug>_new_sets_v1.json --apply --self-host-images --update-master-indexes --readbacks
```

The command should run these phases:

1. `discover`
2. `validate-manifest`
3. `snapshot-sources`
4. `update-master-indexes`
5. `import-raw`
6. `normalize`
7. `canonize`
8. `self-host-images`
9. `readbacks`
10. `tests`
11. `completion-report`

The runner must support:

```powershell
npm run pokemon:new-sets:ingest -- --manifest <path> --dry-run
npm run pokemon:new-sets:ingest -- --manifest <path> --apply
```

Dry-run must perform zero writes.

Apply must be idempotent.

## Stop Conditions

The runner must stop before writes when:

- DB credentials are missing
- storage credentials are missing and `--self-host-images` is set
- source identity is unresolved
- set identity maps to a known unrelated release
- expected counts are missing
- source card count does not match expected count
- duplicate source IDs map to different cards
- card numbers are missing
- card names are missing
- source image download has high failure rate
- master index artifact path is ambiguous

The runner must stop after partial phase completion when:

- DB readbacks fail
- storage upload readbacks fail
- canon image paths cannot be resolved for sample rows
- mapping conflicts are detected

## Readbacks

A release is not complete until readbacks prove:

- target sets exist in DB
- target set rows have source provenance
- target card print count equals source count
- target external mappings exist
- no unresolved mapping conflicts exist for target source IDs
- target master index entries exist
- image manifest count equals uploaded image count or skipped image count
- sample `image_path` values sign and resolve through the normal runtime path
- completion report exists

## Test Gate

Minimum commands:

```bash
npm run contracts:test
npm run contracts:runtime-health
```

Run Flutter checks only when app image rendering or display contracts changed:

```bash
flutter analyze
flutter test
```

## Completion Report

Write a report to:

```text
docs/checkpoints/<release_slug>_new_set_ingestion_completion_v1.md
```

The report must include:

- set names
- language/region
- resolved source IDs
- source URLs
- expected counts
- DB counts
- mapping counts
- image upload counts
- skipped image count and reason
- readback samples
- test results
- deviations from the playbook

## Current First Run

The first release to use this playbook is:

- Japanese: `Abyss Eye`
- English: `Mega Evolution: Pitch Black`

Current identity note:

- `Pitch Black` must be treated as separate from `Black Bolt`.
- If live TCGdex does not expose the needed IDs at execution time, use Route B
  with a bounded source manifest and provenance snapshots.
