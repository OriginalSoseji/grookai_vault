# MTG Exact-Printing Pricing Reconciliation V1

## Status

**offline_reconciliation_complete_publication_blocked**

This is an offline, read-only reconciliation plan. It does not access the
database and does not authorize or perform price publication.

## Frozen Inputs

- Manifest SHA-256: `1240b4ab9aa71c118d022d23e393e8c06397346c61d778e223d0b3b549f8c3e1`
- Payload inventory SHA-256: `6d080c4eb8cc3cb2db9ff50416f4836b1d4571882a15ec4d3ba4669649c26a32`
- Warehouse snapshot SHA-256: `4931471d864b6f48234c3b51b15206de4218b7afd87c708a03fa72b94224048b`
- Result fingerprint: `e8c9af33c308187b6b191894212816bf2d40748bddeb7239ce8f01edcd42ee52`

## Coverage

| Measure | Count |
|---|---:|
| Sets | 953 |
| Canonical finish printings | 158,262 |
| Exact TCGPlayer mapping rows | 144,462 |
| Warehouse-supported exact lanes | 144,462 |
| Snapshot-bound positive-market signals | 142,670 |
| Zero-map sets | 175 |
| Missing warehouse products | 0 |
| Missing warehouse subtypes | 0 |
| Lanes without a snapshot-bound positive-market signal | 1,792 |
| Unmapped canonical printings | 13,800 |
| Manifest-quarantined collision lanes | 42 |
| Detected collision conditions | 0 |
| Publication-blocked gap rows | 15,607 |

## Decision

The warehouse snapshot proves subtype support and a positive-market signal only.
It does not contain a publishable amount or prove freshness. Exact signal rows
are eligible only for a later shadow-qualification gate. Publication remains
blocked until database-aware evidence proves amount, freshness, release
isolation, and shared read-model behavior. Missing and quarantined lanes remain
preserved; this plan chooses no inferred owner.

## Boundaries

- offline_only: `true`
- database_access: `false`
- database_writes: `false`
- publication_writes: `false`
- release_control_writes: `false`
- image_access: `false`
- storage_writes: `false`
- vault_writes: `false`
- active_ingestion_access: `false`
- inferred_mappings: `false`
