# ENRICH-15A Set Identity Domain Backfill Dry Run

Generated at: 2026-06-15T21:59:02.939Z

Mode: guarded dry-run, rollback-only.

DB writes performed: false
Migrations created: false

## Scope

Set `identity_domain_default` to `pokemon_eng_standard` for six English physical sets currently classified as unclassified identity domain.

Forbidden:
- parent card_print writes
- child card_printing writes
- identity inserts
- external mapping writes
- deletes
- merges
- migrations
- image writes
- global apply

## Target Sets

| set_code | set_name | parent_rows | child_printing_rows | missing_parent_gv_id | missing_active_identity |
|---|---:|---:|---:|---:|---:|
| 2023sv | McDonald's Collection 2023 | 15 | 15 | 15 | 15 |
| 2024sv | McDonald's Collection 2024 | 15 | 15 | 15 | 15 |
| me03 | Perfect Order | 126 | 190 | 0 | 126 |
| me04 | Chaos Rising | 122 | 247 | 122 | 122 |
| mee | Mega Evolution Energy | 8 | 16 | 8 | 8 |
| mfb | My First Battle | 34 | 34 | 34 | 34 |

## Dry-Run Result

- pass: true
- target_set_count: 6
- dry_run_updated_sets: 6
- affected_parent_rows: 320
- affected_child_printing_rows: 517
- proof_hash_sha256: `3f778632b7489b6c4156f5e0b6956dea2d1ac741b734714ce3f0203a97fc6696`

## Safety Confirmation

This package only prepares a set-domain classification update. It does not enrich parent or child rows directly.
