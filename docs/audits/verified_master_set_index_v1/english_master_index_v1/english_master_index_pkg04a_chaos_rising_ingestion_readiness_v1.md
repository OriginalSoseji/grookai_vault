# PKG-04A Chaos Rising Ingestion Readiness V1

This is a no-write readiness package for Chaos Rising. It does not authorize raw imports, canonical normalization, migrations, cleanup, quarantine, or apply execution.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- apply_paths_executed: false
- write_ready_now: 0

## Status

- report_status: pkg04a_chaos_rising_completed_live_matches_master_index_no_write
- package_id: PKG-04A-CHAOS-RISING-INGESTION-READINESS

## Scope

| field | value |
| --- | --- |
| set_key | me04 |
| set_name | Chaos Rising |
| source_aliases | ["me04","me4"] |
| master_index_cards | 122 |
| master_index_printings | 247 |
| master_index_printings_by_finish | {"normal":113,"reverse":76,"holo":58} |
| live_set_rows | 1 |
| live_card_print_rows | 122 |
| live_card_printing_rows | 247 |
| tcgdex_raw_import_rows | 123 |
| chaos_rising_missing_printings | 0 |

## Source Probe

| Field | Value |
| --- | --- |
| set command | `node backend\sets\tcgdex_import_sets_worker.mjs --set me04 --dry-run` |
| fetched_sets | 1 |
| would_upsert_sets | 1 |
| set_probe_db_writes_performed | false |
| card command | `node backend\pokemon\tcgdex_import_cards_worker.mjs --set me04 --detail --dry-run` |
| fetched_cards | 122 |
| would_upsert_cards | 122 |
| card_probe_db_writes_performed | false |
| command_scoped_tls_retry_used | true |
| tls_note | Do not make NODE_TLS_REJECT_UNAUTHORIZED=0 a default. Use only as a temporary local operator workaround if certificate trust is not fixed. |

## Current Blockers

| blocker | severity | required_resolution |
| --- | --- | --- |

## Required Operator Sequence

| step | command | write_scope | durable_write | canonical_write | safety_requirement |
| --- | --- | --- | --- | --- | --- |
| raw_set_import | node backend\sets\tcgdex_import_sets_worker.mjs --set me04 | raw_imports set row for me04 only | true | false | Operator approval required. Confirm dry-run fetched=1 and wouldUpsert=1 immediately before real import. |
| raw_card_import | node backend\pokemon\tcgdex_import_cards_worker.mjs --set me04 --detail | raw_imports card rows for me04 only | true | false | Operator approval required. Confirm dry-run fetched=122 and wouldUpsert=122 immediately before real import. |
| scoped_normalize_dry_run | node backend\pokemon\tcgdex_normalize_worker.mjs --set me04 --dry-run | none | false | false | Must show 122 parent card_print insert simulations and no unrelated set/card processing. |
| scoped_normalize_apply | node backend\pokemon\tcgdex_normalize_worker.mjs --set me04 | sets/card_prints/card_printings/external_mappings/traits for me04 only | true | true | Requires explicit approval after dry-run artifact, rollback plan, and post-apply verification gates. |
| post_apply_master_index_verification | node scripts\audits\english_master_index_chaos_rising_completion_package_v1.mjs | none | false | false | Must reach 122 live parents, 247 live child printings, 247/247 verified_by_index, and 0 unsupported/name mismatch. |

## Safety Gaps Closed This Step

- tcgdex_normalize_worker_unscoped_pending_processing: Added --set filtering for pending set and card raw_import rows.
- tcgdex_import_sets_worker_broad_only_execution: Added --set support so Chaos Rising raw set import can be bounded to me04.

## Stop Rules

- Do not run scoped_normalize_apply until raw imports exist and scoped_normalize_dry_run passes.
- Do not run broad normalization for Chaos Rising.
- Do not use direct SQL inserts for Chaos Rising unless standard ingestion is proven unusable and a separate approval exists.
- Do not make insecure TLS behavior the default.
- Do not create migrations for this package.
