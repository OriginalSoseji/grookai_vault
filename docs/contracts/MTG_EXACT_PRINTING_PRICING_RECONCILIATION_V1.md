# MTG Exact-Printing Pricing Reconciliation V1

## Status

Offline/read-only planning contract. This contract authorizes no database,
publication, release-control, image, Storage, Vault, or active-ingestion work.

## Purpose

Reconcile the frozen MTG canonical catalog payloads to the frozen TCGPlayer
warehouse snapshot without inference. The output identifies which exact
canonical finish lanes have warehouse support and a snapshot-bound
positive-market signal, and preserves every gap that blocks publication. The
snapshot contains neither a publishable amount nor evidence that the signal is
fresh at publication time.

## Frozen Inputs

The planner accepts only explicit CLI paths:

- `--manifest=<frozen manifest.json>`
- `--payload-dir=<frozen set payload directory>`
- `--warehouse-snapshot=<frozen product/subtype signal JSONL>`
- `--out-dir=<audit output directory>`

The manifest must be `MTG_CANONICAL_CATALOG_BATCH_MANIFEST_V1` with status
`full_catalog_batches_frozen`. Every payload byte hash and writer fingerprint
must match its manifest entry. The warehouse byte hash must equal the snapshot
hash frozen in the manifest. A mismatch stops before reconciliation.

## Exact Lane Identity

An exact pricing lane requires all of:

```text
canonical card_printing_id
+ canonical finish_key
+ TCGPlayer product_id
+ TCGPlayer source subtype
+ matching external_id and mapping metadata
```

For MTG Pricing V1, `normal` must map to `normal` and `foil` must map to `foil`.
Etched canonical printings remain preserved but publication-blocked. The
planner never derives an owner from name, set, collector number, image, price,
or single-child inference.

## Warehouse Decisions

Each exact external mapping receives one deterministic warehouse status:

- `exact_snapshot_positive_signal_lane`
- `exact_lane_without_positive_market_signal`
- `missing_warehouse_subtype`
- `missing_warehouse_product`
- `duplicate_warehouse_product`
- a structural mapping or ownership collision

An exact lane with a positive signal is only a shadow-qualification candidate.
It is never a publication candidate at this gate. This planner has no price
amount or observation timestamp, does not qualify freshness, does not create
publication snapshots, and does not publish a price.

## Gap Preservation

The publication-blocked ledger preserves:

- canonical printings with no exact external mapping;
- etched printings outside V1;
- missing products and subtypes;
- exact lanes without a snapshot-bound positive-market signal;
- malformed or contradictory exact mappings;
- duplicate warehouse identities;
- source-lane or printing-owner collisions;
- set-level collision counts already withheld by the frozen manifest.

Quarantined lanes remain ownerless. Set-level quarantine evidence is not
invented into card-level assignments when the frozen payload intentionally
withholds those assignments.

## Required Artifacts

- `run_plan.json`
- `summary.json`
- `reconciled_exact_lanes_index.json`
- `reconciled_exact_lanes_part_*.jsonl.gz`
- `publication_blocked_gap_ledger_index.json`
- `publication_blocked_gap_ledger_part_*.jsonl.gz`
- `set_finish_coverage.jsonl`
- `missing_warehouse_lanes.jsonl`
- `collision_conditions.jsonl`
- `zero_map_sets.json`
- `REPORT.md`
- `artifact_hashes.json`

All mapping rows and all gap rows are emitted. Exact-lane and gap-ledger JSONL
are deterministically gzip-compressed. Each index preserves total logical row
count, aggregate logical JSONL SHA-256, and per-part logical SHA-256, compressed
SHA-256, and compressed byte size. `artifact_hashes.json` repeats the logical
and compressed evidence for every gzip part. Counts reconcile to the frozen
manifest. A deterministic result fingerprint makes the plan auditable and
replaceable.

## Boundaries

- No database client is loaded.
- No database or API call is made.
- No canonical, price, publication, or release row is written.
- No image is read, downloaded, uploaded, or repointed.
- No Vault or Pokemon row is accessed.
- No active-ingestion worktree is executed or changed.
- No inferred mapping is created.

## Next Gate

After the offline plan reconciles cleanly, a separate database-aware shadow
qualification plan may compare exact signal candidates with the completed
hidden canonical ingestion and prove an authoritative amount and freshness
timestamp. Publication remains a later, separately governed gate.
