# PKG-04A Chaos Rising Ingestion Readiness Checkpoint V1

Date: 2026-06-09

This checkpoint records the no-write readiness package for Chaos Rising (`me04`) after PKG-02 closure.

No DB writes, migrations, cleanup, quarantine, canonical normalization, or apply operation was performed.

## Result

| Field | Value |
| --- | --- |
| package_id | PKG-04A-CHAOS-RISING-INGESTION-READINESS |
| report_status | pkg04a_chaos_rising_ingestion_readiness_ready_for_operator_raw_import_decision_no_write |
| set_key | me04 |
| set_name | Chaos Rising |
| master_index_cards | 122 |
| master_index_printings | 247 |
| normal_printings | 113 |
| reverse_printings | 76 |
| holo_printings | 58 |
| live_set_rows | 0 |
| live_card_print_rows | 0 |
| live_card_printing_rows | 0 |
| tcgdex_raw_import_rows | 0 |
| write_ready_now | 0 |

## Source Probes

The command-scoped dry-run source probes confirmed TCGdex has the expected Chaos Rising set and detail card payloads:

```powershell
node backend\sets\tcgdex_import_sets_worker.mjs --set me04 --dry-run
node backend\pokemon\tcgdex_import_cards_worker.mjs --set me04 --detail --dry-run
```

Observed:

| Field | Value |
| --- | --- |
| fetched_sets | 1 |
| would_upsert_sets | 1 |
| fetched_cards | 122 |
| would_upsert_cards | 122 |
| created | 0 |
| updated | 0 |
| skipped_missing_id | 0 |
| db_writes_performed | false |

Local Windows TLS required a command-scoped retry using `NODE_TLS_REJECT_UNAUTHORIZED=0`. This must not become default behavior.

## Safety Patch

`backend/sets/tcgdex_import_sets_worker.mjs` now supports scoped set import:

```powershell
node backend\sets\tcgdex_import_sets_worker.mjs --set me04 --dry-run
```

`backend/pokemon/tcgdex_normalize_worker.mjs` now supports scoped normalization:

```powershell
node backend\pokemon\tcgdex_normalize_worker.mjs --set me04 --dry-run
```

Together these prevent a future Chaos Rising raw import or normalization dry-run/apply from processing unrelated TCGdex rows.

## Required Next Approval Boundary

The next durable step is scoped raw import only, not canonical apply:

1. TCGdex set raw import for `me04` decision.
2. TCGdex card raw import for `me04` decision.
3. Scoped normalize dry-run.
4. Only after dry-run proof: explicit approval for scoped canonical normalize apply.

## Source Artifacts

- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg04a_chaos_rising_ingestion_readiness_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg04a_chaos_rising_ingestion_readiness_v1.md`
- `docs/audits/verified_master_set_index_v1/chaos_rising/chaos_rising_completion_package_v1.json`
- `scripts/audits/english_master_index_pkg04a_chaos_rising_ingestion_readiness_v1.mjs`

## Stop Rules

- Do not run scoped normalize apply until raw imports exist and scoped normalize dry-run passes.
- Do not run broad normalization for Chaos Rising.
- Do not use direct SQL inserts unless standard ingestion is proven unusable and separately approved.
- Do not make insecure TLS behavior the default.
- Do not create migrations for this package.
