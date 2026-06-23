# IMG-HOST-WH-04D-TCGDEX-REPLACEMENT-DB-POINTER-REPOINT-DRY-RUN

- Generated: 2026-06-23T17:59:57.286Z
- Mode: dry_run_no_write
- Fingerprint: `04d77bcf6c36082e535d8996d15bd3e6b87d25e3d8df0c371f9482ea772a47c4`
- Manifest rows: 11405
- Completed manifest rows: 11405
- Incomplete or unsupported manifest rows: 0
- Unique card_print rows in scope: 11405
- Metadata pointer plan rows: 11405
- No-op plan rows: 0
- Effective metadata pointer updates: 11405
- Missing current DB rows: 0
- Missing proposed storage paths: 0
- Status claim would change if status updated: 92
- Ready for apply package: true
- Stop findings: none
- Runtime public URL field writes planned: false
- Preserved columns: image_status, image_note
- DB writes performed: false
- Storage writes performed: false
- Migrations created: false
- Exact image claim changes performed: false

## Target Tables

| key | count |
| --- | ---: |
| card_prints | 11405 |

## Proposed Image Sources

| key | count |
| --- | ---: |
| tcgdex | 11303 |
| external | 92 |
| pokemonapi | 10 |

## Display Image Kinds

| key | count |
| --- | ---: |
| exact | 11313 |
| representative | 92 |

## Replacement Routes

| key | count |
| --- | ---: |
| tcgdex_high_suffix_repair | 11303 |
| replacement_malie_trainer_kit | 90 |
| replacement_pokemontcg_trainer_kit | 10 |
| replacement_tcgcollector_trainer_kit | 2 |
