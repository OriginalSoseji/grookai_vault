# DV1 Stamp Holo Second Wave Guarded Dry Run V1

Generated: 2026-06-21T20:35:50.538Z

This is a rollback-only dry-run artifact. It performs no durable writes.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false

## Summary

- target_rows: 2
- write_ready_for_approval: true
- rollback_verified: true
- dry_run_proof_sha256: 189a08eebdf16f493dbfec8bd89fc9017facd565c69d6a6fa6101435ea14c063

## Scope

| set | number | card | stamp | variant_key | finish |
| --- | --- | --- | --- | --- | --- |
| dv1 | 8 | Salamence | League Stamp | league_stamp | holo |
| dv1 | 17 | Druddigon | Dragon Vault Stamp | dragon_vault_stamp | holo |

## Evidence Rule

Exact card-level variant labels were found on PokeScope and Scrydex. Supplemental sources resolve the previously ambiguous rows: Salamence #8 is Spring Regional Crosshatch Holo with separate Staff and Cosmos variants, and Druddigon #17 is Dragon Vault Stamped Holo. Dragon Vault set-level sources identify the set cards as foil/holographic, and each base parent currently has a holo child printing.

## Required Approval Boundary

Do not real-apply this package without explicit approval. If approved, the exact scope is 2 parent inserts, 2 active identity inserts, and 2 holo child printing inserts. No deletes, no merges, no migrations.
