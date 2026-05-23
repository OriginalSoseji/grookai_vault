# Printing Generation Source Audit V1

Generated: 2026-05-23T17:58:59.649Z

## Origin Summary

| provenance_source |created_by |rows |
| --- |--- |--- |
| tcgdex |printing_ingestion_v2 |32626 |
| (null) |(null) |22789 |
| premium_authority_v1 |premium_reconciliation_v1 |167 |
| me03_master_set_repair_v1 |codex:me03_master_set_repair_v1 |79 |

## Unsafe Generation Paths

- `backend/printing/finish_normalizer_v1.mjs` previously mapped upstream boolean flags directly into child finish rows; now returns no writeable finishes.
- `backend/printing/printing_upsert_v1.mjs` previously allowed `normal`, `holo`, and `reverse` writes without proof metadata; now requires explicit proof evidence.
- Historical identity normalization apply scripts move/delete `card_printings` by finish_key during row collapses.
- Legacy rows with null provenance/created_by remain in production and cannot be externally verified from row metadata alone.

## Required Engineering Follow-Up

- Wire future approved printing ingestion through explicit proof/evidence payloads.
- Block reverse-holo creation unless checked source evidence names reverse/reverse-holofoil for that exact parent card.
- Add quarantine/status columns or a sidecar table before any cleanup.
- Run an ownership/provenance impact audit before quarantining or removing referenced rows.
