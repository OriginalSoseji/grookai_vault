# MTG Catalog Ingestion Progress Snapshot

- Observed at: `2026-08-14T03:45:41.351Z`
- Source run: `C:\grookai_vault_mtg_pricing_readiness\docs\audits\pricing\mtg_canonical_catalog_ingestion_v1\2026-08-14T02-53-11Z_durable_apply`
- State: **running**
- Selected: `952`
- Completed: `25`
- Remaining: `927`
- Deferred: `0`
- Retries: `0`
- Failures: `0`
- Process liveness: **not_found** (no matching local executor process found)

## Current Work

- `tdd1` (ordinal 25)

## Completed Frozen Plan Rows

| Row class | Count |
| --- | ---: |
| Sets | 25 |
| Card parents | 1162 |
| Identity rows | 1162 |
| Printings | 1632 |
| Scryfall parent mappings | 1162 |
| TCGPlayer printing mappings | 1353 |

## Timing

- Rate basis: `completed_timestamps`
- Completed timestamp sample: `25`
- Rate: `29.561` sets/hour
- Average: `121.783` seconds/set
- ETA: `2026-08-15T11:07:14.307Z`
- Last event: `set_started` at `2026-08-14T03:45:14.467Z`
- Last event age: `27` seconds

## Automatic Gates

| Completed-set target | Status |
| ---: | --- |
| 1 | passed |
| 25 | passed |
| 952 | pending |

## Observer Boundaries

This snapshot was produced without database, network, Storage, release, or
ingestion writes. Source run artifacts were read only. Process liveness remains
unknown unless the explicit `--inspect-process-liveness` flag is supplied.

## Warnings

- None
