# BRIDGE_GENERALIZATION_V1

## Problem

`external_discovery_to_warehouse_bridge_v1.mjs` was hardcoded to:

- accept only `me03-perfect-order-pokemon`
- infer canonical set identity only for `me03`
- rely on a bridge scope that was not reusable for future sets

That blocked lawful reuse for:

- `me02-phantasmal-flames-pokemon`
- `sv-scarlet-violet-151-pokemon`
- future source-backed missing-card batches

## Solution

The bridge is now parameterized by required CLI input:

```bash
node backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs --set-id=<external-set-id>
```

The generalized bridge keeps one-set execution only, but removes the fixed `me03` guard.

Set context is now resolved by:

1. proving the set exists in `public.external_discovery_candidates`
2. requiring exactly one active helper alignment in `public.justtcg_set_mappings`
3. reading canonical `set_code` / `set_name` from the mapped `sets` row

## Bridge Scope

The bridge now admits only two lawful row classes:

1. standard missing-card rows
   - `match_status = 'UNMATCHED'`
   - `candidate_bucket = 'CLEAN_CANON_CANDIDATE'`

2. retroactive set-mapping rows
   - unresolved rows whose ingestion reason is exactly `set_mapping_missing`
   - these become bridgeable once a unique helper set mapping exists

Rows outside this scope are skipped, not bridged.

This preserves the original Perfect Order behavior without keeping a `me03`-only bridge.

## Invariants Preserved

- no canon writes
- no promotion writes
- no classification changes
- no mapping changes
- product rows still excluded
- unlabeled collision rows still block
- deterministic payload construction unchanged
- idempotency unchanged
- set-specific variant identity evidence is carried through unchanged when it applies

## Me02 Test Batch

Target set:

- `me02-phantasmal-flames-pokemon`

Expected first batch:

- `Charcadet - 022`
- `Ghastly 054/094`

### Dry Run

Observed summary:

- `source_rows_read = 135`
- `candidates_read = 2`
- `eligible = 2`
- `blocked = 0`
- `collision_rows = 0`
- `outside_bridge_scope_rows = 133`

This proved the generalized scope did not drag in unrelated `me02` review rows.

### Apply

Executed:

```bash
node backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs --set-id=me02-phantasmal-flames-pokemon --apply
```

Observed result:

- `candidates_bridged = 2`
- inserted warehouse state: `RAW`

Verified inserted bridge rows:

- `Charcadet - 022`
- `Ghastly`

Verified by bridge provenance:

- `reference_hints_payload.bridge_source = external_discovery_bridge_v1`
- `reference_hints_payload.source_set_id = me02-phantasmal-flames-pokemon`
- row count = `2`

## Why This Enables Reusable Ingestion

The missing-card path is now reusable as:

`external_discovery_candidates --set-id--> canon_warehouse_candidates`

without requiring a one-off bridge for each new set.

The bridge remains bounded:

- one set at a time
- governed by existing staging truth
- founder-gated downstream
- safe for the first missing-card pipeline batch
